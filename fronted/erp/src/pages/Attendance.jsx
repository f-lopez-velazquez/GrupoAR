import React, { useState } from "react";
import { useAuth } from "../state/AuthContext";
import { getCurrentLocation, recordAttendance } from "../services/attendance";

const Attendance = () => {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);

  const handleRegister = async (type) => {
    if (!user) return;
    setLoading(true);
    setStatus("");

    try {
      let location = null;
      try {
        location = await getCurrentLocation();
        setLastLocation(location);
      } catch (geoError) {
        setLastLocation(null);
      }

      await recordAttendance({
        uid: user.uid,
        projectId,
        type,
        notes,
        location,
      });
      setStatus(
        location
          ? "Asistencia registrada con geolocalizacion."
          : "Asistencia registrada sin ubicacion."
      );
      setNotes("");
    } catch (error) {
      setStatus(error.message || "No se pudo registrar asistencia.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-white font-display">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-black">Registro de asistencia</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Marca entrada o salida con geolocalizacion para validar presencia.
          </p>
        </div>

        <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6 shadow-sm">
          <label className="flex flex-col gap-2 text-sm font-medium">
            ID de obra
            <input
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 h-11 px-3"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Proyecto"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Notas
            <textarea
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 h-24"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              className="flex items-center gap-2 bg-primary hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg shadow-md"
              onClick={() => handleRegister("entrada")}
              disabled={loading}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">login</span>
              Entrada
            </button>
            <button
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-lg"
              onClick={() => handleRegister("salida")}
              disabled={loading}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              Salida
            </button>
          </div>

          {lastLocation && (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 text-xs text-slate-600 dark:text-slate-300">
              Ubicacion: {lastLocation.lat.toFixed(5)}, {lastLocation.lng.toFixed(5)}
              {lastLocation.accuracy && ` (±${Math.round(lastLocation.accuracy)}m)`}
            </div>
          )}

          {status && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 px-4 py-3 text-sm">
              {status}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Attendance;
