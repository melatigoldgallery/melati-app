// resync-skipped.cjs - Skrip Pemulihan Data Selisih Sinkronisasi Stok (Satu Kali Jalan)
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mysql = require('mysql2/promise');

const args = process.argv.slice(2);
const targetFloor = (args[0] || 'L2').toUpperCase(); // default L2
const isDryRun = args.includes('--dry-run');

console.log(`[RESYNC] Memulai proses pemulihan data terlewat untuk: Lantai ${targetFloor}`);
console.log(`[RESYNC] Mode: ${isDryRun ? 'SIMULASI (DRY-RUN)' : 'PRODUKSI (KIRIM DATA)'}`);

const STORE_ID = targetFloor === 'L2' ? 'MELATI-ATAS' : 'MELATI-BAWAH';
const PROJECT_ID = 'sistem-antrian-76aa8';
const BASE_URL = process.env.SYNC_API_BASE_URL || `https://asia-southeast2-${PROJECT_ID}.cloudfunctions.net`;
const WEBHOOK_SALES_URL = `${BASE_URL}/syncDesktopSales`;
const SYNC_API_KEY = 'MelatiSecretToken123';

const DB_CONFIG = {
    host: '192.168.18.180',
    port: 3307,
    user: 'root',
    password: '123',
    database: targetFloor === 'L2' ? 'core_dbtokomasmelatiatas' : 'core_dbtokomasmelatibawah'
};

const GOLD_PREFIX_REGEX = /^(C|K|L|A|G|S|Z|V|B|HL|KL|BL)/i;

function formatMySQLDateTime(tanggal, jam) {
    let datePart = '';
    if (tanggal instanceof Date) {
        const offset = tanggal.getTimezoneOffset();
        const localDate = new Date(tanggal.getTime() - (offset * 60 * 1000));
        datePart = localDate.toISOString().split('T')[0];
    } else if (tanggal) {
        datePart = String(tanggal).split(' ')[0];
    }

    let timePart = '00:00:00';
    if (jam instanceof Date) {
        timePart = jam.toISOString().split('T')[1].split('.')[0];
    } else if (jam) {
        const parts = String(jam).split(' ');
        timePart = parts.length > 1 ? parts[1] : parts[0];
    }

    return `${datePart}T${timePart}`;
}

