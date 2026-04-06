// composables/useConnectionMonitor.js
import { ref, onUnmounted } from "vue";
import { ref as dbRef, onValue, off } from "firebase/database";
import { rtdb } from "@/config/firebase";

export function useConnectionMonitor() {
  const isConnected = ref(true);
  const connRef = dbRef(rtdb, ".info/connected");

  function startMonitoring() {
    onValue(connRef, (snap) => {
      isConnected.value = snap.val() === true;
    });
  }

  function stopMonitoring() {
    off(connRef);
  }

  // Auto-cleanup jika dipakai langsung dalam komponen
  onUnmounted(stopMonitoring);

  return { isConnected, startMonitoring, stopMonitoring };
}
