import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { db } from "../config.js";

export const getSpeechTTS = onCall({ region: "asia-southeast2" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Request must be authenticated.");
  }

  const { text, provider, voiceName, pitch } = request.data || {};
  if (!text) {
    throw new HttpsError("invalid-argument", "Text parameter is required.");
  }

  try {
    // Read API Key from private Firestore document
    const docRef = db.collection("settings").doc("googleTTS");
    const snap = await docRef.get();
    
    let apiKey = "";
    if (snap.exists) {
      apiKey = snap.data().apiKey || "";
    }

    if (provider === "google_cloud") {
      if (!apiKey) {
        throw new HttpsError("failed-precondition", "Google Cloud TTS API Key is not configured on the server. Please add it to Firestore under settings/googleTTS.");
      }

      const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
      const payload = {
        input: { text },
        voice: {
          languageCode: "id-ID",
          name: voiceName || "id-ID-Wavenet-A",
          ssmlGender: (voiceName || "").includes("-B") || (voiceName || "").includes("-C") ? "MALE" : "FEMALE"
        },
        audioConfig: {
          audioEncoding: "MP3",
          pitch: typeof pitch === "number" ? pitch : 0.0
        }
      };

      const originalReferer = request.rawRequest?.headers?.referer || "https://melatigold.web.app/";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Referer": originalReferer
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Cloud TTS API error: ${response.status} - ${errorText}`);
      }

      const json = await response.json();
      return { success: true, audioContent: json.audioContent };
    } else {
      // Default: free Translate TTS
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=id&client=tw-ob&q=${encodeURIComponent(text)}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36"
        }
      });

      if (!response.ok) {
        throw new Error(`Translate TTS failed with status ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      return { success: true, audioContent: base64 };
    }
  } catch (err) {
    logger.error("Failed to generate TTS:", err);
    throw new HttpsError("internal", err.message || "Failed to generate TTS.");
  }
});
