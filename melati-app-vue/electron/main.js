const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const Handlebars = require("handlebars");
const bwipjs = require("bwip-js");
const https = require("https");

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

// Path for WASAPI per-process volume control DLL
const dllPath = path.join(app.getPath("userData"), "AudioControl_v4.dll");

// Function to generate and compile AudioControl.dll for Windows per-process audio ducking
function ensureAudioControlDLL() {
  if (process.platform !== "win32") return;
  if (fs.existsSync(dllPath)) return;

  fs.mkdirSync(path.dirname(dllPath), { recursive: true });

  const csharpCode = `using System;
using System.Runtime.InteropServices;
using System.Diagnostics;

namespace AudioControl
{
    [Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioSessionEnumerator
    {
        [PreserveSig] int GetCount(out int count);
        [PreserveSig] int GetSession(int sessionCount, out IAudioSessionControl session);
    }

    [Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioSessionManager2
    {
        [PreserveSig] int GetAudioSessionControl(ref Guid AudioSessionGuid, uint StreamFlags, out object SessionControl);
        [PreserveSig] int GetSimpleAudioVolume(ref Guid AudioSessionGuid, uint StreamFlags, out object AudioVolume);
        [PreserveSig] int GetSessionEnumerator(out IAudioSessionEnumerator SessionList);
    }

    [Guid("F4B1A599-7266-4319-A8CA-E70ACB11E8CD"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioSessionControl
    {
        [PreserveSig] int GetState(out uint state);
        [PreserveSig] int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string displayName);
        [PreserveSig] int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string displayName, ref Guid eventContext);
        [PreserveSig] int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string iconPath);
        [PreserveSig] int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string iconPath, ref Guid eventContext);
        [PreserveSig] int GetGroupingParam(out Guid groupingParam);
        [PreserveSig] int SetGroupingParam(ref Guid groupingParam, ref Guid eventContext);
        [PreserveSig] int RegisterAudioSessionNotification(object client);
        [PreserveSig] int UnregisterAudioSessionNotification(object client);
    }

    [Guid("BFB7FF88-7239-4FC9-8FA2-07C950BE9C6D"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioSessionControl2
    {
        [PreserveSig] int GetState(out uint state);
        [PreserveSig] int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string displayName);
        [PreserveSig] int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string displayName, ref Guid eventContext);
        [PreserveSig] int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string iconPath);
        [PreserveSig] int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string iconPath, ref Guid eventContext);
        [PreserveSig] int GetGroupingParam(out Guid groupingParam);
        [PreserveSig] int SetGroupingParam(ref Guid groupingParam, ref Guid eventContext);
        [PreserveSig] int RegisterAudioSessionNotification(object client);
        [PreserveSig] int UnregisterAudioSessionNotification(object client);
        [PreserveSig] int GetSessionIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string sessionIdentifier);
        [PreserveSig] int GetSessionInstanceIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string sessionInstanceIdentifier);
        [PreserveSig] int GetProcessId(out uint processId);
        [PreserveSig] int IsSystemSoundsSession();
        [PreserveSig] int SetDuckingPreference(bool optOut);
    }

    [Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface ISimpleAudioVolume
    {
        [PreserveSig] int SetMasterVolume(float fLevel, ref Guid EventContext);
        [PreserveSig] int GetMasterVolume(out float pfLevel);
        [PreserveSig] int SetMute(bool bMute, ref Guid EventContext);
        [PreserveSig] int GetMute(out bool pbMute);
    }

    [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IMMDevice
    {
        [PreserveSig] int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
    }

    [Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IMMDeviceCollection
    {
        [PreserveSig] int GetCount(out int count);
        [PreserveSig] int Item(int deviceIndex, out IMMDevice device);
    }

    [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IMMDeviceEnumerator
    {
        [PreserveSig] int EnumAudioEndpoints(int dataFlow, int dwStateMask, out IMMDeviceCollection ppDevices);
        [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
    }

    public class VolumeController
    {
        private static Guid IID_IAudioSessionManager2 = new Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F");

        public static void SetProcessVolume(string processName, float volume)
        {
            try
            {
                Type type = Type.GetTypeFromCLSID(new Guid("BCDE0395-E52F-467C-8E3D-C4579291692E"));
                IMMDeviceEnumerator enumerator = (IMMDeviceEnumerator)Activator.CreateInstance(type);
                
                IMMDeviceCollection collection;
                int hr = enumerator.EnumAudioEndpoints(0, 1, out collection);
                if (hr != 0 || collection == null) return;
                
                int deviceCount;
                collection.GetCount(out deviceCount);
                
                for (int d = 0; d < deviceCount; d++)
                {
                    IMMDevice device;
                    hr = collection.Item(d, out device);
                    if (hr != 0 || device == null) continue;
                    
                    object o;
                    hr = device.Activate(ref IID_IAudioSessionManager2, 1, IntPtr.Zero, out o);
                    if (hr == 0 && o != null)
                    {
                        IAudioSessionManager2 manager = (IAudioSessionManager2)o;
                        IAudioSessionEnumerator sessionEnumerator;
                        hr = manager.GetSessionEnumerator(out sessionEnumerator);
                        if (hr == 0 && sessionEnumerator != null)
                        {
                            int count;
                            sessionEnumerator.GetCount(out count);
                            for (int i = 0; i < count; i++)
                            {
                                IAudioSessionControl session;
                                hr = sessionEnumerator.GetSession(i, out session);
                                if (hr == 0 && session != null)
                                {
                                    IAudioSessionControl2 session2 = session as IAudioSessionControl2;
                                    if (session2 != null)
                                    {
                                        uint pid;
                                        session2.GetProcessId(out pid);
                                        if (pid > 0)
                                        {
                                            try
                                            {
                                                Process proc = Process.GetProcessById((int)pid);
                                                if (proc.ProcessName.Equals(processName, StringComparison.OrdinalIgnoreCase))
                                                {
                                                    ISimpleAudioVolume simpleVolume = (ISimpleAudioVolume)session;
                                                    Guid guid = Guid.Empty;
                                                    
                                                    float currentVolume;
                                                    simpleVolume.GetMasterVolume(out currentVolume);
                                                    
                                                    float step = 0.05f;
                                                    int sleepTime = 15;
                                                    
                                                    if (currentVolume < volume)
                                                    {
                                                        for (float v = currentVolume; v <= volume; v += step)
                                                        {
                                                            simpleVolume.SetMasterVolume(v, ref guid);
                                                            System.Threading.Thread.Sleep(sleepTime);
                                                        }
                                                    }
                                                    else
                                                    {
                                                        for (float v = currentVolume; v >= volume; v -= step)
                                                        {
                                                            simpleVolume.SetMasterVolume(v, ref guid);
                                                            System.Threading.Thread.Sleep(sleepTime);
                                                        }
                                                    }
                                                    simpleVolume.SetMasterVolume(volume, ref guid);
                                                }
                                            }
                                            catch {}
                                        }
                                    }
                                    Marshal.ReleaseComObject(session);
                                }
                            }
                            Marshal.ReleaseComObject(sessionEnumerator);
                        }
                        Marshal.ReleaseComObject(manager);
                    }
                    Marshal.ReleaseComObject(device);
                }
                Marshal.ReleaseComObject(collection);
                Marshal.ReleaseComObject(enumerator);
            }
            catch {}
        }
    }
}`;

  const tempCsPath = path.join(app.getPath("temp"), `AudioControl_${Date.now()}.cs`);
  try {
    fs.writeFileSync(tempCsPath, csharpCode, "utf8");

    // PowerShell script content to compile C# code to DLL
    const psScript = `
$ErrorActionPreference = "Stop"
try {
    Add-Type -TypeDefinition (Get-Content -Path "${tempCsPath}" -Raw) -OutputAssembly "${dllPath}"
    exit 0
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
`;
    // Base64-encode to avoid all Windows quote/spacing escaping issues
    const buffer = Buffer.from(psScript, "utf16le");
    const base64 = buffer.toString("base64");
    const command = `powershell -ExecutionPolicy Bypass -EncodedCommand ${base64}`;

    exec(command, (err, stdout, stderr) => {
      // Cleanup temp .cs file
      try {
        if (fs.existsSync(tempCsPath)) fs.unlinkSync(tempCsPath);
      } catch (_) {}

      if (err) {
        console.error("Failed to compile AudioControl.dll:", stderr);
      } else {
        console.log("AudioControl.dll compiled successfully at:", dllPath);
      }
    });
  } catch (err) {
    console.error("Failed to compile AudioControl.dll on startup:", err);
    try {
      if (fs.existsSync(tempCsPath)) fs.unlinkSync(tempCsPath);
    } catch (_) {}
  }
}

