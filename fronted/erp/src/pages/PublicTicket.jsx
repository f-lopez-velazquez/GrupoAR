import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPublicTicket } from "../services/public";

const formatMoney = (value) => {
  if (value == null) return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
};

const PublicTicket = () => {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [status, setStatus] = useState("Cargando...");

  useEffect(() => {
    let mounted = true;
    const loadTicket = async () => {
      try {
        const data = await getPublicTicket(id);
        if (!mounted) return;
        if (!data) {
          setStatus("No se encontro el ticket.");
        } else {
          setTicket(data);
          setStatus("");
        }
      } catch (error) {
        setStatus(error.message || "Error al consultar ticket.");
      }
    };
    loadTicket();
    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-[#0d151c] dark:text-white">
      <header className="flex items-center justify-between border-b border-[#e7eef4] dark:border-[#2a3642] bg-white dark:bg-[#1a2632] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
            <span className="material-symbols-outlined text-2xl">architecture</span>
          </div>
          <h2 className="text-xl font-bold">Grupo AR</h2>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-sm text-slate-500">
          Consulta publica
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-start py-8 px-4">
        <div className="w-full max-w-[640px] flex flex-col gap-6">
          <div className="w-full bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-[#e7eef4] dark:border-[#2a3642] p-6 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20 mb-4">
              <span className="material-symbols-outlined text-4xl text-green-600 dark:text-green-400">
                {ticket ? "verified" : "error"}
              </span>
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {ticket ? "Ticket verificado" : "Sin datos"}
            </h1>
            <p className="text-[#48769d] dark:text-slate-400 text-base">{status || "Consulta segura."}</p>
          </div>

          {ticket && (
            <div className="w-full bg-white dark:bg-[#1a2632] rounded-xl shadow-lg border border-[#e7eef4] dark:border-[#2a3642] overflow-hidden">
              <div className="bg-primary/5 border-b border-[#e7eef4] dark:border-[#2a3642] px-6 py-4 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Ticket digital</span>
                <span className="material-symbols-outlined text-primary/40 text-lg">receipt_long</span>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-[#48769d] dark:text-slate-400 mb-1">ID</span>
                    <span className="text-sm font-semibold">{ticket.id}</span>
                  </div>
                  <div className="flex flex-col sm:text-right">
                    <span className="text-xs text-[#48769d] dark:text-slate-400 mb-1">Tipo</span>
                    <span className="text-sm font-semibold">{ticket.source}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-[#48769d] dark:text-slate-400 mb-1">Estado</span>
                    <span className="text-sm font-semibold">{ticket.status || "En progreso"}</span>
                  </div>
                  <div className="flex flex-col sm:text-right">
                    <span className="text-xs text-[#48769d] dark:text-slate-400 mb-1">Saldo pendiente</span>
                    <span className="text-sm font-semibold">
                      {ticket.pendingBalance != null ? formatMoney(ticket.pendingBalance) : "-"}
                    </span>
                  </div>
                </div>

                {ticket.items && Array.isArray(ticket.items) && ticket.items.length > 0 && (
                  <div className="w-full">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className="pb-3 text-xs font-medium text-[#48769d] uppercase tracking-wider w-16">Qty</th>
                          <th className="pb-3 text-xs font-medium text-[#48769d] uppercase tracking-wider">Descripcion</th>
                          <th className="pb-3 text-xs font-medium text-[#48769d] uppercase tracking-wider text-right">Precio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ticket.items.map((item, index) => (
                          <tr key={`${item.name}-${index}`} className="border-b border-[#f0f4f8] last:border-0">
                            <td className="py-3 font-medium">{item.qty || 1}x</td>
                            <td className="py-3">
                              <div className="flex flex-col">
                                <span>{item.name || "Item"}</span>
                                {item.category && (
                                  <span className="text-xs text-[#48769d]">{item.category}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 font-medium text-right">{formatMoney(item.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {ticket.progress != null && (
                  <div className="text-sm text-[#48769d]">Avance de obra: {ticket.progress}%</div>
                )}
              </div>
            </div>
          )}

          <div className="text-center text-[#48769d] dark:text-slate-500 text-sm">
            <p>Si necesitas ayuda, contacta a soporte.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PublicTicket;
