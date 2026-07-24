import { useEffect, useState } from "react";
import { getEvaluations, updateEvaluation } from "../../services/evaluations";
import { Roles } from "../../utils/roles";

export default function EvaluationList() {
    const [evals, setEvals] = useState([]);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        loadEvals();
    }, []);

    const loadEvals = async () => {
        const data = await getEvaluations();
        setEvals(data);
    };

    const handleSalaryUpdate = (empIdx, field, value) => {
        if (!selected) return;
        const updated = { ...selected };
        updated.employees[empIdx][field] = value;
        setSelected(updated);
    };

    const saveReview = async () => {
        if (!selected) return;
        try {
            await updateEvaluation(selected.id, {
                employees: selected.employees,
                status: "reviewed"
            });
            alert("Nómina actualizada.");
            setSelected(null);
            loadEvals();
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    if (selected) {
        return (
            <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-900">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h2 className="text-2xl font-bold">Revisión de Nómina: {selected.managerName}</h2>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-4 font-semibold text-slate-600">Empleado</th>
                                <th className="p-4 font-semibold text-slate-600">Días / Puntualidad</th>
                                <th className="p-4 font-semibold text-slate-600">Sueldo Base</th>
                                <th className="p-4 font-semibold text-slate-600">Descuentos</th>
                                <th className="p-4 font-semibold text-slate-600">Bonos</th>
                                <th className="p-4 font-semibold text-slate-600">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {selected.employees.map((emp, idx) => {
                                const base = Number(emp.salary || 0);
                                const discount = Number(emp.discount || 0);
                                const bonus = Number(emp.bonus || 0);
                                const total = base + bonus - discount;

                                return (
                                    <tr key={idx}>
                                        <td className="p-4">
                                            <p className="font-medium">{emp.name}</p>
                                            <p className="text-xs text-slate-500">{emp.notes || "Sin notas"}</p>
                                        </td>
                                        <td className="p-4">
                                            <p>{emp.days} días</p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${emp.punctuality === 'ok' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {emp.punctuality === 'ok' ? 'A tiempo' : 'Incidencias'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <input
                                                type="number" className="input w-24 h-8"
                                                value={emp.salary || ""}
                                                placeholder="$0.00"
                                                onChange={e => handleSalaryUpdate(idx, "salary", e.target.value)}
                                            />
                                        </td>
                                        <td className="p-4">
                                            <input
                                                type="number" className="input w-24 h-8 text-red-600"
                                                value={emp.discount || ""}
                                                placeholder="-$0.00"
                                                onChange={e => handleSalaryUpdate(idx, "discount", e.target.value)}
                                            />
                                            <input
                                                type="text" className="input w-full h-8 mt-1 text-xs"
                                                value={emp.discountReason || ""}
                                                placeholder="Motivo..."
                                                onChange={e => handleSalaryUpdate(idx, "discountReason", e.target.value)}
                                            />
                                        </td>
                                        <td className="p-4">
                                            <input
                                                type="number" className="input w-24 h-8 text-green-600"
                                                value={emp.bonus || ""}
                                                placeholder="+$0.00"
                                                onChange={e => handleSalaryUpdate(idx, "bonus", e.target.value)}
                                            />
                                        </td>
                                        <td className="p-4 font-bold text-slate-900">
                                            ${total.toFixed(2)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                        <button onClick={saveReview} className="btn-primary">Confirmar Nómina</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Reportes Semanales (Obra)</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {evals.map(ev => (
                    <div key={ev.id} onClick={() => setSelected(ev)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-primary cursor-pointer transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${ev.status === 'pending_review' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                {ev.status === 'pending_review' ? 'Pendiente' : 'Revisado'}
                            </span>
                            <span className="text-xs text-slate-400">{new Date(ev.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                        </div>
                        <h3 className="font-bold text-slate-900">{ev.projectId}</h3>
                        <p className="text-sm text-slate-600 mb-4">Encargado: {ev.managerName}</p>
                        <div className="flex items-center text-xs text-slate-500 gap-1 group-hover:text-primary">
                            <span className="material-symbols-outlined text-sm">group</span>
                            {ev.employees?.length || 0} Empleados
                        </div>
                    </div>
                ))}
                {evals.length === 0 && <p className="text-slate-500">No hay reportes pendientes.</p>}
            </div>
        </div>
    );
}
