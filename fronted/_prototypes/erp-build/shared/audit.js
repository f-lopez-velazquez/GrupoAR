import { auth, db } from "./firebase.js";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js";

const functions = getFunctions();
const auditLogsCol = collection(db, "auditLogs");

const safeJson = (value) => {
  try {
    return JSON.stringify(value).slice(0, 800);
  } catch {
    return String(value).slice(0, 800);
  }
};

const callFunction = async (name, payload) => {
  const callable = httpsCallable(functions, name);
  const result = await callable(payload);
  return result.data;
};

export const logAuditEvent = async ({
  action,
  resource,
  resourceId,
  severity = "info",
  details = {},
}) => {
  const uid = auth.currentUser?.uid || null;
  const payload = {
    action,
    resource,
    resourceId: resourceId || null,
    severity,
    details: safeJson(details),
    url: `${window.location.origin}${window.location.pathname}`,
  };

  try {
    await callFunction("logAuditEvent", payload);
  } catch {
    if (!uid) return;
    await addDoc(auditLogsCol, {
      ...payload,
      uid,
      createdAt: serverTimestamp(),
    });
  }
};

const getCurrentLocation = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });

export const recordLoginEvent = async () => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const lastSent = Number(localStorage.getItem("lastLoginAudit") || 0);
  const now = Date.now();
  if (now - lastSent < 10 * 60 * 1000) return;

  const location = await getCurrentLocation();
  try {
    await callFunction("recordLogin", { location });
    localStorage.setItem("lastLoginAudit", String(now));
  } catch {
    await addDoc(auditLogsCol, {
      uid,
      action: "login",
      resource: "auth",
      severity: "info",
      details: location ? safeJson(location) : "sin_geolocalizacion",
      url: `${window.location.origin}${window.location.pathname}`,
      createdAt: serverTimestamp(),
    });
    localStorage.setItem("lastLoginAudit", String(now));
  }
};

