const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const Handlebars = require("handlebars");
const printer = require("pdf-to-printer");
const logger = require("../utils/logger");

// Register Handlebars helpers
Handlebars.registerHelper("formatRupiah", (value) => {
  return new Intl.NumberFormat("id-ID").format(value || 0);
});

Handlebars.registerHelper("eq", (a, b) => a === b);

Handlebars.registerHelper("statusLabel", (status) => {
  const labels = {
    nominal: "LUNAS",
    belum_lunas: "BELUM LUNAS",
    free: "GRATIS",
    custom: "CUSTOM",
  };
  return labels[status] || "LUNAS";
});

class ServisPrinter {
  constructor(printerName) {
    this.printerName = printerName;
  }

  async printNotaServis(data) {
    try {
      const templatePath = path.join(__dirname, "../templates/nota-servis.html");
      const templateContent = await fs.readFile(templatePath, "utf-8");
      const template = Handlebars.compile(templateContent);

      // Add status labels to items
      const enhancedData = {
        ...data,
        items: data.items.map((item) => ({
          ...item,
          statusLabel: this.getStatusLabel(item.statusPembayaran || "nominal"),
        })),
      };

      const html = template(enhancedData);
      const pdfPath = await this.generatePDF(html, {
        width: "20cm",
        height: "12.9cm",
        landscape: true,
      });

      // Print 2x
      await this.printPDF(pdfPath, 2);

      logger.info(`✅ Nota servis printed successfully (2 copies)`);
      return { success: true, path: pdfPath };
    } catch (error) {
      logger.error(`Print nota servis failed:`, error);
      throw new Error(`Print nota servis failed: ${error.message}`);
    }
  }

  async printNotaCustom(data) {
    try {
      const templatePath = path.join(__dirname, "../templates/nota-custom.html");
      const templateContent = await fs.readFile(templatePath, "utf-8");
      const template = Handlebars.compile(templateContent);

      // Add status labels to items
      const enhancedData = {
        ...data,
        items: data.items.map((item) => {
          const statusPembayaran = item.statusPembayaran || "nominal";
          const statusLabel = this.getStatusLabel(statusPembayaran);

          return {
            ...item,
            statusPembayaran,
            statusLabel: statusLabel,
          };
        }),
      };

      // Determine dpLabel based on all items' statusPembayaran
      let dpLabel = "DP"; // default
      const allItemsLunas = enhancedData.items.every((item) => {
        const status = item.statusPembayaran || "nominal";
        return status === "nominal";
      });

      if (allItemsLunas) {
        dpLabel = "LUNAS";
      } else {
        dpLabel = "DP";
      }

      // Pass dpLabel to template
      const html = template({
        ...enhancedData,
        dpLabel: dpLabel,
      });

      const pdfPath = await this.generatePDF(html, {
        width: "17cm",
        height: "12cm",
        landscape: true,
      });

      // Print 2x
      await this.printPDF(pdfPath, 2);

      logger.info(`✅ Nota custom printed successfully (2 copies)`);
      return { success: true, path: pdfPath };
    } catch (error) {
      logger.error(`Print nota custom failed:`, error);
      throw new Error(`Print nota custom failed: ${error.message}`);
    }
  }

  async generatePDF(html, pageSize) {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();

      await page.setContent(html, { waitUntil: "networkidle0" });

      const timestamp = Date.now();
      const pdfPath = path.join(__dirname, "../temp", `servis-${timestamp}.pdf`);

      // Ensure temp directory exists
      const tempDir = path.join(__dirname, "../temp");
      try {
        await fs.access(tempDir);
      } catch {
        await fs.mkdir(tempDir, { recursive: true });
      }

      // Generate PDF following CSS @page rules
      await page.pdf({
        path: pdfPath,
        preferCSSPageSize: true,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });

      logger.info(`PDF generated: ${pdfPath}`);
      return pdfPath;
    } finally {
      await browser.close();
    }
  }

  async printPDF(pdfPath, copies = 1) {
    const options = {
      printer: this.printerName,
      copies: copies,
    };

    logger.info(`Printing ${copies} copies to ${this.printerName}...`);
    await printer.print(pdfPath, options);
  }

  getStatusLabel(status) {
    const labels = {
      nominal: "LUNAS",
      belum_lunas: "BELUM LUNAS",
      free: "GRATIS",
      custom: "CUSTOM",
    };
    return labels[status] || "LUNAS";
  }
}

module.exports = ServisPrinter;
