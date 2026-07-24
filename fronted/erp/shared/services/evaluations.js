import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from "../firebase.js";

const evaluationsCol = collection(db, "evaluations");
const requestsCol = collection(db, "evaluationRequests");

export const saveWeeklyEvaluations = async ({ entries = [], meta = {} }) => {
  const results = [];
  for (const entry of entries) {
    const ref = await addDoc(evaluationsCol, {
      ...entry,
      ...meta,
      createdAt: serverTimestamp(),
    });
    results.push(ref.id);
  }
  return results;
};

export const fetchRecentEvaluations = async ({ max = 200 } = {}) => {
  const q = query(evaluationsCol, orderBy("createdAt", "desc"), limit(max));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const createEvaluationRequest = async ({
  managerUid,
  managerName,
  employeeIds = [],
  employees = [],
  projectName,
  weekRange,
  dueDate,
  createdBy,
}) => {
  const ref = await addDoc(requestsCol, {
    managerUid,
    managerName: managerName || null,
    employeeIds,
    employees,
    projectName: projectName || null,
    weekRange: weekRange || null,
    dueDate: dueDate || null,
    status: "sent",
    createdBy: createdBy || null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const getEvaluationRequest = async (requestId) => {
  if (!requestId) return null;
  const ref = doc(db, "evaluationRequests", requestId);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

export const updateEvaluationRequest = async (requestId, data) => {
  if (!requestId) return null;
  const ref = doc(db, "evaluationRequests", requestId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
};

export const watchEvaluationRequests = (cb, { max = 200 } = {}) => {
  const q = query(requestsCol, orderBy("createdAt", "desc"), limit(max));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    cb(items);
  });
};
