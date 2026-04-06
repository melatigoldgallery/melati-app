// composables/usePrint.js
// Kirim ke print service lokal, fallback ke browser print

const PRINT_URL = import.meta.env.VITE_PRINT_SERVICE_URL || "http://localhost:3001";

export function usePrint() {
  async function printData(endpoint, payload) {
    try {
      const res = await fetch(`${PRINT_URL}/print/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`Print service error: ${res.status}`);
      return { success: true };
    } catch {
      return { success: false, fallback: true };
    }
  }

  function browserPrint(html) {
    const win = window.open("", "_blank", "width=800,height=600");
    win.document.write(`
      <!doctype html><html><head>
        <meta charset="UTF-8">
        <style>body{font-family:sans-serif;font-size:12px;margin:16px;}@media print{button{display:none}}</style>
      </head><body>
        <button onclick="window.print()" style="margin-bottom:12px;">Print</button>
        ${html}
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 300);
  }

  async function printServis(data) {
    const result = await printData("servis", data);
    if (result.fallback) browserPrint(buildServisSlipHTML(data));
  }

  async function printInvoice(data) {
    const result = await printData("invoice", data);
    if (result.fallback) browserPrint(buildInvoiceHTML(data));
  }

  return { printServis, printInvoice, browserPrint };
}

// ─── HTML builders (minimal — styling disesuaikan nanti) ─────────────────────
function buildServisSlipHTML(s) {
  return `
    <div style="max-width:300px;margin:auto;border:1px solid #ccc;padding:12px;font-size:11px;">
      <h3 style="text-align:center;margin:0 0 8px">Melati Gold Shop</h3>
      <div style="text-align:center;margin-bottom:8px;border-bottom:1px dashed #ccc;padding-bottom:8px;">
        Slip Servis
      </div>
      <table style="width:100%">
        <tr><td>No Servis</td><td>: ${s.nomorServis || ""}</td></tr>
        <tr><td>Tanggal</td><td>: ${s.tanggal || ""}</td></tr>
        <tr><td>Pelanggan</td><td>: ${s.namaPelanggan || ""}</td></tr>
        <tr><td>Pekerjaan</td><td>: ${s.jenisPekerjaan || ""}</td></tr>
        <tr><td>Barang</td><td>: ${s.barang || ""}</td></tr>
        <tr><td>Harga</td><td>: Rp ${Number(s.harga || 0).toLocaleString("id-ID")}</td></tr>
        <tr><td>Pembayaran</td><td>: ${s.pembayaran || ""}</td></tr>
      </table>
    </div>
  `;
}

function buildInvoiceHTML(t) {
  const rows = (t.items || [])
    .map(
      (i) =>
        `<tr><td>${i.kodeText}</td><td>${i.namaBarang}</td><td>${i.qty}</td>
     <td style="text-align:right">Rp ${Number(i.subtotal).toLocaleString("id-ID")}</td></tr>`,
    )
    .join("");
  return `
    <div style="max-width:320px;margin:auto;font-size:11px;">
      <h3 style="text-align:center">Melati Gold Shop</h3>
      <p style="text-align:center">Invoice #${t.noInvoice || ""}</p>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr><th>Kode</th><th>Nama</th><th>Qty</th><th>Subtotal</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><td colspan="3"><b>Total</b></td>
          <td style="text-align:right"><b>Rp ${Number(t.grandTotal || 0).toLocaleString("id-ID")}</b></td></tr>
        </tfoot>
      </table>
    </div>
  `;
}
