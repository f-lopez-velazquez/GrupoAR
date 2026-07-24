import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from "../firebase.js";

const inventoryCol = collection(db, "inventory");

export const listenInventory = ({ category, max = 200 } = {}, cb) => {
  const q = category && category !== "All"
    ? query(inventoryCol, where("category", "==", category), limit(max))
    : query(inventoryCol, orderBy("name"), limit(max));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    cb(items);
  });
};

export const importInventoryFromJson = async (file, onProgress) => {
  const text = await file.text();
  const items = JSON.parse(text);
  if (!Array.isArray(items)) {
    throw new Error("El JSON debe ser un arreglo de productos.");
  }

  const chunkSize = 400;
  let imported = 0;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((item) => {
      const ref = doc(inventoryCol);
      batch.set(ref, {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
    imported += chunk.length;
    if (onProgress) onProgress(imported, items.length);
  }

  return imported;
};

export const registerMaterialUsage = async ({ projectId, inventoryId, quantity, unitCost, recordedBy }) => {
  const inventoryRef = doc(db, "inventory", inventoryId);
  const gastosRef = collection(db, "projects", projectId, "gastos");

  return runTransaction(db, async (transaction) => {
    const inventorySnap = await transaction.get(inventoryRef);
    if (!inventorySnap.exists()) {
      throw new Error("Producto no encontrado.");
    }

    const currentStock = Number(inventorySnap.data().stock || 0);
    if (currentStock < quantity) {
      throw new Error("Stock insuficiente.");
    }

    transaction.update(inventoryRef, {
      stock: currentStock - quantity,
      updatedAt: serverTimestamp(),
    });

    const price = Number(unitCost || inventorySnap.data().price || 0);
    transaction.set(doc(gastosRef), {
      inventoryId,
      quantity,
      unitCost: price,
      totalCost: price * quantity,
      recordedBy,
      type: "material",
      createdAt: serverTimestamp(),
    });
  });
};

export const createInventoryItem = async (data) => {
  const ref = await addDoc(inventoryCol, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateInventoryItem = async (inventoryId, data) => {
  if (!inventoryId) return;
  const ref = doc(db, "inventory", inventoryId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
};

export const deleteInventoryItem = async (inventoryId) => {
  if (!inventoryId) return;
  const ref = doc(db, "inventory", inventoryId);
  await deleteDoc(ref);
};

export const createSale = async ({ items, paymentMethod, cashierId, customer }) => {
  const salesCol = collection(db, "sales");
  const saleRef = doc(salesCol);
  const ticketRef = doc(db, "tickets", saleRef.id);

  await runTransaction(db, async (transaction) => {
    let subtotal = 0;
    const resolvedItems = [];

    for (const entry of items) {
      const inventoryRef = doc(db, "inventory", entry.id);
      const invSnap = await transaction.get(inventoryRef);
      if (!invSnap.exists()) {
        throw new Error("Producto no encontrado.");
      }
      const data = invSnap.data();
      const stock = Number(data.stock || 0);
      if (stock < entry.qty) {
        throw new Error(`Stock insuficiente para ${data.name || entry.sku}.`);
      }
      const price = Number(entry.price || data.price || 0);
      subtotal += price * entry.qty;
      resolvedItems.push({
        inventoryId: entry.id,
        sku: data.sku || entry.sku || null,
        name: data.name || entry.name || "Producto",
        category: data.category || entry.category || null,
        qty: entry.qty,
        price,
      });
      transaction.update(inventoryRef, {
        stock: stock - entry.qty,
        updatedAt: serverTimestamp(),
      });
    }

    const taxRate = 0.16;
    const tax = Number((subtotal * taxRate).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));

    const payload = {
      items: resolvedItems,
      subtotal,
      taxRate,
      tax,
      total,
      paymentMethod,
      cashierId,
      customer: customer || { name: "Cliente público", type: "mostrador" },
      status: "pagado",
      createdAt: serverTimestamp(),
    };

    transaction.set(saleRef, payload);
    transaction.set(ticketRef, { ...payload, source: "sale" });
  });

  return saleRef.id;
};
