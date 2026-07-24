import React, { useEffect, useState } from "react";
import { useAuth } from "../state/AuthContext";
import { listenToolLog, logToolMovement } from "../services/tools";

const ToolLogbook = () => {
  const { user } = useAuth();
  const [toolId, setToolId] = useState("");
  const [toolName, setToolName] = useState("");
  const [action, setAction] = useState("prestamo");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    const unsub = listenToolLog(setRecent);
    return () => unsub();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;

    try {
      await logToolMovement({
        uid: user.uid,
        toolId,
        toolName,
        action,
        notes,
      });
      setStatus("Movimiento registrado.");
      setToolId("");
      setToolName("");
      setNotes("");
    } catch (error) {
      setStatus(error.message || "No se pudo registrar.");
    }
  };

  return (
    <div className="min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-white font-display">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">Bitácora de herramienta</h1>
            <p className="text-slate-500 dark:text-text-secondary">Controla prestamos y devoluciones.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-100 dark:bg-[#222249] px-3 py-1 text-xs text-slate-500 dark:text-text-secondary">
              Movimientos recientes: {recent.length}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            className="lg:col-span-1 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark/50 rounded-xl p-6 space-y-4 shadow-sm"
            onSubmit={handleSubmit}
          >
            <h2 className="text-lg font-bold">Registrar movimiento</h2>
            <label className="flex flex-col gap-2 text-sm">
              ID herramienta
              <input
                className="rounded-lg bg-slate-50 dark:bg-[#101023] border border-slate-200 dark:border-border-dark text-slate-900 dark:text-white h-11 px-3"
                value={toolId}
                onChange={(e) => setToolId(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Nombre
              <input
                className="rounded-lg bg-slate-50 dark:bg-[#101023] border border-slate-200 dark:border-border-dark text-slate-900 dark:text-white h-11 px-3"
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Accion
              <select
                className="rounded-lg bg-slate-50 dark:bg-[#101023] border border-slate-200 dark:border-border-dark text-slate-900 dark:text-white h-11 px-3"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                <option value="prestamo">Prestamo</option>
                <option value="devolucion">Devolucion</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Notas
              <textarea
                className="rounded-lg bg-slate-50 dark:bg-[#101023] border border-slate-200 dark:border-border-dark text-slate-900 dark:text-white p-3 h-24"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <button className="bg-primary hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg">
              Registrar
            </button>
            {status && (
              <div className="text-xs text-slate-500 dark:text-text-secondary bg-slate-50 dark:bg-[#101023] border border-slate-200 dark:border-border-dark/40 px-3 py-2 rounded-lg">
                {status}
              </div>
            )}
          </form>

          <div className="lg:col-span-2 bg-slate-50 dark:bg-[#16162c] border border-slate-200 dark:border-border-dark rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-200 dark:border-border-dark flex items-center justify-between">
              <h3 className="text-lg font-bold">Historial reciente</h3>
              <span className="material-symbols-outlined text-slate-400 dark:text-text-secondary">history</span>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 dark:bg-[#1a1a2e] text-slate-500 dark:text-text-secondary">
                  <tr>
                    <th className="p-4">Estado</th>
                    <th className="p-4">Herramienta</th>
                    <th className="p-4">Responsable</th>
                    <th className="p-4">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-border-dark/40">
                  {recent.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-100 dark:hover:bg-[#1f1f35]">
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${item.action === "devolucion"
                              ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                              : "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                            }`}
                        >
                          {item.action === "devolucion" ? "ENTRADA" : "SALIDA"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-white">{item.toolName || "Sin nombre"}</span>
                          <span className="text-xs text-slate-500 dark:text-text-secondary">ID: {item.toolId || "-"}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-500 dark:text-text-secondary text-xs">{item.uid?.slice(0, 8)}</td>
                      <td className="p-4 text-slate-500 dark:text-text-secondary text-xs">{item.notes || "-"}</td>
                    </tr>
                  ))}
                  {recent.length === 0 && (
                    <tr>
                      <td className="p-4 text-slate-500 dark:text-text-secondary" colSpan="4">
                        Sin movimientos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolLogbook;

