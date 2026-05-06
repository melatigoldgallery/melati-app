const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs").promises;
const logger = require("../utils/logger");
const Handlebars = require("handlebars");
const bwipjs = require("bwip-js");

class PDFService {
  constructor() {
    this.browser = null;
    this.templateCache = new Map();
    this.isProcessing = false;
    this.requestQueue = [];
    this.initializeHelpers();
  }

  /**
   * Initialize Handlebars helpers
   */
  initializeHelpers() {
    Handlebars.registerHelper("formatRupiah", function (angka) {
      if (!angka && angka !== 0) return "";
      const number = typeof angka === "string" ? parseInt(angka.replace(/\./g, "")) : angka;
      return "Rp " + new Intl.NumberFormat("id-ID").format(number);
    });

    Handlebars.registerHelper("add", function (a, b) {
      return a + b;
    });

    Handlebars.registerHelper("eq", function (a, b) {
      return a === b;
    });
  }

  /**
   * Initialize Puppeteer browser
   * Fallback strategy:
   * 1. Try Chrome from system paths
   * 2. Try Chromium bundled with Puppeteer
   * 3. Try Microsoft Edge (Chromium-based)
   */
  async init() {
    try {
      if (!this.browser) {
        logger.info("Initializing Puppeteer browser...");

        const launchOptions = {
          headless: "new",
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        };

        // 🔍 STEP 1: Try Chrome from system
        const chromePaths = [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
          process.env.PROGRAMFILES + "\\Google\\Chrome\\Application\\chrome.exe",
        ];

        let chromeFound = false;
        for (const chromePath of chromePaths) {
          try {
            const fs = require("fs");
            if (fs.existsSync(chromePath)) {
              launchOptions.executablePath = chromePath;
              logger.info(`✅ Found Chrome at: ${chromePath}`);
              chromeFound = true;
              break;
            }
          } catch (err) {
            // Continue to next path
          }
        }

        // 🔍 STEP 2: If Chrome not found, try Edge (Chromium-based)
        if (!chromeFound) {
          const edgePaths = [
            "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
            "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
          ];

          for (const edgePath of edgePaths) {
            try {
              const fs = require("fs");
              if (fs.existsSync(edgePath)) {
                launchOptions.executablePath = edgePath;
                logger.info(`✅ Found Edge (Chromium) at: ${edgePath}`);
                chromeFound = true;
                break;
              }
            } catch (err) {
              // Continue
            }
          }
        }

        // 🔍 STEP 3: If still not found, let Puppeteer use bundled Chromium (if available)
        if (!chromeFound) {
          logger.warn("⚠️ Chrome/Edge not found in system. Attempting to use Puppeteer's bundled Chromium...");
          logger.warn(
            "💡 If this fails, please install Google Chrome or run: cd printing-service && npm install puppeteer",
          );
          // Don't set executablePath, let Puppeteer use default
        }

        this.browser = await puppeteer.launch(launchOptions);
        logger.info("✅ Puppeteer browser initialized successfully");
      }
    } catch (error) {
      logger.error("❌ Failed to initialize Puppeteer browser");
      logger.error("Error details:", error.message);
      logger.error("");
      logger.error("🔧 TROUBLESHOOTING:");
      logger.error("   1. Install Google Chrome: https://www.google.com/chrome/");
      logger.error("   2. OR install Puppeteer with Chromium: cd printing-service && npm install puppeteer");
      logger.error("   3. Restart the print service after installation");
      logger.error("");
      throw new Error(`Browser initialization failed: ${error.message}`);
    }
  }