async function run() {
    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        console.log("[DB SUCCESS] Terhubung ke MySQL.");

        // 1. Dapatkan ID awal sebelum 2026-08-01
        const [initRows] = await connection.execute(`
            SELECT MIN(\`Primary\`) AS start_id FROM tblpenjualan WHERE \`Tanggal\` >= '2026-08-01';
        `);
        
        let startId = initRows[0].start_id ? initRows[0].start_id - 1 : 0;
        if (startId === -1) startId = 0;
        console.log(`[WATERMARK] ID Awal (1 Agustus): ${startId}`);

        // Dapatkan ID akhir transaksi 15 Agustus
        const [endRows] = await connection.execute(`
            SELECT MAX(\`Primary\`) AS end_id FROM tblpenjualan WHERE \`Tanggal\` <= '2026-08-15';
        `);
        const endId = endRows[0].end_id || 99999999;
        console.log(`[WATERMARK] ID Akhir (15 Agustus): ${endId}`);

        // 2. Tarik semua baris emas dari database (tanpa limit pemisah)
        const [trueRows] = await connection.execute(`
            SELECT 
                h.\`Primary\` AS id,
                h.\`No Penjualan\` AS no_faktur,
                h.\`Tanggal\` AS tgl_penjualan,
                h.\`Jam\` AS jam_penjualan,
                d.\`ID Barang\` AS barcode,
                COALESCE(p.\`Nama Pegawai\`, h.\`ID Pegawai\`, 'Unknown Sales') AS nama_sales
            FROM tblpenjualan h
            JOIN tblpenjualanitem d ON h.\`Primary\` = d.\`PrimaryTransaksi\`
            LEFT JOIN tblpegawai p ON TRIM(h.\`ID Pegawai\`) = TRIM(p.\`Nomor Identitas Pegawai\`)
            WHERE h.\`Tanggal\` BETWEEN '2026-08-01' AND '2026-08-15'
            ORDER BY h.\`Primary\` ASC
        `);

        // Filter emas
        const trueGoldItems = trueRows.filter(row => row.barcode && GOLD_PREFIX_REGEX.test(row.barcode.trim()));
        console.log(`[TRUE DATA] Total barang emas terdaftar di DB: ${trueGoldItems.length} pcs`);

        // 3. Jalankan simulasi loop sync agent yang lama (limit 100) untuk deteksi skipped
        const simulatedFetchedItems = [];
        let watermark = startId;
        let loopCount = 0;

        while (loopCount < 200) {
            const [batchRows] = await connection.execute(`
                SELECT 
                    h.\`Primary\` AS id,
                    h.\`No Penjualan\` AS no_faktur,
                    d.\`ID Barang\` AS barcode
                FROM tblpenjualan h
                JOIN tblpenjualanitem d ON h.\`Primary\` = d.\`PrimaryTransaksi\`
                WHERE h.\`Primary\` > ?
                ORDER BY h.\`Primary\` ASC
                LIMIT 100
            `, [watermark]);

            if (batchRows.length === 0) break;

            const batchRowsInRange = batchRows.filter(r => r.id <= endId);
            const batchGold = batchRowsInRange.filter(row => row.barcode && GOLD_PREFIX_REGEX.test(row.barcode.trim()));
            simulatedFetchedItems.push(...batchGold);

            let maxBatchId = watermark;
            batchRows.forEach(r => { if (r.id > maxBatchId) maxBatchId = r.id; });
            watermark = maxBatchId;
            loopCount++;

            if (watermark >= endId) break;
        }

        console.log(`[SIMULATION] Barang yang berhasil disinkronkan oleh logika lama: ${simulatedFetchedItems.length} pcs`);

        // 4. Cari item yang skipped
        const simulatedSet = new Set(simulatedFetchedItems.map(item => `${item.id}_${item.barcode}`));
        const skippedItems = trueGoldItems.filter(item => !simulatedSet.has(`${item.id}_${item.barcode}`));

        console.log(`[SKIPPED] Total barang emas yang terlewat: ${skippedItems.length} pcs`);

        if (skippedItems.length === 0) {
            console.log("[SUCCESS] Tidak ada data terlewat untuk lantai ini.");
            return;
        }

        console.log("\n=== DAFTAR BARANG YANG AKAN DIPULIHKAN ===");
        skippedItems.forEach((item, idx) => {
            console.log(`${idx + 1}. Faktur: ${item.no_faktur} | Barcode: ${item.barcode} | Sales: ${item.nama_sales}`);
        });
        console.log("=========================================\n");

        if (isDryRun) {
            console.log("[DRY-RUN] Simulasi selesai. Tidak ada data yang dikirim.");
            return;
        }

        // 5. Kirim payload khusus berisi barang terlewat ke Cloud Function
        const salesPayload = {
            store_id: STORE_ID,
            is_test_payload: false,
            synced_at: new Date().toISOString(),
            sales_data: skippedItems.map(row => ({
                desktop_item_id: row.id,
                invoice_no: row.no_faktur,
                barcode: row.barcode.trim().toUpperCase(),
                tanggal_penjualan: formatMySQLDateTime(row.tgl_penjualan, row.jam_penjualan),
                nama_sales: row.nama_sales || 'Unknown Sales'
            }))
        };

        console.log(`[POST] Mengirim payload pemulihan ke ${WEBHOOK_SALES_URL}...`);
        const response = await axios.post(WEBHOOK_SALES_URL, salesPayload, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': SYNC_API_KEY
            },
            family: 4,
            timeout: 15000
        });

        console.log(`[SUCCESS] Pemulihan selesai. Status Server: ${response.status}`);

    } catch (e) {
        console.error("[CRITICAL ERROR] Proses pemulihan gagal:", e.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log("[DB CLOSED] Hubungan database diputus.");
        }
    }
}

run();
