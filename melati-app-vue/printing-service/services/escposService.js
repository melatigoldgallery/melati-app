const logger = require("../utils/logger");

class ESCPOSService {
  constructor() {
    // ESC/POS command constants
    this.ESC = "\x1B";
    this.GS = "\x1D";
  }

  /**
   * Generate plain text receipt for TM-U220
   * @param {Object} data - Receipt data
   * @returns {string} Plain text receipt
   */
  generateReceiptCommands(data) {
    const {
      items = [],
      totalHarga = 0,
      jumlahBayar = 0,
      kembalian = 0,
      sales = "",
      tanggal = "",
      jam = "",
      metodeBayar = "tunai",
      nominalDP = 0,
      sisaPembayaran = 0,
      transactionType = "AKSESORIS",
    } = data;

    const metode = String(metodeBayar || "").toLowerCase();
    const totalNum = Number(totalHarga || 0) || 0;
    const bayarNum = Number(jumlahBayar || 0) || 0;
    const effectiveJumlahBayar = metode !== "dp" && metode !== "free" && bayarNum <= 0 ? totalNum : bayarNum;
    const kembalianNum = Number(kembalian);
    const effectiveKembalian =
      metode !== "dp" && metode !== "free"
        ? Number.isFinite(kembalianNum) && kembalianNum >= 0
          ? kembalianNum
          : Math.max(0, effectiveJumlahBayar - totalNum)
        : 0;

    let output = "";
    const width = 38; // Character width for 76mm paper

    // Helper function to center text
    const centerText = (text) => {
      const padding = Math.max(0, Math.floor((width - text.length) / 2));
      return " ".repeat(padding) + text + "\n";
    };

    // Helper function to pad line with right margin
    const padLine = (left, right) => {
      const rightMargin = 4; // Margin from right edge
      const maxWidth = width - rightMargin;
      const spaces = Math.max(1, maxWidth - left.length - right.length);
      return left + " ".repeat(spaces) + right + "\n";
    };

    // Header - Centered
    output += "\n";
    output += centerText("==================================");
    output += centerText("M E L A T I   3");
    output += centerText("JL. DIPONEGORO NO. 116");
    output += centerText("NOTA PENJUALAN " + transactionType);
    output += centerText("==================================");
    output += "\n";

    // Transaction info
    output += "Tanggal: " + tanggal + "\n";
    output += "Sales  : " + sales + "\n";
    output += "==================================\n";

    // Items
    let hasKeterangan = false;
    let keteranganText = "";

    items.forEach((item, index) => {
      const isLastItem = index === items.length - 1;

      // Nama barang (uppercase)
      const namaBarang = (item.nama || item.kode || "Item").toUpperCase();
      output += namaBarang + "\n\n";

      // Detail barang
      const kode = item.kode || item.kodeText || "-";
      const kadar = item.kadar || "-";
      const berat = item.berat ? item.berat + "gr" : "-";
      const harga = this.formatRupiah(item.totalHarga || item.harga || 0);

      const detailBarang = kode + "|" + kadar + "|" + berat + `|`;
      output += padLine(detailBarang, harga);
      output += "\n";

      // Separator
      if (!isLastItem) {
        output += "- - - - - - - - - - - - - - - - - -\n";
      }

      // Collect keterangan
      if (item.keterangan && item.keterangan.trim() !== "") {
        hasKeterangan = true;
        keteranganText += item.keterangan + " ";
      }
    });

    output += "==================================\n";

    // Total
    output += padLine("TOTAL:", this.formatRupiah(totalHarga));
    output += "==================================\n";
    // Payment details
    if (metode === "dp") {
      const dpAmount = parseInt(nominalDP || 0);
      const total = parseInt(totalHarga || 0);

      output += padLine("Total Harga:", this.formatRupiah(total));
      output += padLine("DP:", this.formatRupiah(dpAmount));

      if (dpAmount >= total) {
        output += centerText("* * *  Lunas  * * *");
      } else {
        const sisa = parseInt(sisaPembayaran || 0);
        output += padLine("Sisa:", this.formatRupiah(sisa));
      }
    } else if (metode !== "free") {
      output += padLine("Bayar:", this.formatRupiah(effectiveJumlahBayar));
      if (effectiveKembalian > 0) {
        output += padLine("Kembalian:", this.formatRupiah(effectiveKembalian));
      }
    }

    output += "==================================\n";

    // Keterangan
    if (hasKeterangan) {
      output += "\n";
      output += "Keterangan: " + keteranganText.trim() + "\n";
      output += "==================================\n";
    }

    // Footer - Centered
    output += "\n";
    output += centerText("Terima Kasih");
    output += centerText("Atas Kunjungan Anda");
    output += "\n";
    output += centerText("==================================");
    output += "\n\n\n\n\n";

    return output;
  }

