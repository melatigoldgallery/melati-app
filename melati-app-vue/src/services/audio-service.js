// Audio service untuk sistem antrian — ported dari audioHandlers.js
// Import audio files as Vite modules for proper resolution
import informasiAudio from "@/public/audio/informasi.mp3?url";
import antrianAudio from "@/public/audio/antrian.mp3?url";
import informasiEndAudio from "@/public/audio/informasiEnd.mp3?url";
import notifOnAudio from "@/public/audio/notifOn.mp3?url";
import failedAudio from "@/public/audio/failed.mp3?url";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/config/firebase";
import { subscribeClosingAnnouncementSettings } from "@/services/antrian-closing-service";
import { requireActiveFloor } from "@/config/floor-config";

const AUDIO_PATHS = {
  informasi: informasiAudio,
  antrian: antrianAudio,
  informasiEnd: informasiEndAudio,
  notifOn: notifOnAudio,
  failed: failedAudio,
};

let isAudioPlaying = false;
let audioCtx = null;
let currentTTSAudio = null;

export function isAudioBusy() {
  return isAudioPlaying;
}

// Helper to perform audio ducking in Electron environment
async function withDucking(estimatedDuration, playFn) {
  const hasElectronAPI = typeof window !== "undefined" && window.electronAPI;
  
  if (hasElectronAPI && typeof window.electronAPI.panggilAntreanDim === "function") {
    try {
      await window.electronAPI.panggilAntreanDim(estimatedDuration);
    } catch (err) {
      console.error("Failed to start audio ducking:", err);
    }
  }

  try {
    return await playFn();
  } finally {
    if (hasElectronAPI && typeof window.electronAPI.panggilAntreanUnduck === "function") {
      try {
        await window.electronAPI.panggilAntreanUnduck();
      } catch (err) {
        console.error("Failed to stop audio ducking:", err);
      }
    }
  }
}

export function cancelAllAudio() {
  window.speechSynthesis.cancel();
  if (currentTTSAudio) {
    try {
      currentTTSAudio.pause();
      currentTTSAudio.src = "";
    } catch (_) {}
    currentTTSAudio = null;
  }
  isAudioPlaying = false;
}

function playAudio(audioPath) {
  return new Promise((resolve) => {
    const audio = new Audio(audioPath);
    audio.addEventListener("ended", resolve, { once: true });
    audio.play().catch((err) => {
      console.error(`Error playing audio ${audioPath}:`, err);
      resolve();
    });
  });
}

function speakNativeFallback(text, rate = 0.85, pitch = 1.2) {
  if (!("speechSynthesis" in window)) {
    console.warn("Text-to-speech tidak didukung");
    return Promise.resolve();
  }

  window.speechSynthesis.cancel();

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = rate;
    utterance.pitch = pitch;

    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find((v) => v.lang.includes("id"));
    if (idVoice) utterance.voice = idVoice;

    utterance.onend = resolve;
    utterance.onerror = () => {
      resolve();
    };

    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 0);
  });
}

let ttsSettings = {
  provider: localStorage.getItem("google_tts_provider") || "translate",
  voiceName: localStorage.getItem("google_tts_voice_name") || "id-ID-Wavenet-A",
  pitch: parseFloat(localStorage.getItem("google_tts_pitch") || "0.0"),
  rate: parseFloat(localStorage.getItem("google_tts_rate") || "0.85"),
  subscribedFloorId: null,
};

let ttsUnsubscribe = null;

