import { useEffect, useMemo, useState } from "react";
import { listenUsers, setUserRole } from "../services/users";
import { RoleLabels, Roles } from "../utils/roles";
import { BadgeGenerator } from "../components/BadgeGenerator";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selectedForBadge, setSelectedForBadge] = useState(null);

  useEffect(() => {
    const unsub = listenUsers(setUsers);
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return users;
    const term = search.toLowerCase();
    return users.filter(
      (user) =>
        user.email?.toLowerCase().includes(term) ||
        user.displayName?.toLowerCase().includes(term) ||
        user.uid?.toLowerCase().includes(term)
    );
  }, [users, search]);

  const handleRoleChange = async (uid, role) => {
    setStatus("");
    try {
      await setUserRole(uid, role);
      setStatus("Rol actualizado.");
    } catch (error) {
      setStatus(error.message || "No se pudo actualizar el rol.");
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black">Gestión de usuarios</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Administra accesos y roles del ERP.
          </p>
        </div>

        <div className="bg-white dark:bg-[#1a1a2e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="relative max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              className="w-full pl-10 pr-3 h-11 rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Buscar por nombre, correo o UID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1a2e] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500">Usuario</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500">UID</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500">Rol</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((user) => (
                  <tr key={user.uid || user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-semibold">
                          {user.displayName || user.email || "Usuario"}
                        </span>
                        <span className="text-xs text-slate-500">{user.email || ""}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs font-mono text-slate-500">
                      {user.uid || user.id}
                    </td>
                    <td className="py-4 px-6">
                      <select
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 h-10 px-3"
                        value={user.role || Roles.PENDING}
                        onChange={(e) => handleRoleChange(user.uid || user.id, e.target.value)}
                      >
                        {Object.values(Roles).map((value) => (
                          <option key={value} value={value}>
                            {RoleLabels[value] || value}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-4 px-6 text-right text-xs">
                      <button
                        onClick={() => setSelectedForBadge(user)}
                        className="mr-3 text-secondary hover:underline"
                      >
                        Gafete
                      </button>
                      <span className="text-slate-500">{user.role === Roles.PENDING ? "Pendiente" : "Activo"}</span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td className="py-6 px-6 text-slate-500" colSpan="4">
                      Sin usuarios.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {status && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 px-4 py-3 text-sm">
            {status}
          </div>
        )}

        {selectedForBadge && (
          <BadgeGenerator
            user={selectedForBadge}
            onClose={() => setSelectedForBadge(null)}
          />
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
