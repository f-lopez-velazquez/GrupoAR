import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

const projectsCol = collection(db, "projects");

export const createProject = async ({ id, ...data }) => {
  const ref = id ? doc(db, "projects", id) : doc(projectsCol);
  await setDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const getProject = async (projectId) => {
  const ref = doc(db, "projects", projectId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
};

export const addProjectExpense = async (projectId, data) => {
  const ref = collection(db, "projects", projectId, "gastos");
  const docRef = await addDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const addProjectPayment = async (projectId, data) => {
  const ref = collection(db, "projects", projectId, "pagos");
  const docRef = await addDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
  });
  await updateDeferredBalance(projectId);
  return docRef.id;
};

export const addProjectFiscalDoc = async (projectId, data) => {
  const ref = collection(db, "projects", projectId, "fiscalDocs");
  const docRef = await addDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const computeDeferredBalance = async (projectId) => {
  const project = await getProject(projectId);
  if (!project) return null;
  const totalBudget = Number(project.budgetTotal || 0);
  const paymentsRef = collection(db, "projects", projectId, "pagos");
  const paymentSnapshots = await getDocs(paymentsRef);
  let paid = 0;
  paymentSnapshots.forEach((docSnap) => {
    const value = Number(docSnap.data().amount || 0);
    paid += value;
  });

  const pending = Math.max(totalBudget - paid, 0);
  return { pending, paid, totalBudget };
};

export const updateDeferredBalance = async (projectId) => {
  const result = await computeDeferredBalance(projectId);
  if (!result) return null;
  const ref = doc(db, "projects", projectId);
  await updateDoc(ref, {
    pendingBalance: result.pending,
    paidBalance: result.paid,
    updatedAt: serverTimestamp(),
  });
  return result;
};

export const watchDeferredBalance = (projectId, cb) => {
  const paymentsRef = collection(db, "projects", projectId, "pagos");
  return onSnapshot(paymentsRef, async () => {
    const result = await computeDeferredBalance(projectId);
    cb(result);
  });
};
