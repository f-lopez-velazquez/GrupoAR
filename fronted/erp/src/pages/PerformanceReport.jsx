import React, { useEffect, useRef, useState } from "react";
import { exportElementAsPng, getPerformanceMetrics } from "../services/reports";

const PerformanceReport = () => {
  const panelRef = useRef(null);
  const [status, setStatus] = useState("");
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getPerformanceMetrics();
        setMetrics(data);
      } catch (error) {
        console.error("Error fetching metrics:", error);
        setStatus("Error cargando datos del reporte.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExport = async () => {
    setStatus("");
    try {
      await exportElementAsPng(panelRef.current, "desempeno-personal.png");
      setStatus("Reporte exportado como imagen.");
    } catch (error) {
      setStatus(error.message || "No se pudo exportar.");
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(val || 0);
  };

  return (
    <div className="min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-white font-display">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black">Reporte de desempeño</h1>
            <p className="text-slate-500 dark:text-slate-400">
              Convierte el panel en imagen compartible.
            </p>
          </div>
          <button
            className="flex items-center gap-2 bg-primary hover:bg-blue-700 text-white px-5 h-12 rounded-lg font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50"
            onClick={handleExport}
            type="button"
            disabled={loading || !metrics}
          >
            <span className="material-symbols-outlined">download</span>
            Exportar imagen
          </button>
        </div>

        <div
          className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm"
          ref={panelRef}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Equipo Ferretería - Resumen General</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Resumen de indicadores principales históricos.
              </p>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Actualizado: {new Date().toLocaleDateString()}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <span className="text-slate-500">Cargando métricas...</span>
            </div>
          ) : metrics ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                <span className="text-xs uppercase tracking-wider text-slate-500">Ventas Totales</span>
                <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(metrics.sales)}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                <span className="text-xs uppercase tracking-wider text-slate-500">Registros Asistencia</span>
                <div className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                  {metrics.attendance}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                <span className="text-xs uppercase tracking-wider text-slate-500">Incidentes Resueltos</span>
                <div className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">
                  {metrics.incidentsResolved}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-red-500">No se pudieron cargar los datos.</div>
          )}

          <div className="mt-6 text-xs text-slate-500 dark:text-slate-400">
            Datos actualizados automáticamente desde Firestore.
          </div>
        </div>

        {status && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 px-4 py-3 text-sm">
            {status}
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceReport;

