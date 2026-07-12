const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

class PrinterService {
  constructor() {
    this.defaultPrinter = null;
    this.printers = [];
    this.initialize();
  }

  initialize() {
    try {
      // Get default printer using PowerShell
      exec(
        'powershell -Command "Get-CimInstance -ClassName Win32_Printer | Where-Object {$_.Default -eq $true} | Select-Object -ExpandProperty Name"',
        (error, stdout) => {
          if (!error && stdout) {
            this.defaultPrinter = stdout.trim();
            logger.info(`Default printer: ${this.defaultPrinter}`);
          }
        },
      );
    } catch (error) {
      logger.error("Error getting default printer:", error);
    }
  }

  /**
   * Read printer config fresh from disk (avoid stale require cache)
   * @returns {Object}
   */
  readPrinterConfig() {
    try {
      const configPath = path.join(__dirname, "../config/printers.json");
      const raw = fs.readFileSync(configPath, "utf8");
      return JSON.parse(raw || "{}");
    } catch (error) {
      logger.error("Error reading printer config:", error);
      return {};
    }
  }

  /**
   * Get printer name for specific type
   * @param {string} type - 'receipt', 'invoice', 'label' or 'queue'
   * @returns {string} Printer name
   */
  getPrinterForType(type) {
    try {
      const config = this.readPrinterConfig();
      let printerName = config[type];

      // Fallback khusus untuk antrian
      if (!printerName && type === "queue") {
        printerName = config["receipt"] || this.defaultPrinter;
      } else if (!printerName) {
        printerName = this.defaultPrinter;
      }

      if (!printerName) {
        throw new Error("No printer configured for type: " + type);
      }

      return printerName;
    } catch (error) {
      logger.error(`Error getting printer for type ${type}:`, error);
      return this.defaultPrinter;
    }
  }

  /**
   * List all available printers
   * @returns {Array} List of printer objects
   */
  listPrinters() {
    return new Promise((resolve, reject) => {
      // Get printers using PowerShell
      exec(
        'powershell -Command "Get-CimInstance -ClassName Win32_Printer | Select-Object Name, Default, PrinterStatus | ConvertTo-Json"',
        (error, stdout, stderr) => {
          if (error) {
            logger.error("Error listing printers:", error);
            resolve([]);
            return;
          }

          try {
            const printers = JSON.parse(stdout);
            const printerArray = Array.isArray(printers) ? printers : [printers];

            this.printers = printerArray.map((p) => ({
              name: p.Name,
              isDefault: p.Default === true,
              status: p.PrinterStatus === 3 ? "Ready" : "Offline",
            }));

            logger.info(`Found ${this.printers.length} printers`);
            resolve(this.printers);
          } catch (parseError) {
            logger.error("Error parsing printer list:", parseError);
            resolve([]);
          }
        },
      );
    });
  }

