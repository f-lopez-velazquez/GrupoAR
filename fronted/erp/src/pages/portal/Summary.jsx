import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../state/AuthContext";

export default function Summary() {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    // Data State
    const [quotes, setQuotes] = useState([]);
    const [sales, setSales] = useState([]);
    const [projects, setProjects] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [evaluations, setEvaluations] = useState([]);
    const [finance, setFinance] = useState({ income: 0, expenses: 0 });

    useEffect(() => {
        // Real-time Listeners
        const qUnsub = onSnapshot(query(collection(db, "quotes"), orderBy("createdAt", "desc"), limit(20)), (snap) => {
            setQuotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const sUnsub = onSnapshot(query(collection(db, "sales"), orderBy("createdAt", "desc"), limit(50)), (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setSales(data.slice(0, 10)); // Recent 10 for list
            const totalIncome = data.reduce((sum, d) => sum + (d.total || 0), 0);
            setFinance(prev => ({ ...prev, income: totalIncome }));
        });

        const pUnsub = onSnapshot(query(collection(db, "projects"), where("status", "==", "active")), (snap) => {
            setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const eUnsub = onSnapshot(collection(db, "employees"), (snap) => {
            setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const expUnsub = onSnapshot(query(collection(db, "expenses"), orderBy("date", "desc")), (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setExpenses(data);
            const totalExpense = data.reduce((sum, d) => sum + (d.amount || 0), 0);
            setFinance(prev => ({ ...prev, expenses: totalExpense }));
        });

        const evalUnsub = onSnapshot(query(collection(db, "evaluations"), orderBy("createdAt", "desc"), limit(100)), (snap) => {
            setEvaluations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const accUnsub = onSnapshot(collection(db, "accounts"), (snap) => {
            setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        setLoading(false);

        return () => {
            qUnsub();
            sUnsub();
            pUnsub();
            eUnsub();
            expUnsub();
            evalUnsub();
            accUnsub();
        };
    }, []);

    const currentWeekStart = () => {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        return monday.toISOString().split('T')[0];
    };

    // Actual Payroll for current week
    const currentWeekEvals = evaluations.filter(ev => ev.weekStart === currentWeekStart());
    const actualPayroll = currentWeekEvals.reduce((sum, ev) => {
        if (Array.isArray(ev.employees)) {
            return sum + ev.employees.reduce((s, emp) => s + (emp.salaryDetails?.net || 0), 0);
        }
        return sum + (ev.finalPayment || 0);
    }, 0);

    const handleEditQuote = (quote) => {
        navigate("/portal/cotizador", { state: { quote } });
    };

    const StatusBadge = ({ status }) => {
        const colors = {
            active: "bg-blue-100 text-blue-700",
            approved: "bg-green-100 text-green-700",
            expired: "bg-gray-100 text-gray-500",
            rejected: "bg-red-100 text-red-700"
        };
        const labels = {
            active: "Activa",
            approved: "Aprobada",
            expired: "Vencida",
            rejected: "Rechazada"
        };
        return (
            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${colors[status] || colors.active}`}>
                {labels[status] || status}
            </span>
        );
    };

    if (loading) return <div className="p-10 text-center text-slate-400">Cargando resumen real...</div>;

    return (
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Resumen General</h1>
                    <p className="text-slate-500 text-sm">Visión integral de operaciones y finanzas en tiempo real</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-blue-100 animate-pulse">
                        <span className="size-2 bg-blue-600 rounded-full"></span>
                        Sincronización Activa (Live)
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">Ventas (Total Real)</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">${finance.income.toLocaleString()}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">Gastos (Total Real)</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">${finance.expenses.toLocaleString()}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">Obras Activas</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{projects.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">Cotizaciones Live</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{quotes.length}</p>
                </div>
            </div>

            {/* Saturday Overviews */}
            {(profile?.role === "SUPERADMIN" || profile?.superAdmin) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-3">
                        <h3 className="text-sm font-bold text-slate-400 uppercase flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-orange-500">event_upcoming</span>
                            Pendientes Semanales (Próximo Sábado)
                        </h3>
                    </div>
                    <div className="bg-gradient-to-br from-[#BF953F]/10 to-white p-5 rounded-2xl border border-[#BF953F]/20 shadow-sm relative overflow-hidden">
                        <div className="absolute right-[-10px] top-[-10px] opacity-10">
                            <span className="material-symbols-outlined text-6xl text-[#BF953F]">account_balance_wallet</span>
                        </div>
                        <p className="text-xs font-black text-[#AA771C] uppercase tracking-widest">Nómina Real (Evaluaciones)</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">
                            ${actualPayroll.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 font-bold italic uppercase">{currentWeekEvals.length} EVALUACIONES REGISTRADAS</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-white p-5 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
                        <div className="absolute right-[-10px] top-[-10px] opacity-10">
                            <span className="material-symbols-outlined text-6xl text-blue-600">receipt_long</span>
                        </div>
                        <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Servicios por Pagar</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">
                            ${accounts.filter(a => (a.type === "payable" || a.type === "Abono") && (a.status === "pending" || a.status === "Parcial")).reduce((sum, a) => sum + (a.amountRemaining || a.amount || 0), 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-blue-400 mt-1 italic">Cuentas pendientes esta semana</p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
                        <p className="text-xs font-black text-[#BF953F] uppercase tracking-tighter">DISPONIBILIDAD REQUERIDA (SÁBADO)</p>
                        <p className="text-3xl font-black text-white mt-2">
                            ${(
                                actualPayroll +
                                accounts.filter(a => (a.type === "payable" || a.type === "Abono") && (a.status === "pending" || a.status === "Parcial")).reduce((sum, a) => sum + (a.amountRemaining || a.amount || 0), 0)
                            ).toLocaleString()}
                        </p>
                        <div className="flex items-center gap-2 mt-4">
                            <div className="h-2 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[#BF953F] to-[#AA771C]" style={{ width: '100%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COL: Quotes & Projects */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Quotes Section */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-600">request_quote</span>
                                Historial de Cotizaciones
                            </h3>
                            <button onClick={() => navigate("/portal/cotizador")} className="text-xs font-bold text-blue-600 hover:underline">+ Nueva Cotización</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-5 py-3">Folio/Título</th>
                                        <th className="px-5 py-3">Cliente</th>
                                        <th className="px-5 py-3 text-right">Monto</th>
                                        <th className="px-5 py-3 text-center">Estado</th>
                                        <th className="px-5 py-3 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {quotes.map(q => (
                                        <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-5 py-3">
                                                <p className="font-bold text-slate-700">{q.title}</p>
                                                <p className="text-xs text-slate-400 font-mono">{q.quoteNumber}</p>
                                            </td>
                                            <td className="px-5 py-3 text-slate-600">{q.client?.name}</td>
                                            <td className="px-5 py-3 text-right font-medium text-slate-900">${q.totals?.total?.toFixed(2)}</td>
                                            <td className="px-5 py-3 text-center">
                                                <StatusBadge status={q.status || 'active'} />
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <button
                                                    onClick={() => handleEditQuote(q)}
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 hover:bg-blue-50 px-3 py-1 rounded transition-all"
                                                >
                                                    {q.status === 'approved' ? 'Ver' : 'Retomar'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {quotes.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-400">No hay cotizaciones registradas</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Projects Section */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-orange-600">apartment</span>
                                Obras Activas (Live)
                            </h3>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {projects.slice(0, 6).map(p => (
                                <div key={p.id} className="border border-slate-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-800 line-clamp-1">{p.name}</h4>
                                        <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase">Activo</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-3">{p.client}</p>
                                    <div className="flex justify-between text-xs border-t border-slate-50 pt-2">
                                        <span className="text-slate-400">Presupuesto</span>
                                        <span className="font-mono font-bold">${p.budget?.toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                            {projects.length === 0 && <p className="text-center text-slate-400 col-span-2">Sin obras activas en este momento</p>}
                        </div>
                    </div>
                </div>

                {/* RIGHT COL: Team & Sales */}
                <div className="space-y-8">
                    {/* Recent Sales (Real-time) */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[300px]">
                        <div className="p-5 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-600">point_of_sale</span>
                                Ventas en Vivo
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                            {sales.map(s => (
                                <div key={s.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                                    <div>
                                        <p className="font-bold text-sm text-slate-700">Ticket #{s.folio || '??'}</p>
                                        <p className="text-xs text-slate-400">{new Date(s.createdAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                    <span className="font-mono font-bold text-green-600">${s.total?.toFixed(2)}</span>
                                </div>
                            ))}
                            {sales.length === 0 && <p className="p-8 text-center text-slate-400">Esperando ventas...</p>}
                        </div>
                    </div>

                    {/* Employee Status */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-500">group</span>
                                Equipo
                            </h3>
                        </div>
                        <div className="p-4 space-y-3">
                            {employees.slice(0, 5).map(e => (
                                <div key={e.id} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                        {e.displayName ? e.displayName.substring(0, 2).toUpperCase() : 'UR'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">{e.displayName || e.name}</p>
                                        <p className="text-xs text-slate-400">{e.role}</p>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
