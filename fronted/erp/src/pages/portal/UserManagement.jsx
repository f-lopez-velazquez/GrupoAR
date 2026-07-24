import { useState, useEffect } from "react";
import { db, auth, functions } from "../../firebase/firebase";
import { httpsCallable } from "firebase/functions";
import { query, orderBy, where, getDocs, collection, doc, updateDoc, addDoc, onSnapshot, serverTimestamp, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { EmployeeBadge } from "../../components/EmployeeBadge";
import { uploadToCloudinary } from "../../services/uploadService";
import { useAuth } from "../../state/AuthContext";
import * as htmlToImage from 'html-to-image';
import { useRef } from "react";
import { Roles } from "../../utils/roles";

const PERMISSION_LEVELS = {
    NONE: 0,
    VIEW: 1,
    EDIT: 2
};

const allPermissions = [
    { id: "pos", label: "Terminal POS", icon: "storefront" },
    { id: "inventory", label: "Inventario", icon: "inventory" },
    { id: "hr", label: "Personal", icon: "groups" },
    { id: "projects", label: "Proyectos", icon: "construction" },
    { id: "finance", label: "Finanzas", icon: "account_balance" },
    { id: "marketing", label: "Marketing", icon: "campaign" },
    { id: "warehouse", label: "Almacén", icon: "warehouse" },
    { id: "evaluations", label: "Evaluaciones", icon: "assessment" },
    { id: "frontend", label: "Frontend/CMS", icon: "web" },
    { id: "users", label: "Usuarios", icon: "manage_accounts" },
    { id: "cashier", label: "Caja", icon: "point_of_sale" },
    { id: "cash_withdrawal", label: "Retiro de Efectivo", icon: "money_off" }
];

export default function UserManagement() {
    const { profile, role, loading: authLoading } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [search, setSearch] = useState("");

    const isSuperAdmin =
        profile?.role === 'SUPERADMIN' ||
        profile?.username === 'paco-gpoGR' ||
        profile?.superAdmin === true ||
        role === Roles.ADMIN;

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isSuperAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-10">
                <span className="material-symbols-outlined text-red-500 text-6xl mb-4">gpp_maybe</span>
                <h1 className="text-2xl font-black text-slate-800">Acceso Restringido</h1>
                <p className="text-gray-500 mt-2">Solo SuperAdministradores pueden gestionar usuarios y permisos.</p>
            </div>
        );
    }

    const [form, setForm] = useState({
        email: "", password: "", displayName: "", role: "Staff", username: "",
        permissions: {}, phone: "", cashWithdrawalKey: ""
    });
    const [showPassword, setShowPassword] = useState(false);

    const roles = ["Admin", "Staff", "Obra", "Pending"];

    const [showDeleted, setShowDeleted] = useState(false);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        try {
            const snap = await getDocs(query(collection(db, "users"), orderBy("displayName")));
            // Filter deleted users unless showDeleted is true
            const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setUsers(allUsers);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const filtered = users.filter(u => {
        // Hide deleted users by default
        if (u.role === "Deleted" && !showDeleted) return false;

        return u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase()) ||
            u.username?.toLowerCase().includes(search.toLowerCase());
    });

    const openNew = () => {
        setSelectedUser(null);
        setForm({ email: "", password: "", displayName: "", role: "Staff", username: "", permissions: {}, phone: "", cashWithdrawalKey: "" });
        setShowModal(true);
    };

    const importDoc = async (path) => {
        const { getDoc, doc } = await import("firebase/firestore");
        return getDoc(doc(db, ...path));
    };

    const openEdit = async (u) => {
        setSelectedUser(u);
        let recoveredPassword = "";

        try {
            // Try to fetch secure data
            const secureSnap = await importDoc(["users", u.id, "secure_data", "info"]);
            if (secureSnap.exists()) {
                recoveredPassword = secureSnap.data().password || "";
            }
        } catch (e) { console.log("No secure data access"); }

        setForm({
            email: u.email || "",
            password: recoveredPassword, // Mostrar contraseña recuperada
            displayName: u.displayName || "",
            role: u.role || "Staff",
            username: u.username || "",
            permissions: u.permissions || {},
            phone: u.phone || "",
            cashWithdrawalKey: u.specialKeys?.cashWithdrawal || ""
        });
        setShowModal(true);
    };

    const setPermissionLevel = (permId, level) => {
        const current = form.permissions || {};
        setForm({
            ...form,
            permissions: {
                ...current,
                [permId]: level
            }
        });
    };

    // Import needed for secondary app
    const saveUser = async () => {
        let finalEmail = form.email;
        if (!finalEmail && form.username) {
            const cleanUser = form.username.replace('@', '').trim();
            finalEmail = `${cleanUser}@gpo-ar.internal`;
        }

        if (!finalEmail || !form.displayName) return alert("Nombre completo y Usuario (o Email) son obligatorios");

        setProcessing(true);

        try {
            if (selectedUser) {
                // Update existing user (Direct Firestore update)
                // Admin has full write access now via rules
                await updateDoc(doc(db, "users", selectedUser.id), {
                    displayName: form.displayName,
                    username: form.username,
                    phone: form.phone,
                    role: form.role,
                    permissions: form.permissions,
                    specialKeys: form.cashWithdrawalKey ? { cashWithdrawal: form.cashWithdrawalKey } : {},
                    // Internal flags
                    superAdmin: form.role === "Admin"
                });

                // Securely store credentials if password is provided or edited
                if (form.password) {
                    await setDoc(doc(db, "users", selectedUser.id, "secure_data", "info"), {
                        password: form.password,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                }

                // Also update Auth Claims if we could (we can't from client)
                // But the app uses the DB profile as source of truth for roles anyway.

                setProcessing(false);
                setShowModal(false);
                fetchUsers();
            } else {
                // Create new user (Client-Side with Secondary App)
                if (!form.password) {
                    setProcessing(false);
                    return alert("La contraseña es obligatoria");
                }

                // 1. Initialize secondary app to avoid logging out admin
                const { initializeApp, getApp, deleteApp } = await import("firebase/app");
                const { getAuth, createUserWithEmailAndPassword, signOut } = await import("firebase/auth");

                const firebaseConfig = {
                    apiKey: "AIzaSyCSmb_4bBzLTovhm-aKXYkjgT_oRFum_pA",
                    authDomain: "gpo-ar.firebaseapp.com",
                    projectId: "gpo-ar",
                    storageBucket: "gpo-ar.firebasestorage.app",
                    messagingSenderId: "826066778675",
                    appId: "1:826066778675:web:9413dcaca733d45db04146"
                };

                const secondaryAppName = "secondaryApp";
                let secondaryApp;
                try {
                    secondaryApp = getApp(secondaryAppName);
                } catch (e) {
                    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
                }

                const secondaryAuth = getAuth(secondaryApp);

                // 2. Create the user
                const userCred = await createUserWithEmailAndPassword(secondaryAuth, finalEmail, form.password);
                const newUser = userCred.user;

                // 3. Create profile in Firestore (Admin has permission)
                await setDoc(doc(db, "users", newUser.uid), {
                    email: finalEmail,
                    displayName: form.displayName,
                    role: form.role,
                    username: form.username,
                    permissions: form.permissions || {},
                    phone: form.phone || "",
                    specialKeys: form.cashWithdrawalKey ? { cashWithdrawal: form.cashWithdrawalKey } : {},
                    createdAt: serverTimestamp(),
                    superAdmin: form.role === "Admin"
                });

                // 3.5. Securely store password
                await setDoc(doc(db, "users", newUser.uid, "secure_data", "info"), {
                    password: form.password,
                    createdAt: serverTimestamp()
                });

                // 4. Cleanup
                await signOut(secondaryAuth);
                await deleteApp(secondaryApp);

                setProcessing(false);
                setShowModal(false);
                fetchUsers();
            }
        } catch (e) {
            console.error(e);
            setProcessing(false);
            if (e.code === 'auth/email-already-in-use') {
                alert("El usuario/email ya existe");
            } else {
                alert("Error: " + e.message);
            }
        }
    };

    const deleteUser = async (uid, username) => {
        if (username === "paco-gpoGR") {
            alert("Acción denegada: No se puede eliminar al Superadmin.");
            return;
        }
        if (!confirm("¿Desactivar este usuario? El usuario perderá el acceso inmediatamente.")) return;
        try {
            // Soft Delete: Mark as Deleted instead of calling Cloud Function
            await updateDoc(doc(db, "users", uid), {
                role: "Deleted",
                permissions: {},
                disabledAt: serverTimestamp()
            });
            alert("Usuario desactivado correctamente.");
            fetchUsers();
        } catch (e) {
            console.error(e);
            alert("Error al eliminar: " + e.message);
        }
    };

    const badgeRef = useRef(null);
    const [badgeUser, setBadgeUser] = useState(null);

    const downloadBadge = async (user) => {
        setBadgeUser(user);
        // Wait for render
        setTimeout(async () => {
            if (badgeRef.current) {
                try {
                    const dataUrl = await htmlToImage.toPng(badgeRef.current, { quality: 1.0, pixelRatio: 2 });
                    const link = document.createElement('a');
                    link.download = `Gafete-AR-${user.displayName.replace(/\s+/g, '_')}.png`;
                    link.href = dataUrl;
                    link.click();
                } catch (e) {
                    console.error("Error generating badge", e);
                    alert("No se pudo generar el gafete");
                }
                setBadgeUser(null);
            }
        }, 500);
    };

    const handleNuclearReset = async () => {
        const confirm1 = confirm("⚠️ ATENCIÓN: Estás a punto de borrar TODA la información del sistema (Ventas, Gastos, Inventario, Personal).\n\n¿Estás seguro de que quieres limpiar todo para PRODUCCIÓN?");
        if (!confirm1) return;

        const confirm2 = confirm("ESTA ACCIÓN NO SE PUEDE DESHACER.\n\nSe conservarán únicamente las cuentas de Administrador. ¿Confirmas la limpieza nuclear?");
        if (!confirm2) return;

        setProcessing(true);
        try {
            const collectionsToClear = [
                "sales", "cancellationLogs", "tickets", "sales_public",
                "expenses", "accounts", "cashRegisters",
                "projects", "employees", "evaluations", "evaluationRequests",
                "inventory", "inventoryLogs", "inventoryImports",
                "warehouseLoans", "quotes",
                "secureActions", "securityLogs", "authCodes",
                "attendance", "incidents", "materialUsage", "performance_reports",
                "marketing", "services", "settings_pos"
            ];

            let totalDeleted = 0;

            for (const colName of collectionsToClear) {
                const snap = await getDocs(collection(db, colName));
                const docs = snap.docs;
                while (docs.length > 0) {
                    const batch = writeBatch(db);
                    const chunk = docs.splice(0, 400);
                    chunk.forEach(d => batch.delete(d.ref));
                    await batch.commit();
                    totalDeleted += chunk.length;
                }
            }

            // Prune users (Delete non-admins)
            const userSnap = await getDocs(collection(db, "users"));
            const usersToDelete = userSnap.docs.filter(uDoc => {
                const uData = uDoc.data();
                const isAdmin = uData.role === "Admin" || uData.role === "SUPERADMIN" || uData.username === 'paco-gpoGR' || uData.username === 'paco-gpoAR';
                return !isAdmin;
            });

            while (usersToDelete.length > 0) {
                const batch = writeBatch(db);
                const chunk = usersToDelete.splice(0, 400);
                chunk.forEach(d => batch.delete(d.ref));
                await batch.commit();
                totalDeleted += chunk.length;
            }

            alert(`¡LIMPIEZA COMPLETADA! Se han eliminado ${totalDeleted} registros. El sistema está listo para producción.`);
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert("Error durante la limpieza: " + e.message);
        } finally {
            setProcessing(false);
        }
    };

    const getRoleStyle = (role) => {
        const styles = {
            Admin: "bg-red-100 text-red-700",
            Staff: "bg-blue-100 text-blue-700",
            Obra: "bg-yellow-100 text-yellow-700",
            Pending: "bg-gray-100 text-gray-600",
            Deleted: "bg-gray-800 text-white"
        };
        return styles[role] || styles.Pending;
    };

    return (
        <div className="bg-background-light min-h-screen font-display text-[#111518]">
            {/* Header */}
            <header className="bg-white border-b border-[#e5e7eb] sticky top-0 z-50">
                <div className="px-4 md:px-10 flex items-center justify-between py-3 max-w-[1440px] mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <div className="size-8 flex items-center justify-center text-primary bg-primary/10 rounded-lg">
                            <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
                        </div>
                        <h2 className="text-lg font-bold">Administración de Usuarios</h2>
                    </div>
                    <button onClick={openNew} className="flex items-center h-10 px-4 rounded-lg bg-primary hover:bg-blue-700 text-white text-sm font-bold">
                        <span className="material-symbols-outlined mr-2 text-[18px]">person_add</span>
                        Nuevo Usuario
                    </button>
                </div>
            </header>

            <main className="max-w-[1440px] mx-auto px-4 md:px-10 py-6">
                {/* Search */}
                <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-2/3">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#60778a]">search</span>
                        <input
                            className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#dbe1e6] bg-white text-sm"
                            placeholder="Buscar por nombre, email o usuario..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={showDeleted}
                            onChange={(e) => setShowDeleted(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        Ver Usuarios Desactivados
                    </label>
                </div>

                {/* Users Grid */}
                {loading ? (
                    <div className="text-center py-12 text-gray-400">Cargando...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map((u) => (
                            <div key={u.id} className={`bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-5 hover:shadow-md transition-all ${u.role === 'Deleted' ? 'opacity-75 grayscale bg-gray-50' : ''}`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                            {u.displayName?.charAt(0) || "?"}
                                        </div>
                                        <div>
                                            <h3 className="font-bold">{u.displayName}</h3>
                                            <p className="text-xs text-gray-500">{u.email}</p>
                                            {u.username && <p className="text-xs text-primary">@{u.username}</p>}
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${getRoleStyle(u.role)}`}>{u.role}</span>
                                </div>

                                {/* Permissions */}
                                <div className="mb-4">
                                    <p className="text-xs text-gray-500 mb-2">Resumen de Permisos:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {u.role === "Admin" ? (
                                            <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded">Acceso Total</span>
                                        ) : !u.permissions || Object.keys(u.permissions).length === 0 ? (
                                            <span className="text-xs text-gray-400">Sin permisos</span>
                                        ) : Object.entries(u.permissions).map(([p, level]) => {
                                            if (level === 0) return null;
                                            const perm = allPermissions.find(x => x.id === p);
                                            return (
                                                <span key={p} className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-bold ${level === 2 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    <span className="material-symbols-outlined text-[10px]">{perm?.icon || 'check'}</span>
                                                    {perm?.label || p} ({level === 2 ? 'EDIT' : 'VIEW'})
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-4 border-t border-gray-100">
                                    <button onClick={() => openEdit(u)} className="flex-1 py-2 text-sm font-medium text-primary hover:bg-blue-50 rounded-lg">
                                        {u.role === 'Deleted' ? 'Restaurar / Ver' : 'Editar'}
                                    </button>
                                    {u.role !== 'Deleted' && (
                                        <button onClick={() => deleteUser(u.id, u.username)} className={`flex-1 py-2 text-sm font-medium rounded-lg ${u.username === 'paco-gpoGR' ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'}`} disabled={u.username === 'paco-gpoGR'}>
                                            Desactivar
                                        </button>
                                    )}
                                </div>
                                <button onClick={() => downloadBadge(u)} className="w-full mt-2 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg flex items-center justify-center gap-1 border border-transparent hover:border-slate-200 transition-all">
                                    <span className="material-symbols-outlined text-[16px]">badge</span>
                                    Descargar Gafete Oficial
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Nuclear Reset - Danger Zone */}
                <div className="mt-12 pt-8 border-t-2 border-red-100 mb-10">
                    <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                                <span className="material-symbols-outlined text-3xl">emergency_home</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-red-900 uppercase tracking-tight">Zona de Peligro: Mantenimiento Crítico</h3>
                                <p className="text-sm text-red-700 font-medium">Estas acciones son irreversibles y solo para preparación de lanzamiento.</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-5 border border-red-100 shadow-sm">
                            <h4 className="font-extrabold text-red-800 text-sm mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">cleaning_services</span>
                                Resetear Todo para Producción
                            </h4>
                            <p className="text-xs text-gray-500 leading-relaxed mb-5">
                                Se eliminarán de forma permanente e irrecuperable: Todas las ventas, gastos, abonos, cotizaciones,
                                <strong className="text-red-600"> inventario completo</strong>, obras, personal (empleados), evaluaciones y logs de seguridad.
                                <strong className="text-red-700"> Se conservarán únicamente las cuentas de Administrador para mantener el acceso al sistema.</strong>
                                <br /><br />
                                <span className="text-blue-600 font-bold italic">💡 Nota: Si aún ves datos después del reset, presiona Ctrl+F5 o limpia la caché de tu navegador.</span>
                            </p>
                            <button
                                onClick={handleNuclearReset}
                                disabled={processing}
                                className={`w-full py-4 ${processing ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'} text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-200 uppercase tracking-wider`}
                            >
                                <span className="material-symbols-outlined">delete_forever</span>
                                {processing ? "PROCESANDO LIMPIEZA NUCLEAR..." : "EJECUTAR RESET TOTAL (PRODUCCIÓN)"}
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* User Form Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold">{selectedUser ? "Editar Usuario" : "Nuevo Usuario"}</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Email (Opcional si usas Usuario)</label>
                                <input
                                    type="email"
                                    className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2 bg-gray-50/50"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    disabled={!!selectedUser}
                                    placeholder="ejemplo@correo.com"
                                />
                            </div>
                            <div className="relative">
                                <label className="block text-sm font-medium mb-1">Contraseña {selectedUser ? "(Visible para Admins)" : "*"}</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2 pr-10"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        placeholder={selectedUser ? "•••••••• (Sin cambios)" : "Ingresa una contraseña"}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            {showPassword ? "visibility_off" : "visibility"}
                                        </span>
                                    </button>
                                </div>
                                {selectedUser && form.password && (
                                    <p className="text-xs text-orange-500 mt-1">⚠️ Estás cambiando o viendo la contraseña de este usuario.</p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Nombre Completo *</label>
                                    <input className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Usuario</label>
                                    <input className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="@usuario" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Rol</label>
                                    <select className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                                        {form.role === "Deleted" && <option value="Deleted">Desactivado (Selecciona otro para restaurar)</option>}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Teléfono</label>
                                    <input className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                                </div>
                            </div>

                            {/* Permissions Matrix */}
                            <div className="space-y-3">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Matriz de Permisos Granulares</label>
                                {form.role === "Admin" ? (
                                    <div className="bg-red-50 p-4 rounded-2xl border-2 border-red-100 flex items-center gap-3">
                                        <span className="material-symbols-outlined text-red-600">security_update_good</span>
                                        <p className="text-xs text-red-800 font-bold leading-tight">
                                            Los administradores tienen acceso EDIT GLOBAL por defecto.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {allPermissions.map(p => {
                                            const currentLevel = form.permissions[p.id] || PERMISSION_LEVELS.NONE;
                                            return (
                                                <div key={p.id} className="bg-white border border-[#dbe1e6] p-3 rounded-xl shadow-sm hover:shadow-md transition-all group">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${currentLevel > 0 ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'} transition-colors`}>
                                                            <span className="material-symbols-outlined text-[18px]">{p.icon}</span>
                                                        </div>
                                                        <span className={`font-bold text-sm ${currentLevel > 0 ? 'text-gray-800' : 'text-gray-400'}`}>{p.label}</span>
                                                    </div>

                                                    <div className="flex bg-gray-100 rounded-lg p-1 relative">
                                                        {/* Segmented Control */}
                                                        {[
                                                            { value: PERMISSION_LEVELS.NONE, label: "Ninguno", icon: "block" },
                                                            { value: PERMISSION_LEVELS.VIEW, label: "Ver", icon: "visibility" },
                                                            { value: PERMISSION_LEVELS.EDIT, label: "Editar", icon: "edit" }
                                                        ].map((option) => (
                                                            <button
                                                                key={option.value}
                                                                onClick={() => setPermissionLevel(p.id, option.value)}
                                                                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${currentLevel === option.value
                                                                    ? 'bg-white text-gray-800 shadow-sm'
                                                                    : 'text-gray-400 hover:text-gray-600'
                                                                    }`}
                                                            >
                                                                {currentLevel === option.value && <span className="material-symbols-outlined text-[12px]">{option.icon}</span>}
                                                                {option.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Special Keys */}
                            {form.permissions?.cash_withdrawal > 0 && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Llave de Retiro de Efectivo</label>
                                    <input
                                        type="password"
                                        className="w-full rounded-lg border border-[#dbe1e6] px-3 py-2"
                                        value={form.cashWithdrawalKey}
                                        onChange={(e) => setForm({ ...form, cashWithdrawalKey: e.target.value })}
                                        placeholder="Clave secreta para aprobar retiros"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600">Cancelar</button>
                            <button onClick={saveUser} className="px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm">Guardar</button>
                        </div>
                    </div>
                </div>
            )
            }
            {/* Hidden Badge Rendering Area */}
            {
                badgeUser && (
                    <div className="fixed top-0 left-0 z-[-1] opacity-0 pointer-events-none">
                        <EmployeeBadge user={badgeUser} elementRef={badgeRef} />
                    </div>
                )
            }
        </div >
    );
}
