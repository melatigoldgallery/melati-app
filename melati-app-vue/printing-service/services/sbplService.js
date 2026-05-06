/**
 * SBPL (SATO Printer Format Language) Service
 * Generates native SBPL commands for SATO thermal printers
 * Optimized for QR label printing on 24x24mm labels
 */

const logger = require("../utils/logger");

class SBPLService {
  /**
   * Generate SBPL commands for QR label
   * @param {string} kode - Item code (barcode value)
   * @param {string} nama - Item name
   * @param {string} kadar - Purity/grade (optional)
   * @param {string} berat - Weight (optional)
   * @returns {string} SBPL command string
   */
  generateQRLabel(kode, nama = "", kadar = "", berat = "") {
    const trimKode = (kode || "").trim().toUpperCase();
    const trimNama = (nama || "").trim().substring(0, 20); // Max 20 chars for display
    const trimKadar = (kadar || "").trim().substring(0, 10);
    const trimBerat = (berat || "").trim().substring(0, 10);

    // SBPL Command for 24x24mm QR label (300 DPI = 283x283 dots)
    const sbpl = `SBPL
^XA
^MMT
^PW576
^LL289
^LS0
^FT288,60^BCN,100,Y,N,N,N
^FD${trimKode}^FS
^FT30,200^A0N,18,20
^FD${trimNama}^FS
^FT30,230^A0N,14,16
^FD${trimKadar}${trimBerat ? " / " + trimBerat + "g" : ""}^FS
^XZ
`;

    return sbpl;
  }

  /**
   * Generate batch SBPL commands for multiple QR labels
   * Each label is repeated by qty times
   * @param {Array} labels - Array of { kode, nama, kadar, berat, qty }
   * @returns {string} Full SBPL batch command
   */
  generateBatchQRLabels(labels) {
    if (!Array.isArray(labels) || labels.length === 0) {
      throw new Error("Invalid labels array");
    }

    let batchSbpl = "";

    for (const label of labels) {
      const qty = Number(label.qty) || 1;

      // Repeat label command for each qty
      for (let i = 0; i < qty; i++) {
        batchSbpl += this.generateQRLabel(label.kode, label.nama, label.kadar, label.berat);
      }
    }

    logger.info(`Generated SBPL batch with ${labels.length} label type(s)`);
    return batchSbpl;
  }

  /**
   * Validate SBPL command format
   * @param {string} sbplCommand - SBPL command to validate
   * @returns {boolean} True if valid SBPL format
   */
  isValidSBPLCommand(sbplCommand) {
    if (!sbplCommand || typeof sbplCommand !== "string") return false;

    // Check for SBPL header and footer
    return sbplCommand.includes("^XA") && sbplCommand.includes("^XZ");
  }

  /**
   * Calculate label size in dots (300 DPI)
   * 1 mm = 11.81 dots at 300 DPI
   * @param {number} widthMm - Label width in mm
   * @param {number} heightMm - Label height in mm
   * @returns {Object} { widthDots, heightDots }
   */
  calculateLabelDots(widthMm = 24, heightMm = 24) {
    const DPI_RATIO = 300 / 25.4; // 11.81 dots per mm
    return {
      widthDots: Math.round(widthMm * DPI_RATIO),
      heightDots: Math.round(heightMm * DPI_RATIO),
    };
  }

  /**
   * Get SBPL command format info for logging
   * @param {string} sbplCommand - SBPL command
   * @returns {Object} Command info
   */
  getCommandInfo(sbplCommand) {
    const lines = sbplCommand.split("\n").filter((l) => l.trim());
    const hasQRCode = sbplCommand.includes("^BC");
    const hasBarcode = sbplCommand.includes("^BA");

    return {
      lineCount: lines.length,
      size: sbplCommand.length,
      hasQRCode,
      hasBarcode,
      format: "SBPL",
    };
  }
}

module.exports = new SBPLService();
