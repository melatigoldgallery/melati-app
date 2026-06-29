const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const Handlebars = require("handlebars");
const bwipjs = require("bwip-js");

// Try to safely load the loudness module
let loudness = null;
try {
  loudness = require("loudness");
} catch (e) {
  console.error("Failed to load loudness library. Master volume ducking will be disabled.", e);
}

// Handle self-signed certificates in local development (Vite dev server)
app.on("certificate-error", (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith("https://localhost:") || url.startsWith("https://127.0.0.1:")) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

let mainWindow = null;
let hiddenPrintWindow = null;

// Create main cashier window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Melati Gold Kasir App",
    icon: path.join(__dirname, "assets", "png.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load appropriate URL (dev server or Firebase production)
  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
  const startUrl = isDev 
    ? "https://localhost:5173" // Vite default HTTPS dev port
    : "https://melatigold.web.app";

  mainWindow.loadURL(startUrl);

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (hiddenPrintWindow) {
      hiddenPrintWindow.close();
      hiddenPrintWindow = null;
    }
  });
}

// Create reusable persistent hidden window for HTML printing
function createPrintWindow() {
  hiddenPrintWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });
}

app.whenReady().then(() => {
  createMainWindow();
  createPrintWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Audio Ducking state tracking
let originalVolume = null;
let originalMute = null;
let duckTimeout = null;

// Failsafe: Restore master volume when application is quitting
app.on("will-quit", async () => {
  try {
    if (loudness && originalVolume !== null) {
      await loudness.setVolume(originalVolume);
      await loudness.setMuted(originalMute);
    }
  } catch (err) {
    console.error("Failed to restore volume on quit:", err);
  }
});

// Helper: Validate caller origin
function validateOrigin(sender) {
  const url = sender.getURL();
  try {
    const parsed = new URL(url);
    const allowed = [
      "https://melatigold.web.app",
      "https://melatigoldgallery.github.io",
      "https://localhost:5173",
      "http://localhost:8080",
      "http://127.0.0.1:8080"
    ];
    
    const isAllowed = allowed.some(origin => {
      if (origin.startsWith("https://localhost:") || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
        return parsed.origin.startsWith(origin.split(":")[0]); // match protocol & host
      }
      return parsed.origin === origin;
    });

    return isAllowed;
  } catch (e) {
    return false;
  }
}

// Register Handlebars helpers
Handlebars.registerHelper("formatRupiah", (angka) => {
  if (!angka && angka !== 0) return "Rp 0";
  const number = typeof angka === "string" ? parseInt(angka.replace(/\./g, "")) : angka;
  return "Rp " + new Intl.NumberFormat("id-ID").format(number);
});

Handlebars.registerHelper("add", (a, b) => a + b);
Handlebars.registerHelper("eq", (a, b) => a === b);
Handlebars.registerHelper("statusLabel", (status) => {
  const labels = {
    nominal: "LUNAS",
    belum_lunas: "BELUM LUNAS",
    free: "GRATIS",
    custom: "CUSTOM"
  };
  return labels[status] || "LUNAS";
});

// Barcode & QR Helpers using bwip-js
async function generateBarcodeDataUrl(value) {
  if (!value || value === "-") return "";
  try {
    const pngBuffer = await bwipjs.toBuffer({
      bcid: "code128",
      text: String(value),
      scale: 2,
      height: 8,
      includetext: false
    });
    return `data:image/png;base64,${pngBuffer.toString("base64")}`;
  } catch (err) {
    console.error("Barcode generation failed:", err);
    return "";
  }
}

async function generateQRDataUrl(value) {
  if (!value) return "";
  try {
    const pngBuffer = await bwipjs.toBuffer({
      bcid: "qrcode",
      text: String(value),
      scale: 6,
      includetext: false
    });
    return `data:image/png;base64,${pngBuffer.toString("base64")}`;
  } catch (err) {
    console.error("QR generation failed:", err);
    return "";
  }
}

// PowerShell Raw & Image Printer commands (compiled pure-JS without binary dependencies)
function listPrinters() {
  return new Promise((resolve) => {
    exec(
      'powershell -Command "Get-CimInstance -ClassName Win32_Printer | Select-Object Name, Default, PrinterStatus | ConvertTo-Json"',
      (error, stdout) => {
        if (error || !stdout) {
          resolve([]);
          return;
        }
        try {
          const printers = JSON.parse(stdout);
          const printerArray = Array.isArray(printers) ? printers : [printers];
          const result = printerArray.map((p) => ({
            name: p.Name,
            isDefault: p.Default === true,
            status: p.PrinterStatus === 3 ? "Ready" : "Offline"
          }));
          resolve(result);
        } catch (e) {
          resolve([]);
        }
      }
    );
  });
}

function printRawPowerShell(printerName, rawData) {
  return new Promise((resolve, reject) => {
    try {
      const tempDir = path.join(app.getPath("temp"), "melati-print");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFile = path.join(tempDir, `receipt_${Date.now()}.prn`);
      const buffer = Buffer.from(rawData, "binary");
      fs.writeFileSync(tempFile, buffer, "binary");

      const psScriptFile = path.join(tempDir, `print_${Date.now()}.ps1`);
      const psScript = `
$ErrorActionPreference = "Stop"
try {
    $printer = Get-CimInstance -ClassName Win32_Printer | Where-Object { $_.Name -eq "${printerName}" }
    if (-not $printer) { exit 1 }
    $portName = $printer.PortName
    $filePath = "${tempFile.replace(/\\/g, "\\\\")}"
    
    if ($portName -match "^(USB|LPT|COM)") {
        Copy-Item -Path $filePath -Destination $portName -Force
        exit 0
    }
    
    # Fallback to .NET graphics text rendering
    Add-Type -AssemblyName System.Drawing
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $printDoc = New-Object System.Drawing.Printing.PrintDocument
    $printDoc.PrinterSettings.PrinterName = "${printerName}"
    $printDoc.add_PrintPage({
        param($sender, $ev)
        $font = New-Object System.Drawing.Font("Courier New", 8)
        $text = [System.Text.Encoding]::ASCII.GetString($bytes)
        $ev.Graphics.DrawString($text, $font, [System.Drawing.Brushes]::Black, 10, 10)
        $ev.HasMorePages = $false
    })
    $printDoc.Print()
} catch {
    exit 1
}
`;
      fs.writeFileSync(psScriptFile, psScript, "utf8");

      exec(`powershell -ExecutionPolicy Bypass -File "${psScriptFile}"`, (err, stdout, stderr) => {
        // Cleanup files
        try {
          if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
          if (fs.existsSync(psScriptFile)) fs.unlinkSync(psScriptFile);
        } catch (_) {}

        if (err) {
          reject(new Error("PowerShell RAW print failed: " + stderr));
        } else {
          resolve(true);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

// IPC Handlers
ipcMain.handle("get-printers", async (event) => {
  if (!validateOrigin(event.sender)) {
    throw new Error("Unauthorized IPC Call");
  }
  return await listPrinters();
});

ipcMain.handle("duck-audio", async (event, duration) => {
  if (!validateOrigin(event.sender)) {
    throw new Error("Unauthorized IPC Call");
  }
  
  if (!loudness) {
    console.warn("Loudness library is not available. Skipping ducking.");
    return { success: false, error: "Loudness library not loaded" };
  }

  try {
    if (duckTimeout) {
      clearTimeout(duckTimeout);
      duckTimeout = null;
    }

    if (originalVolume === null) {
      originalVolume = await loudness.getVolume();
      originalMute = await loudness.getMuted();
    }

    // Set master volume to 30% if not already muted
    if (!originalMute) {
      await loudness.setVolume(30);
    }

    // Set timeout as fallback
    duckTimeout = setTimeout(async () => {
      try {
        if (loudness && originalVolume !== null) {
          await loudness.setVolume(originalVolume);
          await loudness.setMuted(originalMute);
          originalVolume = null;
          originalMute = null;
        }
      } catch (err) {
        console.error("Failed to restore volume in timeout:", err);
      } finally {
        duckTimeout = null;
      }
    }, duration || 5000);

    return { success: true };
  } catch (err) {
    console.error("Failed to duck audio:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("unduck-audio", async (event) => {
  if (!validateOrigin(event.sender)) {
    throw new Error("Unauthorized IPC Call");
  }

  if (!loudness) {
    return { success: false, error: "Loudness library not loaded" };
  }

  try {
    if (duckTimeout) {
      clearTimeout(duckTimeout);
      duckTimeout = null;
    }

    if (originalVolume !== null) {
      await loudness.setVolume(originalVolume);
      await loudness.setMuted(originalMute);
      originalVolume = null;
      originalMute = null;
    }
    return { success: true };
  } catch (err) {
    console.error("Failed to unduck audio:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("print-job", async (event, { type, payload, printerName }) => {
  if (!validateOrigin(event.sender)) {
    return { success: false, error: "Unauthorized IPC caller origin" };
  }

  try {
    if (!printerName) {
      return { success: false, error: "Target printer name is required" };
    }

    // 1. Raw Text Receipt printing via ESC/POS Commands
    if (type === "receipt") {
      const rawText = generateReceiptText(payload);
      await printRawPowerShell(printerName, rawText);
      return { success: true };
    }

    // 2. Graphic HTML templates via hidden window
    let templateName = "";
    let dataForTemplate = { ...payload };
    let copiesCount = 1;

    if (type === "invoice") {
      templateName = "invoice.html";
      const normalizedItems = (payload.items || []).map((item) => ({
        code: item.kode || item.kodeText || item.code || "-",
        quantity: item.jumlah || item.quantity || 1,
        name: item.nama || item.name || "-",
        purity: item.kadar || item.purity || "-",
        weight: item.berat || (typeof item.weight === "string" ? item.weight.replace(" gr", "").trim() : item.weight) || "-",
        price: item.totalHarga || item.harga || item.price || 0
      }));
      const barcodeValue = String(normalizedItems[0]?.code || "").trim();
      const barcodeDataUrl = await generateBarcodeDataUrl(barcodeValue);
      const resolvedNotes = String(payload.notes || payload.keterangan || "").trim() ||
        (payload.items || []).map((item) => String(item.keterangan || item.notes || "").trim()).filter(Boolean).join("; ");

      dataForTemplate = {
        date: payload.tanggal || payload.date || "",
        customerName: payload.customerName || "",
        customerPhone: payload.customerPhone || "",
        sales: payload.sales || "Admin",
        total: payload.totalHarga || payload.total || 0,
        items: normalizedItems,
        barcodeDataUrl,
        barcodeValue,
        notes: resolvedNotes
      };
    } else if (type === "nota-servis") {
      templateName = "nota-servis.html";
      copiesCount = 2; // print two copies of nota-servis
      dataForTemplate.items = (payload.items || []).map(item => ({
        ...item,
        statusLabel: item.statusPembayaran === "nominal" ? "LUNAS" : 
                     item.statusPembayaran === "belum_lunas" ? "BELUM LUNAS" :
                     item.statusPembayaran === "free" ? "GRATIS" : "LUNAS"
      }));
    } else if (type === "nota-custom") {
      templateName = "nota-custom.html";
      copiesCount = 2; // print two copies of nota-custom
      dataForTemplate.items = (payload.items || []).map(item => ({
        ...item,
        statusLabel: item.statusPembayaran === "nominal" ? "LUNAS" : 
                     item.statusPembayaran === "belum_lunas" ? "BELUM LUNAS" :
                     item.statusPembayaran === "free" ? "GRATIS" : "LUNAS"
      }));
      const allItemsLunas = dataForTemplate.items.every(item => item.statusPembayaran === "nominal");
      dataForTemplate.dpLabel = allItemsLunas ? "LUNAS" : "DP";
    } else if (type === "qr-sbpl" || type === "qr-silver") {
      templateName = "label-qr.html";
      
      const labelWidthMm = Number(payload.labelWidthMm) || 23;
      const labelHeightMm = Number(payload.labelHeightMm) || 24;
      const pageWidthMm = Number(payload.pageWidthMm) || 85;
      const pageHeightMm = Number(payload.pageHeightMm) || 28;
      const pagePaddingX = Number(payload.pagePaddingX) || 2;
      const pagePaddingY = Number(payload.pagePaddingY) || 2;
      const gapMm = Number(payload.gapMm) || pageWidthMm - 2 * pagePaddingX - 2 * labelWidthMm;

      // Expand labels based on quantity
      const rowsData = [];
      const labelsList = [];
      (payload.labels || []).forEach(l => {
        const qty = Number(l.qty) || 1;
        for (let i = 0; i < qty; i++) {
          labelsList.push(l);
        }
      });

      for (const item of labelsList) {
        const leftQrDataUrl = await generateQRDataUrl(String(item.kode || ""));
        const rightQrDataUrl = leftQrDataUrl; // Identical duplicate labels on Left and Right

        rowsData.push({
          left: {
            kode: item.kode || "",
            nama: item.nama || "",
            kadar: item.kadar || "",
            berat: item.berat || "",
            qrDataUrl: leftQrDataUrl
          },
          right: {
            kode: item.kode || "",
            nama: item.nama || "",
            kadar: item.kadar || "",
            berat: item.berat || "",
            qrDataUrl: rightQrDataUrl
          }
        });
      }

      dataForTemplate = {
        rows: rowsData,
        labelWidthMm,
        labelHeightMm,
        gapMm,
        pageWidthMm,
        pageHeightMm,
        pagePaddingX,
        pagePaddingY
      };
    } else {
      return { success: false, error: "Unsupported print job type: " + type };
    }

    // Compile template using Handlebars
    const templatePath = path.join(__dirname, "templates", templateName);
    if (!fs.existsSync(templatePath)) {
      return { success: false, error: `Template file ${templateName} not found` };
    }
    const templateContent = fs.readFileSync(templatePath, "utf-8");
    const compiledTemplate = Handlebars.compile(templateContent);
    const htmlString = compiledTemplate(dataForTemplate);

    // Save to temp HTML file and load it in print window
    const tempHTMLPath = path.join(app.getPath("temp"), `print_${Date.now()}.html`);
    fs.writeFileSync(tempHTMLPath, htmlString, "utf-8");

    if (!hiddenPrintWindow) {
      createPrintWindow();
    }

    await hiddenPrintWindow.loadURL(`file://${tempHTMLPath}`);

    // Wait for window to load and perform silent print
    return new Promise((resolve) => {
      hiddenPrintWindow.webContents.once("did-finish-load", () => {
        hiddenPrintWindow.webContents.print({
          silent: true,
          printBackground: true,
          deviceName: printerName,
          copies: copiesCount
        }, (success, failureReason) => {
          // Cleanup temp file
          try {
            fs.unlinkSync(tempHTMLPath);
          } catch (_) {}

          if (success) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: "Print failure: " + failureReason });
          }
        });
      });
    });

  } catch (err) {
    console.error("Print job error:", err);
    return { success: false, error: err.message };
  }
});

// Simple plain text printer renderer for receipt (similar to printing-service/services/escposService.js)
function generateReceiptText(data) {
  const {
    items = [],
    totalHarga = 0,
    jumlahBayar = 0,
    kembalian = 0,
    sales = "",
    tanggal = "",
    metodeBayar = "tunai",
    nominalDP = 0,
    sisaPembayaran = 0,
    transactionType = "AKSESORIS"
  } = data;

  const metode = String(metodeBayar || "").toLowerCase();
  const totalNum = Number(totalHarga || 0) || 0;
  const bayarNum = Number(jumlahBayar || 0) || 0;
  const effectiveJumlahBayar = metode !== "dp" && metode !== "free" && bayarNum <= 0 ? totalNum : bayarNum;
  
  const kembalianNum = Number(kembalian);
  const effectiveKembalian = (metode !== "dp" && metode !== "free")
    ? (Number.isFinite(kembalianNum) && kembalianNum >= 0 ? kembalianNum : Math.max(0, effectiveJumlahBayar - totalNum))
    : 0;

  const width = 38; // character column width for 76/80mm paper

  const centerText = (text) => {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return " ".repeat(padding) + text + "\n";
  };

  const padLine = (left, right) => {
    const rightMargin = 4;
    const maxWidth = width - rightMargin;
    const spaces = Math.max(1, maxWidth - left.length - right.length);
    return left + " ".repeat(spaces) + right + "\n";
  };

  const formatRupiah = (angka) => {
    if (!angka && angka !== 0) return "Rp 0";
    const number = typeof angka === "string" ? parseInt(angka.replace(/\./g, "")) : angka;
    return "Rp " + new Intl.NumberFormat("id-ID").format(number);
  };

  let output = "";
  output += "\n";
  output += centerText("==================================");
  output += centerText("M E L A T I   3");
  output += centerText("JL. DIPONEGORO NO. 116");
  output += centerText("NOTA PENJUALAN " + transactionType);
  output += centerText("==================================");
  output += "\n";

  output += "Tanggal: " + tanggal + "\n";
  output += "Sales  : " + sales + "\n";
  output += "==================================\n";

  let hasKeterangan = false;
  let keteranganText = "";

  items.forEach((item, index) => {
    const isLastItem = index === items.length - 1;
    const namaBarang = (item.nama || item.kode || "Item").toUpperCase();
    output += namaBarang + "\n\n";

    const kode = item.kode || item.kodeText || "-";
    const kadar = item.kadar || "-";
    const berat = item.berat ? item.berat + "gr" : "-";
    const harga = formatRupiah(item.totalHarga || item.harga || 0);

    const detailBarang = `${kode}|${kadar}|${berat}|`;
    output += padLine(detailBarang, harga);
    output += "\n";

    if (!isLastItem) {
      output += "- - - - - - - - - - - - - - - - - -\n";
    }

    if (item.keterangan && item.keterangan.trim() !== "") {
      hasKeterangan = true;
      keteranganText += item.keterangan + " ";
    }
  });

  output += "==================================\n";
  output += padLine("TOTAL:", formatRupiah(totalHarga));
  output += "==================================\n";

  if (metode === "dp") {
    const dpAmount = parseInt(nominalDP || 0);
    const total = parseInt(totalHarga || 0);
    output += padLine("Total Harga:", formatRupiah(total));
    output += padLine("DP:", formatRupiah(dpAmount));
    if (dpAmount >= total) {
      output += centerText("* * *  Lunas  * * *");
    } else {
      const sisa = parseInt(sisaPembayaran || 0);
      output += padLine("Sisa:", formatRupiah(sisa));
    }
  } else if (metode !== "free") {
    output += padLine("Bayar:", formatRupiah(effectiveJumlahBayar));
    if (effectiveKembalian > 0) {
      output += padLine("Kembalian:", formatRupiah(effectiveKembalian));
    }
  }

  output += "==================================\n";

  if (hasKeterangan) {
    output += "\n";
    output += "Keterangan: " + keteranganText.trim() + "\n";
    output += "==================================\n";
  }

  output += "\n";
  output += centerText("Terima Kasih");
  output += centerText("Atas Kunjungan Anda");
  output += "\n";
  output += centerText("==================================");
  output += "\n\n\n\n\n";

  return output;
}
