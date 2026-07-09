// composables/usePrint.js
// Menggunakan printHelper untuk mendeteksi platform (Electron vs Browser) dan menangani fallback.

import { printJob } from "@/utils/printHelper";

export function usePrint() {
  async function printServis(data) {
    const isCustom = data.jenisInput === "custom" || data.isCustom;
    const type = isCustom ? "nota-custom" : "nota-servis";
    return await printJob(type, data);
  }

  async function printInvoice(data) {
    return await printJob("invoice", data);
  }

  function browserPrint(html) {
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;
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

  return { printServis, printInvoice, browserPrint };
}

