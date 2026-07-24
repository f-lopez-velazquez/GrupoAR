import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  serverTimestamp,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from "../firebase.js";

const payrollCol = collection(db, "payroll");

const buildPayrollId = (employeeUid, weekRange) => {
  const key = weekRange || "general";
  return `${employeeUid}_${key}`.replace(/[^a-zA-Z0-9_-]/g, "_");
};

export const upsertPayrollEntry = async ({
  employeeUid,
  employeeName,
  role,
  weekRange,
  baseSalary = 0,
  bonuses = [],
  deductions = [],
  notes = "",
  updatedBy,
}) => {
  if (!employeeUid) throw new Error("Empleado inválido.");
  const id = buildPayrollId(employeeUid, weekRange);
  const ref = doc(db, "payroll", id);
  await setDoc(
    ref,
    {
      employeeUid,
      employeeName: employeeName || null,
      role: role || null,
      weekRange: weekRange || null,
      baseSalary: Number(baseSalary || 0),
      bonuses,
      deductions,
      notes: notes || null,
      updatedBy: updatedBy || null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return id;
};

export const listPayrollByWeek = async (weekRange) => {
  const q = weekRange
    ? query(payrollCol, where("weekRange", "==", weekRange))
    : query(payrollCol);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};
