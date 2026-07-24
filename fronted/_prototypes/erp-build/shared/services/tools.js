import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from "../firebase.js";

const toolLogCol = collection(db, "toolLog");

export const logToolMovement = async ({
  uid,
  toolId,
  toolName,
  action,
  notes,
  responsible,
  condition,
  location,
  dueDate,
}) => {
  const ref = await addDoc(toolLogCol, {
    uid,
    toolId: toolId || null,
    toolName: toolName || null,
    action: action || "prestamo",
    notes: notes || null,
    responsible: responsible || null,
    condition: condition || null,
    location: location || null,
    dueDate: dueDate || null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const listenToolLog = (cb, { max = 50 } = {}) => {
  const q = query(toolLogCol, orderBy("createdAt", "desc"), limit(max));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    cb(items);
  });
};

export const updateToolLog = async (logId, data) => {
  if (!logId) return;
  const ref = doc(db, "toolLog", logId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
};

export const deleteToolLog = async (logId) => {
  if (!logId) return;
  const ref = doc(db, "toolLog", logId);
  await deleteDoc(ref);
};