  /**
   * Print raw data (for thermal printer with ESC/POS commands)
   * @param {string} printerName - Name of printer
   * @param {string} data - Raw print data
   * @returns {Promise<string>} Job ID
   */
  printRaw(printerName, data) {
    return new Promise((resolve, reject) => {
      try {
        logger.info(`Printing to ${printerName} (RAW mode)...`);

        // Save to temp file with binary encoding
        const tempDir = path.join(__dirname, "../temp");
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempFile = path.join(tempDir, `receipt_${Date.now()}.prn`);

        // Write as binary buffer to preserve ESC/POS commands
        const buffer = Buffer.from(data, "binary");
        fs.writeFileSync(tempFile, buffer, "binary");

        logger.info(`Temp file created: ${tempFile} (${buffer.length} bytes)`);

        // Create PowerShell script file to avoid escaping issues
        const psScriptFile = path.join(tempDir, `print_${Date.now()}.ps1`);
        const psScript = `
$ErrorActionPreference = "Stop"

try {
    # Get printer info
    $printer = Get-CimInstance -ClassName Win32_Printer | Where-Object { $_.Name -eq "${printerName}" }
    
    if (-not $printer) {
        Write-Host "ERROR: Printer ${printerName} not found"
        exit 1
    }
    
    $portName = $printer.PortName
    Write-Host "Printer: ${printerName}"
    Write-Host "Port: $portName"
    
    # Read file as binary
    $filePath = "${tempFile.replace(/\\/g, "\\")}"
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    Write-Host "File size: $($bytes.Length) bytes"
    
    # Try direct copy to printer port (works for USB/LPT/COM ports)
    if ($portName -match "^(USB|LPT|COM)") {
        try {
            Copy-Item -Path $filePath -Destination $portName -Force
            Write-Host "SUCCESS: Sent RAW data via Copy-Item to $portName"
            exit 0
        } catch {
            Write-Host "Copy-Item failed: $_"
        }
    }
    
    # Fallback: Use .NET printing
    Add-Type -AssemblyName System.Drawing
    Add-Type -AssemblyName System.Windows.Forms
    
    $printDoc = New-Object System.Drawing.Printing.PrintDocument
    $printDoc.PrinterSettings.PrinterName = "${printerName}"
    
    # Simple print - just send as graphics/text
    $printDoc.add_PrintPage({
        param($sender, $ev)
        try {
            # Strip ESC/POS control sequences (including INIT ESC @) to prevent garbage characters
            $rawText = [System.Text.Encoding]::ASCII.GetString($bytes)
            $cleanText = $rawText -replace '\x1B@|\x1B.\x00|\x1B.\x01|\x1B.\x38|\x1B.\x30|\x1D.\x11|\x1D.\x00|\x1D.\x41.\x00', ''
            $text = $cleanText -replace '[\x00-\x08\x0B-\x0C\x0E-\x1F]', ''
            
            $lines = $text -split "\`r?\`n"
            $y = 10
            
            $centerFormat = New-Object System.Drawing.StringFormat
            $centerFormat.Alignment = [System.Drawing.StringAlignment]::Center
            
            $leftFormat = New-Object System.Drawing.StringFormat
            $leftFormat.Alignment = [System.Drawing.StringAlignment]::Near
            
            $printWidth = $ev.PageBounds.Width
            if ($printWidth -lt 100) { $printWidth = 280 }
            
            $inCatatan = $false
            foreach ($line in $lines) {
                $trimmedLine = $line.Trim()
                if ($trimmedLine.Length -eq 0 -and $line.Length -eq 0) {
                    $y += 12
                    continue
                }
                
                # State machine to detect Catatan section block
                if ($trimmedLine -like "*CATATAN:*" -or $trimmedLine -like "*NOTES:*") {
                    $inCatatan = $true
                }
                
                # Footer note centers, ending the Catatan block
                if ($trimmedLine -like "*Harap menunggu*" -or $trimmedLine -like "*Please wait*") {
                    $inCatatan = $false
                }
                
                $fontFamily = "Courier New"
                $fontSize = 8.5
                $fontStyle = [System.Drawing.FontStyle]::Regular
                
                # Check for bold elements (Headers, Floor, Titles)
                if ($trimmedLine -like "*M E L A T I*" -or $trimmedLine -like "*LANTAI*" -or $trimmedLine -like "*FLOOR*" -or $trimmedLine -like "*NOMOR ANTRIAN*" -or $trimmedLine -like "*YOUR QUEUE*") {
                    $fontStyle = [System.Drawing.FontStyle]::Bold
                    $fontSize = 10
                }
                
                # Check for queue number
                $isQueueNum = $trimmedLine -match "^[A-F][0-9]{2}$"
                if ($isQueueNum) {
                    $fontStyle = [System.Drawing.FontStyle]::Bold
                    $fontSize = 24
                }
                
                # Align everything to the left
                $format = $leftFormat
                $textToDraw = if ($inCatatan) { $line } else { $trimmedLine }
                
                # If we are drawing the closing divider, end the Catatan block after this line
                if ($inCatatan -and $trimmedLine -eq "--------------------------------------") {
                    $inCatatan = $false
                }
                
                $lineFont = New-Object System.Drawing.Font($fontFamily, $fontSize, $fontStyle)
                $lineHeight = if ($fontSize -eq 24) { 38 } else { 15 }
                
                $rect = New-Object System.Drawing.RectangleF(0, $y, $printWidth, $lineHeight)
                $ev.Graphics.DrawString($textToDraw, $lineFont, [System.Drawing.Brushes]::Black, $rect, $format)
                
                $y += $lineHeight
            }
            $ev.HasMorePages = $false
        } catch {
            Write-Host "Print page error: $_"
            $ev.HasMorePages = $false
        }
    })
    
    $printDoc.Print()
    Write-Host "SUCCESS: Print job sent via .NET"
    
} catch {
    Write-Host "ERROR: $_"
    exit 1
}
`;

        fs.writeFileSync(psScriptFile, psScript, "utf8");

        // Execute PowerShell script
        exec(
          `powershell -ExecutionPolicy Bypass -File "${psScriptFile}"`,
          { encoding: "utf8", maxBuffer: 1024 * 1024 },
          (error, stdout, stderr) => {
            logger.info(`PowerShell output: ${stdout}`);
            if (stderr) logger.warn(`PowerShell stderr: ${stderr}`);

            // Cleanup files after delay
            setTimeout(() => {
              try {
                if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                if (fs.existsSync(psScriptFile)) fs.unlinkSync(psScriptFile);
                logger.info(`Temp files cleaned up`);
              } catch (e) {
                logger.warn(`Cleanup warning: ${e.message}`);
              }
            }, 5000);

            if (error && !stdout.includes("SUCCESS")) {
              logger.error(`Print error: ${stderr || error.message}`);
              reject(new Error(stderr || error.message || "Print failed"));
              return;
            }

            const jobID = `RAW-${Date.now()}`;
            logger.info(`✅ Print job ${jobID} sent to ${printerName}`);
            resolve(jobID);
          },
        );
      } catch (error) {
        logger.error("Print raw error:", error);
        reject(error);
      }
    });
  }

