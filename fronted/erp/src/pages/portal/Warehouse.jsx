import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../state/AuthContext";

export default function Warehouse() {
    const { profile, hasPermission } = useAuth();
    const canEdit = hasPermission('warehouse', 2);
    const [activeTab, setActiveTab] = useState("entries");
    const [loading, setLoading] = useState(true);
    const [inventory, setInventory] = useState([]);
    const [movements, setMovements] = useState([]);
    const [tools, setTools] = useState([]);
    const [toolLog, setToolLog] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showToolModal, setShowToolModal] = useState(false);

    const [form, setForm] = useState({
        type: "entry", // entry, exit, transfer
        productId: "",
        quantity: "",
        reason: "",
        supplier: "",
        cost: "",
        notes: ""
    });

    const [toolForm, setToolForm] = useState({
        type: "loan", // loan, return, register
        toolId: "",
        toolName: "",
        employeeId: "",
        projectName: "",
        notes: ""
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [invSnap, movSnap, toolSnap, logSnap, empSnap] = await Promise.all([
                getDocs(collection(db, "inventory")),
                getDocs(query(collection(db, "warehouseMovements"), orderBy("createdAt", "desc"))),
                getDocs(query(collection(db, "tools"), orderBy("name"))),
                getDocs(query(collection(db, "toolLog"), orderBy("createdAt", "desc"))),
                getDocs(query(collection(db, "employees"), orderBy("name")))
            ]);

            setInventory(invSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setMovements(movSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setTools(toolSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setToolLog(logSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setEmployees(empSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const saveMovement = async () => {
        if (!form.productId || !form.quantity) {
            alert("Producto y cantidad son obligatorios");
            return;
        }

        try {
            const product = inventory.find(p => p.id === form.productId);
            if (!product) {
                alert("Producto no encontrado");
                return;
            }

            const quantity = parseFloat(form.quantity);
            const currentStock = product.stock || 0;

            // Validar stock para salidas
            if (form.type === "exit" && quantity > currentStock) {
                alert(`Stock insuficiente. Disponible: ${currentStock}`);
                return;
            }

            // Calcular nuevo stock
            let newStock = currentStock;
            if (form.type === "entry") newStock += quantity;
            if (form.type === "exit") newStock -= quantity;

            // Guardar movimiento
            await addDoc(collection(db, "warehouseMovements"), {
                type: form.type,
                productId: form.productId,
                productName: product.name,
                quantity,
                reason: form.reason,
                supplier: form.supplier || null,
                cost: form.cost ? parseFloat(form.cost) : null,
                notes: form.notes,
                previousStock: currentStock,
                newStock,
                createdBy: profile?.email,
                createdAt: serverTimestamp()
            });

            // Actualizar inventario
            await updateDoc(doc(db, "inventory", form.productId), {
                stock: newStock,
                updatedAt: serverTimestamp()
            });

            setShowModal(false);
            setForm({
                type: "entry",
                productId: "",
                quantity: "",
                reason: "",
                supplier: "",
                cost: "",
                notes: ""
            });
            fetchData();
            alert("Movimiento registrado correctamente");
        } catch (e) {
            console.error(e);
            alert("Error al registrar movimiento");
        }
    };

    const handleToolAction = async () => {
        if (toolForm.type === 'register') {
            if (!toolForm.toolName) return alert("Nombre de herramienta obligatorio");
            try {
                await addDoc(collection(db, "tools"), {
                    name: toolForm.toolName,
                    status: 'available',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                alert("Herramienta registrada");
                setShowToolModal(false);
                fetchData();
            } catch (e) { console.error(e); }
            return;
        }

        if (!toolForm.toolId || !toolForm.employeeId) return alert("Faltan campos obligatorios");

        try {
            const tool = tools.find(t => t.id === toolForm.toolId);
            const emp = employees.find(e => e.id === toolForm.employeeId);

            await addDoc(collection(db, "toolLog"), {
                toolId: toolForm.toolId,
                toolName: tool.name,
                employeeId: toolForm.employeeId,
                employeeName: emp.name,
                action: toolForm.type,
                project: toolForm.projectName,
                notes: toolForm.notes,
                createdAt: serverTimestamp()
            });

            await updateDoc(doc(db, "tools", toolForm.toolId), {
                status: toolForm.type === 'loan' ? 'borrowed' : 'available',
                currentHolder: toolForm.type === 'loan' ? emp.name : null,
                updatedAt: serverTimestamp()
            });

            alert("Operación completada");
            setShowToolModal(false);
            fetchData();
        } catch (e) {
            console.error(e);
            alert("Error al procesar");
        }
    };

    const getStats = () => {
        const entries = movements.filter(m => m.type === "entry");
        const exits = movements.filter(m => m.type === "exit");
        const totalValue = inventory.reduce((sum, p) => sum + (p.stock || 0) * (p.price || 0), 0);

        return {
            totalProducts: inventory.length,
            totalEntries: entries.length,
            totalExits: exits.length,
            totalValue,
            toolsAvailable: tools.filter(t => t.status === 'available').length,
            toolsBorrowed: tools.filter(t => t.status === 'borrowed').length
        };
    };

    const stats = getStats();

    const filtered = movements.filter(m => {
        if (activeTab === "entries") return m.type === "entry";
        if (activeTab === "exits") return m.type === "exit";
        if (activeTab === "transfers") return m.type === "transfer";
        return true;
    });

    return (
        <div className="bg-background-light min-h-screen">
            {/* Header */}
            <header className="bg-white sticky top-0 z-50 border-b border-[#dbe1e6] px-6 py-3 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-2xl">warehouse</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-[#111518]">Gestión de Almacén</h1>
                            <p className="text-xs text-[#60778a] font-medium uppercase tracking-wider">Entradas, Salidas y Herramientas</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {canEdit && (
                            activeTab === 'tools' ? (
                                <button
                                    onClick={() => {
                                        setToolForm({ type: 'register', toolName: '', toolId: '', employeeId: '', projectName: '', notes: '' });
                                        setShowToolModal(true);
                                    }}
                                    className="flex items-center h-10 px-4 rounded-lg bg-[#BF953F] hover:bg-[#AA771C] text-white text-sm font-bold"
                                >
                                    <span className="material-symbols-outlined text-[18px] mr-2">build</span>
                                    Nueva Herramienta
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        setForm({ ...form, type: activeTab === "entries" ? "entry" : "exit" });
                                        setShowModal(true);
                                    }}
                                    className="flex items-center h-10 px-4 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-bold"
                                >
                                    <span className="material-symbols-outlined text-[18px] mr-2">add</span>
                                    Nuevo Movimiento
                                </button>
                            )
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-6">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-[#dbe1e6] p-6">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-sm font-medium text-[#60778a]">Productos</p>
                            <span className="material-symbols-outlined text-primary">inventory_2</span>
                        </div>
                        <p className="text-2xl font-bold">{stats.totalProducts}</p>
                    </div>

                    <div className="bg-white rounded-xl border border-[#dbe1e6] p-6">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-sm font-medium text-[#60778a]">Entradas Sem.</p>
                            <span className="material-symbols-outlined text-green-600">trending_up</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">+{stats.totalEntries}</p>
                    </div>

                    <div className="bg-white rounded-xl border border-[#dbe1e6] p-6">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-sm font-medium text-[#60778a]">Herramientas</p>
                            <span className="material-symbols-outlined text-amber-600">construction</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold">{stats.toolsAvailable + stats.toolsBorrowed}</p>
                            <span className="text-xs text-red-500 font-bold">{stats.toolsBorrowed} en uso</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-[#dbe1e6] p-6">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-sm font-medium text-[#60778a]">Valor Inventario</p>
                            <span className="material-symbols-outlined text-blue-600">account_balance_wallet</span>
                        </div>
                        <p className="text-2xl font-bold">${(stats.totalValue / 1000).toFixed(0)}K</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl border border-[#dbe1e6] mb-6 shadow-sm overflow-hidden">
                    <div className="border-b border-[#dbe1e6] px-6 bg-gray-50/30">
                        <nav className="flex gap-6">
                            {[
                                { id: "entries", label: "Material Entradas", icon: "login" },
                                { id: "exits", label: "Material Salidas", icon: "logout" },
                                { id: "tools", label: "Herramientas", icon: "build" },
                                { id: "all", label: "Historial Gral", icon: "list" }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 py-4 border-b-2 transition-all ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-[#60778a] hover:text-slate-900"
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                                    <span className="text-sm font-bold">{tab.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                                <p className="text-[#60778a]">Sincronizando con la nube...</p>
                            </div>
                        ) : activeTab === 'tools' ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Tool List */}
                                    <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
                                        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                                            <h3 className="font-bold flex items-center gap-2">
                                                <span className="material-symbols-outlined text-primary">inventory</span>
                                                Biblioteca de Herramientas
                                            </h3>
                                        </div>
                                        <div className="max-h-[500px] overflow-y-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead>
                                                    <tr className="border-b bg-gray-50/50">
                                                        <th className="p-3 font-semibold">Herramienta</th>
                                                        <th className="p-3 font-semibold">Estado</th>
                                                        <th className="p-3 font-semibold text-right">Acción</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {tools.map(t => (
                                                        <tr key={t.id} className="hover:bg-gray-50">
                                                            <td className="p-3">
                                                                <div className="font-bold">{t.name}</div>
                                                                {t.currentHolder && <div className="text-xs text-amber-600">Cargo: {t.currentHolder}</div>}
                                                            </td>
                                                            <td className="p-3 px-1">
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${t.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {t.status === 'available' ? 'Disponible' : 'Prestada'}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-right">
                                                                {canEdit && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setToolForm({ type: t.status === 'available' ? 'loan' : 'return', toolId: t.id, toolName: t.name, employeeId: '', projectName: '', notes: '' });
                                                                            setShowToolModal(true);
                                                                        }}
                                                                        className={`p-1.5 rounded-lg ${t.status === 'available' ? 'bg-primary/10 text-primary hover:bg-primary hover:text-white' : 'bg-green-100 text-green-700 hover:bg-green-700 hover:text-white'}`}
                                                                    >
                                                                        <span className="material-symbols-outlined text-sm">{t.status === 'available' ? 'forklift' : 'undo'}</span>
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Recent Activity */}
                                    <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
                                        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                                            <h3 className="font-bold flex items-center gap-2">
                                                <span className="material-symbols-outlined text-amber-600">history</span>
                                                Últimos Préstamos
                                            </h3>
                                        </div>
                                        <div className="max-h-[500px] overflow-y-auto">
                                            <div className="divide-y">
                                                {toolLog.map(log => (
                                                    <div key={log.id} className="p-3 hover:bg-gray-50">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="font-bold text-sm">{log.toolName}</span>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded font-black ${log.action === 'loan' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                                {log.action === 'loan' ? 'SALIÓ' : 'VOLVIÓ'}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-gray-500 flex flex-col gap-1">
                                                            <div className="flex items-center gap-1 font-medium">
                                                                <span className="material-symbols-outlined text-[14px]">person</span>
                                                                {log.employeeName}
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="flex items-center gap-1 text-[10px] bg-gray-100 px-1.5 rounded">
                                                                    <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                                                                    {log.createdAt?.toDate().toLocaleDateString()}
                                                                </span>
                                                                {log.project && <span className="text-[10px] text-primary font-bold">Obra: {log.project}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-20 bg-gray-50/30 rounded-xl">
                                <span className="material-symbols-outlined text-5xl text-gray-200 mb-4">folder_open</span>
                                <p className="text-[#60778a] font-medium">No se encontraron movimientos registrados</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/50">
                                            <th className="py-4 px-4 text-xs font-bold text-[#60778a] uppercase tracking-wider">Fecha</th>
                                            <th className="py-4 px-4 text-xs font-bold text-[#60778a] uppercase tracking-wider">Tipo</th>
                                            <th className="py-4 px-4 text-xs font-bold text-[#60778a] uppercase tracking-wider">Material / Producto</th>
                                            <th className="py-4 px-4 text-xs font-bold text-[#60778a] uppercase tracking-wider text-right">Cantidad</th>
                                            <th className="py-4 px-4 text-xs font-bold text-[#60778a] uppercase tracking-wider">Referencia</th>
                                            <th className="py-4 px-4 text-xs font-bold text-[#60778a] uppercase tracking-wider">Registró</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filtered.map((mov) => (
                                            <tr key={mov.id} className="hover:bg-primary/[0.02] transition-colors group">
                                                <td className="py-4 px-4 text-sm text-slate-500">
                                                    {mov.createdAt ? new Date(mov.createdAt.toDate()).toLocaleDateString() : "-"}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${mov.type === "entry" ? "bg-green-100 text-green-700" :
                                                        mov.type === "exit" ? "bg-red-100 text-red-700" :
                                                            "bg-blue-100 text-blue-700"
                                                        }`}>
                                                        {mov.type === "entry" ? "Entrada" : mov.type === "exit" ? "Salida" : "Transfer"}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="font-bold text-slate-800">{mov.productName}</div>
                                                    {mov.supplier && <div className="text-[10px] text-gray-400">Prov: {mov.supplier}</div>}
                                                </td>
                                                <td className="py-4 px-4 text-sm font-black text-right tabular-nums">
                                                    <span className={mov.type === "entry" ? "text-green-600" : "text-red-500"}>
                                                        {mov.type === "entry" ? "+ " : "- "}{mov.quantity.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-xs text-[#60778a] italic">{mov.reason || "-"}</td>
                                                <td className="py-4 px-4 text-[10px] text-gray-400 font-medium">
                                                    {mov.createdBy?.split('@')[0]}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Movement Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-10 overflow-y-auto">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden transform transition-all">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Movimiento</h2>
                                <button onClick={() => setShowModal(false)} className="size-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Tipo de Operación</label>
                                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1.5 rounded-2xl border-2 border-gray-100">
                                        {['entry', 'exit'].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setForm({ ...form, type: t })}
                                                className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${form.type === t ? 'bg-white shadow-sm text-primary ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}
                                            >
                                                {t === 'entry' ? 'Entrada' : 'Salida'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Producto</label>
                                    <select
                                        className="w-full h-12 rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 text-sm font-bold focus:border-primary focus:bg-white transition-all outline-none"
                                        value={form.productId}
                                        onChange={(e) => setForm({ ...form, productId: e.target.value })}
                                    >
                                        <option value="">Seleccionar material...</option>
                                        {inventory.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} (Stock: {p.stock || 0})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Cantidad</label>
                                        <input
                                            type="number"
                                            className="w-full h-12 rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 text-sm font-bold focus:border-primary focus:bg-white transition-all outline-none"
                                            value={form.quantity}
                                            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Unidad</label>
                                        <div className="w-full h-12 rounded-2xl border-2 border-gray-100 bg-gray-100/50 flex items-center px-4 text-xs font-bold text-gray-400">
                                            Auto-detect
                                        </div>
                                    </div>
                                </div>

                                {form.type === "entry" && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Costo Unit.</label>
                                            <input
                                                type="number"
                                                className="w-full h-12 rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 text-sm font-bold focus:border-primary focus:bg-white transition-all outline-none"
                                                value={form.cost}
                                                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Proveedor</label>
                                            <input
                                                className="w-full h-12 rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 text-sm font-bold focus:border-primary focus:bg-white transition-all outline-none"
                                                value={form.supplier}
                                                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                                                placeholder="Nombre..."
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Referencia / Motivo</label>
                                    <textarea
                                        className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:border-primary focus:bg-white transition-all outline-none min-h-[80px]"
                                        value={form.reason}
                                        onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                        placeholder="Ej: Remisión #123, Ajuste mensual..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-10">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 h-14 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all uppercase tracking-widest"
                                >
                                    Cerrar
                                </button>
                                <button
                                    onClick={saveMovement}
                                    className="flex-1 h-14 bg-primary text-white rounded-2xl text-sm font-black shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all uppercase tracking-widest"
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tool Modal (Register/Loan/Return) */}
            {showToolModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-10 overflow-y-auto">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden transform transition-all">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                    {toolForm.type === 'register' ? 'Nueva Herramienta' :
                                        toolForm.type === 'loan' ? 'Préstamo' : 'Devolución'}
                                </h2>
                                <button onClick={() => setShowToolModal(false)} className="size-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="space-y-6">
                                {toolForm.type === 'register' ? (
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Nombre Herramienta</label>
                                        <input
                                            className="w-full h-12 rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 text-sm font-bold focus:border-primary focus:bg-white transition-all outline-none"
                                            value={toolForm.toolName}
                                            onChange={(e) => setToolForm({ ...toolForm, toolName: e.target.value })}
                                            placeholder="Ej: Taladro Milwaukee M18"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-6">
                                            <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Herramienta Seleccionada</p>
                                            <p className="font-black text-primary text-lg">{toolForm.toolName}</p>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Empleado Responsable</label>
                                            <select
                                                className="w-full h-12 rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 text-sm font-bold focus:border-primary focus:bg-white transition-all outline-none"
                                                value={toolForm.employeeId}
                                                onChange={(e) => setToolForm({ ...toolForm, employeeId: e.target.value })}
                                            >
                                                <option value="">Seleccionar personal...</option>
                                                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Obra / Destino (Opcional)</label>
                                            <input
                                                className="w-full h-12 rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 text-sm font-bold focus:border-primary focus:bg-white transition-all outline-none"
                                                value={toolForm.projectName}
                                                onChange={(e) => setToolForm({ ...toolForm, projectName: e.target.value })}
                                                placeholder="¿A qué obra se dirige?"
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Observaciones</label>
                                    <textarea
                                        className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:border-primary focus:bg-white transition-all outline-none min-h-[80px]"
                                        value={toolForm.notes}
                                        onChange={(e) => setToolForm({ ...toolForm, notes: e.target.value })}
                                        placeholder="Detalles adicionales..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-10">
                                <button
                                    onClick={() => setShowToolModal(false)}
                                    className="flex-1 h-14 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all uppercase tracking-widest"
                                >
                                    Cerrar
                                </button>
                                <button
                                    onClick={handleToolAction}
                                    className={`flex-1 h-14 text-white rounded-2xl text-sm font-black shadow-lg hover:-translate-y-0.5 transition-all uppercase tracking-widest ${toolForm.type === 'return' ? 'bg-green-600 shadow-green-100' : 'bg-primary shadow-primary/30'}`}
                                >
                                    {toolForm.type === 'register' ? 'Registrar' :
                                        toolForm.type === 'loan' ? 'Entregar' : 'Recibir'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
