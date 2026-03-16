import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const fridemConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FRIDEM_API_KEY ?? "AIzaSyCFmBmgKk1TblOc2xGFhs6qATOMXf-1UsE",
  authDomain: process.env.NEXT_PUBLIC_FRIDEM_AUTH_DOMAIN ?? "fridem.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FRIDEM_PROJECT_ID ?? "fridem",
  storageBucket: process.env.NEXT_PUBLIC_FRIDEM_STORAGE_BUCKET ?? "fridem.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FRIDEM_MESSAGING_SENDER_ID ?? "816155410877",
  appId: process.env.NEXT_PUBLIC_FRIDEM_APP_ID ?? "1:816155410877:web:5e59291c88b9ad039592d4",
  measurementId: process.env.NEXT_PUBLIC_FRIDEM_MEASUREMENT_ID ?? "G-BC26CK5BMK",
  databaseURL: process.env.NEXT_PUBLIC_FRIDEM_DATABASE_URL,
};

const hasCoreConfig = fridemConfig.apiKey && fridemConfig.projectId && fridemConfig.appId;

const fridemApp = hasCoreConfig
  ? getApps().find((app) => app.name === "fridem") ?? initializeApp(fridemConfig, "fridem")
  : null;

export const fridemDb = fridemApp ? getFirestore(fridemApp) : null;
export const fridemDatabase = fridemApp && fridemConfig.databaseURL ? getDatabase(fridemApp) : null;
export const fridemAuth = fridemApp ? getAuth(fridemApp) : null;

export async function ensureFridemAuth() {
  if (!fridemAuth) return;
  if (fridemAuth.currentUser) return;
  try {
    await signInAnonymously(fridemAuth);
  } catch (error) {
    console.warn("No se pudo hacer login anónimo en fridem", error);
  }
}

export default fridemApp;