  /**
   * Print PDF file (for A4 invoice)
   * @param {string} printerName - Name of printer
   * @param {string} pdfPath - Path to PDF file
   * @returns {Promise<string>} Job ID
   */
  printPDF(printerName, pdfPath) {
    return new Promise((resolve, reject) => {
      try {
        logger.info(`Printing PDF to ${printerName}: ${pdfPath}`);

        // Try pdf-to-printer package first (if installed)
        try {
          const ptp = require("pdf-to-printer");

          ptp
            .print(pdfPath, { printer: printerName })
            .then(() => {
              const jobID = `PDF-${Date.now()}`;
              logger.info(`✅ PDF print job ${jobID} sent to ${printerName}`);
              resolve(jobID);
            })
            .catch((err) => {
              logger.warn("pdf-to-printer failed, trying alternative method:", err.message);
              this.printPDFAlternative(printerName, pdfPath, resolve, reject);
            });
        } catch (requireError) {
          // pdf-to-printer not installed, use alternative
          logger.info("pdf-to-printer not available, using PowerShell method");
          this.printPDFAlternative(printerName, pdfPath, resolve, reject);
        }
      } catch (error) {
        logger.error("Print PDF error:", error);
        reject(error);
      }
    });
  }

  /**
   * Alternative PDF printing using PowerShell
   */
  printPDFAlternative(printerName, pdfPath, resolve, reject) {
    // Method 1: Use Adobe Reader command line (if installed)
    const adobePath = "C:\\Program Files\\Adobe\\Acrobat DC\\Acrobat\\Acrobat.exe";
    const adobeAltPath = "C:\\Program Files (x86)\\Adobe\\Acrobat Reader DC\\Reader\\AcroRd32.exe";

    let printCommand = "";

    if (fs.existsSync(adobePath)) {
      printCommand = `"${adobePath}" /t "${pdfPath}" "${printerName}"`;
    } else if (fs.existsSync(adobeAltPath)) {
      printCommand = `"${adobeAltPath}" /t "${pdfPath}" "${printerName}"`;
    } else {
      // Method 2: Use Edge for printing (Windows built-in)
      printCommand = `start msedge --headless --print-to-printer="${printerName}" "${pdfPath}"`;
    }

    exec(printCommand, (error, stdout, stderr) => {
      if (error) {
        logger.error(`PDF print error: ${stderr || error.message}`);
        reject(new Error(stderr || error.message));
        return;
      }

      const jobID = `PDF-${Date.now()}`;
      logger.info(`✅ PDF print job ${jobID} sent to ${printerName}`);
      resolve(jobID);
    });
  }

