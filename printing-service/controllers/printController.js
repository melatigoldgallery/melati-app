const printerService = require("../services/printerService");
const escposService = require("../services/escposService");
const pdfService = require("../services/pdfService");
const logger = require("../utils/logger");
const fs = require("fs").promises;

class PrintController {
  /**
   * Print thermal receipt
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

      // Generate ESC/POS commands
      const commands = escposService.generateReceiptCommands(receiptData);

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

      // Print
      const jobID = await printerService.printRaw(printerName, commands);

      logger.info(`✅ Receipt printed successfully: Job ${jobID}`);

      res.json({
        success: true,
        jobID,
        printer: printerName,
        message: "Receipt sent to printer",
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
   * Print A4 invoice
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

      // Generate PDF
      const pdfPath = await pdfService.generateInvoicePDF(invoiceData);

      // Get inkjet printer
      const printerName = printerService.getPrinterForType("invoice");

      // Check if printer is available
      const isAvailable = await printerService.isPrinterAvailable(printerName);
      if (!isAvailable) {
        // Cleanup PDF
        await fs.unlink(pdfPath).catch(() => {});

        return res.status(404).json({
          success: false,
          error: `Printer not found: ${printerName}`,
        });
      }

      // Print PDF
      const jobID = await printerService.printPDF(printerName, pdfPath);

      // Schedule PDF cleanup (5 seconds after printing)
      setTimeout(async () => {
        try {
          await fs.unlink(pdfPath);
          logger.info(`Cleaned up PDF: ${pdfPath}`);
        } catch (error) {
          logger.error("Error cleaning up PDF:", error);
        }
      }, 5000);

      logger.info(`✅ Invoice printed successfully: Job ${jobID}`);

      res.json({
        success: true,
        jobID,
        printer: printerName,
        invoiceNumber: invoiceData.invoiceNumber,
        message: "Invoice sent to printer",
      });
    } catch (error) {
      logger.error("Print invoice error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = new PrintController();
