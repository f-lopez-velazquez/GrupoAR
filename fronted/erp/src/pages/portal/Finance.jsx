import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy, serverTimestamp, getDoc, writeBatch, where, onSnapshot, Timestamp, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../state/AuthContext";
import { useSecurity } from "../../state/SecurityContext";
import TicketModal from "../../components/TicketModal";
import { showAlert, showConfirm, showPrompt } from "../../components/Modal";

export default function Finance() {
    const { profile, hasPermission } = useAuth();
    const canEdit = hasPermission('finance', 2);
    const { validateAction, isSuperAdmin } = useSecurity();
    const [activeTab, setActiveTab] = useState("dashboard");
    const [loading, setLoading] = useState(true);
    const [sales, setSales] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [accounts, setAccounts] = useState([]); // cuentas por cobrar/pagar
    const [showModal, setShowModal] = useState(false);
    const [showTicket, setShowTicket] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);
    const [modalType, setModalType] = useState(""); // expense, receivable, payable

    const [showFullNumbers, setShowFullNumbers] = useState(false);

    // Historical Sale
    const [isHistoricalSale, setIsHistoricalSale] = useState(false);

    const [form, setForm] = useState({
        amount: "",
        description: "",
        category: "",
        date: new Date().toISOString().split("T")[0],
        status: "pending",
        dueDate: "",
        client: ""
    });

    const expenseCategories = ["Nómina", "Servicios", "Renta", "Materiales", "Transporte", "Otros"];

    useEffect(() => {
        const sUnsub = onSnapshot(query(collection(db, "sales"), orderBy("createdAt", "desc")), (snap) => {
            setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const eUnsub = onSnapshot(query(collection(db, "expenses"), orderBy("createdAt", "desc")), (snap) => {
            setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const aUnsub = onSnapshot(query(collection(db, "accounts"), orderBy("dueDate", "asc")), (snap) => {
            setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            sUnsub();
            eUnsub();
            aUnsub();
        };
    }, []);

    useEffect(() => {
        if (showModal || showTicket) {
            document.body.classList.add('no-scroll');
        } else {
            document.body.classList.remove('no-scroll');
        }
        return () => document.body.classList.remove('no-scroll');
    }, [showModal, showTicket]);

    const [selectedItem, setSelectedItem] = useState(null);



    const registerEdit = (oldData, newData) => {
        const changes = {};
        Object.keys(newData).forEach(key => {
            if (newData[key] !== oldData[key]) {
                changes[key] = { from: oldData[key], to: newData[key] };
            }
        });
        return {
            date: new Date().toISOString(),
            user: profile?.email,
            changes
        };
    };

    const saveHistoricalSale = async () => {
        try {
            const data = {
                total: parseFloat(form.amount),
                items: [{ description: "Venta Histórica / Manual", quantity: 1, price: parseFloat(form.amount), total: parseFloat(form.amount) }],
                paymentMethod: form.paymentMethod || "cash",
                status: "completed",
                isHistorical: true,
                description: form.description,
                createdAt: Timestamp.fromDate(new Date(form.date)),
                updatedAt: serverTimestamp()
            };

            if (selectedItem) {
                const editLog = selectedItem.editLog || [];
                editLog.push(registerEdit(selectedItem, data));
                await updateDoc(doc(db, "sales", selectedItem.id), { ...data, editLog });
            } else {
                await addDoc(collection(db, "sales"), { ...data, createdBy: profile?.email });
            }
            setShowModal(false);
            resetForm();
        } catch (e) {
            console.error(e);
            alert("Error al guardar venta");
        }
    };

    const saveExpense = async () => {
        if (!form.amount || !form.description) return alert("Monto y descripción son obligatorios");

        try {
            const data = {
                amount: parseFloat(form.amount),
                description: form.description,
                category: form.category,
                date: form.date,
                updatedAt: serverTimestamp()
            };

            if (selectedItem) {
                const editLog = selectedItem.editLog || [];
                editLog.push(registerEdit(selectedItem, data));
                await updateDoc(doc(db, "expenses", selectedItem.id), { ...data, editLog });
            } else {
                await addDoc(collection(db, "expenses"), { ...data, createdBy: profile?.email, createdAt: serverTimestamp() });
            }

            setShowModal(false);
            resetForm();
        } catch (e) {
            console.error(e);
            alert("Error al guardar gasto");
        }
    };

    const saveAccount = async () => {
        if (!form.amount || !form.client) {
            alert("Monto y cliente son obligatorios");
            return;
        }

        try {
            await addDoc(collection(db, "accounts"), {
                type: modalType, // receivable or payable
                amount: parseFloat(form.amount),
                client: form.client,
                description: form.description,
                dueDate: form.dueDate,
                status: form.status,
                createdBy: profile?.email,
                createdAt: serverTimestamp()
            });

            setShowModal(false);
            resetForm();
            fetchData();
        } catch (e) {
            console.error(e);
            alert("Error al guardar cuenta");
        }
    };

    const markAsPaid = async (accountId) => {
        try {
            await updateDoc(doc(db, "accounts", accountId), {
                status: "paid",
                paidAt: serverTimestamp()
            });
        } catch (e) {
            console.error(e);
            alert("Error al marcar como pagado");
        }
    };

    const deleteSale = async (sale) => {
        const confirmed = await showConfirm(`¿Eliminar venta ${sale.folio || ""}?`);
        if (!confirmed) return;

        try {
            // Restore inventory if it's a POS sale
            if (sale.items && sale.items.length > 0) {
                for (const item of sale.items) {
                    if (item.id) {
                        const productRef = doc(db, "inventory", item.id);
                        const productSnap = await getDoc(productRef);
                        if (productSnap.exists()) {
                            await updateDoc(productRef, {
                                stock: (productSnap.data().stock || 0) + item.qty,
                                updatedAt: serverTimestamp()
                            });
                        }
                    }
                }
            }
            await deleteDoc(doc(db, "sales", sale.id));
            showAlert("Venta eliminada e inventario restaurado", "success");
        } catch (e) {
            console.error(e);
            showAlert("Error al eliminar venta", "error");
        }
    };

    const deleteExpense = async (id) => {
        const confirmed = await showConfirm("¿Eliminar este gasto?");
        if (!confirmed) return;
        try {
            await deleteDoc(doc(db, "expenses", id));
            showAlert("Gasto eliminado", "success");
        } catch (e) {
            console.error(e);
            showAlert("Error al eliminar gasto", "error");
        }
    };

    const deleteAllSales = async () => {
        const confirmed = await showConfirm("¡ADVERTENCIA! Esto borrará TODAS las ventas permanentemente. ¿Continuar?");
        if (!confirmed) return;

        try {
            setLoading(true);
            const snap = await getDocs(collection(db, "sales"));
            const batchSize = 500;
            let count = 0;

            // Note: This doesn't restore inventory. It's a mass wipe.
            for (let i = 0; i < snap.docs.length; i += batchSize) {
                const batch = writeBatch(db);
                snap.docs.slice(i, i + batchSize).forEach(d => batch.delete(d.ref));
                await batch.commit();
                count += snap.docs.slice(i, i + batchSize).length;
            }

            showAlert(`Se eliminaron ${count} ventas`, "success");
        } catch (e) {
            console.error(e);
            showAlert("Error al limpiar historial", "error");
        } finally {
            setLoading(false);
        }
    };

    const openEdit = (item, type) => {
        setSelectedItem(item);
        setModalType(type);
        setForm({
            amount: type === "expense" ? item.amount : item.total,
            description: item.description,
            category: item.category || "",
            date: item.date || (item.createdAt?.toDate ? item.createdAt.toDate().toISOString().split("T")[0] : new Date().toISOString().split("T")[0]),
            status: item.status || "pending",
            dueDate: item.dueDate || "",
            client: item.client || ""
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setSelectedItem(null);
        setForm({
            amount: "",
            description: "",
            category: "",
            date: new Date().toISOString().split("T")[0],
            status: "pending",
            dueDate: "",
            client: ""
        });
    };

    const getFinancialStats = () => {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        const monthlySales = sales.filter(s => {
            if (!s.createdAt || s.status !== 'completed') return false;
            // Handle Timestamp vs Date object if mixed
            const date = s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
            return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
        });

        const monthlyExpenses = expenses.filter(e => {
            if (!e.createdAt) return false;
            const date = e.createdAt.toDate ? e.createdAt.toDate() : new Date(e.createdAt);
            return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
        });

        const income = monthlySales.reduce((sum, s) => sum + (s.total || 0), 0);
        const expensesTotal = monthlyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const profit = income - expensesTotal;

        const receivables = accounts.filter(a => a.type === "receivable" && a.status === "pending");
        const payables = accounts.filter(a => a.type === "payable" && a.status === "pending");

        const totalReceivable = receivables.reduce((sum, a) => sum + (a.amount || 0), 0);
        const totalPayable = payables.reduce((sum, a) => sum + (a.amount || 0), 0);

        return {
            income,
            expenses: expensesTotal,
            profit,
            receivables: totalReceivable,
            payables: totalPayable,
            cashFlow: income - expensesTotal + totalReceivable - totalPayable
        };
    };

    const stats = getFinancialStats();

    const formatMoney = (amount) => {
        if (!showFullNumbers) {
            if (Math.abs(amount) >= 1000) return `$${(amount / 1000).toFixed(1)} K`;
        }
        return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} `;
    };

    // Helper for safely accessing absolute value
    const absFormat = (val) => formatMoney(Math.abs(val));
    // Correct helper
    const displayVal = (val) => {
        if (!showFullNumbers && Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(1)} K`;
        return `$${val.toLocaleString('es-MX', { minimumFractionDigits: 2 })} `;
    }

    return (
        <div className="bg-background-light min-h-screen">
            {/* Header */}
            <header className="bg-white sticky top-0 z-50 border-b border-[#dbe1e6] px-6 py-3 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-2xl">account_balance</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-[#111518]">Finanzas</h1>
                            <p className="text-xs text-[#60778a] font-medium uppercase tracking-wider">Dashboard Financiero</p>
                        </div>
                    </div>
                    {/* Toggle View */}
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{showFullNumbers ? "Completo" : "Resumido (K)"}</span>
                        <button
                            onClick={() => setShowFullNumbers(!showFullNumbers)}
                            className={`w - 12 h - 6 rounded - full p - 1 transition - colors ${showFullNumbers ? 'bg-primary' : 'bg-gray-300'} `}
                        >
                            <div className={`w - 4 h - 4 rounded - full bg - white shadow - md transform transition - transform ${showFullNumbers ? 'translate-x-6' : 'translate-x-0'} `} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-6">
                {/* Tab Switcher */}
                <div className="flex border-b border-[#dbe1e6] mb-6">
                    <button onClick={() => setActiveTab("dashboard")} className={`px - 6 py - 3 font - bold text - sm transition - colors ${activeTab === 'dashboard' ? 'border-b-2 border-primary text-primary' : 'text-[#60778a]'} `}>Dashboard</button>
                    <button onClick={() => setActiveTab("sales")} className={`px - 6 py - 3 font - bold text - sm transition - colors ${activeTab === 'sales' ? 'border-b-2 border-primary text-primary' : 'text-[#60778a]'} `}>Ventas Históricas</button>
                    <button onClick={() => setActiveTab("expenses")} className={`px - 6 py - 3 font - bold text - sm transition - colors ${activeTab === 'expenses' ? 'border-b-2 border-primary text-primary' : 'text-[#60778a]'} `}>Gastos</button>
                    <button onClick={() => setActiveTab("accounts")} className={`px - 6 py - 3 font - bold text - sm transition - colors ${activeTab === 'accounts' ? 'border-b-2 border-primary text-primary' : 'text-[#60778a]'} `}>Cuentas Pendientes</button>
                </div>

                {activeTab === "dashboard" && (
                    <div className="space-y-6">
                        {/* KPIs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-white rounded-xl border border-[#dbe1e6] p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm font-medium text-[#60778a]">Ingresos del Mes</p>
                                    <span className="material-symbols-outlined text-green-600">trending_up</span>
                                </div>
                                <p className="text-3xl font-bold text-green-600">{displayVal(stats.income)}</p>
                            </div>

                            <div className="bg-white rounded-xl border border-[#dbe1e6] p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm font-medium text-[#60778a]">Gastos del Mes</p>
                                    <span className="material-symbols-outlined text-red-600">trending_down</span>
                                </div>
                                <p className="text-3xl font-bold text-red-600">{displayVal(stats.expenses)}</p>
                            </div>

                            <div className="bg-white rounded-xl border border-[#dbe1e6] p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm font-medium text-[#60778a]">Utilidad del Mes</p>
                                    <span className="material-symbols-outlined text-blue-600">payments</span>
                                </div>
                                <p className={`text - 3xl font - bold ${stats.profit >= 0 ? 'text-blue-600' : 'text-red-600'} `}>
                                    {displayVal(stats.profit)}
                                </p>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        {canEdit && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <button
                                    onClick={() => { setModalType("expense"); setSelectedItem(null); setShowModal(true); }}
                                    className="bg-white border border-[#dbe1e6] p-6 rounded-xl hover:shadow-md transition-all text-left"
                                >
                                    <span className="material-symbols-outlined text-3xl text-red-600 mb-2">receipt</span>
                                    <h3 className="font-bold text-lg">Registrar Gasto</h3>
                                    <p className="text-sm text-[#60778a]">Nómina, servicios...</p>
                                </button>

                                <button
                                    onClick={() => { setModalType("sale_history"); setSelectedItem(null); setShowModal(true); }}
                                    className="bg-white border border-[#dbe1e6] p-6 rounded-xl hover:shadow-md transition-all text-left"
                                >
                                    <span className="material-symbols-outlined text-3xl text-blue-600 mb-2">history</span>
                                    <h3 className="font-bold text-lg">Venta Histórica</h3>
                                    <p className="text-sm text-[#60778a]">Registro manual pasado...</p>
                                </button>

                                <button
                                    onClick={() => { setModalType("receivable"); setSelectedItem(null); setShowModal(true); }}
                                    className="bg-white border border-[#dbe1e6] p-6 rounded-xl hover:shadow-md transition-all text-left"
                                >
                                    <span className="material-symbols-outlined text-3xl text-green-600 mb-2">request_quote</span>
                                    <h3 className="font-bold text-lg">Cuenta por Cobrar</h3>
                                    <p className="text-sm text-[#60778a]">Facturas pendientes...</p>
                                </button>

                                <button
                                    onClick={() => { setModalType("payable"); setSelectedItem(null); setShowModal(true); }}
                                    className="bg-white border border-[#dbe1e6] p-6 rounded-xl hover:shadow-md transition-all text-left"
                                >
                                    <span className="material-symbols-outlined text-3xl text-orange-600 mb-2">shopping_cart</span>
                                    <h3 className="font-bold text-lg">Cuenta por Pagar</h3>
                                    <p className="text-sm text-[#60778a]">Proveedores, servicios...</p>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "sales" && (
                    <div className="bg-white rounded-xl border border-[#dbe1e6] overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <h3 className="font-bold text-gray-700">Historial de Ventas</h3>
                                {isSuperAdmin && (
                                    <button
                                        onClick={() => validateAction(deleteAllSales, { type: 'delete_all_sales' })}
                                        className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 font-bold hover:bg-red-100 transition-colors"
                                    >
                                        BORRAR TODO
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400 font-medium italic">Solo personal autorizado puede eliminar registros</span>
                                <button onClick={() => { setModalType("sale_history"); resetForm(); setShowModal(true); }} className="text-sm bg-primary text-white px-3 py-1.5 rounded-lg font-bold">Nueva Venta</button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b">
                                    <tr>
                                        <th className="px-6 py-4">Fecha</th>
                                        <th className="px-6 py-4">Descripción</th>
                                        <th className="px-6 py-4">Monto</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {sales.length === 0 ? (
                                        <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-400">Sin registros</td></tr>
                                    ) : sales.map(s => (
                                        <tr key={s.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">{s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString() : new Date(s.createdAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 font-medium">
                                                {s.description || "Venta de Punto de Venta"}
                                                {s.status === 'cancelled' && (
                                                    <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded uppercase">Cancelado</span>
                                                )}
                                            </td>
                                            <td className={`px-6 py-4 font-bold ${s.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-green-600'}`}>${s.total?.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => { setSelectedSale(s); setShowTicket(true); }}
                                                        className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-all"
                                                        title="Ver Ticket"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                                                    </button>

                                                    {s.isHistorical && canEdit && (
                                                        <button onClick={() => openEdit(s, "sale_history")} className="text-primary hover:bg-primary/10 p-2 rounded-lg transition-all">
                                                            <span className="material-symbols-outlined text-[20px]">edit_note</span>
                                                        </button>
                                                    )}
                                                    {isSuperAdmin && (
                                                        <button
                                                            onClick={() => validateAction(() => deleteSale(s), { type: 'delete_sale', id: s.id })}
                                                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all"
                                                        >
                                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === "expenses" && (
                    <div className="bg-white rounded-xl border border-[#dbe1e6] overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                            <h3 className="font-bold text-gray-700">Control de Gastos</h3>
                            <button onClick={() => { setModalType("expense"); resetForm(); setShowModal(true); }} className="text-sm bg-primary text-white px-3 py-1.5 rounded-lg font-bold">Registrar Gasto</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b">
                                    <tr>
                                        <th className="px-6 py-4">Fecha</th>
                                        <th className="px-6 py-4">Categoría</th>
                                        <th className="px-6 py-4">Descripción</th>
                                        <th className="px-6 py-4">Monto</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {expenses.length === 0 ? (
                                        <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400">Sin registros</td></tr>
                                    ) : expenses.map(e => (
                                        <tr key={e.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 font-bold text-xs uppercase text-red-600">{e.category}</td>
                                            <td className="px-6 py-4 text-[#60778a]">{e.description}</td>
                                            <td className="px-6 py-4 font-bold text-red-600">-${e.amount?.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    {canEdit && (
                                                        <button onClick={() => openEdit(e, "expense")} className="text-primary hover:bg-primary/10 p-2 rounded-lg transition-all">
                                                            <span className="material-symbols-outlined text-[20px]">edit_note</span>
                                                        </button>
                                                    )}
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => validateAction(() => deleteExpense(e.id), { type: 'delete_expense', id: e.id })}
                                                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all"
                                                        >
                                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === "accounts" && (
                    <div className="space-y-6">
                        {/* Recent Accounts */}
                        <div className="bg-white rounded-xl border border-[#dbe1e6] p-6">
                            <h2 className="text-lg font-bold mb-4">Cuentas Pendientes</h2>

                            {accounts.filter(a => a.status === "pending").length === 0 ? (
                                <p className="text-center py-8 text-[#60778a]">No hay cuentas pendientes</p>
                            ) : (
                                <div className="space-y-3">
                                    {accounts.filter(a => a.status === "pending").slice(0, 10).map(account => (
                                        <div key={account.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50 rounded-lg gap-4">
                                            <div className="flex-1 w-full">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px - 2 py - 1 rounded text - xs font - bold ${account.type === "receivable" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                                                        } `}>
                                                        {account.type === "receivable" ? "Por Cobrar" : "Por Pagar"}
                                                    </span>
                                                    <span className="font-medium truncate">{account.client}</span>
                                                </div>
                                                <p className="text-sm text-[#60778a] line-clamp-2">{account.description}</p>
                                                {account.dueDate && (
                                                    <p className="text-xs text-red-600 mt-1">
                                                        Vence: {new Date(account.dueDate).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                                                <p className="font-bold text-lg tabular-nums">${account.amount?.toLocaleString()}</p>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => markAsPaid(account.id)}
                                                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-dark whitespace-nowrap"
                                                    >
                                                        Marcar Pagado
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold">
                                    {selectedItem ? "Editar " : "Registrar "}
                                    {modalType === "expense" ? "Gasto" :
                                        modalType === "sale_history" ? "Venta Histórica" :
                                            modalType === "receivable" ? "Cuenta por Cobrar" :
                                                "Cuenta por Pagar"}
                                </h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {selectedItem?.editLog && selectedItem.editLog.length > 0 && (
                                <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">Historial de Ediciones</h4>
                                    <div className="space-y-2 max-h-[100px] overflow-y-auto">
                                        {selectedItem.editLog.map((log, i) => (
                                            <div key={i} className="text-[11px] text-blue-800 leading-tight">
                                                <span className="font-bold">{new Date(log.date).toLocaleDateString()}</span> - {log.user.split('@')[0]}:
                                                {Object.keys(log.changes).map(k => ` ${k} `).join(',')}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}


                                // STEP 1: DATA FORM
                            <div className="space-y-4">
                                {modalType !== "expense" && modalType !== "sale_history" && (
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            {modalType === "receivable" ? "Cliente" : "Proveedor"} *
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border-[#dbe1e6] px-4 py-2 text-sm border"
                                            value={form.client}
                                            onChange={(e) => setForm({ ...form, client: e.target.value })}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium mb-2">Monto *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full rounded-lg border-[#dbe1e6] px-4 py-2 text-sm border"
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Descripción *</label>
                                    <textarea
                                        className="w-full rounded-lg border-[#dbe1e6] px-4 py-2 text-sm min-h-[80px] border"
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    />
                                </div>

                                {(modalType === "expense" || modalType === "sale_history") && (
                                    <>
                                        {modalType === "expense" && (
                                            <div>
                                                <label className="block text-sm font-medium mb-2">Categoría</label>
                                                <select
                                                    className="w-full rounded-lg border-[#dbe1e6] px-4 py-2 text-sm border"
                                                    value={form.category}
                                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                                >
                                                    <option value="">Seleccionar</option>
                                                    {expenseCategories.map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium mb-2">Fecha</label>
                                            <input
                                                type="date"
                                                className="w-full rounded-lg border-[#dbe1e6] px-4 py-2 text-sm border"
                                                value={form.date}
                                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                                            />
                                        </div>
                                    </>
                                )}

                                {modalType !== "expense" && modalType !== "sale_history" && (
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Fecha de Vencimiento</label>
                                        <input
                                            type="date"
                                            className="w-full rounded-lg border-[#dbe1e6] px-4 py-2 text-sm border"
                                            value={form.dueDate}
                                            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                                        />
                                    </div>
                                )}

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => {
                                            setShowModal(false);
                                            resetForm();
                                        }}
                                        className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!form.amount || !form.description) return alert("Completa los campos obligatorios");

                                            validateAction(async () => {
                                                if (modalType === "expense") await saveExpense();
                                                else if (modalType === "sale_history") await saveHistoricalSale();
                                                else await saveAccount();
                                            });
                                        }}
                                        className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark"
                                    >
                                        {selectedItem ? "Guardar Cambios" : "Guardar"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Ticket Viewer */}
            {showTicket && selectedSale && (
                <TicketModal
                    sale={selectedSale}
                    onClose={() => { setShowTicket(false); setSelectedSale(null); }}
                    title="Detalle de Venta"
                />
            )}
        </div>
    );
}
