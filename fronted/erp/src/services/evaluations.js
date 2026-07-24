import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    getDocs,
    orderBy,
    serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/firebase";

const COLLECTION = "evaluations";

export const createEvaluation = async (data) => {
    // data: { managerId, managerName, projectId, employees: [{name, status, notes}], weekStart, weekEnd }
    const payload = {
        ...data,
        status: "pending_review",
        createdAt: serverTimestamp(),
    };
    return await addDoc(collection(db, COLLECTION), payload);
};

export const updateEvaluation = async (id, updates) => {
    // updates: { status, employees: [{...salary, discounts}] }
    const ref = doc(db, COLLECTION, id);
    await updateDoc(ref, {
        ...updates,
        reviewedAt: serverTimestamp(),
    });
};

export const getEvaluations = async (filters = {}) => {
    let q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));

    if (filters.managerId) {
        q = query(q, where("managerId", "==", filters.managerId));
    }

    if (filters.status) {
        q = query(q, where("status", "==", filters.status));
    }

    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
