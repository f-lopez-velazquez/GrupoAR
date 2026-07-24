import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from "../firebase.js";

export const listenUsers = (cb) => {
  const ref = collection(db, "users");
  return onSnapshot(ref, (snapshot) => {
    const users = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    cb(users);
  });
};

export const setUserRole = async (uid, role) => {
  if (!uid) return;
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { role });
};

export const setUserPermissions = async (uid, permissions) => {
  if (!uid) return;
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { permissions: Array.isArray(permissions) ? permissions : [] });
};

export const deleteUserDoc = async (uid) => {
  if (!uid) return;
  const ref = doc(db, "users", uid);
  await deleteDoc(ref);
};
