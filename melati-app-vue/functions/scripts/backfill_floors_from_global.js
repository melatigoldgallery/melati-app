#!/usr/bin/env node
/* Backfill floors' dailyStockSnapshot using global dailyStockSnapshot dates.
   Usage: node backfill_floors_from_global.js
*/

import admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

const SNAPSHOT_FLOORS = ["L1", "L2"];
const WITA_OFFSET = "+08:00";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toWitaParts(date = new Date()) {
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
  };
}

function formatDmy({ y, m, d }) {
  return `${pad2(d)}/${pad2(m)}/${y}`;
}

function toDateFromYmd(ymd, time = "00:00:00") {
  return new Date(`${ymd}T${time}${WITA_OFFSET}`);
}

async function aggregateTransactionsUntilByRef(endDate, txRef) {
  const endTs = admin.firestore.Timestamp.fromDate(endDate);
  const snap = await txRef.where("timestamp", "<=", endTs).get();

  const map = new Map();
  for (const docSnap of snap.docs) {
    const tx = docSnap.data();
    const kode = tx.kode;
    if (!kode) continue;

    if (!map.has(kode)) map.set(kode, 0);
    const jumlah = Number(tx.jumlah || 0);

    switch (tx.jenis) {
      case "tambah":
      case "stockAddition":
      case "initialStock":
        map.set(kode, map.get(kode) + jumlah);
        break;
      case "laku":
      case "free":
      case "gantiLock":
      case "return":
        map.set(kode, map.get(kode) - jumlah);
        break;
      case "adjustment":
        map.set(kode, tx.stokSesudah || map.get(kode));
        break;
      default:
        break;
    }
  }

  return map;
}

async function buildSnapshotStockDataForScope(yesterdayYmd, catalogRef, txRef) {
  const endOfYesterday = toDateFromYmd(yesterdayYmd, "23:59:59");
  const catalogSnap = await catalogRef.get();
  const stockByKode = await aggregateTransactionsUntilByRef(endOfYesterday, txRef);

  const stockData = [];
  const catalogKodes = new Set();

  for (const itemDoc of catalogSnap.docs) {
    const item = itemDoc.data();
    const kode = item.kode || itemDoc.id;
    catalogKodes.add(kode);
    const stokAkhirYesterday = Math.max(0, Number(stockByKode.get(kode) || 0));

    stockData.push({
      kode,
      nama: item.nama || "",
      kategori: item.kategori || "",
      stokAkhir: stokAkhirYesterday,
    });
  }

  for (const [kode, stok] of stockByKode.entries()) {
    if (!catalogKodes.has(kode)) {
      stockData.push({ kode, nama: "", kategori: "", stokAkhir: Math.max(0, Number(stok || 0)) });
    }
  }

  return stockData;
}

function computeDailyStockReportsFromStockData(stockData = [], snapshotDateYmd = "") {
  const mainCategories = [
    "KALUNG",
    "LIONTIN",
    "ANTING",
    "CINCIN",
    "HALA & SDW",
    "GELANG",
    "GIWANG",
    "KENDARI & EMAS BALI",
    "BERLIAN",
  ];

  const items = {};
  const breakdown = {};

  for (const cat of mainCategories) {
    items[cat] = { total: 0, komputer: 0, status: "Belum ada data" };
    breakdown[cat] = {};
  }

  for (const item of stockData) {
    const cat = String(item?.kategori || "")
      .trim()
      .toUpperCase();
    if (!cat || !items[cat]) continue;
    items[cat].total += Math.max(0, Number(item?.stokAkhir || 0));
  }

  for (const cat of mainCategories) {
    items[cat].status = items[cat].total === 0 ? "Belum ada data" : "Klop";
  }

  return {
    date: snapshotDateYmd,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    items,
    breakdown,
    createdBy: "backfill-script",
    version: "1.0",
  };
}

async function run() {
  console.log("Starting backfill: reading global dailyStockSnapshot dates...");
  const globalSnapCol = db.collection("dailyStockSnapshot");
  const globalSnapDocs = await globalSnapCol.get();
  if (globalSnapDocs.empty) {
    console.log("No global snapshots found. Aborting.");
    process.exit(0);
  }

  const dates = Array.from(globalSnapDocs.docs)
    .map((d) => d.id || d.data().dateYmd)
    .filter(Boolean);
  dates.sort();

  for (const floor of SNAPSHOT_FLOORS) {
    console.log(`Processing floor ${floor}...`);
    const floorCatalogRef = db.collection("floors").doc(floor).collection("stokAksesoris");
    const floorTxRef = db.collection("floors").doc(floor).collection("stokAksesorisTransaksi");
    const floorSnapCol = db.collection("floors").doc(floor).collection("dailyStockSnapshot");
    const floorReportsCol = db.collection("floors").doc(floor).collection("dailyStockReports");

    for (const dateYmd of dates) {
      try {
        const exists = await floorSnapCol.doc(dateYmd).get();
        if (exists.exists) {
          // skip
          continue;
        }

        console.log(`Creating snapshot for ${floor} ${dateYmd} ...`);
        const stockData = await buildSnapshotStockDataForScope(dateYmd, floorCatalogRef, floorTxRef);

        await floorSnapCol.doc(dateYmd).set({
          date: formatDmy(toWitaParts(toDateFromYmd(dateYmd, "00:00:00"))),
          dateYmd,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          totalItems: stockData.length,
          stockData,
          createdBy: "backfill-script",
          version: "3.0",
        });

        const reportDoc = floorReportsCol.doc(dateYmd);
        const reportSnap = await reportDoc.get();
        if (!reportSnap.exists) {
          await reportDoc.set({
            ...computeDailyStockReportsFromStockData(stockData, dateYmd),
            snapshotDateKey: formatDmy(toWitaParts(toDateFromYmd(dateYmd, "00:00:00"))),
            source: "snapshot-backfill",
          });
        }
        console.log(`Created snapshot for ${floor} ${dateYmd} (items=${stockData.length})`);
      } catch (err) {
        console.error(`Error creating snapshot for ${floor} ${dateYmd}:`, err.message || err);
      }
    }
  }

  console.log("Backfill complete.");
  process.exit(0);
}

run().catch((e) => {
  console.error("Backfill failed:", e);
  process.exit(2);
});
