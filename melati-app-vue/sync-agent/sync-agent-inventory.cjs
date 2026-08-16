// sync-agent-inventory.cjs - Skrip Sinkronisasi Stok & Deteksi Selisih Barang
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mysql = require('mysql2/promise');

// ==========================================
// 1. KONFIGURASI UTAMA & PARSING MULTI-LANTAI
// ==========================================

// Membaca argumen lantai dari command line (default ke 'L1' jika tidak diisi)
const args = process.argv.slice(2);
const targetFloor = (args[0] || 'L1').toUpperCase();

// Konfigurasi Lokasi Lantai Toko
const STORE_ID = targetFloor === 'L2' ? 'MELATI-ATAS' : 'MELATI-BAWAH';

// MODE PENGUJIAN (TEST MODE)
// - Set ke true untuk mengambil data historis yang sudah ada untuk uji coba.
// - Set ke false untuk mode produksi otomatis (incremental sync).
const IS_TEST_MODE = false;

// ID Transaksi spesifik untuk uji coba historis (isi jika ingin tes data tertentu).
const TEST_TRANSACTION_ID = null;

// URL Endpoint Web (Cloud Functions API)
const PROJECT_ID = 'sistem-antrian-76aa8';
const BASE_URL = process.env.SYNC_API_BASE_URL || `https://asia-southeast2-${PROJECT_ID}.cloudfunctions.net`;
const WEBHOOK_SALES_URL = `${BASE_URL}/syncDesktopSales`;
const WEBHOOK_VOID_URL = `${BASE_URL}/syncDesktopVoid`;

// Token rahasia otentikasi API
const SYNC_API_KEY = process.env.SYNC_API_KEY || 'MelatiSecretToken123';

// File Penyimpan State Watermark
const STATE_FILE = path.join(__dirname, `last_sync_state_inventory_${targetFloor}.json`);
const VOID_STATE_FILE = path.join(__dirname, `last_sync_void_state_${targetFloor}.json`);

// Konfigurasi Database Desktop MySQL (Sesuaikan dengan data riil)
const DB_CONFIG = {
    host: process.env.DB_HOST || '192.168.18.180',
    port: parseInt(process.env.DB_PORT, 10) || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123',
    database: targetFloor === 'L2' ? 'core_dbtokomasmelatiatas' : 'core_dbtokomasmelatibawah',
    insecureAuth: true // Mendukung otentikasi server versi lama
};

// Regex Penyaring Barcode Emas
const GOLD_PREFIX_REGEX = /^(C|K|L|A|G|S|Z|V|B|HL|KL|BL)/i;

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

// Format MySQL Date/Time to ISO 8601 string safely
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

// Membaca ID Watermark terakhir
function getLastSyncedId(file) {
    if (fs.existsSync(file)) {
        try {
            const raw = fs.readFileSync(file, 'utf8');
            return JSON.parse(raw).last_id || 0;
        } catch (e) {
            return 0;
        }
    }
    return 0;
}

// Get local ISO 8601 representation of date with timezone offset
function getLocalISOString(date) {
    const tzOffset = -date.getTimezoneOffset();
    const diff = tzOffset >= 0 ? '+' : '-';
    const pad = (num) => String(num).padStart(2, '0');
    const padMs = (num) => String(num).padStart(3, '0');
    return date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) +
        ':' + pad(date.getMinutes()) +
        ':' + pad(date.getSeconds()) +
        '.' + padMs(date.getMilliseconds()) +
        diff + pad(Math.floor(Math.abs(tzOffset) / 60)) +
        ':' + pad(Math.abs(tzOffset) % 60);
}

