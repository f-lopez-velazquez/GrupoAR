import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from "../firebase.js";

const incidentsCol = collection(db, "incidents");

const getCloudinaryPreset = () => {
  const fromWindow = window.CLOUDINARY_UPLOAD_PRESET;
  if (fromWindow) return fromWindow;
  const stored = localStorage.getItem("cloudinaryUploadPreset");
  if (stored) return stored;
  const preset = prompt("Ingresa el Cloudinary Upload Preset (unsigned) para subir evidencias:");
  if (preset) {
    localStorage.setItem("cloudinaryUploadPreset", preset);
    return preset;
  }
  return null;
};

const uploadToCloudinary = async (file) => {
  if (!file) return null;
  const preset = getCloudinaryPreset();
  if (!preset) throw new Error("Cloudinary upload preset no configurado.");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", preset);
  formData.append("folder", "grupo-ar/incidents");

  const response = await fetch("https://api.cloudinary.com/v1_1/dyzin1srr/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Error al subir evidencia a Cloudinary.");
  }

  const data = await response.json();
  return {
    url: data.secure_url,
    publicId: data.public_id,
  };
};

export const createIncident = async ({ uid, projectId, title, description, priority, zone, incidentDate, photoFile }) => {
  const incidentRef = await addDoc(incidentsCol, {
    uid,
    projectId: projectId || null,
    title: title || "Incidente",
    description: description || null,
    priority: priority || "media",
    zone: zone || null,
    incidentDate: incidentDate || null,
    status: "abierto",
    createdAt: serverTimestamp(),
  });

  if (photoFile) {
    const upload = await uploadToCloudinary(photoFile);
    await updateDoc(incidentRef, {
      photoUrl: upload?.url || null,
      photoPath: upload?.publicId || null,
      photoProvider: "cloudinary",
      updatedAt: serverTimestamp(),
    });
  }

  return incidentRef.id;
};

export const listenRecentIncidents = ({ uid, isAdmin }, cb) => {
  const q = isAdmin
    ? query(incidentsCol, limit(10))
    : query(incidentsCol, where("uid", "==", uid || ""), limit(20));

  return onSnapshot(q, (snapshot) => {
    let items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    items = items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 6);
    cb(items);
  });
};

export const updateIncident = async (incidentId, data) => {
  if (!incidentId) return;
  const ref = doc(db, "incidents", incidentId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
};

export const deleteIncident = async (incidentId) => {
  if (!incidentId) return;
  const ref = doc(db, "incidents", incidentId);
  await deleteDoc(ref);
};
