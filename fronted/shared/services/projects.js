import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from "../firebase.js";

const projectsCol = collection(db, "projects");

export const getProject = async (projectId) => {
  const ref = doc(db, "projects", projectId);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

export const listProjects = async () => {
  const snapshot = await getDocs(projectsCol);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
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

export const computeDeferredBalance = async (projectId) => {
  const project = await getProject(projectId);
  if (!project) return null;
  const totalBudget = Number(project.budgetTotal || 0);
  const paymentsRef = collection(db, "projects", projectId, "pagos");
  const paymentSnapshots = await getDocs(paymentsRef);
  let paid = 0;
  paymentSnapshots.forEach((docSnap) => {
    paid += Number(docSnap.data().amount || 0);
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
