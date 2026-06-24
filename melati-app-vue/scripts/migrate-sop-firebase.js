import fs from "node:fs";
import path from "node:path";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { DEFAULT_STORE_SOP } from "../src/config/toko-defaults.js";

// Parse .env manually
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    console.warn(".env file not found at " + envPath);
    return;
  }
  const content = fs.readFileSync(envPath, "utf8");
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const parts = trimmed.split("=");
    const key = parts[0].trim();
    let value = parts.slice(1).join("=").trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  });
}

loadEnv();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app, "asia-southeast2");
const db = getFirestore(app);

async function run() {
  console.log("Authenticating with username 'admin' and password 'adminmelati' on L1...");
  const loginWithUsername = httpsCallable(functions, "loginWithUsername");
  
  try {
    const result = await loginWithUsername({
      username: "admin",
      password: "adminmelati",
      floorId: "L1"
    });
    
    const payload = result.data || {};
    if (!payload.customToken) {
      throw new Error("Login failed: custom token was not returned.");
    }
    
    console.log("Logging in using custom token...");
    await signInWithCustomToken(auth, payload.customToken);
    console.log("Logged in successfully as:", auth.currentUser.uid);
    
    const now = new Date().toISOString();
    const updatedSop = {
      staffSOP: DEFAULT_STORE_SOP.staffSOP || "",
      goldKnowledge: DEFAULT_STORE_SOP.goldKnowledge || "",
      diamondKnowledge: DEFAULT_STORE_SOP.diamondKnowledge || "",
      lastUpdated: now,
      updatedBy: "admin (Migration)"
    };
    
    console.log("Writing to floors/L1/settings/storeSOP...");
    await setDoc(doc(db, "floors", "L1", "settings", "storeSOP"), updatedSop);
    console.log("L1 SOP updated successfully.");
    
    console.log("Writing to floors/L2/settings/storeSOP...");
    await setDoc(doc(db, "floors", "L2", "settings", "storeSOP"), updatedSop);
    console.log("L2 SOP updated successfully.");
    
    console.log("Migration script finished successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed with error:", error);
    process.exit(1);
  }
}

run();
