import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

const toolLogCol = collection(db, "toolLog");

export const logToolMovement = async ({
  uid,
  toolId,
  toolName,
  action,
  notes,
}) => {
  const ref = await addDoc(toolLogCol, {
    uid,
    toolId: toolId || null,
    toolName: toolName || null,
    action: action || "prestamo",
    notes: notes || null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const listenToolLog = (cb) => {
  const toolLogQuery = query(toolLogCol, orderBy("createdAt", "desc"), limit(8));
  return onSnapshot(toolLogQuery, (snapshot) => {
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    cb(items);
  });
};
