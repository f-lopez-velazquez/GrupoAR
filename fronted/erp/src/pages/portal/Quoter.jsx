import { useState, useRef, useEffect } from "react";
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../state/AuthContext";
import { generatePdf } from "../../utils/pdfGenerator";
import { showToast } from "../../utils/errorHandler";
import { useLocation, useNavigate } from "react-router-dom";

const DEFAULT_CHECKLIST = [
    "Pago 50% materiales antes de iniciar",
    "Pago 50% restante al finalizar",
    "Incluye materiales, herramientas y mano de obra",
    "Retiro de escombro incluido",
    "Limpieza general incluida",
    "Garantía de funcionamiento",
    "Garantía en materiales",
    "Vigencia cotización: 30 días",
    "Responsabilidad terceros",
    "Cumplimiento normativas",
    "Cláusula fuerza mayor"
];

const PREDEFINED_GROUPS = ["Materiales", "Mano de Obra", "General", "Otros"];

export default function Quoter() {
    const { user, profile } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const initialQuote = location.state?.quote || null;

    // Core Data
    const [items, setItems] = useState([]);

    // Quote State
    const [quoteItems, setQuoteItems] = useState(initialQuote?.items || []);
    const [title, setTitle] = useState(initialQuote?.title || "");
    const [clientData, setClientData] = useState(initialQuote?.client || { name: "", company: "", phone: "", email: "", location: "" });
    const [quoteType, setQuoteType] = useState(initialQuote?.type || "express");

    // Financial Config
    const [config, setConfig] = useState(initialQuote?.config || {
        iva: true,
        anticipo: false,
        anticipoPct: 50,
        showSidebar: false
    });

    const [specs, setSpecs] = useState(initialQuote?.specs || DEFAULT_CHECKLIST.reduce((acc, item) => ({ ...acc, [item]: false }), {}));
    const [customSpecs, setCustomSpecs] = useState(initialQuote?.customSpecs || []);
    const [newSpec, setNewSpec] = useState("");

    // UI
    const [loading, setLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(0.65); // Default zoom
    const printRef = useRef(null);

    const [newItem, setNewItem] = useState({
        desc: "",
        group: "Materiales",
        price: 0,
        qty: 1,
        material: 0,
        labor: 0,
        sinPrecio: false
    });

    const [isHardwareMode, setIsHardwareMode] = useState(quoteType === 'express');

    useEffect(() => {
        setIsHardwareMode(quoteType === 'express');
    }, [quoteType]);

    // Actions
    const addQuoteItem = () => {
        if (!newItem.desc.trim()) return;
        const item = {
            id: Date.now().toString(),
            ...newItem,
            total: isHardwareMode
                ? (newItem.sinPrecio ? 0 : newItem.price * newItem.qty)
                : (newItem.sinPrecio ? 0 : (newItem.material + newItem.labor) * newItem.qty)
        };
        setQuoteItems([...quoteItems, item]);
        setNewItem({ ...newItem, desc: "", price: 0, material: 0, labor: 0, qty: 1, sinPrecio: false });
    };

    const removeQuoteItem = (id) => {
        setQuoteItems(quoteItems.filter(i => i.id !== id));
    };

    const toggleSpec = (spec) => {
        setSpecs(prev => ({ ...prev, [spec]: !prev[spec] }));
    };

    const addCustomSpec = () => {
        if (!newSpec.trim()) return;
        setCustomSpecs([...customSpecs, newSpec]);
        setNewSpec("");
    };

    // Calculations
    const getCalculations = () => {
        const subtotal = quoteItems.reduce((sum, item) => sum + (item.total || 0), 0);
        const iva = config.iva ? subtotal * 0.16 : 0;
        const total = subtotal + iva;
        const anticipoAmount = config.anticipo ? (total * (config.anticipoPct / 100)) : 0;
        const balance = total - anticipoAmount;
        return { subtotal, iva, total, anticipoAmount, balance };
    };
    const { subtotal, iva, total, anticipoAmount, balance } = getCalculations();

    // Handlers
    const saveQuote = async (status = "active") => {
        try {
            const quoteData = {
                quoteNumber: initialQuote?.quoteNumber || `COT-${Date.now()}`,
                title: title || "Sin Título",
                client: clientData,
                type: quoteType,
                items: quoteItems,
                config,
                totals: { subtotal, iva, total, anticipoAmount, balance },
                specs,
                customSpecs,
                createdBy: user?.uid,
                createdByName: profile?.displayName || user?.email,
                updatedAt: serverTimestamp(),
                status: status
            };
            if (initialQuote?.id) {
                await updateDoc(doc(db, "quotes", initialQuote.id), quoteData);
            } else {
                await addDoc(collection(db, "quotes"), {
                    ...quoteData,
                    createdAt: serverTimestamp()
                });
            }
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const handleGeneratePDF = async () => {
        setLoading(true);
        setShowPreview(true);
        // Temporarily reset zoom for capture if needed, though html-to-image usually handles DOM state
        await new Promise(r => setTimeout(r, 800));

        try {
            const element = printRef.current;
            if (element) {
                await generatePdf(element, `Cotizacion-AR-${(title || "doc").replace(/\s+/g, '_')}.pdf`);
                await saveQuote();
                showToast("PDF generado y guardado", "success");
            }
        } catch (e) {
            console.error(e);
            showToast("Error generando PDF", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleApproveQuote = async () => {
        if (!confirm("¿Aprobar cotización y crear Proyecto?")) return;
        const invoiceData = confirm("¿El cliente requiere Factura?")
            ? { status: "pending_data" }
            : { status: "not_required" };

        try {
            const projectData = {
                name: title || "Proyecto Nuevo",
                client: clientData.name || "Cliente",
                address: clientData.location || "",
                startDate: new Date().toISOString().split('T')[0],
                status: "active",
                budget: total,
                createdAt: serverTimestamp(),
                createdBy: profile?.email,
                materials: quoteItems.map(i => ({
                    name: i.desc,
                    quantity: i.qty,
                    cost: isHardwareMode ? i.price : i.material + i.labor
                })),
                assignedEmployees: [],
                payments: [],
                invoice: invoiceData
            };

            await addDoc(collection(db, "projects"), projectData);
            await saveQuote("approved");
            showToast("Proyecto creado exitosamente", "success");
            navigate("/portal/obras");
        } catch (e) {
            console.error(e);
            showToast("Error al aprobar", "error");
        }
    };


    // Group Items for Rendering
    const groupedItems = quoteItems.reduce((groups, item) => {
        const g = item.group || "Otros";
        if (!groups[g]) groups[g] = [];
        groups[g].push(item);
        return groups;
    }, {});


    return (
        <div className="flex flex-col lg:flex-row h-screen lg:h-[calc(100vh-4rem)] bg-slate-50 overflow-hidden">

            {/* LEFT: Editor */}
            <div className={`flex-1 flex flex-col overflow-y-auto p-4 lg:p-6 gap-6 pb-24 lg:pb-6 transition-all duration-300 ${showPreview ? 'hidden lg:flex' : 'flex'}`}>
                {/* Header configuration and Inputs... (Same as before, abbreviated here for focus) */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <h2 className="font-bold text-xl text-slate-800">
                            {initialQuote ? "Editando Cotización" : "Nueva Cotización"}
                        </h2>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                            <select
                                value={quoteType}
                                onChange={(e) => setQuoteType(e.target.value)}
                                className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium bg-slate-50"
                            >
                                <option value="express">🛒 Ferretería</option>
                                <option value="detailed">🏗️ Proyecto</option>
                            </select>
                            <button onClick={() => setConfig({ ...config, showSidebar: true })} className="px-3 py-2 rounded-lg bg-blue-50 text-blue-600 font-medium text-sm hover:bg-blue-100 flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-[18px]">settings</span>
                            </button>
                            <button onClick={() => setShowPreview(true)} className="lg:hidden px-3 py-2 rounded-lg bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-[18px]">visibility</span>
                                Ver PDF
                            </button>
                            {initialQuote && (
                                <button onClick={handleApproveQuote} className="px-3 py-2 rounded-lg bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-1">
                                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Inputs for Title, Client... */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Título</label>
                            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej. Material Eléctrico" className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Cliente</label>
                            <input value={clientData.name} onChange={e => setClientData({ ...clientData, name: e.target.value })} placeholder="Nombre" className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-sm" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Teléfono</label>
                            <input value={clientData.phone} onChange={e => setClientData({ ...clientData, phone: e.target.value })} placeholder="464..." className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-sm" />
                        </div>
                    </div>
                </div>

                {/* Add Item Panel */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex flex-col md:flex-row items-start gap-3 mb-3">
                        <div className="w-full md:w-1/3">
                            <label className="text-xs font-semibold text-slate-500">Grupo</label>
                            <input
                                list="group-suggestions"
                                value={newItem.group}
                                onChange={e => setNewItem({ ...newItem, group: e.target.value })}
                                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                                placeholder="Seleccionar..."
                            />
                            <datalist id="group-suggestions">{PREDEFINED_GROUPS.map(g => <option key={g} value={g} />)}</datalist>
                        </div>
                        <div className="flex-1 w-full">
                            <label className="text-xs font-semibold text-slate-500">Descripción</label>
                            <input
                                value={newItem.desc}
                                onChange={e => setNewItem({ ...newItem, desc: e.target.value })}
                                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                                placeholder="..."
                                onKeyDown={e => e.key === 'Enter' && addQuoteItem()}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-end gap-3">
                        {isHardwareMode ? (
                            <>
                                <div className="w-full md:w-24">
                                    <label className="text-xs font-semibold text-slate-500">Cant.</label>
                                    <input type="number" value={newItem.qty} onChange={e => setNewItem({ ...newItem, qty: parseFloat(e.target.value) || 1 })} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-center" />
                                </div>
                                <div className="flex-1 w-full">
                                    <label className="text-xs font-semibold text-slate-500">Precio Unitario</label>
                                    <input type="number" disabled={newItem.sinPrecio} value={newItem.price} onChange={e => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-full md:w-20">
                                    <label className="text-xs font-semibold text-slate-500">Cant.</label>
                                    <input type="number" value={newItem.qty} onChange={e => setNewItem({ ...newItem, qty: parseFloat(e.target.value) || 1 })} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-center" />
                                </div>
                                <div className="flex-1 w-full">
                                    <label className="text-xs font-semibold text-slate-500">Material</label>
                                    <input type="number" disabled={newItem.sinPrecio} value={newItem.material} onChange={e => setNewItem({ ...newItem, material: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
                                </div>
                                <div className="flex-1 w-full">
                                    <label className="text-xs font-semibold text-slate-500">Mano Obra</label>
                                    <input type="number" disabled={newItem.sinPrecio} value={newItem.labor} onChange={e => setNewItem({ ...newItem, labor: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
                                </div>
                            </>
                        )}
                        <button onClick={addQuoteItem} className="w-full md:w-auto px-6 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            <span className="md:hidden">Agregar</span>
                        </button>
                    </div>
                </div>

                {/* Items Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 min-h-[300px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3">Concepto</th>
                                    <th className="px-4 py-3 text-center">Cant.</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                    <th className="px-4 py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(groupedItems).map(([group, groupItems]) => (
                                    <>
                                        <tr key={"g-" + group} className="bg-blue-50/50">
                                            <td colSpan={5} className="px-4 py-2 font-bold text-blue-600 border-t border-blue-100">{group}</td>
                                        </tr>
                                        {groupItems.map((item) => (
                                            <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50">
                                                <td className="px-4 py-3 text-slate-700">{item.desc}</td>
                                                <td className="px-4 py-3 text-center font-medium">{item.qty}</td>
                                                <td className="px-4 py-3 text-right font-medium text-slate-900">${item.total.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button onClick={() => removeQuoteItem(item.id)} className="text-red-400 hover:text-red-600">
                                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* PREVIEW AREA - DRAGGABLE & WATERMARK */}
            <div className={`fixed inset-0 z-[100] bg-slate-100/95 flex flex-col lg:static lg:bg-transparent lg:w-[600px] xl:w-[700px] lg:border-l border-slate-200 transition-all duration-300 transform ${showPreview ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>

                {/* Preview Toolbar (Same as before) */}
                <div className="p-4 border-b border-slate-200 bg-white shadow-sm z-10 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-slate-700 hidden lg:block">Vista Previa</h3>
                    <button onClick={() => setShowPreview(false)} className="lg:hidden flex items-center gap-1 text-slate-500 font-medium">
                        <span className="material-symbols-outlined">arrow_back</span> Editar
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                            <button onClick={() => setZoomLevel(z => Math.max(0.4, z - 0.1))} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white shadow-sm text-slate-600">
                                <span className="material-symbols-outlined text-[18px]">remove</span>
                            </button>
                            <span className="text-xs font-mono w-12 text-center text-slate-500">{Math.round(zoomLevel * 100)}%</span>
                            <button onClick={() => setZoomLevel(z => Math.min(1.5, z + 0.1))} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white shadow-sm text-slate-600">
                                <span className="material-symbols-outlined text-[18px]">add</span>
                            </button>
                        </div>
                        <button onClick={handleGeneratePDF} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">download</span>
                            <span className="hidden sm:inline">PDF</span>
                        </button>
                    </div>
                </div>

                {/* Draggable Container */}
                <div
                    className="flex-1 overflow-auto bg-slate-200/50 p-4 lg:p-8 flex items-start justify-center cursor-grab active:cursor-grabbing select-none"
                    onMouseDown={(e) => {
                        const ele = e.currentTarget;
                        ele.style.cursor = 'grabbing';
                        ele.style.userSelect = 'none';

                        const startX = e.pageX - ele.offsetLeft;
                        const startY = e.pageY - ele.offsetTop;
                        const scrollLeft = ele.scrollLeft;
                        const scrollTop = ele.scrollTop;

                        const onMouseMove = (ev) => {
                            const x = ev.pageX - ele.offsetLeft;
                            const y = ev.pageY - ele.offsetTop;
                            const walkX = (x - startX) * 1.5; // Scroll speed multiplier
                            const walkY = (y - startY) * 1.5;
                            ele.scrollLeft = scrollLeft - walkX;
                            ele.scrollTop = scrollTop - walkY;
                        };

                        const onMouseUp = () => {
                            ele.style.cursor = 'grab';
                            ele.style.removeProperty('user-select');
                            document.removeEventListener('mousemove', onMouseMove);
                            document.removeEventListener('mouseup', onMouseUp);
                        };

                        document.addEventListener('mousemove', onMouseMove);
                        document.addEventListener('mouseup', onMouseUp);
                    }}
                >

                    {/* DOC: A4 Size (210mm x 297mm) */}
                    <div
                        ref={printRef}
                        style={{
                            width: '210mm',
                            minHeight: '297mm',
                            transform: `scale(${zoomLevel})`,
                            transformOrigin: 'top center'
                        }}
                        className={`bg-white shadow-2xl relative text-slate-900 transition-transform duration-200 ease-out shrink-0`}
                    >
                        {/* WATERMARK */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none overflow-hidden font-display z-0">
                            <div className="transform -rotate-45 flex flex-col items-center">
                                <img src="/assets/logo.png" className="w-[500px] h-[500px] object-contain grayscale" alt="Watermark" />
                                <p className="text-9xl font-black text-slate-900 uppercase tracking-widest mt-10 whitespace-nowrap">BORRADOR</p>
                            </div>
                        </div>

                        {/* Background Elements for Value Perception */}
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-50/50 rounded-bl-[100%] -z-0 pointer-events-none" />

                        {/* 1. PREMIUM HEADER */}
                        <div className="relative z-10 p-[15mm] pb-5 flex flex-col gap-8">

                            {/* Top Brand Bar */}
                            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-6">
                                <div className="flex gap-4 items-center">
                                    <div className="w-20 h-20 bg-slate-900 rounded-xl shadow-lg flex items-center justify-center">
                                        {/* Placeholder for Logo if image fails, or use img tag */}
                                        <img src="/assets/logo.png" className="w-full h-full object-contain p-2 filter brightness-0 invert" alt="AR" />
                                    </div>
                                    <div className="flex flex-col justify-end h-20">
                                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tighter leading-none">GRUPO AR</h1>
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Soluciones Integrales</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-6xl font-black text-slate-100/80 -mb-4 mr-2 select-none">COTIZACIÓN</h2>
                                    <div className="relative bg-white pl-4">
                                        <p className="font-bold text-xl text-slate-800">{initialQuote?.quoteNumber || `COT-${new Date().getFullYear()}`}</p>
                                        <p className="text-xs text-slate-500 uppercase font-medium">{new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Client & Info Cards */}
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">Información del Cliente</p>
                                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                        <p className="text-lg font-bold text-slate-900">{clientData.name || "Cliente General"}</p>
                                        <p className="text-sm text-slate-600 mt-1">{clientData.email || "Sin correo registrado"}</p>
                                        <p className="text-sm text-slate-600">{clientData.phone || "Sin teléfono"}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">Detalles del Proyecto</p>
                                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                        <p className="text-lg font-bold text-slate-900">{title || "Cotización Estándar"}</p>
                                        <p className="text-sm text-slate-600 mt-1">{clientData.location || "Ubicación no especificada"}</p>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* 2. ITEMS TABLE - CLEAN DESIGN */}
                        <div className="px-[15mm] relative z-10">
                            <table className="w-full">
                                <thead className="bg-slate-900 text-white">
                                    <tr>
                                        <th className="py-2 px-3 text-center text-xs font-bold uppercase tracking-wider w-16">Cant.</th>
                                        <th className="py-2 px-3 text-left text-xs font-bold uppercase tracking-wider">Concepto / Descripción</th>
                                        <th className="py-2 px-3 text-right text-xs font-bold uppercase tracking-wider w-32">P. Unitario</th>
                                        <th className="py-2 px-3 text-right text-xs font-bold uppercase tracking-wider w-32">Importe</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {Object.entries(groupedItems).map(([group, groupItems]) => (
                                        <>
                                            {/* Section Header */}
                                            <tr>
                                                <td colSpan={4} className="pt-4 pb-2 px-3 font-bold text-blue-700 uppercase text-xs tracking-wider border-b border-blue-100">{group}</td>
                                            </tr>
                                            {groupItems.map((item, idx) => (
                                                <tr key={idx} className="border-b border-slate-50">
                                                    <td className="py-3 px-3 text-center text-slate-500 font-medium">{item.qty}</td>
                                                    <td className="py-3 px-3 text-slate-700">
                                                        <p className="font-semibold">{item.desc}</p>
                                                        {item.sinPrecio && <span className="inline-block mt-1 text-[9px] bg-slate-100 text-slate-500 px-1.5 rounded uppercase">Informativo</span>}
                                                    </td>
                                                    <td className="py-3 px-3 text-right text-slate-500 font-mono text-xs">
                                                        {item.sinPrecio ? "-" : `$${((item.total / item.qty) || 0).toFixed(2)}`}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                                                        {item.sinPrecio ? "Incluido" : `$${item.total.toFixed(2)}`}
                                                    </td>
                                                </tr>
                                            ))}
                                        </>
                                    ))}
                                    {/* Spacer/Minimum Height Filler could go here */}
                                </tbody>
                            </table>
                        </div>

                        {/* 3. TOTALS & FOOTER - PINNED TO BOTTOM */}
                        <div className="absolute bottom-0 left-0 right-0 p-[15mm]">

                            <div className="flex items-start gap-8 mb-8">
                                <div className="flex-1">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Términos y Condiciones</h4>
                                    <ul className="text-[10px] text-slate-500 space-y-1.5 list-disc pl-3">
                                        {Object.entries(specs).filter(([_, v]) => v).map(([k]) => <li key={k}>{k}</li>)}
                                        {customSpecs.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                                <div className="w-64">
                                    <div className="flex justify-between py-2 border-b border-slate-100 text-sm">
                                        <span className="text-slate-500">Subtotal</span>
                                        <span className="font-mono text-slate-900">${subtotal.toFixed(2)}</span>
                                    </div>
                                    {config.iva && (
                                        <div className="flex justify-between py-2 border-b border-slate-100 text-sm">
                                            <span className="text-slate-500">IVA (16%)</span>
                                            <span className="font-mono text-slate-900">${iva.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between py-3 border-b-2 border-slate-900 text-lg">
                                        <span className="font-bold text-slate-900">TOTAL</span>
                                        <span className="font-mono font-bold text-slate-900">${total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center pt-6 border-t border-slate-100">
                                <div className="flex justify-center gap-6 text-[10px] text-slate-400 uppercase tracking-widest mb-2">
                                    <span>Pedro Gutierrez 119, Salamanca GTO</span>
                                    <span>RFC: XAXX010101000</span>
                                    <span>Tel: 464 126 2821</span>
                                </div>
                                <div className="w-full h-1 bg-gradient-to-r from-blue-600 via-slate-900 to-blue-600"></div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>

            {/* SIDEBAR DETAILS */}
            {config.showSidebar && (
                <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-[150] p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg">Detalles y Condiciones</h3>
                        <button onClick={() => setConfig({ ...config, showSidebar: false })} className="text-slate-400 hover:text-red-500">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg mb-6">
                        <h4 className="font-bold text-xs uppercase text-blue-800 mb-2">Configuración Fiscal</h4>
                        <label className="flex items-center gap-2 cursor-pointer mb-2">
                            <input type="checkbox" checked={config.iva} onChange={e => setConfig({ ...config, iva: e.target.checked })} className="rounded text-blue-600" />
                            <span className="text-sm text-slate-700">Incluir IVA (16%)</span>
                        </label>
                        {!isHardwareMode && (
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={config.anticipo} onChange={e => setConfig({ ...config, anticipo: e.target.checked })} className="rounded text-blue-600" />
                                <span className="text-sm text-slate-700">Requiere Anticipo</span>
                            </label>
                        )}
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-bold text-xs uppercase text-slate-500">Cláusulas Estándar</h4>
                        {Object.keys(specs).map(spec => (
                            <label key={spec} className="flex gap-3 cursor-pointer items-start p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                                <input
                                    type="checkbox"
                                    checked={specs[spec]}
                                    onChange={() => toggleSpec(spec)}
                                    className="mt-1 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                                />
                                <span className="text-sm text-slate-600 leading-tight">{spec}</span>
                            </label>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Agregar Detalle Personalizado</label>
                        <div className="flex gap-2">
                            <input
                                value={newSpec}
                                onChange={e => setNewSpec(e.target.value)}
                                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                                placeholder="Escribir..."
                                onKeyDown={e => e.key === 'Enter' && addCustomSpec()}
                            />
                            <button onClick={addCustomSpec} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200">
                                <span className="material-symbols-outlined text-[18px]">add</span>
                            </button>
                        </div>
                        <ul className="mt-4 space-y-2">
                            {customSpecs.map((spec, i) => (
                                <li key={i} className="flex justify-between items-center text-sm text-slate-600 bg-slate-50 p-2 rounded">
                                    <span>{spec}</span>
                                    <button onClick={() => setCustomSpecs(customSpecs.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
