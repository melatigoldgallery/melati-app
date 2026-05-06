const printerService = require("../services/printerService");
const escposService = require("../services/escposService");
const pdfService = require("../services/pdfService");
const sbplService = require("../services/sbplService");
const printQueue = require("../services/printQueue");
const logger = require("../utils/logger");
const fs = require("fs").promises;

class PrintController {
  expandLabelsByQty(labels = []) {
    const expanded = [];

    for (const label of labels) {
      const qty = Math.max(1, Number(label?.qty) || 1);
      for (let index = 0; index < qty; index++) {
        expanded.push({
          ...label,
          qty: 1,
        });
      }
    }

    return expanded;
  }

  /**
   * Print thermal receipt (with queue)
   */
  async printReceipt(req, res) {
    try {
      const receiptData = req.body;

      // Validate data
      if (!receiptData.items || receiptData.items.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No items to print",
        });
      }

      logger.info(`Receipt print request: ${receiptData.items.length} items`);
      logger.info(`Receipt data received:`, JSON.stringify(receiptData, null, 2));

      // Get thermal printer
      const printerName = printerService.getPrinterForType("receipt");

      // Check if printer is available
      const isAvailable = await printerService.isPrinterAvailable(printerName);
      if (!isAvailable) {
        return res.status(404).json({
          success: false,
          error: `Printer not found: ${printerName}`,
        });
      }

      // Generate ESC/POS commands
      const commands = escposService.generateReceiptCommands(receiptData);

      // Add to queue instead of direct print (returns jobID immediately)
      const jobID = printQueue.addJob(
        printerName,
        async () => {
          return await printerService.printRaw(printerName, commands);
        },
        {
          type: "receipt",
          itemCount: receiptData.items.length,
        },
      );

      // Get job info immediately
      const queueStatus = printQueue.getQueueStatus(printerName);

      logger.info(`✅ Receipt job ${jobID} queued for ${printerName}`);
      logger.info(`📊 Queue status: ${queueStatus.queueLength} job(s) waiting, printer is ${queueStatus.status}`);

