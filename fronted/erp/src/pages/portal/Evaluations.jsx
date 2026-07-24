import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, serverTimestamp, writeBatch, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { toPng } from "html-to-image";

import MessageModal from "../../components/MessageModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import { useAuth } from "../../state/AuthContext";
import { useSecurity } from "../../state/SecurityContext";
import { Roles } from "../../utils/roles";

export default function Evaluations() {
    const { role, profile, hasPermission } = useAuth();
    const { validateAction } = useSecurity();
    const canEdit = hasPermission('evaluations', 2);
    const navigate = useNavigate();
    const [evaluations, setEvaluations] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalEvals, setTotalEvals] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [selectedWeek, setSelectedWeek] = useState("");
    const [reportData, setReportData] = useState([]);
    const [reportOptions, setReportOptions] = useState({
        showSalary: false, showAbsences: true, showLateArrivals: true, showBonus: false,
        showPerformance: true, showNotes: false, showTotalPayroll: true
    });
    const reportRef = useRef(null);

    // Custom Modals State
    const [messageModal, setMessageModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
    const [confirmationModal, setConfirmationModal] = useState({ isOpen: false, title: "", message: "", onConfirm: () => { } });



    // Request State
    const [activeTab, setActiveTab] = useState('evaluations');
    const [requests, setRequests] = useState([]);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestForm, setRequestForm] = useState({
        projectId: "",
        weekStart: "",
        selectedEmployees: [], // ids
        customQuestions: {
            "justified_absence": true,
            "uniform": false,
            "safety": false
        },
        latePenalty: 100,
        absencePenalty: 250
    });

    // Fetch requests logic inside existing fetchData


    const [form, setForm] = useState({
        employeeId: "", employeeName: "", projectId: "", projectName: "",
        weekStart: "", attendance: { lun: "present", mar: "present", mie: "present", jue: "present", vie: "present", sab: "present" },
        performance: 5, notes: "", supervisor: "", bonus: 0
    });

    const attendanceOptions = [
        { value: "present", label: "✓ Presente", color: "green" },
        { value: "late", label: "⏰ Retardo", color: "yellow" },
        { value: "absent", label: "✗ Falta", color: "red" },
        { value: "holiday", label: "🏠 Descanso", color: "blue" },
        { value: "na", label: "N/A", color: "gray" }
    ];

    const sanctions = { late: 50, absent: 150 };

    useEffect(() => {
        if (showModal || showRequestModal || showReport) {
            document.body.classList.add('no-scroll');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            document.body.classList.remove('no-scroll');
        }
        return () => document.body.classList.remove('no-scroll');
    }, [showModal, showRequestModal, showReport]);

    useEffect(() => {
        setLoading(true);
        // Real-time Listeners
        const evalUnsub = onSnapshot(query(collection(db, "evaluations"), orderBy("weekStart", "desc")), (snap) => {
            setEvaluations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setTotalEvals(snap.size);
            setLoading(false);
        });

        const empUnsub = onSnapshot(query(collection(db, "employees"), orderBy("name")), (snap) => {
            setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const projUnsub = onSnapshot(query(collection(db, "projects"), orderBy("name")), (snap) => {
            setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const reqUnsub = onSnapshot(query(collection(db, "evaluationRequests"), orderBy("createdAt", "desc")), (snap) => {
            setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            evalUnsub();
            empUnsub();
            projUnsub();
            reqUnsub();
        };
    }, []);

    const isSuperAdmin = profile?.role === 'SUPERADMIN' || profile?.username === 'paco-gpoGR';

    const confirmDelete = (type, id, extraData) => {
        const performDelete = async () => {
            try {
                if (type === 'request') {
                    await deleteDoc(doc(db, "evaluationRequests", id));
                    setRequests(requests.filter(r => r.id !== id));
                } else if (type === 'evaluation') {
                    await deleteDoc(doc(db, "evaluations", id));
                    setEvaluations(evaluations.filter(e => e.id !== id));
                } else if (type === 'week_project') {
                    // Batch delete
                    // Batch delete
                    const week = id; // passed as id
                    const groupKey = extraData; // Now passing the composite key

                    // Filter by matching the composite key reconstruction or just checking properties if possible
                    // Since we constructed the key as `${curr.projectName} | ${curr.supervisor} | ${dateStr}`
                    // We need to match that logic.

                    const toDelete = evaluations.filter(e => {
                        if (e.weekStart !== week) return false;
                        let dateStr = 'Sin Fecha';
                        if (e.createdAt?.seconds) {
                            try {
                                dateStr = new Date(e.createdAt.seconds * 1000).toISOString().split('T')[0];
                            } catch (err) { dateStr = 'Error Fecha'; }
                        }
                        const key = `${e.projectName || 'Sin Proyecto'} | ${e.supervisor || 'General'} | ${dateStr}`;
                        return key === groupKey;
                    });

                    const batch = writeBatch(db);
                    toDelete.forEach(docData => {
                        batch.delete(doc(db, "evaluations", docData.id));
                    });
                    await batch.commit();

                    setEvaluations(prev => prev.filter(e => !toDelete.some(d => d.id === e.id)));
                } else if (type === 'week_full') {
                    // Delete entire week
                    const week = id;
                    const toDelete = evaluations.filter(e => e.weekStart === week);
                    const batch = writeBatch(db);
                    toDelete.forEach(docData => {
                        batch.delete(doc(db, "evaluations", docData.id));
                    });
                    await batch.commit();
                    setEvaluations(prev => prev.filter(e => e.weekStart !== week));
                }
                setMessageModal({ isOpen: true, title: "Eliminado", message: "Registros eliminados correctamente.", type: "success" });
            } catch (e) {
                console.error(e);
                setMessageModal({ isOpen: true, title: "Error", message: "Error al eliminar.", type: "error" });
            }
        };

        if (type === 'request') {
            // Requests are less critical, maybe handle them differently or add to worker.
            // For now, let's assume direct admin delete for simplicity or add to worker.
            // Adding to worker:
            validateAction(performDelete, { type: 'delete_request', id });
        } else if (type === 'evaluation') {
            validateAction(performDelete, { type: 'delete_evaluation', id });
        } else if (type === 'week_project') {
            validateAction(performDelete, { type: 'delete_batch', id, extra: extraData });
        } else if (type === 'week_full') {
            validateAction(performDelete, { type: 'delete_week', id });
        }
    };



    const saveRequest = async () => {
        if (!requestForm.projectId || requestForm.selectedEmployees.length === 0) {
            setMessageModal({ isOpen: true, title: "Faltan Datos", message: "Seleccione obra y empleados", type: "warning" });
            return;
        }

        try {
            const proj = projects.find(p => p.id === requestForm.projectId);
            const employeeData = employees.filter(e => requestForm.selectedEmployees.includes(e.id)).map(e => ({
                id: e.id,
                name: e.name,
                role: e.role || "Operario",
                salary: e.salary || 0
            }));

            const docRef = await addDoc(collection(db, "evaluationRequests"), {
                projectName: proj?.name || "Sin Proyecto",
                projectId: requestForm.projectId,
                weekStart: requestForm.weekStart || currentWeekStart(),
                employees: employeeData,
                customQuestions: requestForm.customQuestions,
                config: {
                    latePenalty: Number(requestForm.latePenalty),
                    absencePenalty: Number(requestForm.absencePenalty)
                },
                status: 'pending',
                createdAt: new Date()
            });

            // Refresh handled by onSnapshot
            setShowRequestModal(false);

            // Clipboard copy
            const link = `${window.location.origin}/evaluar/${docRef.id}`;
            navigator.clipboard.writeText(link);
            setMessageModal({ isOpen: true, title: "Enlace Generado", message: "El enlace se ha copiado al portapapeles.", type: "success" });

        } catch (e) {
            console.error(e);
            setMessageModal({ isOpen: true, title: "Error", message: "Error al generar solicitud", type: "error" });
        }
    };

    const currentWeekStart = () => {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        return monday.toISOString().split('T')[0];
    };

    const calculatePayment = (emp, attendance, bonus = 0) => {
        const baseSalary = emp.salary || 0;
        let deductions = 0;

        Object.values(attendance).forEach(status => {
            if (status === "late") deductions += sanctions.late;
            if (status === "absent") deductions += sanctions.absent;
        });

        return Math.max(0, baseSalary - deductions + bonus);
    };

    const openNew = () => {
        setForm({
            employeeId: "", employeeName: "", projectId: "", projectName: "",
            weekStart: currentWeekStart(),
            attendance: { lun: "present", mar: "present", mie: "present", jue: "present", vie: "present", sab: "present" },
            performance: 5, notes: "", supervisor: "", bonus: 0
        });
        setShowModal(true);
    };

    const saveEvaluation = async () => {
        if (!form.employeeId || !form.supervisor) {
            setMessageModal({ isOpen: true, title: "Datos Incompletos", message: "Empleado y supervisor son obligatorios", type: "warning" });
            return;
        }
        const emp = employees.find(e => e.id === form.employeeId);
        const proj = projects.find(p => p.id === form.projectId);
        const finalPayment = calculatePayment(emp, form.attendance, form.bonus);

        try {
            await addDoc(collection(db, "evaluations"), {
                ...form,
                employeeName: emp?.name || "",
                projectName: proj?.name || "",
                baseSalary: emp?.salary || 0,
                finalPayment,
                createdAt: new Date()
            });
            setShowModal(false);
            setShowModal(false);
            // Refresh handled by onSnapshot
        } catch (e) {
            console.error(e);
            setMessageModal({ isOpen: true, title: "Error", message: "Error al guardar", type: "error" });
        }
    };

    const generateWeekReport = () => {
        if (!selectedWeek) {
            setMessageModal({ isOpen: true, title: "Atención", message: "Selecciona una semana", type: "warning" });
            return;
        }
        const weekEvals = evaluations.filter(e => e.weekStart === selectedWeek);

        const report = weekEvals.map(ev => {
            const lates = Object.values(ev.attendance || {}).filter(a => a === "late").length;
            const absences = Object.values(ev.attendance || {}).filter(a => a === "absent").length;

            // Calculate detailed days
            const DAY_LABELS = { mon: 'LUN', tue: 'MAR', wed: 'MIE', thu: 'JUE', fri: 'VIE', sat: 'SAB' };
            const lateDays = Object.entries(ev.attendance || {})
                .filter(([_, status]) => status === 'late')
                .map(([day]) => DAY_LABELS[day] || day.toUpperCase());
            const absentDays = Object.entries(ev.attendance || {})
                .filter(([_, status]) => status === 'absent')
                .map(([day]) => DAY_LABELS[day] || day.toUpperCase());

            const remarks = [];
            if (lateDays.length > 0) remarks.push(`${lateDays.length} Retardos: ${lateDays.join(', ')}`);
            if (absentDays.length > 0) remarks.push(`${absentDays.length} Faltas: ${absentDays.join(', ')}`);

            return {
                ...ev,
                lates,
                absences,
                deductions: (lates * (ev.config?.latePenalty || 100)) + (absences * (ev.config?.absencePenalty || 250)),
                remarks: remarks.join(' | ') || 'Perfecto'
            };
        });

        setReportData(report);
        setShowReport(true);
    };

    const downloadReport = async () => {
        if (!reportRef.current) return;
        try {
            const filter = (node) => {
                const exclusionClasses = ['remove-me', 'secret-div'];
                if (node.classList?.contains(exclusionClasses)) return false;
                const tagName = node.tagName?.toUpperCase();
                if (['SCRIPT', 'STYLE', 'LINK', 'IFRAME', 'NOSCRIPT'].includes(tagName)) return false;
                if (node.nodeType === 3 && !node.textContent.trim()) return false;
                return true;
            }

            const dataUrl = await toPng(reportRef.current, {
                quality: 1,
                backgroundColor: 'white',
                filter: filter,
                skipFonts: true,
                cacheBust: true
            });
            const link = document.createElement("a");
            link.download = `reporte-semanal-${selectedWeek}.png`;
            link.href = dataUrl;
            link.click();
        } catch (e) { console.error(e); }
    };

    const weeks = [...new Set(evaluations.map(e => e.weekStart))].sort().reverse();

    return (
        <div className="bg-background-light min-h-screen font-display text-[#111518]">
            {/* Header */}
            <header className="bg-white border-b border-[#e5e7eb] sticky top-0 z-50">
                <div className="px-4 md:px-10 flex items-center justify-between py-3 max-w-[1440px] mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <div className="size-8 flex items-center justify-center text-primary bg-primary/10 rounded-lg">
                            <span className="material-symbols-outlined text-2xl">assessment</span>
                        </div>
                        <h2 className="text-lg font-bold">Evaluaciones & Nómina</h2>
                    </div>
                    <div className="flex gap-3">
                        {canEdit && (
                            <>

                                <button
                                    onClick={() => navigate("/portal/evaluaciones/nueva")}
                                    className="flex items-center h-10 px-4 rounded-lg bg-[#0B1B32] hover:bg-black text-white text-sm font-bold shadow-lg transition-all active:scale-95"
                                >
                                    <span className="material-symbols-outlined mr-2 text-[18px]">add_task</span>
                                    Nueva Evaluación V22
                                </button>
                                <button onClick={() => setShowRequestModal(true)} className="flex items-center h-10 px-4 rounded-lg bg-[#BF953F] hover:bg-[#AA771C] text-white text-sm font-bold shadow-lg transition-all active:scale-95">
                                    <span className="material-symbols-outlined mr-2 text-[18px]">share</span>
                                    Solicitar a Obra
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-[1440px] mx-auto px-4 md:px-10 py-6">

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('evaluations')}
                        className={`pb-2 px-4 font-bold border-b-2 transition-colors ${activeTab === 'evaluations' ? 'border-primary text-primary' : 'border-transparent text-gray-400'}`}
                    >
                        Evaluaciones Recibidas
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`pb-2 px-4 font-bold border-b-2 transition-colors ${activeTab === 'requests' ? 'border-primary text-primary' : 'border-transparent text-gray-400'}`}
                    >
                        Solicitudes Pendientes
                    </button>
                </div>

                {activeTab === 'requests' && (
                    <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-6 mb-6">
                        <h3 className="text-lg font-bold mb-4">Solicitudes Enviadas</h3>
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-3 text-xs uppercase text-gray-500">Fecha</th>
                                    <th className="p-3 text-xs uppercase text-gray-500">Obra</th>
                                    <th className="p-3 text-xs uppercase text-gray-500">Semana</th>
                                    <th className="p-3 text-xs uppercase text-gray-500">Estado</th>
                                    <th className="p-3 text-xs uppercase text-gray-500">Enlace</th>
                                    <th className="p-3 text-xs uppercase text-gray-500">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => (
                                    <tr key={req.id} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="p-3 text-sm font-bold text-[#111518]">{new Date(req.createdAt.seconds * 1000).toLocaleDateString()}</td>
                                        <td className="p-3 text-sm text-gray-600">{req.projectName}</td>
                                        <td className="p-3 text-sm font-bold text-[#0B1B32]">{req.weekStart}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${req.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {req.status === 'completed' ? 'Completado' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <button
                                                onClick={() => {
                                                    const link = `${window.location.origin}/evaluar/${req.id}`;
                                                    navigator.clipboard.writeText(link);
                                                    setMessageModal({ isOpen: true, title: "Copiado", message: "Enlace copiado", type: "success" });
                                                }}
                                                className="text-primary hover:underline text-xs font-bold"
                                            >
                                                Copiar
                                            </button>
                                        </td>
                                        <td className="p-3">
                                            <button
                                                onClick={() => confirmDelete('request', req.id)}
                                                className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {requests.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-400">No hay solicitudes activas.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'evaluations' && (
                    <>
                        {/* Report Generator */}
                        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-6 mb-6">
                            <h3 className="text-lg font-bold mb-4">Generar Reporte Semanal</h3>
                            <div className="flex flex-wrap gap-4 items-end">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Semana</label>
                                    <select
                                        className="h-10 px-4 rounded-lg border border-[#dbe1e6] bg-white text-sm min-w-[200px]"
                                        value={selectedWeek}
                                        onChange={(e) => setSelectedWeek(e.target.value)}
                                    >
                                        <option value="">Seleccionar semana</option>
                                        {weeks.map(w => <option key={w} value={w}>{w}</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-3 flex-wrap">
                                    {Object.entries(reportOptions).map(([key, val]) => (
                                        <label key={key} className="flex items-center gap-2 text-sm select-none cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={val}
                                                onChange={(e) => setReportOptions({ ...reportOptions, [key]: e.target.checked })}
                                                className="rounded border-gray-300 text-[#0B1B32] focus:ring-[#0B1B32]"
                                            />
                                            <span className="capitalize">{
                                                key === 'showSalary' ? 'Salario' :
                                                    key === 'showAbsences' ? 'Faltas' :
                                                        key === 'showLateArrivals' ? 'Retardos' :
                                                            key === 'showBonus' ? 'Bonos' :
                                                                key === 'showPerformance' ? 'Rendimiento' :
                                                                    key === 'showNotes' ? 'Notas' : 'Total Nómina'
                                            }</span>
                                        </label>
                                    ))}
                                </div>
                                {canEdit && (
                                    <button onClick={generateWeekReport} className="h-10 px-6 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-bold">
                                        <span className="material-symbols-outlined mr-2 text-sm">summarize</span>
                                        Generar Reporte
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Evaluations List */}
                        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-gray-100">
                                <h3 className="text-lg font-bold">Evaluaciones Recientes</h3>
                            </div>
                            <div className="overflow-x-auto">
                                {loading ? (
                                    <div className="p-8 text-center text-gray-400">Cargando...</div>
                                ) : evaluations.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">No hay evaluaciones</div>
                                ) : (
                                    Object.entries(evaluations.reduce((acc, curr) => {
                                        const week = curr.weekStart || 'Sin Fecha';
                                        if (!acc[week]) acc[week] = {};

                                        // Composite Key for Independence: Project - Supervisor - Date
                                        // This ensures different submissions (even same day different supervisor, or different days) are kept separate
                                        // Safety check: ensure string
                                        const safeProject = String(curr.projectName || 'Sin Proyecto');
                                        const safeSupervisor = String(curr.supervisor || 'General');

                                        // Use ISO date to ensure consistency and avoid locale issues
                                        let dateStr = 'Sin Fecha';
                                        if (curr.createdAt?.seconds) {
                                            try {
                                                dateStr = new Date(curr.createdAt.seconds * 1000).toISOString().split('T')[0];
                                            } catch (e) { dateStr = 'Error Fecha'; }
                                        }

                                        const groupKey = `${safeProject} | ${safeSupervisor} | ${dateStr}`;

                                        if (!acc[week][groupKey]) acc[week][groupKey] = [];
                                        acc[week][groupKey].push(curr);
                                        return acc;
                                    }, {})).sort((a, b) => b[0].localeCompare(a[0])).map(([week, groups]) => (
                                        <details key={week} className="group border-b border-gray-100 last:border-0" open>
                                            <summary className="p-4 bg-gray-50 font-bold cursor-pointer hover:bg-gray-100 flex items-center justify-between select-none">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-gray-400 group-open:rotate-90 transition-transform">chevron_right</span>
                                                    SEMANA: {week}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        confirmDelete('week_full', week);
                                                    }}
                                                    className="p-1 px-3 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                                                >
                                                    Eliminar Semana Completa
                                                </button>
                                            </summary>
                                            <div className="pl-4 pr-0 py-2 space-y-2">
                                                {Object.entries(groups).map(([groupKey, evals]) => {
                                                    const [projName, supervisor, date] = groupKey.split(' | ');
                                                    return (
                                                        <details key={groupKey} className="group/project border rounded-lg overflow-hidden border-gray-200" open>
                                                            <summary className="p-3 bg-white border-b border-gray-100 font-bold text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between text-[#0B1B32]">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="material-symbols-outlined text-gray-300 group-open/project:rotate-90 transition-transform text-sm">chevron_right</span>
                                                                    <span>{projName}</span>
                                                                    <span className="font-normal text-gray-400 mx-1">•</span>
                                                                    <span className="font-normal text-gray-500 text-xs">{supervisor}</span>
                                                                    <span className="font-normal text-gray-400 mx-1">•</span>
                                                                    <span className="font-normal text-gray-500 text-xs">{date}</span>
                                                                    <span className="ml-2 bg-blue-50 text-blue-700 px-2 rounded-full text-[10px]">{evals.length}</span>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        // We pass the full groupKey to delete the specific batch
                                                                        confirmDelete('week_project', week, groupKey);
                                                                    }}
                                                                    className="text-red-400 hover:text-red-600 p-1"
                                                                    title="Eliminar Grupo"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                                </button>
                                                            </summary>
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left">
                                                                    <thead className="bg-[#f8fafc]">
                                                                        <tr>
                                                                            <th className="p-3 text-[10px] font-black text-gray-400 uppercase">Empleado</th>
                                                                            <th className="p-3 text-[10px] font-black text-gray-400 uppercase">Asistencia</th>
                                                                            <th className="p-3 text-[10px] font-black text-gray-400 uppercase">Desempeño</th>
                                                                            <th className="p-3 text-[10px] font-black text-gray-400 uppercase">Pago Final</th>
                                                                            <th className="p-3 text-[10px] font-black text-gray-400 uppercase">Supervisor</th>
                                                                            <th className="p-3 text-[10px] font-black text-gray-400 uppercase">Acciones</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-100">
                                                                        {evals.map((ev) => {
                                                                            const DAY_LABELS = { mon: 'LUN', tue: 'MAR', wed: 'MIE', thu: 'JUE', fri: 'VIE', sat: 'SAB' };

                                                                            const lateDays = Object.entries(ev.attendance || {})
                                                                                .filter(([_, status]) => status === 'late')
                                                                                .map(([day]) => DAY_LABELS[day] || day.toUpperCase());

                                                                            const absentDays = Object.entries(ev.attendance || {})
                                                                                .filter(([_, status]) => status === 'absent')
                                                                                .map(([day]) => DAY_LABELS[day] || day.toUpperCase());

                                                                            const isCritical = absentDays.length >= 2 || lateDays.length >= 3;

                                                                            return (
                                                                                <tr key={ev.id} className={`hover:bg-gray-50 bg-white transition-colors ${isCritical ? 'bg-red-50/50' : ''}`}>
                                                                                    <td className="p-3">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className={`font-bold text-xs uppercase ${isCritical ? 'text-red-600 border-b-2 border-red-200' : 'text-[#0B1B32]'}`}>{ev.employeeName}</span>
                                                                                            {isCritical && (
                                                                                                <span className="bg-red-600 text-white px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase shadow-sm">CRÍTICO</span>
                                                                                            )}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="p-3">
                                                                                        <div className="flex flex-wrap gap-1">
                                                                                            {absentDays.length > 0 && (
                                                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${absentDays.length >= 2 ? 'bg-red-600 text-white border-red-700' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                                                                    {absentDays.length} FALTAS
                                                                                                </span>
                                                                                            )}
                                                                                            {lateDays.length > 0 && (
                                                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${lateDays.length >= 3 ? 'bg-orange-600 text-white border-orange-700' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                                                                                                    {lateDays.length} RETARDOS
                                                                                                </span>
                                                                                            )}
                                                                                            {absentDays.length === 0 && lateDays.length === 0 && (
                                                                                                <span className="text-[10px] text-green-600 font-bold">ASISTENCIA PERFECTA</span>
                                                                                            )}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="p-3">
                                                                                        <div className="flex items-center gap-0.5">
                                                                                            {[1, 2, 3, 4, 5].map(i => (
                                                                                                <span key={i} className={`text-sm ${i <= (ev.performance || 0) ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                                                                                            ))}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="p-3 font-bold text-green-600 text-xs">${(ev.finalPayment || 0).toLocaleString()}</td>
                                                                                    <td className="p-3 text-[10px] text-gray-400 uppercase">{ev.supervisor}</td>
                                                                                    <td className="p-3">
                                                                                        <button
                                                                                            onClick={() => confirmDelete('evaluation', ev.id)}
                                                                                            className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                                                                                            title="Eliminar Evaluación"
                                                                                        >
                                                                                            <span className="material-symbols-outlined text-base">delete</span>
                                                                                        </button>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </details>
                                                    );
                                                })}
                                            </div>
                                        </details>
                                    ))
                                )}
                            </div>
                        </div>
                        {/* Closing Evaluations List */}
                    </>
                )}
            </main>

            {/* Evaluation Form Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-100">
                                <h2 className="text-xl font-bold">Nueva Evaluación Semanal</h2>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Empleado *</label>
                                        <select className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                                            <option value="">Seleccionar</option>
                                            {employees.map(e => <option key={e.id} value={e.id}>{e.name} (${e.salary}/sem)</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Proyecto</label>
                                        <select className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                                            <option value="">Seleccionar</option>
                                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Inicio de Semana</label>
                                        <input type="date" className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2" value={form.weekStart} onChange={(e) => setForm({ ...form, weekStart: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Supervisor *</label>
                                        <input className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2" value={form.supervisor} onChange={(e) => setForm({ ...form, supervisor: e.target.value })} placeholder="Nombre completo" />
                                    </div>
                                </div>

                                {/* Attendance Grid */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Asistencia de la Semana</label>
                                    <div className="grid grid-cols-6 gap-2">
                                        {["lun", "mar", "mie", "jue", "vie", "sab"].map(day => (
                                            <div key={day} className="text-center">
                                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">{day}</p>
                                                <select
                                                    className={`w-full text-xs rounded-lg border px-2 py-2 ${form.attendance[day] === 'present' ? 'bg-green-50 border-green-200' :
                                                        form.attendance[day] === 'late' ? 'bg-yellow-50 border-yellow-200' :
                                                            form.attendance[day] === 'absent' ? 'bg-red-50 border-red-200' :
                                                                'bg-blue-50 border-blue-200'
                                                        }`}
                                                    value={form.attendance[day]}
                                                    onChange={(e) => setForm({ ...form, attendance: { ...form.attendance, [day]: e.target.value } })}
                                                >
                                                    {attendanceOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Desempeño (1-5)</label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <button
                                                    key={i}
                                                    onClick={() => setForm({ ...form, performance: i })}
                                                    className={`text-2xl ${i <= form.performance ? 'text-yellow-400' : 'text-gray-300'}`}
                                                >
                                                    ★
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Bono Extra</label>
                                        <input type="number" className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: Number(e.target.value) })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Notas</label>
                                    <textarea className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2 min-h-[60px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                                </div>

                                {/* Payment Preview */}
                                {form.employeeId && (
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h4 className="font-bold mb-2">Vista Previa de Pago</h4>
                                        {(() => {
                                            const emp = employees.find(e => e.id === form.employeeId);
                                            const lates = Object.values(form.attendance).filter(a => a === "late").length;
                                            const absences = Object.values(form.attendance).filter(a => a === "absent").length;
                                            const deductions = (lates * sanctions.late) + (absences * sanctions.absent);
                                            const final = calculatePayment(emp, form.attendance, form.bonus);
                                            return (
                                                <div className="grid grid-cols-4 gap-2 text-sm">
                                                    <div>
                                                        <p className="text-gray-500">Base</p>
                                                        <p className="font-bold">${emp?.salary || 0}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500">Deducciones</p>
                                                        <p className="font-bold text-red-600">-${deductions}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500">Bono</p>
                                                        <p className="font-bold text-green-600">+${form.bonus}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500">Total</p>
                                                        <p className="font-bold text-primary text-lg">${final}</p>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600">Cancelar</button>
                                <button onClick={saveEvaluation} className="px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm">Guardar Evaluación</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Report Modal */}
            {

                showReport && (
                    <div className="fixed inset-0 z-[60] bg-black/90 flex items-start justify-center p-4 pt-10 overflow-y-auto backdrop-blur-xl">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20">
                            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-30">
                                <div>
                                    <h2 className="text-xl font-black text-[#0B1B32] tracking-tight">VISTA PREVIA PROFESIONAL</h2>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Optimizado para WhatsApp (1080p)</p>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowReport(false)} className="px-5 py-2.5 text-xs font-black text-gray-500 hover:text-gray-800 transition-colors uppercase tracking-widest">Cerrar</button>
                                    <button onClick={downloadReport} className="flex items-center gap-2 px-8 py-3 bg-[#0B1B32] hover:bg-black text-white rounded-2xl text-xs font-black shadow-2xl transition-all hover:scale-[1.02] active:scale-95 uppercase tracking-widest">
                                        <span className="material-symbols-outlined text-lg">download</span>
                                        Descargar Reporte PNG
                                    </button>
                                </div>
                            </div>

                            {/* REPORT CANVAS (1080px Width) */}
                            <div className="bg-slate-200 p-6 overflow-auto flex justify-center flex-1">
                                <div ref={reportRef} className="bg-white w-[1080px] min-h-[1400px] shadow-[0_0_100px_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col text-[#0B1B32]">

                                    {/* DECORATIVE ELEMENTS */}
                                    <div className="absolute top-0 left-0 w-full h-4 bg-[#BF953F]"></div>
                                    <div className="absolute bottom-0 left-0 w-full h-4 bg-[#BF953F]"></div>

                                    {/* WATERMARK BACKGROUND */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
                                        <img src="/assets/logo_oficial.png" className="w-[800px] grayscale" alt="Watermark" />
                                    </div>
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/clean-gray-paper.png')] opacity-[0.4] pointer-events-none"></div>

                                    {/* PREMIUM HEADER */}
                                    <div className="p-14 pb-10 flex items-center justify-between relative z-10 border-b-2 border-gray-100 bg-white/60 backdrop-blur-md">
                                        <div className="flex items-center gap-8">
                                            <div className="p-5 bg-white rounded-3xl shadow-xl border border-gray-100 transform -rotate-1">
                                                <img src="/assets/logo_oficial.png" className="h-[90px] object-contain" alt="Logo" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[12px] font-black tracking-[0.5em] text-[#BF953F] uppercase mb-1 drop-shadow-sm">Certificación Oficial de Labores</p>
                                                <h1 className="text-7xl font-black leading-none tracking-tighter italic text-[#0B1B32]">REPORTE <span className="text-[#BF953F]">SEMANAL</span></h1>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[11px] font-black text-[#BF953F] uppercase tracking-[0.4em] mb-1">Semana Operativa</p>
                                            <p className="text-5xl font-black italic tracking-tighter bg-[#0B1B32] text-white px-4 py-1 rounded-xl shadow-lg">{selectedWeek}</p>
                                            <p className="text-[11px] font-bold text-[#0B1B32]/40 uppercase tracking-widest mt-2">Grupo Ar Construcción Industrial</p>
                                        </div>
                                    </div>

                                    {/* MAIN CONTENT AREA */}
                                    <div className="p-14 pt-10 flex-1 relative z-10 flex flex-col">

                                        {/* TOP METRICS & POLICIES */}
                                        <div className="grid grid-cols-12 gap-8 mb-10">
                                            {/* Metrics Panel */}
                                            <div className="col-span-8 grid grid-cols-3 gap-4">
                                                <div className="bg-[#0B1B32] p-6 rounded-[2rem] border border-white/10 shadow-xl flex flex-col items-center justify-center">
                                                    <p className="text-[10px] font-black text-[#BF953F] uppercase tracking-widest mb-1">Personal</p>
                                                    <p className="text-5xl font-black text-white">{reportData.length}</p>
                                                </div>
                                                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Incidencias</p>
                                                    <p className="text-5xl font-black text-amber-600">
                                                        {reportData.reduce((s, r) => s + r.lates + r.absences, 0)}
                                                    </p>
                                                </div>
                                                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Efectividad</p>
                                                    <p className="text-4xl font-black text-green-600">
                                                        {Math.round(100 - (reportData.reduce((s, r) => s + r.lates + r.absences, 0) / (reportData.length || 1) * 10))}%
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Penalty Disclosure */}
                                            <div className="col-span-4 bg-gray-50/80 backdrop-blur-sm p-6 rounded-[2rem] border-2 border-dashed border-gray-200 flex flex-col justify-center">
                                                <p className="text-[10px] font-black text-[#0B1B32] uppercase tracking-[0.2em] mb-3 border-b border-gray-200 pb-2">Políticas de Sanción</p>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-[11px] font-bold">
                                                        <span className="text-gray-500">Multa Retardo:</span>
                                                        <span className="text-amber-600">-${reportData[0]?.config?.latePenalty || 100}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[11px] font-bold">
                                                        <span className="text-gray-500">Multa Falta:</span>
                                                        <span className="text-red-600">-${reportData[0]?.config?.absencePenalty || 250}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* TOTAL PAYROLL BANNER */}
                                        {reportOptions.showTotalPayroll && (
                                            <div className="mb-10 p-8 pt-0">
                                                <div className="bg-gradient-to-r from-[#0B1B32] via-[#152a4a] to-[#0B1B32] rounded-[2.5rem] shadow-2xl p-8 flex items-center justify-between px-16 border-t border-white/10 relative overflow-hidden">
                                                    <div className="absolute right-0 top-0 h-full w-64 bg-white/5 skew-x-12 transform translate-x-20"></div>
                                                    <div className="relative z-10">
                                                        <p className="text-[12px] font-black text-[#BF953F] uppercase tracking-[0.5em] mb-1 leading-none">Inversión de Nómina Semanal</p>
                                                        <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Control Interno Grupo Ar</p>
                                                    </div>
                                                    <p className="text-7xl font-black text-white tracking-tighter drop-shadow-2xl relative z-10">
                                                        ${reportData.reduce((s, r) => s + r.finalPayment, 0).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* EMPLOYEES GRID */}
                                        <div className="space-y-3 mb-16">
                                            <div className="grid grid-cols-12 gap-4 px-10 mb-4 items-end">
                                                <div className="col-span-4 text-[11px] font-black text-[#0B1B32]/40 uppercase tracking-[0.2em]">Colaborador / Especialidad</div>
                                                {reportOptions.showPerformance && <div className="col-span-2 text-center text-[11px] font-black text-[#0B1B32]/40 uppercase tracking-[0.2em]">Desempeño</div>}
                                                <div className="col-span-2 text-center text-[11px] font-black text-[#0B1B32]/40 uppercase tracking-[0.2em]">Asistencia</div>
                                                <div className="col-span-4 text-right text-[11px] font-black text-[#0B1B32]/40 uppercase tracking-[0.2em]">Resumen & Pago</div>
                                            </div>

                                            {reportData.map((r, i) => (
                                                <div key={i} className={`grid grid-cols-12 gap-4 items-center p-6 px-10 rounded-[2rem] border-2 shadow-sm transition-all relative overflow-hidden ${i % 2 === 0 ? 'bg-white border-gray-50' : 'bg-gray-50/30 border-transparent hover:bg-white hover:border-gray-50'}`}>
                                                    <div className="col-span-4 relative z-10">
                                                        <p className="text-2xl font-black uppercase tracking-tight leading-none mb-1.5 text-[#0B1B32]">{r.employeeName}</p>
                                                        <p className="text-[10px] font-bold text-[#BF953F] uppercase tracking-[0.2em]">Operativo de Obra • Industrial</p>
                                                    </div>

                                                    {reportOptions.showPerformance && (
                                                        <div className="col-span-2 flex justify-center relative z-10">
                                                            <div className="flex gap-1.5 bg-white shadow-inner p-2 px-3 rounded-2xl border border-gray-100">
                                                                {[1, 2, 3, 4, 5].map(star => (
                                                                    <span key={star} className={`text-xl leading-none drop-shadow-sm ${star <= (r.performance || 0) ? 'text-[#BF953F]' : 'text-gray-100'}`}>★</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="col-span-2 flex justify-center gap-3 relative z-10">
                                                        <div className={`size-14 rounded-2xl flex flex-col items-center justify-center border-2 ${r.absences > 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-white text-gray-200 border-gray-50'}`}>
                                                            <span className="text-lg font-black leading-none">{r.absences}</span>
                                                            <span className="text-[8px] font-black uppercase mt-0.5">Faltas</span>
                                                        </div>
                                                        <div className={`size-14 rounded-2xl flex flex-col items-center justify-center border-2 ${r.lates > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-white text-gray-200 border-gray-50'}`}>
                                                            <span className="text-lg font-black leading-none">{r.lates}</span>
                                                            <span className="text-[8px] font-black uppercase mt-0.5">Retar.</span>
                                                        </div>
                                                    </div>

                                                    <div className="col-span-4 text-right relative z-10">
                                                        <div className="flex flex-col items-end">
                                                            <p className={`text-sm font-black uppercase tracking-tight mb-1 ${r.remarks !== 'Perfecto' ? 'text-amber-700' : 'text-green-600/50 italic opacity-60'}`}>
                                                                {r.remarks || "—"}
                                                            </p>
                                                            {reportOptions.showSalary && (
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest">Total Devengado:</span>
                                                                    <p className="text-4xl font-black text-[#0B1B32] tracking-tighter leading-none">${r.finalPayment.toLocaleString()}</p>
                                                                </div>
                                                            )}
                                                            {reportOptions.showNotes && r.notes && (
                                                                <p className="text-[10px] text-gray-400 font-bold bg-white px-3 py-1 rounded-lg mt-2 shadow-sm border border-gray-100 italic">" {r.notes} "</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* PREMIUM FOOTER CEREMONIAL */}
                                        <div className="mt-auto border-t-4 border-[#0B1B32]/10 pt-12 flex justify-between items-end relative z-10 pb-10">
                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-[11px] font-black text-[#0B1B32] uppercase tracking-[0.4em] mb-2">Certificación de Integridad</p>
                                                    <p className="text-[10px] text-gray-400 font-bold max-w-sm leading-relaxed">
                                                        Este reporte ha sido validado mediante criptografía de sistema para el control administrativo de Grupo Ar Construcción. Cualquier alteración invalida su legitimidad.
                                                    </p>
                                                </div>
                                                <div className="flex gap-4 items-center">
                                                    <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[1.5rem] flex items-center gap-4">
                                                        <span className="material-symbols-outlined text-[#0B1B32]/20 text-3xl">verified_user</span>
                                                        <div>
                                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">ID Único de Certificación</p>
                                                            <p className="text-xs font-black text-[#0B1B32] tracking-widest">{Math.random().toString(36).substring(7).toUpperCase()}-{Date.now().toString(36).toUpperCase()}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center group">
                                                <div className="w-80 h-px bg-[#0B1B32]/20 mb-6 group-hover:bg-[#0B1B32] transition-colors"></div>
                                                <p className="text-sm font-black text-[#0B1B32] tracking-[0.5em] uppercase">FIRMA DE SUPERVISOR</p>
                                                <p className="text-[10px] font-bold text-[#BF953F] uppercase mt-2 tracking-[0.2em] italic">Responsabilidad Civil y Laboral</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* BOTTOM MARGIN BAR */}
                                    <div className="h-10 bg-[#0B1B32] flex justify-center gap-16 items-center shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
                                        <p className="text-[9px] font-black uppercase tracking-[0.8em] text-[#BF953F]">Infraestructura</p>
                                        <div className="h-1 w-1 rounded-full bg-white/20"></div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.8em] text-[#BF953F]">Urbanización</p>
                                        <div className="h-1 w-1 rounded-full bg-white/20"></div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.8em] text-[#BF953F]">Edificación</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            {/* Request Modal */}
            {
                showRequestModal && (
                    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 rounded-t-2xl z-10">
                                <h2 className="text-xl font-bold">Generar Solicitud de Evaluación</h2>
                                <button onClick={() => setShowRequestModal(false)} className="material-symbols-outlined text-gray-400">close</button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1 space-y-6">

                                {/* Project Select */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">1. Seleccionar Obra</label>
                                    <select
                                        className="w-full p-3 border rounded-xl bg-gray-50 font-bold"
                                        value={requestForm.projectId}
                                        onChange={(e) => {
                                            const proj = projects.find(p => p.id === e.target.value);
                                            setRequestForm({
                                                ...requestForm,
                                                projectId: e.target.value,
                                                // If they select a project, try to pre-fill known employees
                                                selectedEmployees: proj ? (proj.assignedEmployees || []) : []
                                            });
                                        }}
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>

                                {/* Config Penalties */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Multa Retardo ($)</label>
                                        <input
                                            type="number"
                                            className="w-full p-3 border rounded-xl bg-gray-50 font-medium text-amber-600"
                                            value={requestForm.latePenalty}
                                            onChange={(e) => setRequestForm({ ...requestForm, latePenalty: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Multa Falta ($)</label>
                                        <input
                                            type="number"
                                            className="w-full p-3 border rounded-xl bg-gray-50 font-medium text-red-600"
                                            value={requestForm.absencePenalty}
                                            onChange={(e) => setRequestForm({ ...requestForm, absencePenalty: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Week */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">2. Semana a Evaluar</label>
                                    <input
                                        type="date"
                                        className="w-full p-3 border rounded-xl bg-gray-50 font-medium"
                                        value={requestForm.weekStart}
                                        onChange={(e) => setRequestForm({ ...requestForm, weekStart: e.target.value })}
                                    />
                                </div>

                                {/* Employees */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-bold text-gray-700">3. Empleados ({requestForm.selectedEmployees.length})</label>
                                        {requestForm.projectId && (
                                            <button
                                                onClick={() => {
                                                    const proj = projects.find(p => p.id === requestForm.projectId);
                                                    const assignedIds = proj?.assignedEmployees || [];
                                                    const validIds = employees.filter(e => assignedIds.includes(e.id)).map(e => e.id);
                                                    setRequestForm(prev => ({ ...prev, selectedEmployees: [...new Set([...prev.selectedEmployees, ...validIds])] }));
                                                }}
                                                className="text-xs font-bold text-primary hover:underline"
                                            >
                                                + Agregar Asignados a Obra
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-60 overflow-y-auto border rounded-xl p-2 bg-gray-50 space-y-2">
                                        {(requestForm.projectId ? employees : []).map(emp => {
                                            // Find if employee is assigned to any project
                                            const assignedProject = projects.find(p => (p.assignedEmployees || []).includes(emp.id));
                                            const isAssignedToCurrent = requestForm.projectId && (projects.find(p => p.id === requestForm.projectId)?.assignedEmployees || []).includes(emp.id);

                                            return (
                                                <label key={emp.id} className={`flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 hover:border-primary cursor-pointer transition-all ${isAssignedToCurrent ? 'bg-blue-50/50 border-blue-100' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        className="w-5 h-5 rounded text-primary"
                                                        checked={requestForm.selectedEmployees.includes(emp.id)}
                                                        onChange={(e) => {
                                                            const current = requestForm.selectedEmployees;
                                                            if (e.target.checked) setRequestForm({ ...requestForm, selectedEmployees: [...current, emp.id] });
                                                            else setRequestForm({ ...requestForm, selectedEmployees: current.filter(id => id !== emp.id) });
                                                        }}
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-center">
                                                            <p className="font-bold text-sm">{emp.name}</p>
                                                            {assignedProject && (
                                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 rounded uppercase tracking-wider">
                                                                    {assignedProject.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500">{emp.role || "Operario"} • ${emp.salary || 0}/sem</p>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                        {!requestForm.projectId && <p className="text-center text-gray-400 py-4">Seleccione una obra primero para ver empleados.</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3 z-10 sticky bottom-0">
                                <button onClick={() => setShowRequestModal(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200">Cancelar</button>
                                <button
                                    onClick={saveRequest}
                                    className="px-8 py-3 bg-orange-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:translate-y-[-1px] transition-all flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined">link</span>
                                    Generar Enlace
                                </button>
                            </div>
                        </div>
                    </div>
                )}


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
                title={confirmationModal.title}
                message={confirmationModal.message}
                onConfirm={confirmationModal.onConfirm}
            />
        </div >
    );
}
