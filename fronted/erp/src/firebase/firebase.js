import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCSmb_4bBzLTovhm-aKXYkjgT_oRFum_pA",
  authDomain: "gpo-ar.firebaseapp.com",
  projectId: "gpo-ar",
  storageBucket: "gpo-ar.firebasestorage.app",
  messagingSenderId: "826066778675",
  appId: "1:826066778675:web:9413dcaca733d45db04146",
  measurementId: "G-0BNP5PLDH2",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

const initAnalytics = async () => {
  if (typeof window === "undefined") {
    return null;
  }

  const supported = await isSupported();
  if (!supported) {
    return null;
  }

  return getAnalytics(app);
};

export { app, auth, db, storage, functions, initAnalytics };
