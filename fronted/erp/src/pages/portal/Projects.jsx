import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, query, where, orderBy, serverTimestamp, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../state/AuthContext";
import { useSecurity } from "../../state/SecurityContext";

import MessageModal from "../../components/MessageModal";
import ConfirmationModal from "../../components/ConfirmationModal";

export default function Projects() {
    const { profile, hasPermission } = useAuth();
    const { validateAction } = useSecurity();
    const canEdit = hasPermission('projects', 2);
    const [projects, setProjects] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    const [selectedAvailableEmployees, setSelectedAvailableEmployees] = useState([]);
    const [activeTab, setActiveTab] = useState("general");

    // Custom Modals State
    const [messageModal, setMessageModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
    const [confirmationModal, setConfirmationModal] = useState({ isOpen: false, title: "", message: "", onConfirm: () => { } });
    const [showMaterialModal, setShowMaterialModal] = useState(false); // For replacing prompt
    const [materialForm, setMaterialForm] = useState({ name: "", quantity: "", cost: "" });

    const [showPayrollModal, setShowPayrollModal] = useState(false);
    const [payrollForm, setPayrollForm] = useState({
        weekStart: "",
        weekEnd: "",
        selectedEmployees: [], // { id, name, days, dailyRate, extra, total }
        extras: [], // { name, amount, concept }
    });

    const [projectForm, setProjectForm] = useState({
        name: "",
        client: "",
        address: "",
        startDate: "",
        endDate: "",
        budget: "",
        status: "active",
        description: ""
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [projSnap, empSnap, invSnap] = await Promise.all([
                getDocs(query(collection(db, "projects"), orderBy("createdAt", "desc"))),
                getDocs(collection(db, "users")),
                getDocs(collection(db, "inventory"))
            ]);

            setProjects(projSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setEmployees(empSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setInventory(invSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const saveProject = async () => {
        if (!projectForm.name || !projectForm.client) {
            setMessageModal({ isOpen: true, title: "Campos Requeridos", message: "Nombre y cliente son obligatorios", type: "warning" });
            return;
        }

        try {
            const projectData = {
                ...projectForm,
                budget: parseFloat(projectForm.budget) || 0,
                createdAt: serverTimestamp(),
                createdBy: profile?.email,
                assignedEmployees: [],
                materials: [],
                payments: [],
                progress: 0
            };

            const docRef = await addDoc(collection(db, "projects"), projectData);
            setShowNewProjectModal(false);
            setProjectForm({
                name: "",
                client: "",
                address: "",
                startDate: "",
                endDate: "",
                budget: "",
                status: "active",
                description: ""
            });
            fetchData();
            // Auto-select the new project
            setSelectedProject({ id: docRef.id, ...projectData });
            setMessageModal({ isOpen: true, title: "Éxito", message: "Proyecto creado correctamente", type: "success" });
        } catch (e) {
            console.error(e);
            setMessageModal({ isOpen: true, title: "Error", message: "Error al crear proyecto", type: "error" });
        }
    };

    const updateProject = async (updates) => {
        if (!selectedProject) return;
        try {
            await updateDoc(doc(db, "projects", selectedProject.id), {
                ...updates,
                updatedAt: serverTimestamp()
            });
            fetchData();
            setSelectedProject({ ...selectedProject, ...updates });
        } catch (e) {
            console.error(e);
            setMessageModal({ isOpen: true, title: "Error", message: "Error al actualizar proyecto", type: "error" });
        }
    };

    const assignEmployee = async (employeeId) => {
        if (!selectedProject) return;
        const current = selectedProject.assignedEmployees || [];
        if (current.includes(employeeId)) return;

        await updateProject({
            assignedEmployees: [...current, employeeId]
        });
    };

    const batchAssignEmployees = async () => {
        if (!selectedProject || selectedAvailableEmployees.length === 0) return;
        const current = selectedProject.assignedEmployees || [];
        // Filter out duplicates (shouldn't be any but safe check)
        const newIds = selectedAvailableEmployees.filter(id => !current.includes(id));

        await updateProject({
            assignedEmployees: [...current, ...newIds]
        });
        setShowAssignmentModal(false);
        setSelectedAvailableEmployees([]);
    };

    const removeEmployee = async (employeeId) => {
        if (!selectedProject) return;
        const current = selectedProject.assignedEmployees || [];
        await updateProject({
            assignedEmployees: current.filter(id => id !== employeeId)
        });
    };

    const addMaterial = async (materialData) => {
        if (!selectedProject) return;
        const current = selectedProject.materials || [];
        await updateProject({
            materials: [...current, {
                ...materialData,
                addedAt: new Date().toISOString(),
                addedBy: profile?.email
            }]
        });
    };

    const addPayment = async (paymentData) => {
        if (!selectedProject) return;
        const current = selectedProject.payments || [];
        const totalPaid = current.reduce((sum, p) => sum + p.amount, 0) + parseFloat(paymentData.amount);

        await updateProject({
            payments: [...current, {
                ...paymentData,
                amount: parseFloat(paymentData.amount),
                date: new Date().toISOString(),
                receivedBy: profile?.email
            }],
            totalPaid
        });
    };

    const openPayrollModal = () => {
        if (!selectedProject) return;
        // Pre-fill with assigned employees
        const assigned = (selectedProject.assignedEmployees || []).map(empId => {
            const emp = employees.find(e => e.id === empId);
            return {
                id: empId,
                name: emp?.displayName || "Desconocido",
                days: 6, // Default full week
                dailyRate: emp?.dailyRate || 0, // Assuming this field exists, else 0
                extra: 0,
                isDestajo: false,
                total: 0 // calc on change
            };
        });

        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1)); // Monday
        const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6)); // Saturday

        setPayrollForm({
            weekStart: startOfWeek.toISOString().split('T')[0],
            weekEnd: endOfWeek.toISOString().split('T')[0],
            selectedEmployees: assigned,
            extras: []
        });
        setShowPayrollModal(true);
    };

    const savePayroll = async () => {
        // Calculate total
        const employeeTotal = payrollForm.selectedEmployees.reduce((sum, emp) => sum + (emp.isDestajo ? parseFloat(emp.total) : (parseFloat(emp.days) * parseFloat(emp.dailyRate) + parseFloat(emp.extra))), 0);
        const extrasTotal = payrollForm.extras.reduce((sum, ext) => sum + parseFloat(ext.amount), 0);
        const grandTotal = employeeTotal + extrasTotal;

        if (grandTotal <= 0) return alert("El monto total debe ser mayor a 0");

        const payrollData = {
            type: "payroll",
            amount: grandTotal,
            date: new Date().toISOString(),
            weekStart: payrollForm.weekStart,
            weekEnd: payrollForm.weekEnd,
            details: {
                employees: payrollForm.selectedEmployees.filter(e => e.total > 0 || e.days > 0), // Only active
                extras: payrollForm.extras
            },
            concept: `Raya Semanal (${payrollForm.weekStart} - ${payrollForm.weekEnd})`,
            method: "cash",
            createdBy: profile?.email
        };

        try {
            await addPayment(payrollData);
            setShowPayrollModal(false);
            alert("Nómina registrada correctamente");
        } catch (e) {
            console.error(e);
            alert("Error al guardar nómina");
        }
    };

    const getProjectStats = (project) => {
        const totalPaid = (project.payments || []).reduce((sum, p) => sum + p.amount, 0);
        const totalMaterials = (project.materials || []).reduce((sum, m) => sum + (m.cost || 0) * m.quantity, 0);
        const balance = project.budget - totalPaid;

        return { totalPaid, totalMaterials, balance };
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen"><div className="text-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p>Cargando proyectos...</p></div></div>;
    }

    return (
        <div className="bg-background-light min-h-screen">
            {/* Header */}
            <header className="bg-white sticky top-0 z-50 border-b border-[#dbe1e6] px-6 py-3 shadow-sm">
                <div className="max-w-[1440px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-2xl">apartment</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-[#111518]">Control de Proyectos</h1>
                            <p className="text-xs text-[#60778a] font-medium uppercase tracking-wider">Obras y Construcciones</p>
                        </div>
                    </div>
                    {canEdit && (
                        <button
                            onClick={() => setShowNewProjectModal(true)}
                            className="flex items-center h-10 px-4 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-bold"
                        >
                            <span className="material-symbols-outlined text-[18px] mr-2">add</span>
                            Nuevo Proyecto
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-[1440px] mx-auto px-6 py-6">
                {!selectedProject ? (
                    /* Projects Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map(project => {
                            const stats = getProjectStats(project);
                            const progress = project.budget > 0 ? Math.min(100, (stats.totalPaid / project.budget) * 100) : 0;

                            return (
                                <div
                                    key={project.id}
                                    onClick={() => setSelectedProject(project)}
                                    className="bg-white rounded-xl border border-[#dbe1e6] shadow-sm hover:shadow-md transition-all cursor-pointer p-6"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg text-[#111518] mb-1">{project.name}</h3>
                                            <p className="text-sm text-[#60778a]">{project.client}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${project.status === "active" ? "bg-green-100 text-green-700" :
                                            project.status === "completed" ? "bg-blue-100 text-blue-700" :
                                                "bg-gray-100 text-gray-600"
                                            }`}>
                                            {project.status === "active" ? "Activo" : project.status === "completed" ? "Completado" : "Cancelado"}
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-[#60778a]">Presupuesto</span>
                                                <span className="font-mono font-bold">${project.budget?.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-[#60778a]">Pagado</span>
                                                <span className="font-mono font-bold text-green-600">${stats.totalPaid.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[#60778a]">Saldo</span>
                                                <span className="font-mono font-bold text-blue-600">${stats.balance.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-xs mb-2">
                                                <span className="text-[#60778a]">Progreso</span>
                                                <span className="font-bold">{progress.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-primary rounded-full h-2 transition-all"
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                                            <span className="text-[#60778a]">{(project.assignedEmployees || []).length} empleados</span>
                                            <span className="text-[#60778a]">{(project.materials || []).length} materiales</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Project Details */
                    <div>
                        <button
                            onClick={() => setSelectedProject(null)}
                            className="flex items-center gap-2 text-sm font-medium text-[#60778a] hover:text-[#111518] mb-6"
                        >
                            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                            Volver a proyectos
                        </button>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Sidebar */}
                            <div className="lg:col-span-1">
                                <div className="bg-white rounded-xl border border-[#dbe1e6] p-6 sticky top-24">
                                    <h2 className="font-bold text-xl mb-2">{selectedProject.name}</h2>
                                    <p className="text-sm text-[#60778a] mb-4">{selectedProject.client}</p>

                                    <div className="space-y-3 mb-6">
                                        <div>
                                            <p className="text-xs text-[#60778a]">Presupuesto</p>
                                            <p className="font-mono font-bold text-lg">${selectedProject.budget?.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-[#60778a]">Pagado</p>
                                            <p className="font-mono font-bold text-lg text-green-600">${getProjectStats(selectedProject).totalPaid.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-[#60778a]">Saldo</p>
                                            <p className="font-mono font-bold text-lg text-blue-600">${getProjectStats(selectedProject).balance.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100">
                                        <label className="block text-sm font-medium mb-2">Estado</label>
                                        <select
                                            value={selectedProject.status}
                                            onChange={(e) => updateProject({ status: e.target.value })}
                                            className="w-full rounded-lg border-[#dbe1e6] px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500"
                                            disabled={!canEdit}
                                        >
                                            <option value="active">Activo</option>
                                            <option value="completed">Completado</option>
                                            <option value="cancelled">Cancelado</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="lg:col-span-2">
                                {/* Tabs */}
                                <div className="bg-white rounded-xl border border-[#dbe1e6] mb-6">
                                    <div className="border-b border-[#dbe1e6] px-6">
                                        <nav className="flex gap-6">
                                            {[
                                                { id: "general", label: "General", icon: "info" },
                                                { id: "employees", label: "Empleados", icon: "group" },
                                                { id: "materials", label: "Materiales", icon: "inventory_2" },
                                                { id: "payments", label: "Pagos", icon: "payments" },
                                                { id: "payroll", label: "Nómina / Raya", icon: "engineering" }
                                            ].map(tab => (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setActiveTab(tab.id)}
                                                    className={`flex items-center gap-2 py-4 border-b-2 ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-[#60778a]"
                                                        }`}
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                                                    <span className="text-sm font-bold">{tab.label}</span>
                                                </button>
                                            ))}
                                        </nav>
                                    </div>

                                    <div className="p-6">
                                        {activeTab === "general" && (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-2">Dirección</label>
                                                    <input
                                                        type="text"
                                                        className="w-full rounded-lg border-[#dbe1e6] px-4 py-2 text-sm disabled:bg-gray-50"
                                                        value={selectedProject.address || ""}
                                                        onChange={(e) => updateProject({ address: e.target.value })}
                                                        disabled={!canEdit}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium mb-2">Fecha Inicio</label>
                                                        <input
                                                            type="date"
                                                            className="w-full rounded-lg border-[#dbe1e6] px-4 py-2 text-sm disabled:bg-gray-50"
                                                            value={selectedProject.startDate || ""}
                                                            onChange={(e) => updateProject({ startDate: e.target.value })}
                                                            disabled={!canEdit}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium mb-2">Fecha Fin</label>
                                                        <input
                                                            type="date"
                                                            className="w-full rounded-lg border-[#dbe1e6] px-4 py-2 text-sm disabled:bg-gray-50"
                                                            value={selectedProject.endDate || ""}
                                                            onChange={(e) => updateProject({ endDate: e.target.value })}
                                                            disabled={!canEdit}
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium mb-2">Descripción</label>
                                                    <textarea
                                                        className="w-full rounded-lg border-[#dbe1e6] px-4 py-2 text-sm min-h-[120px] disabled:bg-gray-50"
                                                        value={selectedProject.description || ""}
                                                        onChange={(e) => updateProject({ description: e.target.value })}
                                                        disabled={!canEdit}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === "employees" && (
                                            <div>
                                                <div className="mb-4 flex justify-end">
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedAvailableEmployees([]);
                                                                setShowAssignmentModal(true);
                                                            }}
                                                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-sm"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">person_add</span>
                                                            Asignar Personal
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="space-y-2">
                                                    {(selectedProject.assignedEmployees || []).map(empId => {
                                                        const emp = employees.find(e => e.id === empId);
                                                        if (!emp) return null;

                                                        return (
                                                            <div key={empId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                                <div>
                                                                    <p className="font-medium">{emp.displayName || emp.email || emp.name}</p>
                                                                    <p className="text-xs text-[#60778a]">{emp.role || "Empleado"}</p>
                                                                </div>
                                                                {canEdit && (
                                                                    <button
                                                                        onClick={() => removeEmployee(empId)}
                                                                        className="text-red-600 hover:bg-red-50 p-2 rounded"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                    {(selectedProject.assignedEmployees || []).length === 0 && (
                                                        <p className="text-center text-gray-400 py-4">No hay empleados asignados.</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === "materials" && (
                                            <div>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => {
                                                            setMaterialForm({ name: "", quantity: "", cost: "" });
                                                            setShowMaterialModal(true);
                                                        }}
                                                        className="mb-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-sm"
                                                    >
                                                        + Agregar Material
                                                    </button>
                                                )}

                                                <div className="space-y-2">
                                                    {(selectedProject.materials || []).map((mat, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                            <div>
                                                                <p className="font-medium">{mat.name}</p>
                                                                <p className="text-xs text-[#60778a]">Cantidad: {mat.quantity} × ${mat.cost}</p>
                                                            </div>
                                                            <p className="font-mono font-bold">${(mat.quantity * mat.cost).toFixed(2)}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === "payments" && (
                                            <div>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => {
                                                            const amount = prompt("Monto del pago:");
                                                            if (!amount) return;
                                                            const concept = prompt("Concepto:");

                                                            validateAction(() => {
                                                                addPayment({
                                                                    amount,
                                                                    concept: concept || "Pago",
                                                                    method: "cash"
                                                                });
                                                            });
                                                        }}
                                                        className="mb-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold"
                                                    >
                                                        + Registrar Pago
                                                    </button>
                                                )}

                                                <div className="space-y-2">
                                                    {(selectedProject.payments || []).map((payment, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                            <div>
                                                                <p className="font-medium">{payment.concept}</p>
                                                                <p className="text-xs text-[#60778a]">{new Date(payment.date).toLocaleDateString()}</p>
                                                            </div>
                                                            <p className="font-mono font-bold text-green-600">${payment.amount.toLocaleString()}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === "payroll" && (
                                            <div>
                                                <div className="flex justify-between items-center mb-6">
                                                    <div>
                                                        <h3 className="font-bold text-lg">Nómina Semanal (Raya)</h3>
                                                        <p className="text-sm text-gray-500">Gestione el pago a empleados y destajistas por semana.</p>
                                                    </div>
                                                    {canEdit && (
                                                        <button
                                                            onClick={openPayrollModal}
                                                            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold flex items-center gap-2"
                                                        >
                                                            <span className="material-symbols-outlined">add_card</span>
                                                            Generar Raya
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="space-y-4">
                                                    {(selectedProject.payments || []).filter(p => p.type === "payroll").map((pay, idx) => (
                                                        <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div>
                                                                    <h4 className="font-bold text-[#111518]">{pay.concept}</h4>
                                                                    <p className="text-xs text-gray-500">Registrado el {new Date(pay.date).toLocaleDateString()}</p>
                                                                </div>
                                                                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-mono font-bold">
                                                                    ${pay.amount?.toLocaleString()}
                                                                </span>
                                                            </div>

                                                            {/* Mini details summary */}
                                                            <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded-lg">
                                                                <p className="font-bold mb-2">Desglose:</p>
                                                                {pay.details?.employees?.map((emp, i) => (
                                                                    <div key={i} className="flex justify-between">
                                                                        <span>• {emp.name} ({emp.isDestajo ? 'Destajo' : `${emp.days} días`})</span>
                                                                        <span className="font-mono">${emp.isDestajo ? emp.total : (emp.days * emp.dailyRate + parseFloat(emp.extra || 0))}</span>
                                                                    </div>
                                                                ))}
                                                                {pay.details?.extras?.map((ext, i) => (
                                                                    <div key={i} className="flex justify-between text-gray-500 italic">
                                                                        <span>• {ext.name} (Ext)</span>
                                                                        <span className="font-mono">${ext.amount}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {(selectedProject.payments || []).filter(p => p.type === "payroll").length === 0 && (
                                                        <div className="text-center py-10 text-gray-400">
                                                            <span className="material-symbols-outlined text-4xl mb-2">engineering</span>
                                                            <p>No hay nóminas registradas aún.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div >
                )
                }
                {/* Payroll Modal */}
                {
                    showPayrollModal && (
                        <div className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
                            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                                    <h2 className="text-xl font-bold">Generar Raya Semanal</h2>
                                    <button onClick={() => setShowPayrollModal(false)} className="material-symbols-outlined text-gray-400">close</button>
                                </div>

                                <div className="p-6 flex-1 overflow-y-auto">
                                    {/* Dates */}
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Inicio de Semana</label>
                                            <input type="date" className="w-full border rounded-lg p-2" value={payrollForm.weekStart} onChange={e => setPayrollForm({ ...payrollForm, weekStart: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Fin de Semana</label>
                                            <input type="date" className="w-full border rounded-lg p-2" value={payrollForm.weekEnd} onChange={e => setPayrollForm({ ...payrollForm, weekEnd: e.target.value })} />
                                        </div>
                                    </div>

                                    {/* Employees Grid */}
                                    <h3 className="font-bold text-sm text-gray-700 mb-3 border-b pb-1">Empleados Asignados</h3>
                                    <div className="space-y-3 mb-6">
                                        {payrollForm.selectedEmployees.map((emp, idx) => (
                                            <div key={idx} className="flex flex-wrap md:flex-nowrap gap-3 items-end p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                <div className="w-full md:w-1/4">
                                                    <p className="text-sm font-bold truncate">{emp.name}</p>
                                                    <label className="flex items-center gap-2 mt-1 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={emp.isDestajo}
                                                            onChange={(e) => {
                                                                const updated = [...payrollForm.selectedEmployees];
                                                                updated[idx].isDestajo = e.target.checked;
                                                                // Reset values logic if needed
                                                                setPayrollForm({ ...payrollForm, selectedEmployees: updated });
                                                            }}
                                                            className="rounded text-primary"
                                                        />
                                                        <span className="text-xs text-gray-500">Destajo / Suma Global</span>
                                                    </label>
                                                </div>

                                                {!emp.isDestajo ? (
                                                    <div className="w-full md:flex-1 grid grid-cols-3 md:flex md:gap-2 gap-3">
                                                        <div className="md:flex-1">
                                                            <label className="text-xs text-gray-400 block mb-1">Días</label>
                                                            <input
                                                                type="number"
                                                                className="w-full p-2 border rounded-lg text-sm bg-white"
                                                                value={emp.days}
                                                                onChange={(e) => {
                                                                    const updated = [...payrollForm.selectedEmployees];
                                                                    updated[idx].days = e.target.value;
                                                                    setPayrollForm({ ...payrollForm, selectedEmployees: updated });
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="md:flex-1">
                                                            <label className="text-xs text-gray-400 block mb-1">Diario ($)</label>
                                                            <input
                                                                type="number"
                                                                className="w-full p-2 border rounded-lg text-sm bg-white"
                                                                value={emp.dailyRate}
                                                                onChange={(e) => {
                                                                    const updated = [...payrollForm.selectedEmployees];
                                                                    updated[idx].dailyRate = e.target.value;
                                                                    setPayrollForm({ ...payrollForm, selectedEmployees: updated });
                                                                }}
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                        <div className="md:flex-1">
                                                            <label className="text-xs text-gray-400 block mb-1">Extra ($)</label>
                                                            <input
                                                                type="number"
                                                                className="w-full p-2 border rounded-lg text-sm bg-white"
                                                                value={emp.extra}
                                                                onChange={(e) => {
                                                                    const updated = [...payrollForm.selectedEmployees];
                                                                    updated[idx].extra = e.target.value;
                                                                    setPayrollForm({ ...payrollForm, selectedEmployees: updated });
                                                                }}
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex-[3]">
                                                        <label className="text-xs text-gray-400 block mb-1">Monto Total a Pagar</label>
                                                        <input
                                                            type="number"
                                                            className="w-full p-1 border rounded text-sm font-bold text-green-700"
                                                            value={emp.total}
                                                            onChange={(e) => {
                                                                const updated = [...payrollForm.selectedEmployees];
                                                                updated[idx].total = e.target.value;
                                                                setPayrollForm({ ...payrollForm, selectedEmployees: updated });
                                                            }}
                                                            placeholder="Ej. 2500"
                                                        />
                                                    </div>
                                                )}

                                                <div className="w-24 text-right">
                                                    <p className="text-xs text-gray-400">Total</p>
                                                    <p className="font-bold text-green-700">
                                                        ${emp.isDestajo
                                                            ? parseFloat(emp.total || 0).toLocaleString()
                                                            : (parseFloat(emp.days || 0) * parseFloat(emp.dailyRate || 0) + parseFloat(emp.extra || 0)).toLocaleString()
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {payrollForm.selectedEmployees.length === 0 && <p className="text-sm text-gray-400 italic">No hay empleados asignados a este proyecto.</p>}
                                    </div>

                                    {/* Extras / Outsourcing */}
                                    <div className="flex justify-between items-center mb-2 mt-6 border-b pb-1">
                                        <h3 className="font-bold text-sm text-gray-700">Externos / Destajistas Extra</h3>
                                        <button
                                            onClick={() => setPayrollForm({ ...payrollForm, extras: [...payrollForm.extras, { name: "", amount: "", concept: "" }] })}
                                            className="text-xs text-primary font-bold hover:underline"
                                        >
                                            + Agregar Externo
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {payrollForm.extras.map((ext, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <input
                                                    placeholder="Nombre"
                                                    className="flex-1 border rounded p-2 text-sm"
                                                    value={ext.name}
                                                    onChange={e => {
                                                        const updated = [...payrollForm.extras];
                                                        updated[idx].name = e.target.value;
                                                        setPayrollForm({ ...payrollForm, extras: updated });
                                                    }}
                                                />
                                                <input
                                                    placeholder="Concepto/Trabajo"
                                                    className="flex-1 border rounded p-2 text-sm"
                                                    value={ext.concept}
                                                    onChange={e => {
                                                        const updated = [...payrollForm.extras];
                                                        updated[idx].concept = e.target.value;
                                                        setPayrollForm({ ...payrollForm, extras: updated });
                                                    }}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Monto ($)"
                                                    className="w-24 border rounded p-2 text-sm font-bold"
                                                    value={ext.amount}
                                                    onChange={e => {
                                                        const updated = [...payrollForm.extras];
                                                        updated[idx].amount = e.target.value;
                                                        setPayrollForm({ ...payrollForm, extras: updated });
                                                    }}
                                                />
                                                <button
                                                    onClick={() => setPayrollForm({ ...payrollForm, extras: payrollForm.extras.filter((_, i) => i !== idx) })}
                                                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-between items-center sticky bottom-0">
                                    <div>
                                        <p className="text-sm text-gray-500">Total de Nómina</p>
                                        <p className="text-2xl font-bold text-green-700 font-mono">
                                            ${(
                                                payrollForm.selectedEmployees.reduce((sum, emp) => sum + (emp.isDestajo ? parseFloat(emp.total || 0) : (parseFloat(emp.days || 0) * parseFloat(emp.dailyRate || 0) + parseFloat(emp.extra || 0))), 0) +
                                                payrollForm.extras.reduce((sum, ext) => sum + parseFloat(ext.amount || 0), 0)
                                            ).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setShowPayrollModal(false)} className="px-4 py-2 text-gray-600 font-medium">Cancelar</button>
                                        <button onClick={() => validateAction(savePayroll)} className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-lg hover:shadow-xl hover:translate-y-[-1px] transition-all">
                                            Guardar y Pagar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

            </main >

            {/* New Project Modal */}
            {
                showNewProjectModal && (
                    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
                            <div className="p-6">
                                <h2 className="text-xl font-bold mb-6">Nuevo Proyecto</h2>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Nombre del Proyecto *</label>
                                            <input
                                                type="text"
                                                className="w-full rounded-lg border-[#dbe1e6] px-4 py-2 text-sm"
                                                value={projectForm.name}
                                                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Cliente *</label>
                                            <input
                                                type="text"
                                                className="w-full rounded-lg border-[#dbe1e6] px-4 py-2 text-sm"
                                                value={projectForm.client}
                                                onChange={(e) => setProjectForm({ ...projectForm, client: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Dirección</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border-[#dbe1e6] px-4 py-2 text-sm"
                                            value={projectForm.address}
                                            onChange={(e) => setProjectForm({ ...projectForm, address: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Fecha Inicio</label>
                                            <input
                                                type="date"
                                                className="w-full rounded-lg border-[#dbe1e6] px-4 py-2 text-sm"
                                                value={projectForm.startDate}
                                                onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Fecha Fin</label>
                                            <input
                                                type="date"
                                                className="w-full rounded-lg border-[#dbe1e6] px-4 py-2 text-sm"
                                                value={projectForm.endDate}
                                                onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Estado Inicial</label>
                                            <select
                                                className="w-full rounded-lg border-[#dbe1e6] px-4 py-2 text-sm"
                                                value={projectForm.status}
                                                onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                                            >
                                                <option value="active">Activo (En curso)</option>
                                                <option value="completed">Histórico (Completado)</option>
                                                <option value="cancelled">Cancelado</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Presupuesto</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="w-full rounded-lg border-[#dbe1e6] px-4 py-2 text-sm"
                                                value={projectForm.budget}
                                                onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Descripción</label>
                                        <textarea
                                            className="w-full rounded-lg border-[#dbe1e6] px-4 py-2 text-sm min-h-[100px]"
                                            value={projectForm.description}
                                            onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setShowNewProjectModal(false)}
                                        className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={saveProject}
                                        className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark"
                                    >
                                        Crear Proyecto
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Assignment Modal */}
            {
                showAssignmentModal && (
                    <div className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center z-10 sticky top-0 bg-white">
                                <h2 className="text-xl font-bold">Asignar Personal</h2>
                                <button onClick={() => setShowAssignmentModal(false)} className="material-symbols-outlined text-gray-400 hover:text-gray-600">close</button>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto">
                                <p className="text-sm text-gray-500 mb-4">Seleccione los empleados para asignar a <strong>{selectedProject?.name}</strong>.</p>
                                <div className="space-y-2">
                                    {employees
                                        .filter(e => !(selectedProject?.assignedEmployees || []).includes(e.id))
                                        .map(emp => (
                                            <label key={emp.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-primary cursor-pointer transition-all">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded text-primary"
                                                    checked={selectedAvailableEmployees.includes(emp.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedAvailableEmployees([...selectedAvailableEmployees, emp.id]);
                                                        else setSelectedAvailableEmployees(selectedAvailableEmployees.filter(id => id !== emp.id));
                                                    }}
                                                />
                                                <div className="flex-1">
                                                    <p className="font-bold text-sm">{emp.displayName || emp.name || emp.email}</p>
                                                    <p className="text-xs text-gray-500">{emp.role || "Operario"}</p>
                                                </div>
                                            </label>
                                        ))
                                    }
                                    {employees.filter(e => !(selectedProject?.assignedEmployees || []).includes(e.id)).length === 0 && (
                                        <p className="text-center text-gray-400 py-4">No hay empleados disponibles para asignar.</p>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white z-10 rounded-b-2xl">
                                <button onClick={() => setShowAssignmentModal(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
                                <button
                                    onClick={batchAssignEmployees}
                                    disabled={selectedAvailableEmployees.length === 0}
                                    className="px-6 py-2 bg-primary disabled:bg-gray-300 text-white rounded-lg font-bold shadow-lg hover:shadow-xl hover:translate-y-[-1px] transition-all"
                                >
                                    Asignar ({selectedAvailableEmployees.length})
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

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

            {/* Material Modal */}
            {showMaterialModal && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-fade-in">
                        <h3 className="text-xl font-bold mb-4">Agregar Material</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre *</label>
                                <input
                                    className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2"
                                    value={materialForm.name}
                                    onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
                                    placeholder="Ej. Cemento"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Cantidad *</label>
                                    <input
                                        type="number"
                                        className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2"
                                        value={materialForm.quantity}
                                        onChange={(e) => setMaterialForm({ ...materialForm, quantity: e.target.value })}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Costo Unit.</label>
                                    <input
                                        type="number"
                                        className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2"
                                        value={materialForm.cost}
                                        onChange={(e) => setMaterialForm({ ...materialForm, cost: e.target.value })}
                                        placeholder="$0.00"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowMaterialModal(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
                            <button
                                onClick={() => {
                                    if (!materialForm.name || !materialForm.quantity) return;
                                    addMaterial({
                                        name: materialForm.name,
                                        quantity: parseFloat(materialForm.quantity),
                                        cost: parseFloat(materialForm.cost || 0)
                                    });
                                    setShowMaterialModal(false);
                                }}
                                className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
