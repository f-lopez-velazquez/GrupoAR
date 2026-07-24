import { toPng } from "html-to-image";
import { collection, getCountFromServer, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/firebase";

export const getPerformanceMetrics = async () => {
  const salesCol = collection(db, "sales");
  const attendanceCol = collection(db, "attendance");
  const incidentsCol = collection(db, "incidents");

  // Fetch sales to sum total
  const salesSnap = await getDocs(salesCol);
  let totalSales = 0;
  salesSnap.forEach((doc) => {
    totalSales += Number(doc.data().total || 0);
  });

  // Count attendance
  const attendanceSnap = await getCountFromServer(attendanceCol);
  const attendanceCount = attendanceSnap.data().count;

  // Count resolved incidents
  // Assuming "resuelto" or "cerrado" is the status for resolved. 
  // If not sure, we can count all or look for "abierto" vs others.
  // incidents.js creates with "abierto". Let's count "cerrado" or "resuelto". 
  // For safety, let's just count ALL incidents for now to show activity, or try to filter.
  // Let's filter by status != 'abierto' if possible, or just fetch all and filter client side.
  // Client side for now to be safe on index requirements.
  const incidentsSnap = await getDocs(incidentsCol);
  let resolvedCount = 0;
  incidentsSnap.forEach((doc) => {
    const status = doc.data().status;
    if (status === "resuelto" || status === "cerrado") {
      resolvedCount++;
    }
  });

  return {
    sales: totalSales,
    attendance: attendanceCount,
    incidentsResolved: resolvedCount,
  };
};

export const exportElementAsPng = async (element, filename = "reporte.png") => {
  if (!element) {
    throw new Error("Elemento no encontrado para exportar.");
  }

  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();

  return dataUrl;
};