export function ensureTtsSubscription() {
  let activeFloorId = "";
  try {
    activeFloorId = requireActiveFloor();
  } catch (err) {
    console.warn("Active floor not set yet, using fallback or cached settings:", err.message);
    return;
  }

  if (ttsSettings.subscribedFloorId === activeFloorId) return;

  if (ttsUnsubscribe) {
    ttsUnsubscribe();
    ttsUnsubscribe = null;
  }

  try {
    ttsUnsubscribe = subscribeClosingAnnouncementSettings((settings) => {
      ttsSettings.provider = settings.ttsProvider || "translate";
      ttsSettings.voiceName = settings.ttsVoiceName || "id-ID-Wavenet-A";
      ttsSettings.pitch = typeof settings.ttsPitch === "number" ? settings.ttsPitch : 0.0;
      ttsSettings.rate = typeof settings.ttsRate === "number" ? settings.ttsRate : 0.85;

      // Update fallback local storage
      localStorage.setItem("google_tts_provider", ttsSettings.provider);
      localStorage.setItem("google_tts_voice_name", ttsSettings.voiceName);
      localStorage.setItem("google_tts_pitch", String(ttsSettings.pitch));
      localStorage.setItem("google_tts_rate", String(ttsSettings.rate));
    }, activeFloorId);
    ttsSettings.subscribedFloorId = activeFloorId;
  } catch (err) {
    console.warn("Failed to subscribe to global TTS settings:", err);
  }
}

function playGoogleTTS(text, rate = null, pitch = 1.2, ttsOptions = null) {
  if (currentTTSAudio) {
    try {
      currentTTSAudio.pause();
      currentTTSAudio.src = "";
    } catch (_) {}
    currentTTSAudio = null;
  }

  ensureTtsSubscription();
  const provider = ttsOptions?.provider || ttsSettings.provider;
  const voiceName = ttsOptions?.voiceName || ttsSettings.voiceName;
  const googleTtsPitch = ttsOptions?.pitch !== undefined ? ttsOptions.pitch : ttsSettings.pitch;
  const resolvedRate = ttsOptions?.rate !== undefined ? ttsOptions.rate : (rate !== null ? rate : ttsSettings.rate);

  const getSpeechTTSCallable = httpsCallable(functions, "getSpeechTTS");

  return getSpeechTTSCallable({ text, provider, voiceName, pitch: googleTtsPitch })
    .then((result) => {
      const audioContent = result.data?.audioContent;
      if (!audioContent) {
        throw new Error("No audioContent in Cloud Function response");
      }
      
      const base64Url = `data:audio/mp3;base64,${audioContent}`;
      
      return new Promise((resolve) => {
        const audio = new Audio(base64Url);
        audio.playbackRate = resolvedRate; // Set matching speed (rate)
        currentTTSAudio = audio;

        audio.addEventListener("ended", () => {
          if (currentTTSAudio === audio) currentTTSAudio = null;
          resolve();
        }, { once: true });

        audio.addEventListener("error", (err) => {
          console.error("Google TTS audio error:", err);
          if (currentTTSAudio === audio) currentTTSAudio = null;
          resolve();
        }, { once: true });

        audio.play().catch((err) => {
          console.error("Failed to play Google TTS audio element:", err);
          if (currentTTSAudio === audio) currentTTSAudio = null;
          resolve();
        });
      });
    })
    .catch((err) => {
      console.error("Failed to get Google TTS from Cloud Function:", err);
      // Fallback: outside Electron (Chrome), use native browser voice
      const hasElectronAPI = typeof window !== "undefined" && window.electronAPI;
      if (!hasElectronAPI) {
        return speakNativeFallback(text, rate, pitch);
      }
      return Promise.resolve();
    });
}

export function speak(text, rate = null, pitch = 1.2, ttsOptions = null) {
  return playGoogleTTS(text, rate, pitch, ttsOptions);
}

// Tombol "Informasi Tunggu"
export async function playWaitMessageSequence() {
  if (isAudioPlaying) return false;

  const text = "Kepada Pelanggan Melati yang belum dilayani, kami mohon kesabarannya untuk menunggu pelayanan. Terima kasih atas perhatiannya";
  const textDuration = text.length * 80;
  const introOutroDuration = 7000;
  const totalDuration = introOutroDuration + textDuration + 1000;

  return withDucking(totalDuration, async () => {
    try {
      isAudioPlaying = true;
      await playAudio(AUDIO_PATHS.informasi);
      await speak(text);
      await playAudio(AUDIO_PATHS.informasiEnd);
      isAudioPlaying = false;
      return true;
    } catch (error) {
      console.error("Error playing wait message:", error);
      isAudioPlaying = false;
      return false;
    }
  });
}

