import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { get, ref, onValue } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { rtdb } from "./configFirebase.js";

document.addEventListener("DOMContentLoaded", () => {
  const queueRef = ref(rtdb, "queue");

  // Setup realtime listener
  onValue(
    queueRef,
    (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      // Update current queue number
      const currentQueueNumber = `${["A", "B", "C", "D"][data.currentLetter]}${String(data.currentNumber - 1).padStart(2, "0")}`;
      const queueNumberElement = document.getElementById("queueNumber");
      if (queueNumberElement) {
        const oldNumber = queueNumberElement.textContent;
        if (oldNumber !== currentQueueNumber) {
          queueNumberElement.textContent = currentQueueNumber;
          queueNumberElement.classList.add("active");
          setTimeout(() => {
            queueNumberElement.classList.remove("active");
          }, 2000);
        }
      }

      // Calculate next sequential queue number
      const nextNumber = data.currentNumber;
      const nextLetter = nextNumber > 50 ? data.currentLetter % 4 : data.currentLetter;
      const nextSequentialQueue = `${["A", "B", "C", "D"][nextLetter]}${String(nextNumber > 50 ? 1 : nextNumber).padStart(2, "0")}`;

      // Build "AKAN DIPANGGIL" display: missed first, then current, max 2 shown
      const missedQueue = data.missedQueue || [];
      let nextQueueDisplay;
      if (missedQueue.length > 0) {
        const items = [missedQueue[0], nextSequentialQueue];
        nextQueueDisplay = missedQueue.length > 1 ? `${items.join(", ")}, ...` : items.join(", ");
      } else {
        nextQueueDisplay = nextSequentialQueue;
      }

      const nextQueueElement = document.getElementById("nextQueueNumber");
      if (nextQueueElement) {
        const oldNext = nextQueueElement.textContent;
        if (oldNext !== nextQueueDisplay) {
          nextQueueElement.textContent = nextQueueDisplay;
          nextQueueElement.classList.add("active");
          setTimeout(() => nextQueueElement.classList.remove("active"), 2000);
        }
        // Adjust font size based on content length
        if (typeof adjustNextQueueFontSize === "function") {
          adjustNextQueueFontSize(nextQueueDisplay);
        }
      }

      // Update delayed queue display
      const delayQueueElement = document.getElementById("delayQueueNumber");
      if (delayQueueElement) {
        delayQueueElement.textContent = data.delayedQueue?.join(", ") || "-";
      }
    },
    (error) => {
      console.error("Firebase connection error:", error);
    },
  );
});
