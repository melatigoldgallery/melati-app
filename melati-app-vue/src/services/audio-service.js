// Audio service untuk sistem antrian — ported dari audioHandlers.js
// File audio harus ada di /public/audio/

const AUDIO_PATHS = {
  informasi: "/audio/informasi.mp3",
  antrian: "/audio/antrian.mp3",
  informasiEnd: "/audio/informasiEnd.mp3",
  notifOn: "/audio/notifOn.mp3",
};

let isAudioPlaying = false;
let audioCtx = null;

export function isAudioBusy() {
  return isAudioPlaying;
}

export function cancelAllAudio() {
  window.speechSynthesis.cancel();
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

function speak(text, rate = 0.85, pitch = 1.2) {
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

// Tombol "Informasi Tunggu"
export async function playWaitMessageSequence() {
  if (isAudioPlaying) return false;
  try {
    isAudioPlaying = true;
    await playAudio(AUDIO_PATHS.informasi);
    await speak(
      "Kepada Pelanggan Melati yang belum dilayani, kami mohon kesabarannya untuk menunggu pelayanan. Terima kasih atas perhatiannya",
    );
    await playAudio(AUDIO_PATHS.informasiEnd);
    isAudioPlaying = false;
    return true;
  } catch (error) {
    console.error("Error playing wait message:", error);
    isAudioPlaying = false;
    return false;
  }
}

// Tombol "Pengingat Antrian"
export async function playTakeQueueMessage() {
  if (isAudioPlaying) return false;
  try {
    isAudioPlaying = true;
    await playAudio(AUDIO_PATHS.informasi);
    await speak(
      "Kepada pelanggan yang belum mendapat nomor antrian, harap mengambil nomor antrian terlebih dahulu di tempat yang sudah disediakan. Terima kasih atas perhatiannya",
    );
    await playAudio(AUDIO_PATHS.informasiEnd);
    isAudioPlaying = false;
    return true;
  } catch (error) {
    console.error("Error playing take queue message:", error);
    isAudioPlaying = false;
    return false;
  }
}

// Pengumuman penutupan toko
export async function playClosingAnnouncement(message) {
  if (isAudioPlaying) return false;
  try {
    isAudioPlaying = true;
    await playAudio(AUDIO_PATHS.informasi);
    await speak(message, 0.75, 1.2);
    await playAudio(AUDIO_PATHS.informasiEnd);
    isAudioPlaying = false;
    return true;
  } catch (error) {
    console.error("Error playing closing announcement:", error);
    isAudioPlaying = false;
    return false;
  }
}

// Tombol "Panggil Nomor Antrian" — dengan audio prefix antrian.mp3 + TTS
export async function playQueueAnnouncement(queueNumber) {
  if (isAudioPlaying) return false;
  try {
    isAudioPlaying = true;

    const letter = queueNumber.charAt(0);
    const numbers = queueNumber.substring(1);
    const text = `Nomor antrian, ${letter}, ${numbers.split("").join("")}, silahkan angkat tangan`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 0.85;
    utterance.pitch = 1.2;

    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find((v) => v.lang.includes("id"));
    if (idVoice) utterance.voice = idVoice;

    const openingAudio = new Audio(AUDIO_PATHS.antrian);

    await new Promise((resolve) => {
      openingAudio.addEventListener(
        "ended",
        () => {
          window.speechSynthesis.speak(utterance);
          utterance.onend = resolve;
          utterance.onerror = () => {
            resolve();
          };
        },
        { once: true },
      );

      openingAudio.play().catch((err) => {
        console.error("Error playing opening audio:", err);
        resolve();
      });
    });

    isAudioPlaying = false;
    return true;
  } catch (error) {
    console.error("Error announcing queue:", error);
    isAudioPlaying = false;
    return false;
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
