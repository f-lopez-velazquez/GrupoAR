import { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { collection, getDocs, query, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, functions } from "../../firebase/firebase";
import { useAuth } from "../../state/AuthContext";

const PERMISSIONS = [
    { id: "frontend", label: "Contenido Público" },
    { id: "rrhh", label: "RRHH y Nómina" },
    { id: "obras", label: "Control de Obras" },
    { id: "desempeno", label: "Evaluaciones" },
    { id: "erp", label: "ERP/POS" },
    { id: "marketing", label: "Marketing" },
    { id: "bitacora", label: "Bitácora" },
    { id: "finanzas", label: "Finanzas" },
    { id: "admin", label: "Admin Usuarios" },
    { id: "auth_tokens", label: "Tokens Seguridad" },
];

export default function Admin() {
    const { profile } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState({
        email: "",
        password: "",
        displayName: "",
        role: "Pending",
        permissions: [],
        cashWithdrawalKey: false,
    });

    const createUserFn = httpsCallable(functions, "createUserByAdmin");
    const setRoleFn = httpsCallable(functions, "setUserRoleByAdmin");
    const setPasswordFn = httpsCallable(functions, "setUserPasswordByAdmin");
    const deleteUserFn = httpsCallable(functions, "deleteUser");

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const snap = await getDocs(query(collection(db, "users"), orderBy("email")));
            setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error("Error fetching users:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm({ ...form, [name]: type === "checkbox" ? checked : value });
    };

    const handlePermissionToggle = (permId) => {
        const current = form.permissions || [];
        if (current.includes(permId)) {
            setForm({ ...form, permissions: current.filter((p) => p !== permId) });
        } else {
            setForm({ ...form, permissions: [...current, permId] });
        }
    };

    const handleCreate = async () => {
        if (!form.email || !form.password) {
            alert("Email y contraseña son requeridos");
            return;
        }
        try {
            await createUserFn({
                email: form.email,
                password: form.password,
                displayName: form.displayName,
                role: form.role,
                permissions: form.permissions,
            });
            closeModal();
            fetchUsers();
        } catch (e) {
            console.error("Error creating user:", e);
            alert(e.message || "Error al crear usuario");
        }
    };

    const handleUpdatePermissions = async () => {
        if (!editingUser) return;
        try {
            await updateDoc(doc(db, "users", editingUser.id), {
                permissions: form.permissions,
                role: form.role,
                specialKeys: { cashWithdrawal: form.cashWithdrawalKey },
                updatedAt: serverTimestamp(),
                updatedBy: profile?.email || "unknown",
            });
            await setRoleFn({ uid: editingUser.id, role: form.role });
            closeModal();
            fetchUsers();
        } catch (e) {
            console.error("Error updating user:", e);
            alert(e.message || "Error al actualizar");
        }
    };

    const handleResetPassword = async () => {
        const newPassword = prompt("Nueva contraseña:");
        if (!newPassword || !editingUser) return;
        try {
            await setPasswordFn({ uid: editingUser.id, password: newPassword });
            alert("Contraseña actualizada");
        } catch (e) {
            console.error("Error resetting password:", e);
            alert(e.message || "Error al restablecer");
        }
    };

    const handleDelete = async (user) => {
        if (!confirm(`¿Eliminar a ${user.email}? Esta acción es irreversible.`)) return;
        try {
            await deleteUserFn({ uid: user.id });
            fetchUsers();
        } catch (e) {
            console.error("Error deleting user:", e);
            alert(e.message || "Error al eliminar");
        }
    };

    const openEdit = (user) => {
        setEditingUser(user);
        setForm({
            email: user.email || "",
            password: "",
            displayName: user.displayName || "",
            role: user.role || "Pending",
            permissions: user.permissions || [],
            cashWithdrawalKey: user.specialKeys?.cashWithdrawal || false,
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingUser(null);
        setForm({ email: "", password: "", displayName: "", role: "Pending", permissions: [], cashWithdrawalKey: false });
    };

    const roleLabel = {
        Admin: "Administrador",
        Staff: "Staff",
        Obra: "Personal Obra",
        Pending: "Pendiente",
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Administración de Usuarios</h1>
                    <p className="text-sm text-slate-500">Crea usuarios, asigna roles y permisos.</p>
                </div>
                <button onClick={() => { closeModal(); setShowModal(true); }} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
                    + Nuevo Usuario
                </button>
            </div>

            {/* Users Table */}
            {loading ? (
                <div className="text-center text-slate-400">Cargando...</div>
            ) : (
                <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600">Nombre</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600">Rol</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600">Permisos</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b border-slate-100">
                                    <td className="px-4 py-3 font-medium text-slate-800">{user.email}</td>
                                    <td className="px-4 py-3 text-slate-600">{user.displayName || "-"}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${user.role === "Admin" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"}`}>
                                            {roleLabel[user.role] || user.role}
                                        </span>
                                        {user.superAdmin && <span className="ml-1 text-xs text-amber-600">⭐</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {(user.permissions || []).slice(0, 3).map((p) => (
                                                <span key={p} className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-600">{p}</span>
                                            ))}
                                            {(user.permissions || []).length > 3 && (
                                                <span className="text-xs text-slate-400">+{user.permissions.length - 3}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button onClick={() => openEdit(user)} className="text-sky-600 hover:underline">Editar</button>
                                            {!user.superAdmin && (
                                                <button onClick={() => handleDelete(user)} className="text-red-600 hover:underline">Eliminar</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-10 overflow-y-auto">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl my-8">
                        <h2 className="text-lg font-bold text-slate-800">{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</h2>
                        <div className="mt-4 space-y-4">
                            <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} disabled={!!editingUser} className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:bg-slate-100" />
                            {!editingUser && (
                                <input name="password" type="password" placeholder="Contraseña" value={form.password} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm" />
                            )}
                            <input name="displayName" placeholder="Nombre" value={form.displayName} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm" />
                            <select name="role" value={form.role} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm">
                                <option value="Pending">Pendiente</option>
                                <option value="Admin">Administrador</option>
                                <option value="Staff">Staff</option>
                                <option value="Obra">Personal Obra</option>
                            </select>

                            {/* Permissions */}
                            <div>
                                <label className="text-sm font-medium text-slate-700">Permisos:</label>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    {PERMISSIONS.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => handlePermissionToggle(p.id)}
                                            className={`rounded-lg px-3 py-2 text-xs font-medium text-left transition ${form.permissions.includes(p.id) ? "bg-sky-100 text-sky-700 border border-sky-300" : "bg-slate-50 text-slate-600 border border-slate-200"}`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Special Keys */}
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" name="cashWithdrawalKey" checked={form.cashWithdrawalKey} onChange={handleChange} />
                                Llave especial para retiros de caja
                            </label>

                            {editingUser && (
                                <button onClick={handleResetPassword} className="w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-700 hover:bg-amber-100">
                                    Restablecer Contraseña
                                </button>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={closeModal} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600">Cancelar</button>
                            <button onClick={editingUser ? handleUpdatePermissions : handleCreate} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white">
                                {editingUser ? "Guardar" : "Crear"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
