const fs = require("fs");
const path = "d:/Coding/Melati/melati-app/melati-app-vue/src/views/aksesoris/DataPenjualanView.vue";
let content = fs.readFileSync(path, "utf8");

const tbodyStart = content.indexOf("            <tbody>\r\n              <template v-for");
const tbodyEnd = content.indexOf("            </tbody>") + "            </tbody>".length;

if (tbodyStart === -1) {
  console.log("NOT FOUND");
  process.exit(1);
}

const newTbody = `            <tbody>
              <tr v-for="(row, idx) in paginatedRows" :key="\`\${row.trx.id}-\${idx}\`">
                <td class="text-center text-muted small">{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
                <td class="small">{{ displayTanggal(row.trx) }}</td>
                <td class="small text-muted">{{ displayJam(row.trx) }}</td>
                <td class="small fw-semibold">{{ row.trx.salesName || '\u2014' }}</td>
                <td class="small">
                  <span class="badge bg-secondary">{{ row.trx.jenisPenjualan || '\u2014' }}</span>
                </td>
                <td class="small text-primary fw-semibold">
                  {{ row.item ? (row.item.kodeText || row.item.kode || '\u2014') : '\u2014' }}
                </td>
                <td class="small">{{ row.item ? (row.item.namaBarang || row.item.nama || '\u2014') : '\u2014' }}</td>
                <td class="text-center small">{{ row.item ? (row.item.qty ?? row.item.jumlah ?? 1) : '\u2014' }}</td>
                <td class="text-center small">{{ row.item ? (row.item.totalBerat ?? row.item.berat ?? '\u2014') : '\u2014' }}</td>
                <td class="small">{{ row.item ? (row.item.kadar || '\u2014') : '\u2014' }}</td>
                <td class="text-end small fw-semibold">
                  {{ formatCurrency(row.item ? (row.item.subtotal ?? row.item.totalHarga ?? row.item.harga ?? 0) : row.trx.totalHarga) }}
                </td>
                <td>
                  <span class="badge" :class="statusClass(row.trx.statusPembayaran)">
                    {{ row.trx.statusPembayaran || row.trx.metodePembayaran || '\u2014' }}
                  </span>
                </td>
                <td class="small text-muted" style="max-width:120px;white-space:normal;word-break:break-word">
                  {{ row.item ? (row.item.keterangan || '') : (row.trx.keterangan || '') }}
                </td>
                <td class="text-center">
                  <button
                    @click="openPrintChoice(row.trx)"
                    class="btn btn-sm btn-outline-secondary py-0 px-1 me-1"
                    title="Cetak Ulang"
                  ><i class="bi bi-receipt small"></i></button>
                  <button
                    @click="openEditVerify(row.trx)"
                    class="btn btn-sm btn-outline-primary py-0 px-1 me-1"
                    title="Edit"
                  ><i class="bi bi-pencil small"></i></button>
                  <button
                    @click="confirmDelete(row.trx)"
                    class="btn btn-sm btn-outline-danger py-0 px-1"
                    title="Hapus"
                  ><i class="bi bi-trash3 small"></i></button>
                </td>
              </tr>
            </tbody>`;

content = content.slice(0, tbodyStart) + newTbody + content.slice(tbodyEnd);
fs.writeFileSync(path, content, "utf8");
console.log("OK tbodyStart=" + tbodyStart + " tbodyEnd=" + tbodyEnd);