  /**
   * Generate queue ticket formatted with ESC/POS large font commands
   * @param {Object} data - Queue ticket data
   * @returns {string} Queue ticket commands
   */
  generateQueueCommands(data) {
    const {
      queueNumber = "",
      queueType = "",
      dateStr = "",
      timeStr = "",
      floor = "L1",
      lang = "id",
    } = data;

    const isEn = lang === "en";
    const width = 38; // Character width for 76mm paper

    // Helper function to left-align text
    const leftAlignText = (text) => {
      return text + "\n";
    };

    // ESC/POS command shortcuts (Safe basic select mode)
    const ESC = "\x1B";
    const INIT = ESC + "@";

    const TEXT_LARGE_BOLD = ESC + "!\x38"; // Double height + Double width + Bold
    const TEXT_NORMAL = ESC + "!\x00";
    const BOLD_ON = ESC + "E\x01";
    const BOLD_OFF = ESC + "E\x00";

    let output = "";

    // 1. Initialize
    output += INIT;

    // 2. Header
    output += leftAlignText("==================================");
    output += BOLD_ON + leftAlignText("M E L A T I   G O L D   S H O P") + BOLD_OFF;
    output += leftAlignText("==================================");
    output += "\n";

    // 3. Floor Display
    let floorLabel = "";
    if (floor === "L2") {
      floorLabel = isEn ? "* * 2ND FLOOR * *" : "* * LANTAI 2 * *";
    } else {
      floorLabel = isEn ? "* * 1ST FLOOR * *" : "* * LANTAI 1 * *";
    }
    output += BOLD_ON + leftAlignText(floorLabel) + BOLD_OFF;
    output += "\n";

    // 4. Ticket Title
    const titleLabel = isEn ? "YOUR QUEUE NUMBER" : "NOMOR ANTRIAN ANDA";
    output += BOLD_ON + leftAlignText(titleLabel) + BOLD_OFF;
    output += "\n";

    // 5. Large Queue Number (Regular text scaled with ESC/POS command)
    output += leftAlignText("--------------------------------");
    output += TEXT_LARGE_BOLD + leftAlignText(queueNumber).trimEnd() + "\n" + TEXT_NORMAL;
    output += leftAlignText("--------------------------------");
    output += "\n";

    // 6. Queue Type
    let displayQueueType = queueType;
    if (isEn) {
      if (queueType.toLowerCase().includes("jual")) {
        displayQueueType = "Sell Jewelry";
      } else if (queueType.toLowerCase().includes("beli")) {
        displayQueueType = "Buy / Trade-In";
      }
    }
    output += leftAlignText(displayQueueType.toUpperCase());

    const timeLabel = isEn ? "Time" : "Waktu";
    output += leftAlignText(timeLabel + ": " + dateStr + " " + timeStr);
    output += "\n";

    // 7. Notes (Left aligned for standard paragraph formatting)
    output += "--------------------------------------\n";
    if (isEn) {
      output += "NOTES:\n";
      output += "- If your queue is missed by more than\n";
      output += "  10 numbers, please take a new one\n";
      output += "- If it is less than 10 numbers, please\n";
      output += "  confirm with staff to be called next\n";
    } else {
      output += "CATATAN:\n";
      output += "- Jika antrian terlewat melebihi 10\n";
      output += "  nomor antrian maka ambil antrian baru\n";
      output += "- Jika belum melebihi 10 nomor silakan\n";
      output += "  konfirmasi ke staff untuk dipanggil\n";
      output += "  di antrian selanjutnya\n";
    }
    output += "--------------------------------------\n\n";

    // 8. Footer (Left-aligned, under notes section)
    if (isEn) {
      output += leftAlignText("Please wait for your queue");
      output += leftAlignText("number to be called.");
      output += leftAlignText("Thank you for your visit.");
    } else {
      output += leftAlignText("Harap menunggu nomor antrian");
      output += leftAlignText("anda dipanggil.");
      output += leftAlignText("Terima kasih atas kunjungan Anda.");
    }

    // 9. Space spacing to push ticket through tear-off bar
    output += "\n\n\n\n\n\n";

    return output;
  }

  /**
   * Format rupiah currency
   * @param {number} angka - Amount
   * @returns {string} Formatted currency
   */
  formatRupiah(angka) {
    if (!angka && angka !== 0) return "Rp 0";
    const number = typeof angka === "string" ? parseInt(angka.replace(/\./g, "")) : angka;
    return "Rp " + new Intl.NumberFormat("id-ID").format(number);
  }

  /**
   * Format payment method label
   * @param {string} metode - Payment method
   * @returns {string} Formatted label
   */
  formatMetodeBayar(metode) {
    const mapping = {
      tunai: "Tunai",
      dp: "Down Payment (DP)",
      free: "Gratis",
    };
    return mapping[metode] || metode;
  }
}

module.exports = new ESCPOSService();