      // Return immediately with job info (don't wait for print to complete)
      res.json({
        success: true,
        jobID: jobID,
        printer: printerName,
        queueStatus: queueStatus,
        message: "Receipt queued for printing",
      });
    } catch (error) {
      logger.error("Print receipt error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Print A4 invoice (with queue)
   */
  async printInvoice(req, res) {
    try {
      const invoiceData = req.body;

      // Validate data
      if (!invoiceData.items || invoiceData.items.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No items to print",
        });
      }

      logger.info(`Invoice print request: ${invoiceData.items.length} items`);

      // Generate invoice number if not provided
      if (!invoiceData.invoiceNumber) {
        invoiceData.invoiceNumber = `INV-${Date.now()}`;
      }

      // Get inkjet printer
      const printerName = printerService.getPrinterForType("invoice");

      // Check if printer is available
      const isAvailable = await printerService.isPrinterAvailable(printerName);
      if (!isAvailable) {
        return res.status(404).json({
          success: false,
          error: `Printer not found: ${printerName}`,
        });
      }

      // Generate PDF first (outside queue to avoid delay)
      const pdfPath = await pdfService.generateInvoicePDF(invoiceData);
      logger.info(`📄 PDF generated: ${pdfPath}`);

      // Add to queue (returns jobID immediately)
      const jobID = printQueue.addJob(
        printerName,
        async () => {
          try {
            // Print PDF
            const printJobID = await printerService.printPDF(printerName, pdfPath);

            // Schedule PDF cleanup after successful print (10 seconds delay for safety)
            setTimeout(async () => {
              try {
                await fs.unlink(pdfPath);
                logger.info(`🧹 Cleaned up PDF: ${pdfPath}`);
              } catch (error) {
                logger.error("Error cleaning up PDF:", error);
              }
            }, 10000);

            return { printJobID, pdfPath };
          } catch (error) {
            // Cleanup PDF on error
            try {
              await fs.unlink(pdfPath);
            } catch (cleanupError) {
              logger.error("Error cleaning up PDF after error:", cleanupError);
            }
            throw error;
          }
        },
        {
          type: "invoice",
          invoiceNumber: invoiceData.invoiceNumber,
          itemCount: invoiceData.items.length,
          pdfPath: pdfPath,
        },
      );

      // Get queue status
      const queueStatus = printQueue.getQueueStatus(printerName);

      logger.info(`✅ Invoice job ${jobID} queued for ${printerName}`);
      logger.info(`📊 Queue status: ${queueStatus.queueLength} job(s) waiting, printer is ${queueStatus.status}`);

      res.json({
        success: true,
        jobID: jobID,
        printer: printerName,
        invoiceNumber: invoiceData.invoiceNumber,
        queueStatus: queueStatus,
        message: "Invoice queued for printing",
      });
    } catch (error) {
      logger.error("Print invoice error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Print QR labels for silver (PDF per job) and enqueue
   */
  async printQrSilver(req, res) {
    try {
      const data = req.body;

      if (!data || !Array.isArray(data.labels) || data.labels.length === 0) {
        return res.status(400).json({ success: false, error: "No labels provided" });
      }

      logger.info(`QR-silver print request: ${data.labels.length} label(s)`);

      // Always follow configured label printer for QR silver
      const printerName = printerService.getPrinterForType("label");

      const isAvailable = await printerService.isPrinterAvailable(printerName);
      if (!isAvailable) {
        return res.status(404).json({ success: false, error: `Printer not found: ${printerName}` });
      }

      // Ensure dimensions/defaults for SATO CG408 if not provided
      data.labelWidthMm = Number(data.labelWidthMm) || 23;
      data.labelHeightMm = Number(data.labelHeightMm) || 24;
      data.pageWidthMm = Number(data.pageWidthMm) || 85;
      data.pageHeightMm = Number(data.pageHeightMm) || 28;
      data.pagePaddingX = Number(data.pagePaddingX) || 2;
      data.pagePaddingY = Number(data.pagePaddingY) || 2;
      if (!data.gapMm) data.gapMm = data.pageWidthMm - 2 * data.pagePaddingX - 2 * data.labelWidthMm;

      const labelsToPrint = this.expandLabelsByQty(data.labels);
      if (!labelsToPrint.length) {
        return res.status(400).json({ success: false, error: "No printable labels after qty expansion" });
      }

      const labelWidthMm = Number(data?.labelWidthMm) || 23;
      const labelHeightMm = Number(data?.labelHeightMm) || 24;
      const gapMm = Number(data?.gapMm) || data.pageWidthMm - 2 * data.pagePaddingX - 2 * labelWidthMm;
      const pageWidthMm = Number(data?.pageWidthMm) || data.pageWidthMm || labelWidthMm * 2 + gapMm;

      const printJobIDs = [];
      for (const label of labelsToPrint) {
        const imagePath = await pdfService.generateLabelImage({
          ...data,
          labels: [{ ...label, qty: 1 }],
        });
        logger.info(`Generated label image: ${imagePath}`);

        const jobID = printQueue.addJob(
          printerName,
          async () => {
            const printJobID = await printerService.printImage(printerName, imagePath, {
              paperWidthMm: pageWidthMm,
              paperHeightMm: pageHeightMm || labelHeightMm,
            });

            setTimeout(async () => {
              try {
                await fs.unlink(imagePath);
                logger.info(`🧹 Cleaned up QR image: ${imagePath}`);
              } catch (err) {
                logger.error("Error cleaning up QR image:", err.message || err);
              }
            }, 10000);

            return { printJobID, imagePath };
          },
          { type: "qr-silver", itemCount: 1 },
        );

        printJobIDs.push(jobID);
      }

      const queueStatus = printQueue.getQueueStatus(printerName);

      res.json({
        success: true,
        jobID: printJobIDs[0],
        jobIDs: printJobIDs,
        printer: printerName,
        queueStatus,
        message: "QR labels queued for printing",
      });
    } catch (error) {
      logger.error("Print QR Silver error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Print QR labels using SBPL (native SATO command format)
   * ⚡ 10-50x faster than image-based printing
   * 💚 Minimal resource usage (no Puppeteer/Chrome required)
   * ✅ Direct native printer support for SATO
   */
  async printQrSbpl(req, res) {
    try {
      const data = req.body;

      // Validate request
      if (!data || !Array.isArray(data.labels) || data.labels.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No labels provided",
        });
      }

      logger.info(`🚀 SBPL QR print request: ${data.labels.length} label type(s)`);
      logger.info(`📊 Label details:`, JSON.stringify(data.labels, null, 2));

      // Get label printer from config
      const printerName = printerService.getPrinterForType("label");

      // Verify printer availability
      const isAvailable = await printerService.isPrinterAvailable(printerName);
      if (!isAvailable) {
        return res.status(404).json({
          success: false,
          error: `Printer not found: ${printerName}`,
        });
      }

      // Ensure dimensions/defaults for SATO CG408 if not provided
      data.labelWidthMm = Number(data.labelWidthMm) || 23;
      data.labelHeightMm = Number(data.labelHeightMm) || 24;
      data.pageWidthMm = Number(data.pageWidthMm) || 85;
      data.pageHeightMm = Number(data.pageHeightMm) || 28;
      data.pagePaddingX = Number(data.pagePaddingX) || 2;
      data.pagePaddingY = Number(data.pagePaddingY) || 2;
      if (!data.gapMm) data.gapMm = data.pageWidthMm - 2 * data.pagePaddingX - 2 * data.labelWidthMm;

      const labelsToPrint = this.expandLabelsByQty(data.labels);
      if (!labelsToPrint.length) {
        return res.status(400).json({ success: false, error: "No printable labels after qty expansion" });
      }
      const printJobIDs = [];
      const labelWidthMm = Number(data.labelWidthMm) || 23;
      const labelHeightMm = Number(data.labelHeightMm) || 24;
      const gapMm = Number(data.gapMm) || data.pageWidthMm - 2 * data.pagePaddingX - 2 * labelWidthMm;
      const pageWidthMm = Number(data.pageWidthMm) || labelWidthMm * 2 + gapMm;

      for (const label of labelsToPrint) {
        const imagePath = await pdfService.generateLabelImage({
          ...data,
          labels: [{ ...label, qty: 1 }],
        });
        logger.info(`Generated label image: ${imagePath}`);

        const printJobID = await printerService.printImage(printerName, imagePath, {
          paperWidthMm: pageWidthMm,
          paperHeightMm: labelHeightMm,
        });

        printJobIDs.push(printJobID);

        setTimeout(async () => {
          try {
            await fs.unlink(imagePath);
            logger.info(`🧹 Cleaned up QR image: ${imagePath}`);
          } catch (err) {
            logger.error("Error cleaning up QR image:", err.message || err);
          }
        }, 10000);
      }

      logger.info(`✅ QR images sent successfully (${printJobIDs.length} job(s))`);

      res.json({
        success: true,
        jobID: printJobIDs[0],
        jobIDs: printJobIDs,
        printer: printerName,
        method: "IMAGE",
        performance: {
          estimatedSpeed: "image-mode",
        },
        message: "QR labels printed successfully",
      });
    } catch (error) {
      logger.error("❌ Print QR SBPL error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = new PrintController();