  /**
   * Print an image file using .NET PrintDocument with exact page sizing
   * @param {string} printerName
   * @param {string} imagePath
   * @param {Object} options
   * @returns {Promise<string>}
   */
  printImage(printerName, imagePath, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        logger.info(`Printing image to ${printerName}: ${imagePath}`);

        const paperWidthMm = Number(options.paperWidthMm) || 83;
        const paperHeightMm = Number(options.paperHeightMm) || 24;
        const paperWidthHundredthsInch = Math.max(1, Math.round((paperWidthMm / 25.4) * 100));
        const paperHeightHundredthsInch = Math.max(1, Math.round((paperHeightMm / 25.4) * 100));

        const tempDir = path.join(__dirname, "../temp");
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const psScriptFile = path.join(tempDir, `print_img_${Date.now()}.ps1`);
        const psScript = `
$ErrorActionPreference = "Stop"

try {
    $printerName = "${printerName}"
    $imagePath = "${imagePath.replace(/\\/g, "\\\\")}" 
    $paperWidth = ${paperWidthHundredthsInch}
    $paperHeight = ${paperHeightHundredthsInch}

    $printer = Get-CimInstance -ClassName Win32_Printer | Where-Object { $_.Name -eq $printerName }
    if (-not $printer) {
        Write-Host "ERROR: Printer $printerName not found"
        exit 1
    }

    Add-Type -AssemblyName System.Drawing
    Add-Type -AssemblyName System.Windows.Forms

    $image = [System.Drawing.Image]::FromFile($imagePath)
    $printDoc = New-Object System.Drawing.Printing.PrintDocument
    $printDoc.PrinterSettings.PrinterName = $printerName
    $printDoc.DefaultPageSettings.PaperSize = New-Object System.Drawing.Printing.PaperSize("Custom", $paperWidth, $paperHeight)
    $printDoc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0,0,0,0)
    $printDoc.OriginAtMargins = $false
    $printDoc.DefaultPageSettings.Landscape = $false

    $printDoc.add_PrintPage({
        param($sender, $ev)
        try {
            $ev.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $ev.Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $ev.Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $ev.Graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

            # Draw from (0,0) using actual image pixel dimensions to avoid printer hardware margins
            # This ensures template positioning matches physical output exactly
            $imgWidth = $image.Width
            $imgHeight = $image.Height
            $rect = New-Object System.Drawing.Rectangle(0, 0, $imgWidth, $imgHeight)
            $ev.Graphics.DrawImage($image, $rect)
            $ev.HasMorePages = $false
        } catch {
            Write-Host "Print page error: $_"
            $ev.HasMorePages = $false
        }
    })

    $printDoc.Print()
    $image.Dispose()
    Write-Host "SUCCESS: Print job sent via image mode"
} catch {
    Write-Host "ERROR: $_"
    exit 1
}
`;

        fs.writeFileSync(psScriptFile, psScript, "utf8");

        exec(
          `powershell -ExecutionPolicy Bypass -File "${psScriptFile}"`,
          { encoding: "utf8", maxBuffer: 1024 * 1024 },
          (error, stdout, stderr) => {
            logger.info(`PowerShell output: ${stdout}`);
            if (stderr) logger.warn(`PowerShell stderr: ${stderr}`);

            setTimeout(() => {
              try {
                if (fs.existsSync(psScriptFile)) fs.unlinkSync(psScriptFile);
              } catch (e) {
                logger.warn(`Cleanup warning: ${e.message}`);
              }
            }, 5000);

            if (error && !stdout.includes("SUCCESS")) {
              logger.error(`Image print error: ${stderr || error.message}`);
              reject(new Error(stderr || error.message || "Image print failed"));
              return;
            }

            const jobID = `IMG-${Date.now()}`;
            logger.info(`✅ Image print job ${jobID} sent to ${printerName}`);
            resolve(jobID);
          },
        );
      } catch (error) {
        logger.error("Print image error:", error);
        reject(error);
      }
    });
  }

  /**
   * Check if printer is available
   * @param {string} printerName - Name of printer
   * @returns {Promise<boolean>} True if available
   */
  async isPrinterAvailable(printerName) {
    try {
      const printers = await this.listPrinters();
      return printers.some((p) => p.name === printerName);
    } catch (error) {
      logger.error("Error checking printer availability:", error);
      return false;
    }
  }
}

module.exports = new PrinterService();