// Menyimpan ID Watermark terbaru
function saveLastSyncedId(file, lastId) {
    const data = { last_id: lastId, updated_at: getLocalISOString(new Date()) };
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Inisialisasi awal watermark jika cold start untuk penjualan
async function initializeColdStart(connection) {
    console.log(`[INIT SALES] Menghitung watermark awal untuk hari ini...`);
    try {
        const query = `SELECT MIN(\`Primary\`) AS start_id FROM tblpenjualan WHERE \`Tanggal\` = CURDATE();`;
        const [rows] = await connection.execute(query);

        if (rows[0] && rows[0].start_id) {
            const initialId = rows[0].start_id - 1;
            console.log(`[INIT SALES SUCCESS] Watermark diset ke ID sebelum transaksi hari ini: ${initialId}`);
            return initialId;
        } else {
            const maxQuery = `SELECT MAX(\`Primary\`) AS start_id FROM tblpenjualan;`;
            const [maxRows] = await connection.execute(maxQuery);
            const initialId = (maxRows[0] && maxRows[0].start_id) ? maxRows[0].start_id : 0;
            console.log(`[INIT SALES SUCCESS] Tidak ada transaksi hari ini. Watermark diset ke ID maksimal: ${initialId}`);
            return initialId;
        }
    } catch (e) {
        console.error('[INIT SALES ERROR] Gagal inisialisasi, fallback ke ID 0:', e.message);
        return 0;
    }
}

// Inisialisasi awal watermark jika cold start untuk void
async function initializeVoidColdStart(connection) {
    console.log(`[INIT VOID] Menghitung watermark awal void untuk hari ini...`);
    try {
        const query = `SELECT MIN(\`Primary\`) AS start_id FROM tblsejarahpenjualanhapus WHERE \`Tanggal Hapus\` = CURDATE();`;
        const [rows] = await connection.execute(query);

        if (rows[0] && rows[0].start_id) {
            const initialId = rows[0].start_id - 1;
            console.log(`[INIT VOID SUCCESS] Watermark diset ke ID sebelum void hari ini: ${initialId}`);
            return initialId;
        } else {
            const maxQuery = `SELECT MAX(\`Primary\`) AS start_id FROM tblsejarahpenjualanhapus;`;
            const [maxRows] = await connection.execute(maxQuery);
            const initialId = (maxRows[0] && maxRows[0].start_id) ? maxRows[0].start_id : 0;
            console.log(`[INIT VOID SUCCESS] Tidak ada void hari ini. Watermark diset ke ID maksimal: ${initialId}`);
            return initialId;
        }
    } catch (e) {
        console.error('[INIT VOID ERROR] Gagal inisialisasi, fallback ke ID 0:', e.message);
        return 0;
    }
}

// ==========================================
// 3. LOGIKA UTAMA SINKRONISASI
// ==========================================
async function runSyncAgent() {
    console.log(`[${getLocalISOString(new Date())}] [START] Menjalankan Sync Agent Inventory...`);
    console.log(`[CONFIG] Lantai: ${targetFloor} (${STORE_ID}) | Database: ${DB_CONFIG.database}`);
    console.log(`[CONFIG] Mode: ${IS_TEST_MODE ? 'TESTING (HISTORIS)' : 'PRODUKSI (INCREMENTAL)'}`);

    let connection;
    try {
        // 1. Koneksi ke Database MySQL
        connection = await mysql.createConnection(DB_CONFIG);
        console.log(`[DB SUCCESS] Terhubung ke MySQL.`);

        // =====================================================================
        // SINKRONISASI PENJUALAN (SALES)
        // =====================================================================
        let salesQuery = '';
        let salesQueryParams = [];

        if (IS_TEST_MODE) {
            if (TEST_TRANSACTION_ID) {
                console.log(`[TESTING SALES] Mencari data khusus untuk ID Transaksi: ${TEST_TRANSACTION_ID}`);
                salesQuery = `
                    SELECT 
                        h.\`Primary\` AS id,
                        h.\`No Penjualan\` AS no_faktur,
                        h.\`Tanggal\` AS tgl_penjualan,
                        h.\`Jam\` AS jam_penjualan,
                        d.\`ID Barang\` AS kode_barcode,
                        COALESCE(p.\`Nama Pegawai\`, h.\`ID Pegawai\`, 'Unknown Sales') AS nama_sales
                    FROM tblpenjualan h
                    JOIN tblpenjualanitem d ON h.\`Primary\` = d.\`PrimaryTransaksi\`
                    LEFT JOIN tblpegawai p ON TRIM(h.\`ID Pegawai\`) = TRIM(p.\`Nomor Identitas Pegawai\`)
                    WHERE h.\`Primary\` = ?
                `;
                salesQueryParams = [TEST_TRANSACTION_ID];
            } else {
                console.log(`[TESTING SALES] Mencari 3 transaksi historis terakhir...`);
                salesQuery = `
                    SELECT 
                        h.\`Primary\` AS id,
                        h.\`No Penjualan\` AS no_faktur,
                        h.\`Tanggal\` AS tgl_penjualan,
                        h.\`Jam\` AS jam_penjualan,
                        d.\`ID Barang\` AS kode_barcode,
                        COALESCE(p.\`Nama Pegawai\`, h.\`ID Pegawai\`, 'Unknown Sales') AS nama_sales
                    FROM tblpenjualan h
                    JOIN tblpenjualanitem d ON h.\`Primary\` = d.\`PrimaryTransaksi\`
                    LEFT JOIN tblpegawai p ON TRIM(h.\`ID Pegawai\`) = TRIM(p.\`Nomor Identitas Pegawai\`)
                    ORDER BY h.\`Primary\` DESC
                    LIMIT 3
                `;
            }
        } else {
            // Mode Produksi (Incremental Watermark)
            let lastSalesId = getLastSyncedId(STATE_FILE);
            if (lastSalesId === 0) {
                lastSalesId = await initializeColdStart(connection);
                saveLastSyncedId(STATE_FILE, lastSalesId);
            }

            console.log(`[PRODUKSI SALES] Membaca data baru dari ID watermark: ${lastSalesId}`);
            salesQuery = `
                SELECT 
                    h.\`Primary\` AS id,
                    h.\`No Penjualan\` AS no_faktur,
                    h.\`Tanggal\` AS tgl_penjualan,
                    h.\`Jam\` AS jam_penjualan,
                    d.\`ID Barang\` AS kode_barcode,
                    COALESCE(p.\`Nama Pegawai\`, h.\`ID Pegawai\`, 'Unknown Sales') AS nama_sales
                FROM tblpenjualan h
                JOIN tblpenjualanitem d ON h.\`Primary\` = d.\`PrimaryTransaksi\`
                LEFT JOIN tblpegawai p ON TRIM(h.\`ID Pegawai\`) = TRIM(p.\`Nomor Identitas Pegawai\`)
                WHERE h.\`Primary\` IN (
                    SELECT \`Primary\` FROM (
                        SELECT \`Primary\` FROM tblpenjualan 
                        WHERE \`Primary\` > ? 
                        ORDER BY \`Primary\` ASC 
                        LIMIT 50
                    ) tmp
                )
                ORDER BY h.\`Primary\` ASC
            `;
            salesQueryParams = [lastSalesId];
        }

        // Eksekusi Query Penjualan
        const [salesRows] = await connection.execute(salesQuery, salesQueryParams);
        console.log(`[EXTRACT SALES] Mengambil ${salesRows.length} baris penjualan.`);

        // Pre-Filtering Regex Barcode Emas secara lokal
        const validSalesRows = salesRows.filter(row => row.kode_barcode && GOLD_PREFIX_REGEX.test(row.kode_barcode.trim()));
        console.log(`[FILTER SALES] Menyaring ${validSalesRows.length} baris penjualan emas.`);

        if (validSalesRows.length > 0) {
            // Struktur Payload Penjualan
            const salesPayload = {
                store_id: STORE_ID,
                is_test_payload: IS_TEST_MODE,
                synced_at: new Date().toISOString(),
                sales_data: validSalesRows.map(row => ({
                    desktop_item_id: row.id,
                    invoice_no: row.no_faktur,
                    barcode: row.kode_barcode.trim().toUpperCase(),
                    tanggal_penjualan: formatMySQLDateTime(row.tgl_penjualan, row.jam_penjualan),
                    nama_sales: row.nama_sales || 'Unknown Sales'
                }))
            };

            // Kirim HTTP POST ke Cloud Functions (Sales)
            console.log(`[POST SALES] Mengirim payload ke ${WEBHOOK_SALES_URL}...`);
            const salesResponse = await axios.post(WEBHOOK_SALES_URL, salesPayload, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': SYNC_API_KEY
                },
                family: 4,
                timeout: 10000
            });

            console.log(`[SERVER SALES RESPONSE] Status Kode: ${salesResponse.status}`);

            // Update Watermark Penjualan
            if (!IS_TEST_MODE && salesResponse.status >= 200 && salesResponse.status < 300) {
                let maxSalesId = getLastSyncedId(STATE_FILE);
                salesRows.forEach(r => { if (r.id > maxSalesId) maxSalesId = r.id; });
                saveLastSyncedId(STATE_FILE, maxSalesId);
                console.log(`[SUCCESS SALES] Watermark diperbarui ke ID: ${maxSalesId}`);
            }
        } else {
            console.log(`[SUPPRESSION SALES] Tidak ada transaksi penjualan emas baru.`);
        }

        // =====================================================================
        // SINKRONISASI PEMBATALAN (VOID)
        // =====================================================================
        if (!IS_TEST_MODE) {
            let lastVoidId = getLastSyncedId(VOID_STATE_FILE);
            if (lastVoidId === 0) {
                lastVoidId = await initializeVoidColdStart(connection);
                saveLastSyncedId(VOID_STATE_FILE, lastVoidId);
            }

            console.log(`[PRODUKSI VOID] Membaca data baru dari ID watermark: ${lastVoidId}`);
            const voidQuery = `
                SELECT 
                    \`Primary\` AS id,
                    \`No Penjualan\` AS no_faktur,
                    \`ID Barang\` AS kode_barcode,
                    \`Tanggal Hapus\` AS tgl_hapus,
                    \`Jam\` AS jam_hapus,
                    \`Dihapus Oleh\` AS dihapus_oleh
                FROM tblsejarahpenjualanhapus
                WHERE \`Primary\` > ?
                ORDER BY \`Primary\` ASC
                LIMIT 100
            `;

            const [voidRows] = await connection.execute(voidQuery, [lastVoidId]);
            console.log(`[EXTRACT VOID] Mengambil ${voidRows.length} baris void.`);

            // Pre-Filtering Regex Barcode Emas secara lokal untuk void
            const validVoidRows = voidRows.filter(row => row.kode_barcode && GOLD_PREFIX_REGEX.test(row.kode_barcode.trim()));
            console.log(`[FILTER VOID] Menyaring ${validVoidRows.length} baris void emas.`);

            if (validVoidRows.length > 0) {
                // Struktur Payload Void
                const voidPayload = {
                    store_id: STORE_ID,
                    synced_at: new Date().toISOString(),
                    void_data: validVoidRows.map(row => ({
                        void_item_id: row.id,
                        invoice_no: row.no_faktur,
                        barcode: row.kode_barcode.trim().toUpperCase(),
                        tanggal_void: formatMySQLDateTime(row.tgl_hapus, row.jam_hapus),
                        dihapus_oleh: row.dihapus_oleh || 'Unknown Admin'
                    }))
                };

                // Kirim HTTP POST ke Cloud Functions (Void)
                console.log(`[POST VOID] Mengirim payload ke ${WEBHOOK_VOID_URL}...`);
                const voidResponse = await axios.post(WEBHOOK_VOID_URL, voidPayload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': SYNC_API_KEY
                    },
                    family: 4,
                    timeout: 10000
                });

                console.log(`[SERVER VOID RESPONSE] Status Kode: ${voidResponse.status}`);

                // Update Watermark Void
                if (voidResponse.status >= 200 && voidResponse.status < 300) {
                    let maxVoidId = lastVoidId;
                    voidRows.forEach(r => { if (r.id > maxVoidId) maxVoidId = r.id; });
                    saveLastSyncedId(VOID_STATE_FILE, maxVoidId);
                    console.log(`[SUCCESS VOID] Watermark diperbarui ke ID: ${maxVoidId}`);
                }
            } else {
                console.log(`[SUPPRESSION VOID] Tidak ada transaksi void emas baru.`);
            }
        }

    } catch (e) {
        console.error('[CRITICAL ERROR] Proses gagal:', e.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('[DB CLOSED] Hubungan database diputus.');
        }
        console.log(`[${getLocalISOString(new Date())}] [FINISH] Agen selesai berjalan.\n`);
    }
}

// Konfigurasi Interval Sinkronisasi (30 Detik)
const SYNC_INTERVAL_MS = 30000;

async function startDaemon() {
    try {
        await runSyncAgent();
    } catch (e) {
        console.error('[DAEMON ERROR] Gagal mengeksekusi runSyncAgent:', e.message);
    }
    console.log(`[DAEMON] Menunggu ${SYNC_INTERVAL_MS / 1000} detik sebelum eksekusi berikutnya...\n`);
    setTimeout(startDaemon, SYNC_INTERVAL_MS);
}

// Mulai Daemon
startDaemon();
