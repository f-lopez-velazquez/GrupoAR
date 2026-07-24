import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { Roles } from "../utils/roles";

export const ensureUserProfile = async (user) => {
  if (!user) return null;
  const ref = doc(db, "users", user.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    return snapshot.data();
  }

  const profile = {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    role: Roles.PENDING,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return profile;
};

export const getUserProfile = async (uid) => {
  if (!uid) return null;
  const ref = doc(db, "users", uid);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? snapshot.data() : null;
};

export const updateUserProfile = async (uid, data) => {
  if (!uid) return;
  const ref = doc(db, "users", uid);
  await updateDoc(ref, data);
};

export const listenUsers = (cb) => {
  const ref = collection(db, "users");
  return onSnapshot(ref, (snapshot) => {
    const users = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    cb(users);
  });
};

export const setUserRole = async (uid, role) => {
  if (!uid) return;
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { role });
};
