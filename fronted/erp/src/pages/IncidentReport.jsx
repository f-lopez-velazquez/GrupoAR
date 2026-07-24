import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../state/AuthContext";
import { createIncident, listenRecentIncidents } from "../services/incidents";
import { Roles } from "../utils/roles";

const IncidentReport = () => {
  const { user, role } = useAuth();
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("media");
  const [zone, setZone] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [photo, setPhoto] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user) return undefined;
    const unsub = listenRecentIncidents({ uid: user.uid, isAdmin: role === Roles.ADMIN }, setRecent);
    return () => unsub();
  }, [user, role]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;
    setLoading(true);
    setStatus("");

    try {
      const incidentId = await createIncident({
        uid: user.uid,
        projectId,
        title: title || "Incidente",
        description,
        priority,
        zone,
        incidentDate: incidentDate || null,
        photoFile: photo,
      });
      setStatus(`Incidente ${incidentId} registrado.`);
      setProjectId("");
      setTitle("");
      setDescription("");
      setPriority("media");
      setZone("");
      setIncidentDate("");
      setPhoto(null);
    } catch (error) {
      setStatus(error.message || "No se pudo registrar el incidente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-white font-display">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black">Reporte de incidentes</h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
              Registra incidentes con evidencia y prioridad para seguimiento inmediato.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            className="lg:col-span-8 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark/60 rounded-xl p-6 space-y-6 shadow-xl"
            onSubmit={handleSubmit}
          >
            <div className="flex items-center gap-2 text-xl font-bold">
              <span className="material-symbols-outlined text-primary">edit_document</span>
              Nuevo incidente
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Fecha
                <input
                  type="date"
                  className="w-full rounded-lg bg-slate-50 dark:bg-[#101023] border border-slate-200 dark:border-border-dark text-slate-900 dark:text-white h-12 px-4 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Zona / ubicacion
                <input
                  className="w-full rounded-lg bg-slate-50 dark:bg-[#101023] border border-slate-200 dark:border-border-dark text-slate-900 dark:text-white h-12 px-4 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  placeholder="Zona A, Bodega, etc."
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2 text-sm font-medium">
                ID de obra
                <input
                  className="w-full rounded-lg bg-slate-50 dark:bg-[#101023] border border-slate-200 dark:border-border-dark text-slate-900 dark:text-white h-12 px-4 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="Proyecto"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Titulo
                <input
                  className="w-full rounded-lg bg-slate-50 dark:bg-[#101023] border border-slate-200 dark:border-border-dark text-slate-900 dark:text-white h-12 px-4 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Incidente"
                />
              </label>
            </div>

            <div className="flex flex-col gap-2 text-sm font-medium">
              Prioridad
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    value: "baja",
                    label: "Baja",
                    classes:
                      "peer-checked:bg-emerald-500/20 peer-checked:border-emerald-500 peer-checked:text-emerald-500",
                    icon: "check_circle",
                  },
                  {
                    value: "media",
                    label: "Media",
                    classes:
                      "peer-checked:bg-amber-500/20 peer-checked:border-amber-500 peer-checked:text-amber-500",
                    icon: "warning",
                  },
                  {
                    value: "alta",
                    label: "Alta",
                    classes:
                      "peer-checked:bg-red-600/20 peer-checked:border-red-600 peer-checked:text-red-500",
                    icon: "dangerous",
                  },
                ].map((option) => (
                  <label key={option.value} className="cursor-pointer">
                    <input
                      className="peer sr-only"
                      type="radio"
                      name="priority"
                      value={option.value}
                      checked={priority === option.value}
                      onChange={() => setPriority(option.value)}
                    />
                    <div
                      className={`h-12 rounded-lg border border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-[#101023] flex items-center justify-center gap-2 text-slate-500 dark:text-text-secondary hover:bg-slate-100 dark:hover:bg-[#1e1e35] transition-all ${option.classes}`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {option.icon}
                      </span>
                      <span className="font-bold text-sm">{option.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium">
              Descripcion
              <textarea
                className="w-full rounded-lg bg-slate-50 dark:bg-[#101023] border border-slate-200 dark:border-border-dark text-slate-900 dark:text-white p-4 h-32 focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none"
                placeholder="Describe el incidente, responsables y acciones tomadas..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <div className="flex flex-col gap-2 text-sm font-medium">
              Evidencia
              <div
                className="border-2 border-dashed border-slate-300 dark:border-border-dark rounded-xl bg-slate-50 dark:bg-[#101023]/50 hover:bg-slate-100 dark:hover:bg-[#101023] hover:border-primary/50 transition-all cursor-pointer group p-6"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                />
                <div className="flex flex-col items-center justify-center gap-3 text-center">
                  <div className="bg-white dark:bg-surface-dark p-3 rounded-full group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <span className="material-symbols-outlined text-primary text-3xl">cloud_upload</span>
                  </div>
                  <div>
                    <p className="text-slate-900 dark:text-white font-medium">Arrastra la foto o haz click</p>
                    <p className="text-slate-500 dark:text-text-secondary text-sm mt-1">JPG o PNG hasta 10MB</p>
                  </div>
                  {photo && (
                    <div className="text-xs text-slate-500 dark:text-text-secondary">Archivo: {photo.name}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-border-dark/30">
              <button
                className="bg-primary hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-blue-900/30 transition-all active:scale-95 flex items-center gap-2"
                type="submit"
                disabled={loading}
              >
                <span className="material-symbols-outlined">send</span>
                {loading ? "Guardando..." : "Enviar reporte"}
              </button>
            </div>

            {status && (
              <div className="rounded-lg bg-blue-50 dark:bg-[#111938] border border-blue-100 dark:border-border-dark/60 px-4 py-3 text-sm text-slate-700 dark:text-text-secondary">
                {status}
              </div>
            )}
          </form>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark/50 rounded-xl flex flex-col max-h-[680px]">
              <div className="p-5 border-b border-slate-100 dark:border-border-dark/50 flex items-center justify-between">
                <h3 className="text-slate-900 dark:text-white text-lg font-bold">Incidentes recientes</h3>
                <span className="material-symbols-outlined text-slate-400 dark:text-text-secondary">history</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {recent.length === 0 && (
                  <div className="text-slate-500 dark:text-text-secondary text-sm">Sin registros aun.</div>
                )}
                {recent.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg bg-slate-50 dark:bg-[#101023] border border-slate-200 dark:border-border-dark/50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono text-slate-500 dark:text-text-secondary">#{item.id.slice(0, 6)}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                        {item.status || "abierto"}
                      </span>
                    </div>
                    <h4 className="text-slate-900 dark:text-white font-bold text-sm mb-1">{item.title || "Incidente"}</h4>
                    <p className="text-slate-500 dark:text-text-secondary text-xs line-clamp-2">
                      {item.description || "Sin descripcion"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-primary/20 dark:to-surface-dark border border-blue-100 dark:border-primary/20 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-10">
                <span className="material-symbols-outlined text-[100px] text-primary">security</span>
              </div>
              <h4 className="text-slate-900 dark:text-white font-bold text-base mb-2 relative">Recordatorio de seguridad</h4>
              <p className="text-slate-500 dark:text-text-secondary text-xs mb-4 relative">
                Incidentes de alta prioridad requieren notificacion inmediata al responsable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentReport;

