/**
 * Offline queue system with IndexedDB persistence
 * Handles operations when offline and syncs when back online
 */

const DB_NAME = "GrupoAR_OfflineQueue";
const DB_VERSION = 1;
const STORE_NAME = "pendingOperations";

// Initialize IndexedDB
const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
                store.createIndex("timestamp", "timestamp", { unique: false });
                store.createIndex("type", "type", { unique: false });
                store.createIndex("status", "status", { unique: false });
            }
        };
    });
};

// Add operation to queue
export const addToQueue = async (operation) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);

        const item = {
            ...operation,
            timestamp: Date.now(),
            status: "pending",
            retries: 0
        };

        const request = store.add(item);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Get all pending operations
export const getPendingOperations = async () => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const index = store.index("status");

        const request = index.getAll("pending");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Update operation status
export const updateOperationStatus = async (id, status, error = null) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);

        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
            const item = getRequest.result;
            if (item) {
                item.status = status;
                item.lastAttempt = Date.now();
                if (error) item.lastError = error;
                if (status === "failed") item.retries++;

                const putRequest = store.put(item);
                putRequest.onsuccess = () => resolve(item);
                putRequest.onerror = () => reject(putRequest.error);
            } else {
                reject(new Error("Operation not found"));
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
};

// Delete completed operation
export const removeFromQueue = async (id) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);

        const request = store.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
};

// Clear old completed/failed operations
export const cleanupQueue = async (maxAge = 7 * 24 * 60 * 60 * 1000) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const cutoff = Date.now() - maxAge;

        const request = store.openCursor();
        let deleted = 0;

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const item = cursor.value;
                if (item.timestamp < cutoff && item.status !== "pending") {
                    cursor.delete();
                    deleted++;
                }
                cursor.continue();
            } else {
                resolve(deleted);
            }
        };
        request.onerror = () => reject(request.error);
    });
};

// Operation executors for different types
const executors = {
    createSale: async (data) => {
        const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");
        const { db } = await import("../firebase/firebase");

        return addDoc(collection(db, "sales"), {
            ...data,
            createdAt: serverTimestamp(),
            syncedFromOffline: true
        });
    },
    createTicket: async (data) => {
        const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");
        const { db } = await import("../firebase/firebase");

        return addDoc(collection(db, "tickets"), {
            ...data,
            createdAt: serverTimestamp(),
            syncedFromOffline: true
        });
    },
    updateInventory: async (data) => {
        const { updateDoc, doc, increment } = await import("firebase/firestore");
        const { db } = await import("../firebase/firebase");

        return updateDoc(doc(db, "inventory", data.itemId), {
            stock: increment(data.change)
        });
    },
    createLead: async (data) => {
        const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");
        const { db } = await import("../firebase/firebase");

        return addDoc(collection(db, "leads"), {
            ...data,
            createdAt: serverTimestamp(),
            syncedFromOffline: true
        });
    }
};

// Process single operation
const processOperation = async (operation) => {
    const executor = executors[operation.type];

    if (!executor) {
        console.error(`Unknown operation type: ${operation.type}`);
        await updateOperationStatus(operation.id, "failed", "Unknown operation type");
        return false;
    }

    try {
        await executor(operation.data);
        await removeFromQueue(operation.id);
        console.log(`[OfflineQueue] Synced operation ${operation.id}: ${operation.type}`);
        return true;
    } catch (error) {
        console.error(`[OfflineQueue] Failed to sync operation ${operation.id}:`, error);

        if (operation.retries >= 3) {
            await updateOperationStatus(operation.id, "failed", error.message);
        } else {
            await updateOperationStatus(operation.id, "pending", error.message);
        }
        return false;
    }
};

// Sync all pending operations
export const syncPendingOperations = async () => {
    if (!navigator.onLine) {
        console.log("[OfflineQueue] Still offline, skipping sync");
        return { synced: 0, failed: 0 };
    }

    const pending = await getPendingOperations();
    console.log(`[OfflineQueue] Found ${pending.length} pending operations`);

    let synced = 0;
    let failed = 0;

    // Process in order
    for (const operation of pending.sort((a, b) => a.timestamp - b.timestamp)) {
        const success = await processOperation(operation);
        if (success) synced++;
        else failed++;
    }

    return { synced, failed };
};

// Initialize online/offline listeners
export const initOfflineSync = () => {
    // Sync when coming back online
    window.addEventListener("online", async () => {
        console.log("[OfflineQueue] Back online, starting sync...");
        const { showToast } = await import("./errorHandler");
        showToast("Conexión restaurada. Sincronizando datos...", "info");

        const result = await syncPendingOperations();

        if (result.synced > 0) {
            showToast(`${result.synced} operación(es) sincronizada(s)`, "success");
        }
        if (result.failed > 0) {
            showToast(`${result.failed} operación(es) fallaron al sincronizar`, "warning");
        }
    });

    // Notify when going offline
    window.addEventListener("offline", async () => {
        console.log("[OfflineQueue] Gone offline");
        const { showToast } = await import("./errorHandler");
        showToast("Sin conexión. Los datos se guardarán localmente.", "warning");
    });

    // Periodic cleanup
    setInterval(() => {
        cleanupQueue().catch(console.error);
    }, 60 * 60 * 1000); // Every hour

    // Initial sync on load if online
    if (navigator.onLine) {
        setTimeout(() => {
            syncPendingOperations().catch(console.error);
        }, 3000);
    }
};

// Check if we're offline
export const isOffline = () => !navigator.onLine;

// Wrapper for operations that should work offline
export const offlineCapable = async (type, data, onlineExecutor) => {
    if (navigator.onLine) {
        try {
            return await onlineExecutor();
        } catch (error) {
            // If network error, queue for later
            if (error.message?.includes("network") || error.message?.includes("offline")) {
                const queueId = await addToQueue({ type, data });
                console.log(`[OfflineQueue] Queued operation ${queueId} for later sync`);
                return { queued: true, queueId };
            }
            throw error;
        }
    } else {
        // Offline - queue immediately
        const queueId = await addToQueue({ type, data });
        console.log(`[OfflineQueue] Queued operation ${queueId} (offline)`);
        return { queued: true, queueId };
    }
};
