const printerService = require("../services/printerService");
const escposService = require("../services/escposService");
const pdfService = require("../services/pdfService");
const sbplService = require("../services/sbplService");
const printQueue = require("../services/printQueue");
const logger = require("../utils/logger");
const fs = require("fs").promises;

class PrintController {
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

      // Generate PNG image for all requested labels (expanded by qty)
      const imagePath = await pdfService.generateLabelImage(data);
      logger.info(`Generated label image: ${imagePath}`);

      // Enqueue print job
      const jobID = printQueue.addJob(
        printerName,
        async () => {
          const printJobID = await printerService.printImage(printerName, imagePath, {
            paperWidthMm: 98,
            paperHeightMm: 24,
          });

          // Schedule image cleanup
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
        { type: "qr-silver", itemCount: data.labels.length },
      );

      const queueStatus = printQueue.getQueueStatus(printerName);

      res.json({ success: true, jobID, printer: printerName, queueStatus, message: "QR labels queued for printing" });
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

      // Generate SBPL batch commands (native printer format)
      const sbplCommand = sbplService.generateBatchQRLabels(data.labels);

      // Validate SBPL command
      if (!sbplService.isValidSBPLCommand(sbplCommand)) {
        return res.status(400).json({
          success: false,
          error: "Invalid SBPL command generated",
        });
      }

      const cmdInfo = sbplService.getCommandInfo(sbplCommand);
      logger.info(`📋 SBPL Command generated:`, cmdInfo);

      // Add to print queue
      const jobID = printQueue.addJob(
        printerName,
        async () => {
          try {
            logger.info(`⏳ Sending SBPL command to printer: ${printerName}`);
            logger.info(`Command size: ${sbplCommand.length} bytes`);

            // Send SBPL command directly to printer (raw)
            const printJobID = await printerService.printRaw(printerName, sbplCommand);

            logger.info(`✅ SBPL command sent successfully`);
            return { printJobID, method: "SBPL", commandSize: sbplCommand.length };
          } catch (error) {
            logger.error("❌ Error sending SBPL command:", error.message);
            throw new Error(`Failed to send SBPL command: ${error.message}`);
          }
        },
        {
          type: "qr-sbpl",
          method: "SBPL",
          labelCount: data.labels.length,
          totalQty: data.labels.reduce((sum, l) => sum + (Number(l.qty) || 1), 0),
          commandSize: sbplCommand.length,
        },
      );

      const queueStatus = printQueue.getQueueStatus(printerName);

      logger.info(`✅ SBPL job ${jobID} queued successfully`);
      logger.info(`📊 Queue: ${queueStatus.queueLength} job(s), printer ${queueStatus.status}`);

      res.json({
        success: true,
        jobID,
        printer: printerName,
        method: "SBPL",
        queueStatus,
        performance: {
          commandSize: sbplCommand.length,
          estimatedSpeed: "100-200ms", // SBPL is much faster than image
        },
        message: "QR labels queued for SBPL printing (fast native mode)",
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
