import React, { useEffect, useState } from "react";
import { addProjectPayment, watchDeferredBalance } from "../services/projects";
import { useAuth } from "../state/AuthContext";

const ProjectBilling = () => {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState("");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!projectId) return undefined;
    const unsub = watchDeferredBalance(projectId, setBalance);
    return () => unsub();
  }, [projectId]);

  const handlePayment = async (event) => {
    event.preventDefault();
    if (!user || !projectId || !amount) return;

    try {
      await addProjectPayment(projectId, {
        amount: Number(amount),
        recordedBy: user.uid,
      });
      setStatus("Pago registrado.");
      setAmount("");
    } catch (error) {
      setStatus(error.message || "No se pudo registrar el pago.");
    }
  };

  return (
    <div className="min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-white font-display">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-black">Pagos diferidos</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Administra el saldo pendiente por obra.
          </p>
        </div>

        <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6 shadow-sm">
          <label className="flex flex-col gap-2 text-sm font-medium">
            ID de obra
            <input
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 h-11 px-3"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
            />
          </label>

          <form className="flex flex-col sm:flex-row gap-3" onSubmit={handlePayment}>
            <input
              type="number"
              min="0"
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 h-11 px-3"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Monto de pago"
              required
            />
            <button className="bg-primary hover:bg-blue-700 text-white font-bold px-5 rounded-lg" type="submit">
              Registrar pago
            </button>
          </form>

          {balance && (
            <div className="grid gap-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex justify-between">
                <span>Presupuesto:</span>
                <strong>${balance.totalBudget}</strong>
              </div>
              <div className="flex justify-between">
                <span>Pagado:</span>
                <strong>${balance.paid}</strong>
              </div>
              <div className="flex justify-between">
                <span>Pendiente:</span>
                <strong className="text-alert-red">${balance.pending}</strong>
              </div>
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

export default ProjectBilling;
