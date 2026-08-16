// get-start-id.cjs - Helper untuk mencari ID awal transaksi berdasarkan tanggal
const mysql = require('mysql2/promise');

const args = process.argv.slice(2);
const targetFloor = (args[0] || 'L1').toUpperCase();
const targetDate = args[1] || '2026-08-01';

const DB_CONFIG = {
    host: '192.168.18.180',
    port: 3307,
    user: 'root',
    password: '123',
    database: targetFloor === 'L2' ? 'core_dbtokomasmelatiatas' : 'core_dbtokomasmelatibawah',
    insecureAuth: true
};

async function main() {
    console.log(`[MySQL] Menghubungkan ke database ${targetFloor} (${DB_CONFIG.database})...`);
    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        const query = `SELECT MIN(\`Primary\`) AS start_id FROM tblpenjualan WHERE \`Tanggal\` = ?;`;
        const [rows] = await connection.execute(query, [targetDate]);
        
        if (rows[0] && rows[0].start_id) {
            const startId = rows[0].start_id;
            console.log(`\n==================================================`);
            console.log(`Lantai:      ${targetFloor}`);
            console.log(`Tanggal:     ${targetDate}`);
            console.log(`ID Pertama:  ${startId}`);
            console.log(`--------------------------------------------------`);
            console.log(`👉 Silakan isi JSON dengan last_id: ${startId - 1}`);
            console.log(`==================================================\n`);
        } else {
            console.log(`\n[!] Tidak ditemukan transaksi penjualan pada tanggal ${targetDate} di Lantai ${targetFloor}.\n`);
        }
    } catch (e) {
        console.error("[ERROR]", e.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

main();