// Tombol "Pengingat Antrian"
export async function playTakeQueueMessage() {
  if (isAudioPlaying) return false;

  const text = "Kepada pelanggan yang belum mendapat nomor antrian, harap mengambil nomor antrian terlebih dahulu di tempat yang sudah disediakan. Terima kasih atas perhatiannya";
  const textDuration = text.length * 80;
  const introOutroDuration = 7000;
  const totalDuration = introOutroDuration + textDuration + 1000;

  return withDucking(totalDuration, async () => {
    try {
      isAudioPlaying = true;
      await playAudio(AUDIO_PATHS.informasi);
      await speak(text);
      await playAudio(AUDIO_PATHS.informasiEnd);
      isAudioPlaying = false;
      return true;
    } catch (error) {
      console.error("Error playing take queue message:", error);
      isAudioPlaying = false;
      return false;
    }
  });
}

// Pengumuman penutupan toko
export async function playClosingAnnouncement(message) {
  if (isAudioPlaying) return false;

  const text = String(message || "").trim();
  const textDuration = text.length * 100;
  const introOutroDuration = 7000;
  const totalDuration = introOutroDuration + textDuration + 1000;

  return withDucking(totalDuration, async () => {
    try {
      isAudioPlaying = true;
      await playAudio(AUDIO_PATHS.informasi);
      await speak(text, 0.75, 1.2);
      await playAudio(AUDIO_PATHS.informasiEnd);
      isAudioPlaying = false;
      return true;
    } catch (error) {
      console.error("Error playing closing announcement:", error);
      isAudioPlaying = false;
      return false;
    }
  });
}

// Tombol "Panggil Nomor Antrian" — dengan audio prefix antrian.mp3 + TTS
export async function playQueueAnnouncement(queueNumber) {
  if (isAudioPlaying) return false;

  const letter = queueNumber.charAt(0);
  const numbers = queueNumber.substring(1);
  const text = `Nomor antrian, ${letter}, ${numbers.split("").join("")}, silahkan angkat tangan`;

  const textDuration = text.length * 80;
  const openingDuration = 3500;
  const totalDuration = openingDuration + textDuration + 1000;

  return withDucking(totalDuration, async () => {
    try {
      isAudioPlaying = true;

      const openingAudio = new Audio(AUDIO_PATHS.antrian);

      await new Promise((resolve) => {
        openingAudio.addEventListener(
          "ended",
          () => {
            playGoogleTTS(text).then(resolve);
          },
          { once: true },
        );

        openingAudio.play().catch((err) => {
          console.error("Error playing opening audio:", err);
          playGoogleTTS(text).then(resolve);
        });
      });

      isAudioPlaying = false;
      return true;
    } catch (error) {
      console.error("Error announcing queue:", error);
      isAudioPlaying = false;
      return false;
    }
  });
}

// Helper untuk normalisasi penyebutan kategori / nama jenis barang
export function formatCategorySpeech(category) {
  if (!category) return "barang";
  let clean = String(category).trim();
  const upper = clean.toUpperCase();
  
  // Kamus fallback jika yang dikirimkan adalah key/ID teknis
  const keyMap = {
    "CINCIN": "cincin",
    "GELANG": "gelang",
    "KALUNG": "kalung",
    "LIONTIN": "liontin",
    "ANTING": "anting",
    "GIWANG": "giwang",
    "HALA": "hala",
    "HALA & SDW": "hala dan S D W",
    "HALA_SDW": "hala dan S D W",
    "KENDARI & EMAS BALI": "kendari dan emas bali",
    "KENDARI": "emas kendari",
    "BERLIAN": "berlian",
  };
  if (keyMap[upper]) return keyMap[upper];

  // Normalisasi karakter untuk sintesis suara TTS bahasa Indonesia yang fasih
  clean = clean
    .replace(/&/g, " dan ")
    .replace(/[-_]+/g, " ")
    .replace(/\bSDW\b/gi, "S D W")
    .replace(/\bDP\b/gi, "D P")
    .replace(/\s+/g, " ")
    .trim();

  return clean.toLowerCase();
}

