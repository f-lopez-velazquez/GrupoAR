import React, { useState } from "react";
import { useAuth } from "../state/AuthContext";
import { registerMaterialUsage } from "../services/inventory";

const MaterialUsage = () => {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState("");
  const [inventoryId, setInventoryId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;

    try {
      const result = await registerMaterialUsage({
        projectId,
        inventoryId,
        quantity: Number(quantity),
        unitCost: Number(unitCost || 0),
        recordedBy: user.uid,
      });
      setStatus(`Stock actualizado. Nuevo stock: ${result.newStock}`);
      setProjectId("");
      setInventoryId("");
      setQuantity("");
      setUnitCost("");
    } catch (error) {
      setStatus(error.message || "No se pudo registrar insumo.");
    }
  };

  return (
    <div className="min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-white font-display">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-black">Registro de insumos</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Al registrar, se descuenta del inventario y se agrega como gasto.
          </p>
        </div>

        <form
          className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-sm"
          onSubmit={handleSubmit}
        >
          <label className="flex flex-col gap-2 text-sm font-medium">
            ID de obra
            <input
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 h-11 px-3"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            ID de inventario
            <input
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 h-11 px-3"
              value={inventoryId}
              onChange={(e) => setInventoryId(e.target.value)}
              required
            />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Cantidad
            <input
              type="number"
              min="1"
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 h-11 px-3"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Costo unitario
              <input
                type="number"
                min="0"
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 h-11 px-3"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </label>
          </div>
          <button className="bg-primary hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg">
            Registrar
          </button>
          {status && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 px-4 py-3 text-sm">
              {status}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default MaterialUsage;
