import { defineStore } from "pinia";
import { ref as dbRef, onValue, update, off, serverTimestamp } from "firebase/database";
import { rtdb } from "@/config/firebase";

export const useQueueStore = defineStore("queue", {
  state: () => ({
    current: { letter: "", number: 0, displayText: "-", calledAt: null },
    counters: { A: 0, B: 0, C: 0, D: 0 },
    skipList: [],
    history: [],
    customerCount: 0,
    status: "active",
    isConnected: true,
  }),

  actions: {
    // ── Listeners ─────────────────────────────────────────────────────────────
    startListening(onNewQueue) {
      const qRef = dbRef(rtdb, "queue");
      const countRef = dbRef(rtdb, "customerCount");
      const connRef = dbRef(rtdb, ".info/connected");

      onValue(connRef, (snap) => {
        this.isConnected = snap.val() === true;
      });

      onValue(countRef, (snap) => {
        this.customerCount = snap.val()?.count || 0;
      });

      let prevDisplay = this.current.displayText;
      onValue(qRef, (snap) => {
        const data = snap.val() || {};
        if (data.current) {
          const newDisplay = data.current.displayText;
          if (onNewQueue && prevDisplay !== "-" && newDisplay !== prevDisplay) {
            onNewQueue();
          }
          prevDisplay = newDisplay;
          this.current = data.current;
        }
        this.counters = data.counters || { A: 0, B: 0, C: 0, D: 0 };
        this.skipList = data.skipList ? Object.values(data.skipList) : [];
        this.history = data.history ? Object.values(data.history) : [];
        this.status = data.status || "active";
      });
    },

    stopListening() {
      off(dbRef(rtdb, "queue"));
      off(dbRef(rtdb, "customerCount"));
      off(dbRef(rtdb, ".info/connected"));
    },

    // ── Queue operations ──────────────────────────────────────────────────────
    async callNext() {
      const { letter, number } = this.current;
      const nextNum = (number || 0) + 1;
      if (nextNum > 50) return;

      await update(dbRef(rtdb, "queue/current"), {
        letter,
        number: nextNum,
        displayText: `${letter}${nextNum}`,
        calledAt: Date.now(),
      });
    },

    async skipCurrent() {
      const skipKey = `skip_${Date.now()}`;
      await update(dbRef(rtdb, `queue/skipList/${skipKey}`), {
        ...this.current,
        skippedAt: Date.now(),
      });
      await this.callNext();
    },

    async callPrevious() {
      const { letter, number } = this.current;
      if (number <= 1) return;
      await update(dbRef(rtdb, "queue/current"), {
        letter,
        number: number - 1,
        displayText: `${letter}${number - 1}`,
        calledAt: Date.now(),
      });
    },

    async resetAll() {
      await update(dbRef(rtdb, "queue"), {
        current: { letter: "A", number: 0, displayText: "-", calledAt: null },
        counters: { A: 0, B: 0, C: 0, D: 0 },
        skipList: null,
        history: null,
      });
      await update(dbRef(rtdb, "customerCount"), { count: 0, date: new Date().toISOString().slice(0, 10) });
    },

    async incrementCustomer() {
      await update(dbRef(rtdb, "customerCount"), {
        count: this.customerCount + 1,
        date: new Date().toISOString().slice(0, 10),
      });
    },

    async decrementCustomer() {
      if (this.customerCount <= 0) return;
      await update(dbRef(rtdb, "customerCount"), {
        count: this.customerCount - 1,
        date: new Date().toISOString().slice(0, 10),
      });
    },

    setActiveLetter(letter) {
      update(dbRef(rtdb, "queue/current"), {
        letter,
        number: 0,
        displayText: "-",
        calledAt: null,
      });
    },
  },
});
