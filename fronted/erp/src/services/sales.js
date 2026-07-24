import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

export const createSale = async ({ items, paymentMethod, cashierId, customer }) => {
  if (!items || items.length === 0) {
    throw new Error("No hay productos en el carrito.");
  }

  const salesCol = collection(db, "sales");
  const saleRef = doc(salesCol);
  const ticketRef = doc(db, "tickets", saleRef.id);

  return runTransaction(db, async (transaction) => {
    let subtotal = 0;
    const resolvedItems = [];

    for (const item of items) {
      const inventoryRef = doc(db, "inventory", item.id);
      const inventorySnap = await transaction.get(inventoryRef);
      if (!inventorySnap.exists()) {
        throw new Error(`Producto no encontrado (${item.sku || item.id}).`);
      }

      const data = inventorySnap.data();
      const stock = Number(data.stock || 0);
      const qty = Number(item.qty || 0);
      if (qty <= 0) {
        throw new Error("Cantidad invalida.");
      }
      if (stock < qty) {
        throw new Error(`Stock insuficiente para ${data.name || item.sku}.`);
      }

      const price = Number(item.price || data.price || 0);
      subtotal += price * qty;

      resolvedItems.push({
        inventoryId: inventoryRef.id,
        sku: data.sku || item.sku || null,
        name: data.name || item.name || "Producto",
        category: data.category || item.category || null,
        qty,
        price,
      });

      transaction.update(inventoryRef, {
        stock: stock - qty,
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
      customer: customer || { name: "Public Client", type: "walk-in" },
      status: "pagado",
      createdAt: serverTimestamp(),
    };

    transaction.set(saleRef, payload);
    transaction.set(ticketRef, {
      ...payload,
      source: "sale",
    });

    return saleRef.id;
  });
};
