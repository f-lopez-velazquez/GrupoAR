import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import { AuthProvider } from "./state/AuthContext";
import { initAnalytics } from "./firebase/firebase";
import ErrorBoundary from "./components/ErrorBoundary";

// Initialize Firebase Analytics
initAnalytics();

// Listen for service worker sync messages
window.addEventListener("syncPendingOperations", async () => {
  try {
    const { syncPendingOperations } = await import("./utils/offlineQueue");
    await syncPendingOperations();
  } catch (e) {
    console.error("[App] Failed to sync pending operations:", e);
  }
});

// Global unhandled error handler
window.addEventListener("error", async (event) => {
  try {
    const { logError } = await import("./utils/errorHandler");
    await logError(event.error || new Error(event.message), {
      source: "window.onerror",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  } catch (e) {
    console.error("[App] Failed to log error:", e);
  }
});

// Global unhandled promise rejection handler
window.addEventListener("unhandledrejection", async (event) => {
  try {
    const { logError } = await import("./utils/errorHandler");
    await logError(event.reason || new Error("Unhandled promise rejection"), {
      source: "unhandledrejection"
    });
  } catch (e) {
    console.error("[App] Failed to log rejection:", e);
  }
});

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename="/">
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
