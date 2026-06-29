// src/utils/printHelper.js
// Adapter untuk mencetak via Electron native, local Express print service, atau fallback browser print.

const PRINT_SERVICE_URL = import.meta.env.VITE_PRINT_SERVICE_URL || "http://localhost:3001";

// Cek apakah aplikasi berjalan di dalam Electron shell
export function isElectron() {
  return typeof window !== "undefined" && window.electronAPI !== undefined;
}

// Mendapatkan daftar printer lokal (via Electron IPC atau HTTP API local print service)
export async function getLocalPrinters() {
  if (isElectron()) {
    try {
      return await window.electronAPI.getPrinters();
    } catch (err) {
      console.error("Gagal mendapatkan printer via Electron IPC:", err);
      return [];
    }
  }

  // Fallback ke Express service (localhost:3001)
  try {
    const res = await fetch(`${PRINT_SERVICE_URL}/api/printers`, {
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      return data.printers || [];
    }
  } catch (err) {
    console.warn("Print service lokal tidak aktif untuk mendapatkan daftar printer:", err.message);
  }
  return [];
}

// Mendapatkan printer target berdasarkan tipe pekerjaan cetak
export function getTargetPrinter(type) {
  if (typeof localStorage === "undefined") return "";
  
  // Ambil setting khusus tipe printer, atau fallback ke default printer
  if (type === "receipt") {
    return localStorage.getItem("printer_receipt") || localStorage.getItem("user_default_printer") || "";
  } else if (type === "qr-sbpl" || type === "qr-silver") {
    return localStorage.getItem("printer_label") || localStorage.getItem("user_default_printer") || "";
  } else {
    // invoice, nota-servis, nota-custom
    return localStorage.getItem("printer_invoice") || localStorage.getItem("user_default_printer") || "";
  }
}

// Handler cetak utama dengan deteksi platform dan fallback otomatis
export async function printJob(type, payload) {
  const printerName = getTargetPrinter(type);

  // Jalur 1: Electron Native Printing
  if (isElectron()) {
    console.log(`[Print Helper] Mencetak tipe '${type}' via Electron native ke printer: ${printerName || "Default"}`);
    try {
      const res = await window.electronAPI.print(type, payload, printerName);
      if (res && res.success) {
        return { success: true, method: "ELECTRON" };
      }
      throw new Error(res?.error || "Gagal mencetak via Electron IPC");
    } catch (err) {
      console.error("Gagal mencetak menggunakan Electron native, mencoba fallback...", err);
      // Biarkan mengalir ke fallback berikutnya
    }
  }

  // Jalur 2: Local Express print service HTTP API
  try {
    console.log(`[Print Helper] Mencetak tipe '${type}' via local service HTTP...`);
    
    // Sesuaikan endpoint REST API printing-service
    let endpoint = `/api/print/${type}`;
    if (type === "nota-servis") endpoint = "/api/print/nota-servis";
    if (type === "nota-custom") endpoint = "/api/print/nota-custom";

    const res = await fetch(`${PRINT_SERVICE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000) // timeout 8 detik untuk Puppeteer rendering
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true, method: "LOCAL_SERVICE", jobID: data.jobID };
      }
      throw new Error(data.error || "Print service mengembalikan status gagal");
    }
    throw new Error(`Koneksi HTTP print service gagal (${res.status})`);
  } catch (err) {
    console.warn("Koneksi ke print service lokal gagal/timeout:", err.message);
    
    // Jalur 3: Browser Print Dialog Fallback (Khusus dokumen visual seperti invoice/nota)
    if (type !== "receipt" && type !== "qr-sbpl" && type !== "qr-silver") {
      console.log("[Print Helper] Mencetak menggunakan browser print fallback...");
      triggerBrowserPrint(type, payload);
      return { success: true, method: "BROWSER_PRINT" };
    }
    
    throw new Error("Layanan cetak lokal mati dan jenis dokumen ini tidak mendukung browser print dialog.");
  }
}

// Dialog cetak manual bawaan web browser
function triggerBrowserPrint(type, data) {
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return;

  let html = "";
  if (type === "invoice") {
    html = buildInvoiceHTML(data);
  } else if (type === "nota-servis" || type === "nota-custom") {
    html = buildServisHTML(data, type === "nota-custom");
  }

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Cetak Nota/Invoice</title>
        <style>
          body { font-family: Tahoma, Arial, sans-serif; font-size: 12px; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
          th { background: #f0f0f0; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <button onclick="window.print()" style="padding: 6px 12px; margin-bottom: 12px; font-weight: bold; cursor: pointer;">Cetak Sekarang</button>
        ${html}
      </body>
    </html>
  `);
  win.document.close();
  setTimeout(() => {
    win.print();
  }, 500);
}

// Renderer HTML minimal untuk fallback cetak browser
function buildInvoiceHTML(t) {
  const items = t.items || [];
  const rows = items.map(i => `
    <tr>
      <td>${i.code || i.kodeText || "-"}</td>
      <td>${i.name || i.nama || "-"}</td>
      <td>${i.purity || i.kadar || "-"}</td>
      <td>${i.weight || i.berat || "-"} gr</td>
      <td>${i.quantity || i.jumlah || 1}</td>
      <td style="text-align: right">Rp ${Number(i.price || i.totalHarga || 0).toLocaleString("id-ID")}</td>
    </tr>
  `).join("");

  return `
    <h2>MELATI 3 - INVOICE</h2>
    <p>Tanggal: ${t.date || ""}</p>
    <p>Nama Pelanggan: ${t.customerName || "-"}</p>
    <p>Sales: ${t.sales || "Admin"}</p>
    <hr>
    <table>
      <thead>
        <tr>
          <th>Kode</th>
          <th>Nama Barang</th>
          <th>Kadar</th>
          <th>Berat</th>
          <th>Qty</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <h3 style="text-align: right">Total: Rp ${Number(t.total || 0).toLocaleString("id-ID")}</h3>
    ${t.notes ? `<p>Keterangan: ${t.notes}</p>` : ""}
  `;
}

function buildServisHTML(s, isCustom) {
  const items = s.items || [];
  const rows = items.map(i => `
    <tr>
      <td>${i.namaBarang || "-"}</td>
      <td>${i.berat || "-"}</td>
      <td>${i.karat || "-"}</td>
      <td>${i.jenisServis || i.jenisPekerjaan || "-"}</td>
      <td>${i.rincianServis || "-"}</td>
      <td style="text-align: right">Rp ${Number(i.ongkos || i.harga || 0).toLocaleString("id-ID")}</td>
    </tr>
  `).join("");

  return `
    <h2>MELATI 3 - NOTA SERVIS ${isCustom ? "CUSTOM" : ""}</h2>
    <p>Tanggal: ${s.tanggal || ""}</p>
    <p>Nama Pelanggan: ${s.customerName || s.namaPelanggan || "-"}</p>
    <p>Sales: ${s.salesName || s.sales || "-"}</p>
    <hr>
    <table>
      <thead>
        <tr>
          <th>Barang</th>
          <th>Berat</th>
          <th>Karat</th>
          <th>Pekerjaan</th>
          <th>Rincian</th>
          <th>Ongkos</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <h3 style="text-align: right">Total Ongkos: Rp ${Number(s.totalOngkos || s.harga || 0).toLocaleString("id-ID")}</h3>
  `;
}
