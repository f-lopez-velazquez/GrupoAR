import { useState, useEffect, useRef } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, setDoc, writeBatch } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { uploadToCloudinary } from "../../services/uploadService";
import QRCode from "qrcode";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import MessageModal from "../../components/MessageModal";
import ConfirmationModal from "../../components/ConfirmationModal";

import { useAuth } from "../../state/AuthContext";

const BASE_URL = "https://gpo-ar.web.app";

export default function HR() {
    const { profile, hasPermission } = useAuth();
    const canEdit = hasPermission('hr', 2);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showBadge, setShowBadge] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [qrCode, setQrCode] = useState("");
    const [search, setSearch] = useState("");
    const [deptFilter, setDeptFilter] = useState("");
    const badgeRef = useRef(null);

    // Custom Modals State
    const [messageModal, setMessageModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
    const [confirmationModal, setConfirmationModal] = useState({ isOpen: false, title: "", message: "", type: "info", onConfirm: () => { } });

    const [form, setForm] = useState({
        name: "", position: "", department: "", salary: 0, status: "active",
        phone: "", email: "", photoUrl: "", hireDate: "", sanctions: 0,
        curp: "", nss: "", bloodType: "", emergencyContact: ""
    });

    const departments = ["Operaciones", "Administración", "Producción", "Calidad", "Logística", "Ventas"];
    const statuses = [
        { value: "active", label: "Activo", color: "green" },
        { value: "inactive", label: "Inactivo", color: "gray" },
        { value: "suspended", label: "Suspendido", color: "yellow" },
        { value: "leave", label: "Permiso", color: "blue" }
    ];

    useEffect(() => { fetchEmployees(); }, []);

    // Scroll automático al top cuando se abre cualquier modal
    useEffect(() => {
        if (showModal || showBadge) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [showModal, showBadge]);

    const fetchEmployees = async () => {
        try {
            const snap = await getDocs(query(collection(db, "employees"), orderBy("name")));
            setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const filtered = employees.filter(e => {
        const matchSearch = e.name?.toLowerCase().includes(search.toLowerCase()) || e.id?.includes(search);
        const matchDept = !deptFilter || e.department === deptFilter;
        return matchSearch && matchDept;
    });

    const stats = {
        total: employees.length,
        active: employees.filter(e => e.status === "active").length,
        withSanctions: employees.filter(e => (e.sanctions || 0) > 0).length,
        totalPayroll: employees.reduce((sum, e) => sum + (e.salary || 0), 0)
    };

    const openNew = () => {
        setSelectedEmployee(null);
        setForm({ name: "", position: "", department: "", salary: 0, status: "active", phone: "", email: "", photoUrl: "", hireDate: "", sanctions: 0, curp: "", nss: "", bloodType: "", emergencyContact: "" });
        setShowModal(true);
    };

    const openEdit = (e) => {
        setSelectedEmployee(e);
        setForm({ ...e });
        setShowModal(true);
    };

    const saveEmployee = async () => {
        if (!form.name || !form.position) {
            setMessageModal({ isOpen: true, title: "Campos Faltantes", message: "Nombre y puesto son obligatorios", type: "warning" });
            return;
        }
        try {
            if (selectedEmployee) {
                await updateDoc(doc(db, "employees", selectedEmployee.id), form);
                // Sync public
                await setDoc(doc(db, "publicEmployees", selectedEmployee.id), { ...form, id: selectedEmployee.id });
            } else {
                const docRef = await addDoc(collection(db, "employees"), { ...form, createdAt: new Date() });
                // Sync public
                await setDoc(doc(db, "publicEmployees", docRef.id), { ...form, id: docRef.id });
            }
            setShowModal(false);
            fetchEmployees();
            setMessageModal({ isOpen: true, title: "Éxito", message: "Empleado guardado correctamente", type: "success" });
        } catch (e) {
            console.error(e);
            setMessageModal({ isOpen: true, title: "Error", message: "Error al guardar empleado", type: "error" });
        }
    };

    const deleteEmployee = async (id) => {
        setConfirmationModal({
            isOpen: true,
            title: "Eliminar Empleado",
            message: "¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.",
            onConfirm: async () => {
                await deleteDoc(doc(db, "employees", id));
                await deleteDoc(doc(db, "publicEmployees", id));
                fetchEmployees();
                setMessageModal({ isOpen: true, title: "Eliminado", message: "Empleado eliminado correctamente", type: "success" });
            }
        });
    };

    const generateBadge = async (emp) => {
        setSelectedEmployee(emp);
        // Ensure the QR code has data before showing
        const url = `${window.location.origin}/verificar-empleado/${emp.id}`;
        try {
            const qr = await QRCode.toDataURL(url, {
                width: 300,
                margin: 0,
                color: {
                    dark: '#000000',
                    light: '#00000000'
                }
            });
            setQrCode(qr);
            setShowBadge(true);
        } catch (err) {
            console.error(err);
        }
    };

    // V6: Optimized Download Function with SVG Support
    const downloadBadge = async () => {
        if (!badgeRef.current) return;
        try {
            // Robust Filter
            const filter = (node) => {
                const exclusionClasses = ['remove-me', 'secret-div'];
                if (node.classList?.contains(exclusionClasses)) return false;

                const tagName = node.tagName?.toUpperCase();
                if (['SCRIPT', 'STYLE', 'LINK', 'IFRAME', 'NOSCRIPT'].includes(tagName)) return false;

                if (node.nodeType === 3 && !node.textContent.trim()) return false;

                return true;
            }

            const dataUrl = await toPng(badgeRef.current, {
                quality: 1,
                pixelRatio: 4,
                cacheBust: true,
                filter: filter,
                skipFonts: true,
                skipAutoScale: true,
            });
            const pdf = new jsPDF({ unit: 'mm', format: [54, 86] });
            pdf.addImage(dataUrl, 'PNG', 0, 0, 54, 86);
            pdf.save(`gafete-${selectedEmployee?.name?.replace(/\s/g, "_") || "empleado"}.pdf`);
        } catch (e) {
            console.error("Error generating badge:", e);
            setMessageModal({ isOpen: true, title: "Error", message: "Error al generar la imagen. Inténtelo de nuevo.", type: "error" });
        }
    };

    const syncPublicData = async () => {
        if (!confirm("¿Sincronizar todos los empleados para verificación pública?")) return;
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, "employees"));
            const batch = writeBatch(db);
            snap.docs.forEach(d => {
                const data = d.data();
                const pubRef = doc(db, "publicEmployees", d.id);
                batch.set(pubRef, { ...data, id: d.id });
            });
            await batch.commit();
            setMessageModal({ isOpen: true, title: "Sincronizado", message: "Todos los registros actualizados.", type: "success" });
        } catch (e) { console.error(e); setMessageModal({ isOpen: true, title: "Error", message: "Fallo la sincronización", type: "error" }); }
        setLoading(false);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const uploaded = await uploadToCloudinary(file, "grupo-ar/empleados");
            setForm({ ...form, photoUrl: uploaded.url });
        } catch (error) {
            console.error("Upload error:", error);
            setMessageModal({ isOpen: true, title: "Error", message: "Error al subir la imagen", type: "error" });
        } finally {
            setUploading(false);
        }
    };

    const getStatusStyle = (status) => {
        const s = statuses.find(x => x.value === status) || statuses[0];
        const colors = {
            green: "bg-green-50 text-green-700 border-green-100",
            gray: "bg-gray-100 text-gray-600 border-gray-200",
            yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
            blue: "bg-blue-50 text-blue-700 border-blue-100"
        };
        return { label: s.label, className: colors[s.color] };
    };

    return (
        <div className="bg-background-light min-h-screen font-display text-[#111518]">
            {/* Header */}
            <header className="bg-white border-b border-[#e5e7eb] sticky top-0 z-50">
                <div className="px-4 md:px-10 flex items-center justify-between py-3 max-w-[1440px] mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <div className="size-8 flex items-center justify-center text-primary bg-primary/10 rounded-lg">
                            <span className="material-symbols-outlined text-2xl">grid_view</span>
                        </div>
                        <h2 className="text-lg font-bold">GPO-AR</h2>
                    </div>
                    <nav className="hidden md:flex items-center gap-9">
                        <span className="text-primary text-sm font-bold relative after:content-[''] after:absolute after:-bottom-5 after:left-0 after:w-full after:h-0.5 after:bg-primary">Personal</span>
                    </nav>
                </div>
            </header>

            <main className="flex flex-1 justify-center py-5 px-4 md:px-10">
                <div className="flex flex-col max-w-[1200px] flex-1 w-full gap-6">
                    {/* ... (Header and Stats omitted for brevity, logic remains the same) ... */}
                    {/* Page Header */}
                    <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                        <div>
                            <h1 className="text-3xl font-black leading-tight tracking-[-0.033em]">Gestión de Personal</h1>
                            <p className="text-[#60778a] text-base">Administra empleados, revisa sanciones y genera gafetes de identificación.</p>
                        </div>
                        {canEdit && (
                            <>
                                <button onClick={syncPublicData} className="flex items-center justify-center rounded-lg h-10 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-bold shadow-sm">
                                    <span className="material-symbols-outlined mr-2 text-[20px]">sync</span>
                                    Sincronizar
                                </button>
                                <button onClick={openNew} className="flex items-center justify-center rounded-lg h-10 px-4 bg-primary hover:bg-blue-700 text-white text-sm font-bold shadow-sm">
                                    <span className="material-symbols-outlined mr-2 text-[20px]">person_add</span>
                                    Agregar Empleado
                                </button>
                            </>
                        )}
                    </div>

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard label="Total Empleados" value={stats.total} icon="groups" />
                        <StatCard label="Activos" value={stats.active} icon="verified_user" />
                        <StatCard label="Con Sanciones" value={stats.withSanctions} icon="warning" danger={stats.withSanctions > 0} />
                        <StatCard label="Nómina Total" value={`$${(stats.totalPayroll / 1000).toFixed(0)}K`} icon="payments" />
                    </div>

                    {/* Toolbar */}
                    <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-4">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div className="flex flex-1 gap-4 flex-wrap md:flex-nowrap">
                                <div className="relative flex-1 min-w-[200px]">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#60778a]">search</span>
                                    <input
                                        className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#dbe1e6] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        placeholder="Buscar por nombre o ID..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <div className="relative w-full md:w-48">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#60778a]">filter_alt</span>
                                    <select
                                        className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#dbe1e6] bg-white text-sm appearance-none cursor-pointer"
                                        value={deptFilter}
                                        onChange={(e) => setDeptFilter(e.target.value)}
                                    >
                                        <option value="">Todos los Deptos</option>
                                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile View: Cards */}
                    <div className="md:hidden grid grid-cols-1 gap-4">
                        {loading ? (
                            <div className="p-8 text-center text-[#60778a]">Cargando...</div>
                        ) : filtered.length === 0 ? (
                            <div className="p-8 text-center text-[#60778a]">No hay empleados</div>
                        ) : filtered.map((e) => {
                            const status = getStatusStyle(e.status);
                            return (
                                <div key={e.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-gray-200 bg-cover bg-center border border-gray-200 flex-shrink-0" style={{ backgroundImage: e.photoUrl ? `url('${e.photoUrl}')` : undefined }}>
                                                {!e.photoUrl && <div className="w-full h-full flex items-center justify-center text-gray-400"><span className="material-symbols-outlined">person</span></div>}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-[#111518] leading-tight">{e.name}</h3>
                                                <p className="text-xs text-[#60778a]">{e.position}</p>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">ID: {e.id.slice(0, 6)}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.className}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-t border-gray-50 pt-3">
                                        <div>
                                            <span className="block text-[10px] text-[#60778a] uppercase font-bold">Departamento</span>
                                            <span className="font-medium text-gray-800">{e.department}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] text-[#60778a] uppercase font-bold">Salario</span>
                                            <span className="font-mono text-gray-800">${(e.salary || 0).toLocaleString()}</span>
                                        </div>
                                        {(e.sanctions || 0) > 0 &&
                                            <div className="col-span-2 mt-1">
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 text-red-700 text-xs font-bold w-full justify-center">
                                                    <span className="material-symbols-outlined text-[14px]">warning</span>
                                                    {e.sanctions} Sanciones Activas
                                                </span>
                                            </div>
                                        }
                                    </div>

                                    <div className="flex items-center justify-end gap-2 mt-1 border-t border-gray-50 pt-3">
                                        <button onClick={() => generateBadge(e)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold shadow-sm hover:bg-blue-100 transition-colors">
                                            <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                                            Gafete
                                        </button>
                                        <button onClick={() => openEdit(e)} className="w-10 h-10 flex items-center justify-center text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:text-primary hover:bg-white transition-colors">
                                            <span className="material-symbols-outlined text-[20px]">{canEdit ? 'edit' : 'visibility'}</span>
                                        </button>
                                        {canEdit && (
                                            <button onClick={() => deleteEmployee(e.id)} className="w-10 h-10 flex items-center justify-center text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:text-red-600 hover:bg-white transition-colors">
                                                <span className="material-symbols-outlined text-[20px]">delete</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop View: Table */}
                    <div className="hidden md:block bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="p-4 text-xs font-semibold tracking-wide text-gray-500 uppercase">Empleado</th>
                                        <th className="p-4 text-xs font-semibold tracking-wide text-gray-500 uppercase">Rol / Depto</th>
                                        <th className="p-4 text-xs font-semibold tracking-wide text-gray-500 uppercase">Estado</th>
                                        <th className="p-4 text-xs font-semibold tracking-wide text-gray-500 uppercase">Salario</th>
                                        <th className="p-4 text-xs font-semibold tracking-wide text-gray-500 uppercase">Sanciones</th>
                                        <th className="p-4 text-xs font-semibold tracking-wide text-gray-500 uppercase text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-[#60778a]">Cargando...</td></tr>
                                    ) : filtered.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-[#60778a]">No hay empleados</td></tr>
                                    ) : filtered.map((e) => {
                                        const status = getStatusStyle(e.status);
                                        return (
                                            <tr key={e.id} className={`hover:bg-gray-50/50 group ${(e.sanctions || 0) > 0 ? 'bg-red-50/30' : ''}`}>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gray-200 bg-cover bg-center border border-gray-200" style={{ backgroundImage: e.photoUrl ? `url('${e.photoUrl}')` : undefined }}>
                                                            {!e.photoUrl && <div className="w-full h-full flex items-center justify-center text-gray-400"><span className="material-symbols-outlined">person</span></div>}
                                                        </div>
                                                        <div>
                                                            <span className="text-sm font-semibold">{e.name}</span>
                                                            <span className="block text-xs text-[#60778a]">ID: {e.id.slice(0, 6)}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div>
                                                        <span className="text-sm">{e.position}</span>
                                                        <span className="block text-xs text-[#60778a]">{e.department}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.className}`}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm font-medium tabular-nums">${(e.salary || 0).toLocaleString()}</td>
                                                <td className="p-4">
                                                    {(e.sanctions || 0) > 0 ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                                            <span className="material-symbols-outlined text-[14px]">warning</span>
                                                            {e.sanctions} Activa{e.sanctions > 1 ? 's' : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Ninguna</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => generateBadge(e)} className="p-1.5 text-gray-500 hover:text-primary hover:bg-blue-50 rounded-md" title="Ver Gafete QR">
                                                            <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
                                                        </button>
                                                        <button onClick={() => openEdit(e)} className="p-1.5 text-gray-500 hover:text-primary hover:bg-blue-50 rounded-md" title={canEdit ? "Editar" : "Ver Detalles"}>
                                                            <span className="material-symbols-outlined text-[20px]">{canEdit ? 'edit' : 'visibility'}</span>
                                                        </button>
                                                        {canEdit && (
                                                            <button onClick={() => deleteEmployee(e.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md" title="Eliminar">
                                                                <span className="material-symbols-outlined text-[20px]">delete</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Global Modals */}
                <MessageModal
                    isOpen={messageModal.isOpen}
                    onClose={() => setMessageModal({ ...messageModal, isOpen: false })}
                    title={messageModal.title}
                    message={messageModal.message}
                    type={messageModal.type}
                />

                <ConfirmationModal
                    isOpen={confirmationModal.isOpen}
                    onClose={() => setConfirmationModal({ ...confirmationModal, isOpen: false })}
                    onConfirm={confirmationModal.onConfirm}
                    title={confirmationModal.title}
                    message={confirmationModal.message}
                />
            </main>

            {/* Employee Form Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold">
                                {canEdit ? (selectedEmployee ? "Editar Empleado" : "Nuevo Empleado") : "Detalles del Empleado"}
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium mb-1">Nombre Completo *</label>
                                    <input className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!canEdit} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Puesto *</label>
                                    <input className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} disabled={!canEdit} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Departamento</label>
                                    <select className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} disabled={!canEdit}>
                                        <option value="">Seleccionar</option>
                                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Salario Semanal</label>
                                    <input type="number" className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500" value={form.salary} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })} disabled={!canEdit} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Estado</label>
                                    <select className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} disabled={!canEdit}>
                                        {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Teléfono</label>
                                    <input className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!canEdit} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Email</label>
                                    <input type="email" className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!canEdit} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium mb-1">Foto del Empleado</label>
                                    <div className="flex items-center gap-4">
                                        <div className="size-16 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                                            {form.photoUrl ? (
                                                <img src={form.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    <span className="material-symbols-outlined">person</span>
                                                </div>
                                            )}
                                        </div>
                                        {canEdit && (
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                />
                                                {uploading && <p className="text-xs text-blue-600 mt-1 animate-pulse">Subiendo imagen...</p>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Sanciones Activas</label>
                                    <input type="number" className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500" value={form.sanctions} onChange={(e) => setForm({ ...form, sanctions: Number(e.target.value) })} disabled={!canEdit} />
                                </div>
                                <div className="col-span-2 border-t pt-2 mt-2">
                                    <h3 className="font-bold text-sm text-gray-500 mb-2">Datos Adicionales</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">CURP</label>
                                            <input className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2 uppercase disabled:bg-gray-50 disabled:text-gray-500" value={form.curp || ""} onChange={(e) => setForm({ ...form, curp: e.target.value.toUpperCase() })} disabled={!canEdit} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">NSS (Seguro Social)</label>
                                            <input className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500" value={form.nss || ""} onChange={(e) => setForm({ ...form, nss: e.target.value })} disabled={!canEdit} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Tipo de Sangre</label>
                                            <select className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500" value={form.bloodType || ""} onChange={(e) => setForm({ ...form, bloodType: e.target.value })} disabled={!canEdit}>
                                                <option value="">Seleccionar</option>
                                                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Contacto Emergencia</label>
                                            <input className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500" placeholder="Nombre y Tel" value={form.emergencyContact || ""} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} disabled={!canEdit} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
                                {canEdit ? "Cancelar" : "Cerrar"}
                            </button>
                            {canEdit && (
                                <button onClick={saveEmployee} className="px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm">Guardar</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* badge Modal - V6: Secure & Visible QR */}
            {showBadge && selectedEmployee && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800">Vista Previa Oficial (Seguro)</h2>
                            <button onClick={() => setShowBadge(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 bg-gray-600/50 flex items-center justify-center overflow-auto flex-1 backdrop-blur-sm">
                            {/* Badge Preview (V16: Advanced Security & Anti-Cloning) */}
                            <div ref={badgeRef} className="w-[320px] h-[520px] bg-white rounded-xl shadow-2xl overflow-hidden relative flex flex-col select-none print:shadow-none border border-gray-300">

                                {/* 1. GLOBAL OVERLAY WATERMARK (Full Coverage) */}
                                <div className="absolute inset-0 z-[60] opacity-[0.06] pointer-events-none mix-blend-multiply" style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='60' y='50' fill='%230B1B32' font-family='Arial' font-weight='bold' font-size='10' transform='rotate(-45 60 60)' text-anchor='middle'%3EGRUPO AR%3C/text%3E%3Ctext x='60' y='65' fill='%230B1B32' font-family='Arial' font-weight='bold' font-size='8' transform='rotate(-45 60 60)' text-anchor='middle'%3E${selectedEmployee?.id.toUpperCase() || ''}%3C/text%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'repeat'
                                }}></div>

                                {/* 2. PREMIUM METALLIC GOLD STRIP */}
                                <div className="absolute left-0 top-0 bottom-0 w-3 z-50 overflow-hidden flex items-center justify-center border-r border-[#ffffff55] shadow-[inset_-1px_0_2px_rgba(0,0,0,0.1)]"
                                    style={{
                                        background: 'linear-gradient(180deg, #BF953F 0%, #FCF6BA 25%, #B38728 50%, #FBF5B7 75%, #AA771C 100%)',
                                    }}>
                                    <span className="text-[5px] text-[#0B1B32]/40 font-black uppercase tracking-[0.4em] [writing-mode:vertical-rl] rotate-180 py-6 drop-shadow-sm">
                                        SECURED • gpo-ar.web.app • AUTHENTIC • AR •
                                    </span>
                                </div>

                                {/* Header */}
                                <div className="bg-[#0B1B32] h-[95px] relative z-10 flex flex-col items-center justify-center border-b-[4px] border-[#E31C23] pl-2">
                                    <img src="/assets/logo.png" alt="AR" className="h-[45px] object-contain mb-1 drop-shadow-md brightness-110" />
                                    <h1 className="text-white font-serif font-black tracking-[0.25em] text-lg leading-none">GRUPO AR</h1>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="h-[1px] w-6 bg-[#E31C23]"></div>
                                        <p className="text-white text-[8px] uppercase tracking-[0.2em] font-bold">Identificación Oficial</p>
                                        <div className="h-[1px] w-6 bg-[#E31C23]"></div>
                                    </div>
                                </div>

                                {/* Main Body with Security Mesh Background */}
                                <div className="flex-1 relative z-10 flex flex-col items-center pt-4 px-6 pl-8"
                                    style={{
                                        backgroundImage: `
                                            radial-gradient(circle at top right, #ffffff, #f8fafc),
                                            url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 10 10' xmlns='http://www.w3.org/2000/svg'%3E%3Cline x1='0' y1='10' x2='10' y2='0' stroke='%230033A0' stroke-width='0.1' opacity='0.1'/%3E%3C/svg%3E")
                                         `,
                                        backgroundBlendMode: 'multiply'
                                    }}>

                                    {/* Photo with Official Frame */}
                                    <div className="relative w-32 h-32 mb-3 group ring-4 ring-white/50 rounded-full shadow-lg">
                                        <div className="absolute inset-0 rounded-full border-[3px] border-[#0033A0] z-20"></div>
                                        <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 relative z-0">
                                            {selectedEmployee.photoUrl ? (
                                                <img
                                                    src={selectedEmployee.photoUrl}
                                                    crossOrigin="anonymous"
                                                    className="w-full h-full object-cover grayscale-[5%] contrast-110"
                                                    alt="Foto"
                                                    onError={(e) => e.target.style.display = 'none'}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                    <svg className="w-16 h-16 fill-current" viewBox="0 0 24 24">
                                                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        {/* Verified Checkmark Badge */}
                                        <div className="absolute bottom-1 right-1 w-9 h-9 bg-[#E31C23] rounded-full border-[3px] border-white flex items-center justify-center shadow-lg z-30">
                                            <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24">
                                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Identity */}
                                    <div className="text-center w-full mb-3">
                                        <h2 className="text-[#0B1B32] font-black text-2xl uppercase leading-none tracking-tight font-sans mb-1">
                                            {selectedEmployee.name.split(" ")[0]}
                                            <span className="block text-lg font-bold text-gray-600">{selectedEmployee.name.split(" ").slice(1).join(" ")}</span>
                                        </h2>
                                        <div className="mt-1.5 flex justify-center w-full px-4">
                                            <span className="bg-[#0033A0] text-white text-[9px] uppercase font-bold px-3 py-1.5 rounded-lg shadow-md tracking-wide text-center border border-white/20 w-full leading-tight">
                                                {selectedEmployee.position}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Smart Compact Data Grid */}
                                    <div className="w-full flex justify-between items-center text-left bg-white px-4 py-2.5 rounded-xl border border-blue-50 shadow-sm mt-1">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Departamento</span>
                                            <span className="text-[10px] font-bold text-[#0B1B32] uppercase leading-tight truncate max-w-[120px]">{selectedEmployee.department}</span>
                                        </div>
                                        <div className="w-[1px] h-7 bg-blue-50"></div>
                                        <div className="flex flex-col items-end whitespace-nowrap">
                                            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Employee ID</span>
                                            <span className="text-[14px] font-mono font-black text-[#E31C23] tracking-widest leading-none">{selectedEmployee.id.substring(0, 8).toUpperCase()}</span>
                                        </div>
                                    </div>

                                    {/* Macro-Serial Line (Anti-cloning) */}
                                    <div className="w-full flex justify-between px-2 mt-3">
                                        <span className="text-[6px] text-gray-300 font-mono">SEC-ID: {selectedEmployee.id.substring(0, 4)}-{new Date().getYear()}</span>
                                        <p className="text-[8px] text-gray-500 font-bold text-center uppercase tracking-wide">
                                            Verifique Vigencia mediante QR
                                        </p>
                                        <span className="text-[6px] text-gray-300 font-mono">AUTH:AR-001</span>
                                    </div>
                                </div>

                                {/* Footer - V16: Holographic QR Frame & Isolation */}
                                <div className="h-[125px] bg-[#f8fafc] border-t border-gray-200 flex flex-col relative overflow-hidden">
                                    <div className="absolute top-0 w-full h-[3px] bg-gradient-to-r from-[#0033A0] via-[#E31C23] to-[#0033A0]"></div>

                                    {/* Content Area */}
                                    <div className="flex-1 flex items-center justify-between px-6 pt-2 pb-6 pl-8">

                                        {/* 3. BRAND-SHIELD QR ARCHITECTURE (Anti-Falsification) */}
                                        <div className="relative z-[70] p-1 rounded-xl shadow-lg flex-shrink-0"
                                            style={{
                                                background: 'linear-gradient(45deg, #0033A0, #E31C23, #0033A0)',
                                            }}>
                                            <div className="relative bg-white p-0.5 rounded-lg overflow-hidden">
                                                {/* Internal Security Pattern for QR Box */}
                                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
                                                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='5' height='5' viewBox='0 0 10 10' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1' fill='%23000'/%3E%3C/svg%3E")`
                                                }}></div>

                                                <div className="relative bg-white p-1 rounded-[6px]">
                                                    {qrCode ? (
                                                        <div
                                                            className="w-[50px] h-[50px]"
                                                            style={{
                                                                background: 'linear-gradient(135deg, #E31C23 50%, #0033A0 50%)',
                                                                maskImage: `url(${qrCode})`,
                                                                WebkitMaskImage: `url(${qrCode})`,
                                                                maskSize: 'contain',
                                                                WebkitMaskSize: 'contain',
                                                                maskRepeat: 'no-repeat',
                                                                WebkitMaskRepeat: 'no-repeat'
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-[50px] h-[50px] bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-300">QR</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Verification Info - V20: Dynamic Status */}
                                        <div className="flex flex-col items-end justify-center text-right flex-1 pl-4 h-full relative z-[70]">
                                            <div className={`flex items-center gap-1.5 mb-1 bg-white border px-2.5 py-1 rounded-full shadow-sm whitespace-nowrap min-w-fit ${selectedEmployee.status === 'active' ? 'border-green-100' :
                                                selectedEmployee.status === 'inactive' ? 'border-red-100' :
                                                    'border-yellow-100'
                                                }`}>
                                                <div className={`w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0 ${selectedEmployee.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
                                                    selectedEmployee.status === 'inactive' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' :
                                                        'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]'
                                                    }`}></div>
                                                <span className="text-[10px] font-black text-[#0B1B32] uppercase tracking-wider">
                                                    Estatus {statuses.find(s => s.value === selectedEmployee.status)?.label || 'Activo'}
                                                </span>
                                            </div>
                                            <p className="text-[8px] text-gray-500 leading-3 max-w-[130px] font-bold mt-1">
                                                Escanea para validar autenticidad y documentos digitales.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Bottom Legal Bar */}
                                    <div className="absolute bottom-0 w-full h-[20px] bg-[#0B1B32] flex items-center justify-center z-[80]">
                                        <p className="text-[7px] text-white font-mono tracking-[0.4em] uppercase">PROPIEDAD DE GRUPO AR</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
                            <button onClick={() => setShowBadge(false)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={downloadBadge} className="flex-1 px-4 py-3 bg-[#0B1B32] text-white rounded-lg text-sm font-bold shadow-lg hover:bg-[#152b4a] transition-all flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">download</span>
                                Descargar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, icon, danger }) {
    return (
        <div className={`flex flex-col gap-2 rounded-xl p-6 bg-white border border-[#e5e7eb] shadow-sm ${danger ? 'relative overflow-hidden' : ''}`}>
            {danger && <div className="absolute right-0 top-0 h-full w-1 bg-red-500"></div>}
            <div className="flex justify-between items-start">
                <p className="text-[#60778a] text-sm font-medium">{label}</p>
                <span className={`material-symbols-outlined ${danger ? 'text-red-500' : 'text-primary/60'}`}>{icon}</span>
            </div>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    );
}
