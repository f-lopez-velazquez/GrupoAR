import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

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

export { app, auth, db, storage };
