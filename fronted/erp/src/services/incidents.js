import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  limit,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

const incidentsCol = collection(db, "incidents");

const getCloudinaryPreset = () =>
  import.meta?.env?.VITE_CLOUDINARY_UPLOAD_PRESET
  || window.CLOUDINARY_UPLOAD_PRESET
  || localStorage.getItem("cloudinaryUploadPreset")
  || null;

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

export const createIncident = async ({
  uid,
  projectId,
  title,
  description,
  photoFile,
  priority,
  zone,
  incidentDate,
}) => {
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
  const incidentsQuery = isAdmin
    ? query(incidentsCol, orderBy("createdAt", "desc"), limit(6))
    : query(incidentsCol, where("uid", "==", uid || ""), limit(20));

  return onSnapshot(incidentsQuery, (snapshot) => {
    let items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (!isAdmin) {
      items = items
        .sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        })
        .slice(0, 6);
    }
    cb(items);
  });
};
