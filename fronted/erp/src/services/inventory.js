import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

const inventoryCol = collection(db, "inventory");

const chunkArray = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

export const importInventoryFromJson = async (file, onProgress) => {
  const text = await file.text();
  const items = JSON.parse(text);
  if (!Array.isArray(items)) {
    throw new Error("El JSON debe ser un arreglo de productos.");
  }

  const chunks = chunkArray(items, 400);
  let imported = 0;
  for (const chunk of chunks) {
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

export const registerMaterialUsage = async ({
  projectId,
  inventoryId,
  quantity,
  unitCost,
  recordedBy,
}) => {
  const inventoryRef = doc(db, "inventory", inventoryId);
  const gastosRef = collection(db, "projects", projectId, "gastos");

  return runTransaction(db, async (transaction) => {
    const inventorySnap = await transaction.get(inventoryRef);
    if (!inventorySnap.exists()) {
      throw new Error("Producto no encontrado.");
    }

    const currentStock = Number(inventorySnap.data().stock || 0);
    if (currentStock < quantity) {
      throw new Error("Stock insuficiente para registrar el material.");
    }

    const newStock = currentStock - quantity;
    transaction.update(inventoryRef, {
      stock: newStock,
      updatedAt: serverTimestamp(),
    });

    const totalCost = Number(unitCost || inventorySnap.data().price || 0) * quantity;
    const gastoRef = doc(gastosRef);
    transaction.set(gastoRef, {
      inventoryId,
      quantity,
      unitCost: Number(unitCost || inventorySnap.data().price || 0),
      totalCost,
      recordedBy,
      createdAt: serverTimestamp(),
      type: "material",
    });

    return { newStock, totalCost };
  });
};

export const addInventoryItem = async (data) => {
  const ref = await addDoc(inventoryCol, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const listenInventory = ({ category, max = 200 } = {}, cb) => {
  const inventoryQuery = category
    ? query(inventoryCol, where("category", "==", category), limit(max))
    : query(inventoryCol, orderBy("name"), limit(max));
  return onSnapshot(inventoryQuery, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    cb(items);
  });
};
