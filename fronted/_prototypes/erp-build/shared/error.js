import { auth, db } from "./firebase.js";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const errorStoreKey = "gaErrorLog";
const MAX_ERRORS = 50;
const errorLogsCol = collection(db, "errorLogs");
let currentUser = null;
let pendingRemote = [];
let remoteCount = 0;
let lastRemoteReset = Date.now();
const REMOTE_LIMIT = 10;
const REMOTE_WINDOW_MS = 60_000;

const safeString = (value) => {
  if (value == null) return "";
  if (typeof value === "string") return value.slice(0, 500);
  try {
    return JSON.stringify(value).slice(0, 500);
  } catch {
    return String(value).slice(0, 500);
  }
};

const loadErrors = () => {
  try {
    const stored = localStorage.getItem(errorStoreKey);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveErrors = (errors) => {
  try {
    localStorage.setItem(errorStoreKey, JSON.stringify(errors.slice(0, MAX_ERRORS)));
  } catch {
    // ignore
  }
};

const addError = (entry) => {
  const errors = loadErrors();
  errors.unshift(entry);
  saveErrors(errors);
  queueRemote(entry);
};

const showToast = (id) => {
  const toast = document.createElement("div");
  toast.className = "fixed bottom-4 right-4 z-[9999] max-w-sm rounded-lg bg-[#101023] text-white px-4 py-3 shadow-lg border border-[#303169] text-xs";
  toast.textContent = `Se detectó un error. ID: ${id}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
};

const canSendRemote = () => {
  const now = Date.now();
  if (now - lastRemoteReset > REMOTE_WINDOW_MS) {
    lastRemoteReset = now;
    remoteCount = 0;
  }
  if (remoteCount >= REMOTE_LIMIT) return false;
  remoteCount += 1;
  return true;
};

const queueRemote = (entry) => {
  pendingRemote.push(entry);
  flushRemote();
};

const flushRemote = async () => {
  if (!currentUser) return;
  if (!pendingRemote.length) return;
  if (!canSendRemote()) return;
  const entry = pendingRemote.shift();
  try {
    await addDoc(errorLogsCol, {
      ...entry,
      uid: currentUser.uid,
      createdAt: serverTimestamp(),
    });
  } catch {
    // keep local only
  }
};

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (currentUser) {
    flushRemote();
  }
});

const buildEntry = (type, error, extra) => ({
  id: `ERR-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
  type,
  message: safeString(error?.message || error),
  stack: safeString(error?.stack || ""),
  extra: safeString(extra),
  url: `${window.location.origin}${window.location.pathname}`,
  userAgent: navigator.userAgent,
  createdAt: new Date().toISOString(),
});

window.addEventListener("error", (event) => {
  const entry = buildEntry("window", event?.error || event?.message, {
    source: event?.filename,
    lineno: event?.lineno,
    colno: event?.colno,
  });
  addError(entry);
  showToast(entry.id);
});

window.addEventListener("unhandledrejection", (event) => {
  const entry = buildEntry("promise", event?.reason || "Unhandled rejection");
  addError(entry);
  showToast(entry.id);
});

window.__getGrupoArErrors = () => loadErrors();
