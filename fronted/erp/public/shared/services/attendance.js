import { addDoc, collection, GeoPoint, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from "../firebase.js";

const attendanceCol = collection(db, "attendance");

export const getCurrentLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalizacion no soportada."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

export const recordAttendance = async ({ uid, projectId, type, notes, location }) => {
  const payload = {
    uid,
    projectId: projectId || null,
    type: type || "entrada",
    notes: notes || null,
    createdAt: serverTimestamp(),
  };

  if (location?.lat != null && location?.lng != null) {
    payload.location = new GeoPoint(location.lat, location.lng);
    payload.locationAccuracy = location.accuracy || null;
  }

  const ref = await addDoc(attendanceCol, payload);
  return ref.id;
};