// Helper untuk normalisasi penyebutan lokasi / nama jenis tabel tujuan
export function formatDestinationSpeech(destination) {
  if (!destination) return "";
  let clean = String(destination).trim();
  const lower = clean.toLowerCase();

  // Kamus fallback jika yang dikirimkan adalah key teknis
  const map = {
    "barang-display": "display",
    "barang_display": "display",
    "display": "display",
    "brankas": "stok brankas",
    "stok-brankas": "stok brankas",
    "stok_brankas": "stok brankas",
    "posting": "belum posting",
    "belum-posting": "belum posting",
    "belum_posting": "belum posting",
    "admin": "sudah posting",
    "sudah-posting": "sudah posting",
    "sudah_posting": "sudah posting",
    "mutasi": "mutasi",
    "laku": "laku",
    "barang-rusak": "barang rusak",
    "barang_rusak": "barang rusak",
    "batu-lepas": "batu lepas",
    "batu_lepas": "batu lepas",
    "manual": "manual",
    "dp": "D P",
  };
  if (map[lower]) return map[lower];

  // Normalisasi string label agar TTS ramah didengar
  clean = clean
    .replace(/&/g, " dan ")
    .replace(/[-_]+/g, " ")
    .replace(/\bDP\b/gi, "D P")
    .replace(/\s+/g, " ")
    .trim();

  return clean.toLowerCase();
}

// Fungsi tunggal notifikasi audio untuk scan & mutasi inventaris
export async function playScanFeedback({
  success = true,
  salesName = "",
  count = 1,
  category = "barang",
  destination = "",
  errorMessage = "Pindah barang gagal"
} = {}) {
  try {
    if (success) {
      // 1. Putar chime notifOn
      await playAudio(AUDIO_PATHS.notifOn);
      // 2. Susun teks ucapan
      const catLabel = formatCategorySpeech(category);
      const namePart = salesName ? `Oke ${salesName}, ` : "";
      const destLabel = destination ? ` ke ${formatDestinationSpeech(destination)}` : "";
      const text = `${namePart}${count} ${catLabel} berhasil dipindahkan${destLabel}`;
      // 3. Ucapkan kalimat
      await speak(text);
    } else {
      // 1. Putar chime failed
      await playAudio(AUDIO_PATHS.failed);
      // 2. Ucapkan teks kegagalan
      await speak(errorMessage || "Pindah barang gagal");
    }
  } catch (err) {
    console.warn("playScanFeedback error:", err);
  }
}

// Prime AudioContext agar audio bisa diputar setelah interaksi user
export function primeAudioPlayback() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const buffer = audioCtx.createBuffer(1, 1, 22050);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);
    try {
      const u = new SpeechSynthesisUtterance("");
      u.volume = 0;
      window.speechSynthesis.speak(u);
      window.speechSynthesis.cancel();
    } catch (_) {}
  } catch (e) {
    console.warn("primeAudioPlayback failed", e);
  }
}

// Preload audio files
Object.values(AUDIO_PATHS).forEach((path) => {
  const audio = new Audio();
  audio.src = path;
  audio.preload = "auto";
});

// Keep TTS alive (Safari fix)
setInterval(() => {
  if (window.speechSynthesis?.speaking) {
    window.speechSynthesis.pause();
    window.speechSynthesis.resume();
  }
}, 5000);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    try {
      if (window.speechSynthesis?.paused) window.speechSynthesis.resume();
    } catch (_) {}
  }
});