// Function to adjust target browser volumes via PowerShell using the compiled DLL
function setBrowsersVolume(volume) {
  if (process.platform !== "win32") return;
  if (!fs.existsSync(dllPath)) {
    console.warn("AudioControl.dll not found, cannot set browser volumes.");
    return;
  }

  // Kill previous active volume process if running, preventing race conditions
  if (activeVolumeProcess) {
    try {
      activeVolumeProcess.kill();
    } catch (_) {}
    activeVolumeProcess = null;
  }
  
  const browsers = ["chrome", "msedge", "firefox", "brave", "opera"];
  
  // Build volume control PowerShell script
  let script = `Add-Type -Path "${dllPath}";\n`;
  browsers.forEach(browser => {
    script += `[AudioControl.VolumeController]::SetProcessVolume("${browser}", [float]${volume});\n`;
  });
  
  // Base64-encode to execute cleanly without quoting errors
  const buffer = Buffer.from(script, "utf16le");
  const base64 = buffer.toString("base64");
  const command = `powershell -ExecutionPolicy Bypass -EncodedCommand ${base64}`;
  
  activeVolumeProcess = exec(command, (err, stdout, stderr) => {
    activeVolumeProcess = null;
    if (err && !err.killed) {
      console.error(`Failed to set browsers volume to ${volume}:`, stderr);
    }
  });
}

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

  mainWindow.setAutoHideMenuBar(true);
  mainWindow.setMenuBarVisibility(false);

  // Load appropriate URL (dev server or Firebase production)
  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
  const startUrl = isDev 
    ? "https://localhost:5173" // Vite default HTTPS dev port
    : "https://melatigold.web.app";

  // Clear network cache to force latest web build download from Firebase
  mainWindow.webContents.session.clearCache().then(() => {
    mainWindow.loadURL(startUrl, {
      extraHeaders: "pragma: no-cache\r\ncache-control: no-cache\r\n"
    });
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}



app.whenReady().then(() => {
  ensureAudioControlDLL();
  createMainWindow();

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
let activeVolumeProcess = null;

// Failsafe: Restore master volume when application is quitting
app.on("will-quit", async () => {
  try {
    setBrowsersVolume(1.0);
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

/**
 * Prints a single copy of an HTML file using a temporary, isolated BrowserWindow.
 * Wraps the native callback-based webContents.print to block until the spooler accepts the job.
 */
function printHTMLSingle(htmlPath, printerName) {
  return new Promise((resolve, reject) => {
    const workerWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    workerWindow.webContents.once("did-finish-load", () => {
      workerWindow.webContents.print({
        silent: true,
        printBackground: true,
        deviceName: printerName,
        copies: 1
      }, (success, failureReason) => {
        workerWindow.destroy();
        if (success) {
          resolve();
        } else {
          reject(new Error(failureReason || "Printer driver failed to accept job"));
        }
      });
    });

    workerWindow.loadURL(`file://${htmlPath}`).catch((err) => {
      workerWindow.destroy();
      reject(err);
    });
  });
}

// PowerShell Raw & Image Printer commands (compiled pure-JS without binary dependencies)
function listPrinters() {
  return new Promise((resolve) => {
    exec(
      'powershell -Command "Get-CimInstance -ClassName Win32_Printer | Select-Object Name, Default, PrinterStatus, DetectedErrorState | ConvertTo-Json"',
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
            status: p.PrinterStatus === 3 ? "Ready" : "Offline",
            detectedErrorState: p.DetectedErrorState || 0
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
$filePath = "${tempFile.replace(/\\/g, "\\\\")}"

# Unified GDI Graphics Print document
try {
    Add-Type -AssemblyName System.Drawing
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $printDoc = New-Object System.Drawing.Printing.PrintDocument
    $printDoc.PrinterSettings.PrinterName = "${printerName}"
    $printDoc.add_PrintPage({
        param($sender, $ev)
        $y = 10
        $x = 2
        $pageWidth = $ev.PageBounds.Width - 2 * $x
        
        $centerFormat = New-Object System.Drawing.StringFormat
        $centerFormat.Alignment = [System.Drawing.StringAlignment]::Center
        
        $leftFormat = New-Object System.Drawing.StringFormat
        $leftFormat.Alignment = [System.Drawing.StringAlignment]::Near
        
        $rawText = [System.Text.Encoding]::ASCII.GetString($bytes)
        $lines = $rawText -split "\n"
        foreach ($line in $lines) {
            $line = $line.TrimEnd("\`r")
            $isHuge = $line.Contains("$([char]0x1D)!U")
            $isLarge = $line.Contains("$([char]0x1B)!8")
            $isBold = $line.Contains("$([char]0x1B)E$([char]0x01)")
            
            $cleanLine = $line
            $cleanLine = $cleanLine.Replace("$([char]0x1B)@", "")
            $cleanLine = $cleanLine -replace "\x1B!.", ""
            $cleanLine = $cleanLine -replace "\x1B[E]\x01", ""
            $cleanLine = $cleanLine -replace "\x1B[E]\x00", ""
            $cleanLine = $cleanLine -replace "\x1D!.", ""
            $cleanLine = $cleanLine.Replace("$([char]0x1D)VA$([char]0x00)", "")
            $cleanLine = $cleanLine -replace "[\x00-\x1F]", ""
            
            if ($cleanLine.Length -eq 0 -and $line.Length -gt 0 -and ($line -match "[\x1B\x1D]")) {
                continue
            }
            
            $trimmed = $cleanLine.Trim()
            
            if ($isHuge) {
                $font = New-Object System.Drawing.Font("Consolas", 32, [System.Drawing.FontStyle]::Bold)
                $lineHeight = 44
            }
            elseif ($isLarge) {
                $font = New-Object System.Drawing.Font("Consolas", 16, [System.Drawing.FontStyle]::Bold)
                $lineHeight = 24
            }
            elseif ($isBold) {
                $font = New-Object System.Drawing.Font("Consolas", 8.5, [System.Drawing.FontStyle]::Bold)
                $lineHeight = 14
            }
            else {
                $font = New-Object System.Drawing.Font("Consolas", 8.5, [System.Drawing.FontStyle]::Regular)
                $lineHeight = 14
            }
            
            $format = $centerFormat
            if ($trimmed.StartsWith("-") -or $trimmed -eq "CATATAN:") {
                $format = $leftFormat
                $trimmed = $cleanLine.TrimEnd()
            }
            
            $rect = New-Object System.Drawing.RectangleF($x, $y, $pageWidth, $lineHeight)
            $ev.Graphics.DrawString($trimmed, $font, [System.Drawing.Brushes]::Black, $rect, $format)
            $y += $lineHeight
        }
        $ev.HasMorePages = $false
    })
    $printDoc.Print()
    exit 0
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

ipcMain.handle("get-printers", async (event) => {
  if (!validateOrigin(event.sender)) {
    throw new Error("Unauthorized IPC Call");
  }
  return await listPrinters();
});

ipcMain.handle("toggle-menu-bar", (event) => {
  if (!validateOrigin(event.sender)) {
    throw new Error("Unauthorized IPC Call");
  }
  if (mainWindow) {
    const isVisible = mainWindow.isMenuBarVisible();
    mainWindow.setMenuBarVisibility(!isVisible);
    return !isVisible;
  }
  return false;
});

ipcMain.handle("duck-audio", async (event, duration) => {
  if (!validateOrigin(event.sender)) {
    throw new Error("Unauthorized IPC Call");
  }
  
  try {
    if (duckTimeout) {
      clearTimeout(duckTimeout);
      duckTimeout = null;
    }

    // Duck the external browsers (Chrome, Edge, etc.) to 10%
    setBrowsersVolume(0.1);

    // Set timeout as fallback to restore volume
    duckTimeout = setTimeout(() => {
      try {
        setBrowsersVolume(1.0);
      } catch (err) {
        console.error("Failed to restore browser volume in timeout:", err);
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

  try {
    if (duckTimeout) {
      clearTimeout(duckTimeout);
      duckTimeout = null;
    }

    // Restore browser volume to 100%
    setBrowsersVolume(1.0);
    return { success: true };
  } catch (err) {
    console.error("Failed to unduck audio:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("get-google-tts", async (event, text) => {
  if (!validateOrigin(event.sender)) {
    throw new Error("Unauthorized IPC Call");
  }
  return new Promise((resolve, reject) => {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=id&client=tw-ob&q=${encodeURIComponent(text)}`;
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36"
      }
    };
    https.get(url, options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch TTS: Status ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString("base64");
        resolve(`data:audio/mp3;base64,${base64}`);
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
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

    if (type === "queue") {
      const rawText = generateQueueText(payload);
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

    // Save to temp HTML file and load it in print window (with random suffix to avoid name collisions)
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const tempHTMLPath = path.join(app.getPath("temp"), `print_${Date.now()}_${randomSuffix}.html`);
    fs.writeFileSync(tempHTMLPath, htmlString, "utf-8");

    try {
      for (let i = 0; i < copiesCount; i++) {
        if (i > 0) {
          // Wait 1.5 seconds between print jobs to allow the printer spooler to release the device lock
          await new Promise((resolveDelay) => setTimeout(resolveDelay, 1500));
        }
        await printHTMLSingle(tempHTMLPath, printerName);
      }
      return { success: true };
    } catch (err) {
      console.error("Print job error:", err);
      return { success: false, error: "Print failure: " + err.message };
    } finally {
      // Cleanup temp file
      try {
        fs.unlinkSync(tempHTMLPath);
      } catch (_) {}
    }

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

// Simple plain text printer renderer for queue ticket
function generateQueueText(data) {
  const {
    queueNumber = "",
    queueType = "",
    dateStr = "",
    timeStr = "",
    floor = "L1",
    lang = "id",
  } = data;

  const isEn = lang === "en";
  const width = 48; // character column width for 80mm paper

  const centerText = (text) => {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return " ".repeat(padding) + text + "\n";
  };

  const centerTextScaled = (text, scale = 1) => {
    const scaledWidth = Math.floor(width / scale);
    const padding = Math.max(0, Math.floor((scaledWidth - text.length) / 2));
    return " ".repeat(padding) + text + "\n";
  };

  const leftAlignText = (text) => text + "\n";

  const ESC = "\x1B";
  const GS = "\x1D";
  const INIT = ESC + "@";
  const TEXT_NORMAL = ESC + "!\x00";
  const BOLD_ON = ESC + "E\x01";
  const BOLD_OFF = ESC + "E\x00";

  // Large size for Shop Name (2x size: double-width, double-height, bold)
  const TEXT_LARGE_BOLD = ESC + "!\x38";
  
  // Huge size for Queue Number (6x size: 6x width, 6x height, bold)
  const TEXT_HUGE_BOLD = GS + "!\x55";

  let output = INIT;
  output += leftAlignText("=".repeat(width));
  output += TEXT_LARGE_BOLD + centerTextScaled(floor === "L2" ? "MELATI GOLD YOUNG" : "MELATI GOLD SHOP", 2).trimEnd() + "\n" + TEXT_NORMAL;
  output += leftAlignText("=".repeat(width));
  output += "\n";

  let floorLabel = floor === "L2"
    ? (isEn ? "* * 2ND FLOOR * *" : "* * LANTAI 2 * *")
    : (isEn ? "* * 1ST FLOOR * *" : "* * LANTAI 1 * *");
  output += BOLD_ON + centerText(floorLabel) + BOLD_OFF;
  output += "\n";

  const titleLabel = isEn ? "YOUR QUEUE NUMBER" : "NOMOR ANTRIAN ANDA";
  output += BOLD_ON + centerText(titleLabel) + BOLD_OFF;
  output += "\n";

  output += leftAlignText("-".repeat(width));
  output += TEXT_HUGE_BOLD + centerTextScaled(queueNumber, 6).trimEnd() + "\n" + TEXT_NORMAL;
  output += "\n";
  output += leftAlignText("-".repeat(width));

  let displayQueueType = queueType;
  if (isEn) {
    if (queueType.toLowerCase().includes("jual")) displayQueueType = "Sell / Service";
    else if (queueType.toLowerCase().includes("beli")) displayQueueType = "Buy / Trade-In";
  }
  output += centerText(displayQueueType.toUpperCase());

  const timeLabel = isEn ? "Time" : "Waktu";
  output += centerText(timeLabel + ": " + dateStr + " " + timeStr);

  output += "-".repeat(width) + "\n";
  if (isEn) {
    output += "NOTES:\n";
    output += "- If your queue is missed by more than\n";
    output += "  10 numbers, please take a new one\n";
    output += "- If it is less than 10 numbers, please\n";
    output += "  confirm with staff to be called next\n";
  } else {
    output += "CATATAN:\n";
    output += "- Jika antrian terlewat melebihi 10\n";
    output += "  nomor antrian silahkan ambil antrian baru\n";
    output += "- Jika belum melebihi 10 nomor silahkan\n";
    output += "  konfirmasi ke staff untuk dipanggil\n";
    output += "  di antrian selanjutnya\n";
  }
  output += "-".repeat(width) + "\n\n";

  if (isEn) {
    output += centerText("Please wait for your queue");
    output += centerText("number to be called.");
    output += centerText("Thank you for your visit.");
  } else {
    output += centerText("Sembari menunggu dipanggil, silahkan");
    output += centerText("melihat-lihat koleksi perhiasan kami");
    output += centerText("Terima kasih atas kunjungan Anda.");
  }

  output += "\n\n\n\n\n";
  output += "\x1DV\x41\x00"; // Full Cut command
  return output;
}

