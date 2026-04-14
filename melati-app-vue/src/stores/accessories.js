import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { db } from "@/config/firebase";
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import {
  fetchCatalog,
  fetchCurrentStockMap,
  fetchSalesCatalogWithComputedStock,
  fetchTransactions,
  processSale,
  deleteSale,
  updateSale,
  updateSaleFull,
  verifySupervisorPassword,
  verifyEditPassword,
} from "@/services/stock-service";

export const useAccessoriesStore = defineStore("accessories", () => {
  // ─── State ───────────────────────────────────────────────────────────────
  const catalog = ref([]); // stokAksesoris master (cache-first)
  const salesCatalog = ref([]); // stokAksesoris for sales transaction (computed stock)
  const catalogLoadedAt = ref(null); // timestamp last full load
  const transactions = ref([]); // current view transactions
  const lastTransactionDoc = ref(null);
  const hasMoreTransactions = ref(false);
  const todayListener = ref(null); // onSnapshot unsubscribe fn
  const isLoading = ref(false);

  // ─── Getters ─────────────────────────────────────────────────────────────
  const activeItems = computed(() => catalog.value.filter((c) => c.isActive !== false));
  const activeSalesItems = computed(() => salesCatalog.value.filter((c) => c.isActive !== false));

  const getStockByKode = computed(() => (kode) => {
    const item = catalog.value.find((c) => c.kode === kode);
    return item ? (item.stok ?? 0) : 0;
  });

  // ─── Catalog actions ──────────────────────────────────────────────────────

  /** Load catalog from Firestore with real-time stock calculation (cache-first: skip if already loaded) */
  async function loadCatalog(force = false) {
    if (!force && catalog.value.length > 0) return;
    isLoading.value = true;
    try {
      const [items, stockMap] = await Promise.all([fetchCatalog(), fetchCurrentStockMap()]);
      catalog.value = items.map((item) => ({
        ...item,
        stok: stockMap.get(item.kode) ?? item.stok ?? 0,
      }));
      catalogLoadedAt.value = Date.now();
    } finally {
      isLoading.value = false;
    }
  }

  /** Load catalog for sales transaction with computed stock (legacy-compatible). */
  async function loadSalesCatalog(force = false) {
    if (!force && salesCatalog.value.length > 0) return;
    isLoading.value = true;
    try {
      salesCatalog.value = await fetchSalesCatalogWithComputedStock();
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Refresh stock values from computed stock map for selected kodes.
   * Uses one batched read path instead of per-kode document reads.
   * @param {string[]} kodes
   */
  async function refreshComputedStocks(kodes = []) {
    if (!catalog.value.length && !salesCatalog.value.length) return;
    const stockMap = await fetchCurrentStockMap();
    const filter = kodes.length ? new Set(kodes) : null;

    const applyMap = (items) =>
      items.map((item) => {
        if (filter && !filter.has(item.kode)) return item;
        return {
          ...item,
          stok: stockMap.get(item.kode) ?? item.stok ?? 0,
        };
      });

    if (catalog.value.length) catalog.value = applyMap(catalog.value);
    if (salesCatalog.value.length) salesCatalog.value = applyMap(salesCatalog.value);
  }

  /**
   * Backward-compatible single-kode refresher used by cross-tab listeners.
   * @param {string} kode
   */
  async function refreshSingleStock(kode) {
    await refreshComputedStocks([kode]);
  }

  // ─── Transaction actions ─────────────────────────────────────────────────

  /**
   * Subscribe to today's transactions via onSnapshot.
   * Use this in DataPenjualanView for live updates.
   */
  function startTodayListener(dateStr) {
    stopTodayListener();

    // Build timestamp range for the given date (defaults to today)
    const base = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
    const startOfDay = new Date(base);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(base);
    endOfDay.setHours(23, 59, 59, 999);

    // Query by timestamp range — same as old dataPenjualan.js setupDateListener.
    // Single-field orderBy on the same field used in where() → no composite index needed.
    const q = query(
      collection(db, "penjualanAksesoris"),
      where("timestamp", ">=", Timestamp.fromDate(startOfDay)),
      where("timestamp", "<=", Timestamp.fromDate(endOfDay)),
      orderBy("timestamp", "desc"),
      limit(200),
    );

    todayListener.value = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        const data = { id: change.doc.id, ...change.doc.data() };
        if (change.type === "added") {
          const exists = transactions.value.find((t) => t.id === data.id);
          if (!exists) transactions.value.unshift(data);
        } else if (change.type === "modified") {
          const idx = transactions.value.findIndex((t) => t.id === data.id);
          if (idx !== -1) transactions.value[idx] = data;
        } else if (change.type === "removed") {
          transactions.value = transactions.value.filter((t) => t.id !== data.id);
        }
      });
    });
  }

  function stopTodayListener() {
    if (todayListener.value) {
      todayListener.value();
      todayListener.value = null;
    }
  }

  /**
   * Load transactions for a date range (getDocs one-shot, for reports/filter).
   * @param {string} startDate YYYY-MM-DD
   * @param {string} endDate   YYYY-MM-DD
   * @param {boolean} append   If true, append to existing (load more)
   */
  async function loadTransactions(startDate, endDate, append = false) {
    isLoading.value = true;
    try {
      const cursor = append ? lastTransactionDoc.value : null;
      const result = await fetchTransactions(startDate, endDate, 200, cursor);
      if (append) {
        transactions.value = [...transactions.value, ...result.docs];
      } else {
        transactions.value = result.docs;
      }
      lastTransactionDoc.value = result.lastDoc;
      hasMoreTransactions.value = result.hasMore;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Save a new sale transaction atomically.
   * @param {Array}  cartItems      cart items
   * @param {Object} transactionData header fields
   * @returns {string} new sale ID
   */
  async function saveTransaction(cartItems, transactionData) {
    const saleId = await processSale(cartItems, transactionData);

    const affectedKodes = [
      ...cartItems.filter((i) => i.tipe !== "manual" && i.kode).map((i) => i.kode),
      ...cartItems.filter((i) => i.tipe === "manual" && i.kodeLock).map((i) => i.kodeLock),
    ];
    await refreshComputedStocks([...new Set(affectedKodes)]);

    // Notify cross-tab
    notifyStockChanged(affectedKodes);

    return saleId;
  }

  /**
   * Delete a sale and restore stock atomically.
   * @param {string} saleId
   * @param {Object} saleData
   */
  async function removeTransaction(saleId, saleData) {
    await deleteSale(saleId, saleData);

    const affectedKodes = [
      ...(saleData.items ?? [])
        .filter((i) => i.tipe !== "manual")
        .map((i) => i.kode || i.kodeText)
        .filter(Boolean),
      ...(saleData.items ?? []).filter((i) => i.tipe === "manual" && i.kodeLock).map((i) => i.kodeLock),
    ];
    await refreshComputedStocks([...new Set(affectedKodes)]);
    notifyStockChanged(affectedKodes);
  }

  /**
   * Verify supervisor password.
   * @param {string} password
   * @returns {boolean}
   */
  async function verifySupervisor(password) {
    return verifySupervisorPassword(password);
  }

  /**
   * Update sale metadata fields (non-destructive, no stock side effects).
   * @param {string} saleId
   * @param {Object} updates
   */
  async function updateTransaction(saleId, updates) {
    await updateSale(saleId, updates);
    // Patch in-memory
    const idx = transactions.value.findIndex((t) => t.id === saleId);
    if (idx !== -1) transactions.value[idx] = { ...transactions.value[idx], ...updates };
  }

  /**
   * Full update for a sale (items, salesName, totalHarga, etc.). No stock side effects.
   * @param {string} saleId
   * @param {Object} updates
   */
  async function updateTransactionFull(saleId, updates) {
    await updateSaleFull(saleId, updates);
    const idx = transactions.value.findIndex((t) => t.id === saleId);
    if (idx !== -1) transactions.value[idx] = { ...transactions.value[idx], ...updates };
  }

  /**
   * Verify edit access password (settings/passwords.editDataPenjualan).
   * @param {string} password
   * @returns {boolean}
   */
  async function verifyEditAccess(password) {
    return verifyEditPassword(password);
  }

  // ─── Cross-tab sync ──────────────────────────────────────────────────────

  function notifyStockChanged(kodes) {
    try {
      localStorage.setItem("stokAksesorisChanged", JSON.stringify({ kodes, ts: Date.now() }));
    } catch (_) {
      /* silent */
    }
  }

  return {
    // State
    catalog,
    salesCatalog,
    catalogLoadedAt,
    transactions,
    lastTransactionDoc,
    hasMoreTransactions,
    isLoading,
    // Getters
    activeItems,
    activeSalesItems,
    getStockByKode,
    // Actions
    loadCatalog,
    loadSalesCatalog,
    refreshComputedStocks,
    refreshSingleStock,
    startTodayListener,
    stopTodayListener,
    loadTransactions,
    saveTransaction,
    removeTransaction,
    updateTransaction,
    updateTransactionFull,
    verifySupervisor,
    verifyEditAccess,
    notifyStockChanged,
  };
});