  /**
   * Generate invoice PDF with queue mechanism
   * @param {Object} data - Invoice data
   * @returns {Promise<string>} Path to generated PDF
   */
  async generateInvoicePDF(data) {
    // Add to queue if another request is processing
    if (this.isProcessing) {
      logger.info("Request queued, waiting for previous request to complete...");
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ data, resolve, reject });
      });
    }

    return this._generateInvoicePDFInternal(data);
  }

  /**
   * Internal PDF generation method
   * @private
   */
  async _generateInvoicePDFInternal(data) {
    this.isProcessing = true;
    let page = null;

    try {
      logger.info("🔄 Starting PDF generation...");

      // Ensure browser is initialized
      await this.init();

      // Clear template cache to ensure latest version is loaded
      this.templateCache.clear();

      const normalizedItems = (data.items || []).map((item) => ({
        code: item.kode || item.kodeText || item.code || "-",
        quantity: item.jumlah || item.quantity || 1,
        name: item.nama || item.name || "-",
        purity: item.kadar || item.purity || "-",
        weight:
          item.berat || (typeof item.weight === "string" ? item.weight.replace(" gr", "").trim() : item.weight) || "-",
        price: item.totalHarga || item.harga || item.price || 0,
      }));

      const barcodeValue = String(normalizedItems[0]?.code || "").trim();
      const barcodeDataUrl = await this.generateBarcodeDataUrl(barcodeValue);
      const resolvedNotes =
        String(data.notes || data.keterangan || "").trim() ||
        (data.items || [])
          .map((item) => String(item.keterangan || item.notes || "").trim())
          .filter(Boolean)
          .join("; ");

      // Transform data to match template format
      const templateData = {
        date: data.tanggal || data.date || "",
        customerName: data.customerName || "",
        customerPhone: data.customerPhone || "",
        sales: data.sales || "Admin",
        total: data.totalHarga || data.total || 0,
        items: normalizedItems,
        barcodeDataUrl,
        barcodeValue,
        notes: resolvedNotes,
      };

      // Load and compile template
      const template = await this.loadTemplate("invoice");
      const html = template(templateData);

      // Create new page with viewport matching physical paper size
      page = await this.browser.newPage();

      // Set viewport to match paper dimensions (20.5cm x 10.5cm at 96 DPI)
      await page.setViewport({
        width: 774, // 20.5cm = 774px
        height: 396, // 10.5cm = 396px
      });

      await page.setContent(html, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      // Generate PDF - Let CSS @page control size and orientation
      const pdfBuffer = await page.pdf({
        preferCSSPageSize: true, // Follow CSS @page rules
        printBackground: false,
        margin: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        },
        scale: 1, // Default scale, no zoom
      });

      await page.close();
      page = null;

      // Save to temp directory
      const tempDir = path.join(__dirname, "../temp");
      await fs.mkdir(tempDir, { recursive: true });

      const filename = `invoice_${Date.now()}.pdf`;
      const tempPath = path.join(tempDir, filename);

      await fs.writeFile(tempPath, pdfBuffer);

      logger.info(`✅ PDF generated: ${filename}`);

      return tempPath;
    } catch (error) {
      logger.error("PDF generation error:", error);

      // Close page if still open
      if (page) {
        try {
          await page.close();
        } catch (closeError) {
          logger.error("Error closing page:", closeError);
        }
      }

      throw error;
    } finally {
      this.isProcessing = false;

      // Process next request in queue
      if (this.requestQueue.length > 0) {
        const nextRequest = this.requestQueue.shift();
        logger.info(`Processing queued request (${this.requestQueue.length} remaining)...`);

        this._generateInvoicePDFInternal(nextRequest.data).then(nextRequest.resolve).catch(nextRequest.reject);
      }
    }
  }

  /**
   * Load and compile template
   * @param {string} templateName - Template filename without extension
   * @returns {Promise<Function>} Compiled template function
   */
  async loadTemplate(templateName) {
    // Check cache
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    try {
      const templatePath = path.join(__dirname, "../templates", `${templateName}.html`);
      const templateContent = await fs.readFile(templatePath, "utf-8");

      // Compile with Handlebars
      const compiled = Handlebars.compile(templateContent);

      // Cache it
      this.templateCache.set(templateName, compiled);

      logger.info(`Template loaded and cached: ${templateName}`);
      return compiled;
    } catch (error) {
      logger.error(`Error loading template ${templateName}:`, error);
      throw error;
    }
  }

  /**
   * Generate a Code 128 barcode as a PNG data URL
   * @param {string} value - Barcode value
   * @returns {Promise<string>} Data URL or empty string when invalid
   */
  async generateBarcodeDataUrl(value) {
    if (!value || value === "-") {
      return "";
    }

    try {
      const pngBuffer = await bwipjs.toBuffer({
        bcid: "code128",
        text: value,
        scale: 2,
        height: 8,
        includetext: false,
        paddingwidth: 0,
        paddingheight: 0,
      });

      return `data:image/png;base64,${pngBuffer.toString("base64")}`;
    } catch (error) {
      logger.warn(`Failed to generate barcode for value '${value}': ${error.message}`);
      return "";
    }
  }

  /**
   * Generate a QR code as PNG data URL using bwip-js
   * @param {string} value
   * @param {number} scale
   * @returns {Promise<string>}
   */
  async generateQRDataUrl(value, scale = 4) {
    if (!value) return "";
    try {
      const pngBuffer = await bwipjs.toBuffer({
        bcid: "qrcode",
        text: String(value),
        scale: scale, // pixels per module
        includetext: false,
        paddingwidth: 0,
        paddingheight: 0,
      });

      return `data:image/png;base64,${pngBuffer.toString("base64")}`;
    } catch (error) {
      logger.warn(`Failed to generate QR for value '${value}': ${error.message}`);
      return "";
    }
  }

  /**
   * Generate PDF containing one or more QR label pages sized by centimeters
   * @param {Object} data - { widthCm, heightCm, labels: [ { kode, nama, kadar, berat, qty } ] }
   * @returns {Promise<string>} path to generated PDF
   */
  async generateLabelPDF(data) {
    if (this.isProcessing) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ data, resolve, reject });
      });
    }

    this.isProcessing = true;
    let page = null;
    try {
      await this.init();

      const labelWidthMm = Number(data.labelWidthMm) || 23;
      const labelHeightMm = Number(data.labelHeightMm) || 24;
      const pageWidthMm = Number(data.pageWidthMm) || 85;
      const pageHeightMm = Number(data.pageHeightMm) || 28;
      const pagePaddingX = Number(data.pagePaddingX) || 2;
      const pagePaddingY = Number(data.pagePaddingY) || 2;
      const gapMm = Number(data.gapMm) || pageWidthMm - 2 * pagePaddingX - 2 * labelWidthMm;

      // Build flattened list of rows: each requested label prints as 1 row with 2 identical labels
      const rows = [];
      (data.labels || []).forEach((l) => {
        const qty = Number(l.qty) || 1;
        for (let i = 0; i < qty; i++) {
          rows.push({
            left: l,
            right: l,
          });
        }
      });

      // Prepare template data: each row contains 2 identical labels
      const rowsData = [];
      for (const row of rows) {
        const left = row.left || {};
        const right = row.right || left;
        const leftQrDataUrl = await this.generateQRDataUrl(String(left.kode || ""), 6);
        const rightQrDataUrl = await this.generateQRDataUrl(String(right.kode || left.kode || ""), 6);

        rowsData.push({
          left: {
            kode: left.kode || "",
            nama: left.nama || "",
            kadar: left.kadar || "",
            berat: left.berat || "",
            qrDataUrl: leftQrDataUrl,
          },
          right: {
            kode: right.kode || "",
            nama: right.nama || "",
            kadar: right.kadar || "",
            berat: right.berat || "",
            qrDataUrl: rightQrDataUrl,
          },
        });
      }

      // Load template
      const template = await this.loadTemplate("label-qr");
      // Build html by rendering each row and concatenating with page-break
      const html = template({
        rows: rowsData,
        labelWidthMm,
        labelHeightMm,
        gapMm,
        pageWidthMm,
        pageHeightMm,
        pagePaddingX,
        pagePaddingY,
      });

      page = await this.browser.newPage();

      await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });

      // Generate PDF - CSS @page sets size
      const pdfBuffer = await page.pdf({
        preferCSSPageSize: true,
        landscape: true,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });

      await page.close();
      page = null;

      const tempDir = path.join(__dirname, "../temp");
      await fs.mkdir(tempDir, { recursive: true });
      const filename = `qr_labels_${Date.now()}.pdf`;
      const tempPath = path.join(tempDir, filename);
      await fs.writeFile(tempPath, pdfBuffer);

      logger.info(`✅ QR Label PDF generated: ${filename}`);
      return tempPath;
    } catch (error) {
      logger.error("Label PDF generation error:", error);
      if (page) {
        try {
          await page.close();
        } catch (e) {}
      }
      throw error;
    } finally {
      this.isProcessing = false;
      if (this.requestQueue.length > 0) {
        const nextRequest = this.requestQueue.shift();
        this.generateLabelPDF(nextRequest.data).then(nextRequest.resolve).catch(nextRequest.reject);
      }
    }
  }

  /**
   * Generate QR label sheet as PNG image (for direct image printing)
   * @param {Object} data - { labels, labelWidthMm, labelHeightMm, gapMm }
   * @returns {Promise<string>} Path to generated PNG image
   */
  async generateLabelImage(data) {
    if (this.isProcessing) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ data, resolve, reject });
      });
    }

    this.isProcessing = true;
    let page = null;

    try {
      await this.init();
      this.templateCache.clear();

      const labelWidthMm = Number(data.labelWidthMm) || 23;
      const labelHeightMm = Number(data.labelHeightMm) || 24;
      const pageWidthMm = Number(data.pageWidthMm) || 85;
      const pageHeightMm = Number(data.pageHeightMm) || 28;
      const pagePaddingX = Number(data.pagePaddingX) || 2;
      const pagePaddingY = Number(data.pagePaddingY) || 2;
      const gapMm = Number(data.gapMm) || pageWidthMm - 2 * pagePaddingX - 2 * labelWidthMm;

      const rows = [];
      (data.labels || []).forEach((l) => {
        const qty = Number(l.qty) || 1;
        for (let i = 0; i < qty; i++) {
          rows.push({ left: l, right: l });
        }
      });

      const rowsData = [];
      for (const row of rows) {
        const left = row.left || {};
        const right = row.right || left;
        const leftQrDataUrl = await this.generateQRDataUrl(String(left.kode || ""), 6);
        const rightQrDataUrl = await this.generateQRDataUrl(String(right.kode || left.kode || ""), 6);

        rowsData.push({
          left: {
            kode: left.kode || "",
            nama: left.nama || "",
            kadar: left.kadar || "",
            berat: left.berat || "",
            qrDataUrl: leftQrDataUrl,
          },
          right: {
            kode: right.kode || "",
            nama: right.nama || "",
            kadar: right.kadar || "",
            berat: right.berat || "",
            qrDataUrl: rightQrDataUrl,
          },
        });
      }

      const template = await this.loadTemplate("label-qr");
      const html = template({
        rows: rowsData,
        labelWidthMm,
        labelHeightMm,
        gapMm,
        pageWidthMm,
        pageHeightMm,
        pagePaddingX,
        pagePaddingY,
      });

      page = await this.browser.newPage();

      // Gunakan 300 DPI untuk rendering yang akurat pada thermal printer
      // 1 mm = 300/25.4 ≈ 11.81 pixels
      const DPI = 300;
      const mmToPixel = DPI / 25.4;
      const cssWidthPx = Math.round(pageWidthMm * mmToPixel);
      const cssHeightPx = Math.round(pageHeightMm * mmToPixel);

      await page.setViewport({
        width: cssWidthPx,
        height: cssHeightPx,
        deviceScaleFactor: 1.0,
      });

      await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });

      const sheet = await page.$(".sheet");
      if (!sheet) {
        throw new Error("Sheet element not found for QR label rendering");
      }

      const pngBuffer = await sheet.screenshot({ type: "png" });

      const tempDir = path.join(__dirname, "../temp");
      await fs.mkdir(tempDir, { recursive: true });
      const filename = `qr_labels_${Date.now()}.png`;
      const tempPath = path.join(tempDir, filename);
      await fs.writeFile(tempPath, pngBuffer);

      logger.info(`✅ QR Label image generated: ${filename}`);
      return tempPath;
    } catch (error) {
      logger.error("Label image generation error:", error);
      throw error;
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (e) {}
      }
      this.isProcessing = false;
      if (this.requestQueue.length > 0) {
        const nextRequest = this.requestQueue.shift();
        this.generateLabelImage(nextRequest.data).then(nextRequest.resolve).catch(nextRequest.reject);
      }
    }
  }

  /**
   * Cleanup browser and temp files
   */
  async cleanup() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        logger.info("Puppeteer browser closed");
      }

      // Clean old temp files (older than 1 hour)
      const tempDir = path.join(__dirname, "../temp");
      const files = await fs.readdir(tempDir);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      for (const file of files) {
        if (file.endsWith(".pdf")) {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);

          if (now - stats.mtimeMs > oneHour) {
            await fs.unlink(filePath);
            logger.info(`Cleaned up old temp file: ${file}`);
          }
        }
      }
    } catch (error) {
      logger.error("Cleanup error:", error);
    }
  }
}

module.exports = new PDFService();
