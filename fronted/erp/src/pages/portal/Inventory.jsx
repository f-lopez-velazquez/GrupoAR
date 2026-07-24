import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, writeBatch, where } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../state/AuthContext";
import { useSecurity } from "../../state/SecurityContext";
import { showAlert, showConfirm, showPrompt } from "../../components/Modal";
import { toPng } from "html-to-image";

export default function Inventory() {
    const { profile, hasPermission } = useAuth();
    const canEdit = hasPermission('inventory', 2);
    const { validateAction } = useSecurity();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [jsonInput, setJsonInput] = useState("");

    const [form, setForm] = useState({
        name: "", sku: "", category: "", price: 0, cost: 0, stock: 0,
        minStock: 5, imageUrl: "", description: "", publicVisible: false, featured: false
    });

    useEffect(() => { fetchProducts(); }, []);

    // Scroll automático al top cuando se abre modal
    useEffect(() => {
        if (showModal || showImportModal) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [showModal, showImportModal]);

    const fetchProducts = async () => {
        try {
            const snap = await getDocs(query(collection(db, "inventory"), orderBy("name")));
            const prods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setProducts(prods);

            const cats = [...new Set(prods.map(p => p.category).filter(Boolean))];
            setCategories(cats);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const filtered = products.filter(p => {
        const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.includes(search);
        const matchCat = !categoryFilter || p.category === categoryFilter;
        return matchSearch && matchCat;
    });

    const stats = {
        total: products.length,
        lowStock: products.filter(p => (p.stock || 0) < (p.minStock || 5)).length,
        totalValue: products.reduce((sum, p) => sum + ((p.cost || 0) * (p.stock || 0)), 0),
        outOfStock: products.filter(p => (p.stock || 0) === 0).length
    };

    const openNew = () => {
        setSelectedProduct(null);
        setForm({ name: "", sku: "", category: "", price: 0, cost: 0, stock: 0, minStock: 5, imageUrl: "", description: "", publicVisible: false, featured: false });
        setShowModal(true);
    };

    const openEdit = (p) => {
        setSelectedProduct(p);
        setForm({ ...p });
        setShowModal(true);
    };

    const saveProduct = async () => {
        if (!form.name) return showAlert("El nombre es obligatorio", "error");
        try {
            const data = {
                ...form,
                updatedAt: serverTimestamp(),
                updatedBy: profile?.email || "system"
            };

            if (selectedProduct) {
                await updateDoc(doc(db, "inventory", selectedProduct.id), data);
            } else {
                await addDoc(collection(db, "inventory"), { ...data, createdAt: serverTimestamp() });
            }
            setShowModal(false);
            fetchProducts();
        } catch (e) { console.error(e); showAlert("Error al guardar", "error"); }
    };

    const deleteProduct = async (id) => {
        const confirmed = await showConfirm("¿Eliminar este producto?");
        if (!confirmed) return;
        await deleteDoc(doc(db, "inventory", id));
        fetchProducts();
    };

    const adjustStock = async (productId, delta) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const newStock = Math.max(0, (product.stock || 0) + delta);
        await updateDoc(doc(db, "inventory", productId), {
            stock: newStock,
            updatedAt: serverTimestamp()
        });

        // Log the adjustment
        await addDoc(collection(db, "inventoryLogs"), {
            productId,
            productName: product.name,
            action: delta > 0 ? "stock_add" : "stock_remove",
            quantity: Math.abs(delta),
            previousStock: product.stock || 0,
            newStock,
            timestamp: serverTimestamp(),
            user: profile?.email || "system"
        });

        fetchProducts();
    };

    const deleteAllTrigger = async () => {
        validateAction(executeDeleteAll);
    };

    const importTrigger = async (jsonData) => {
        validateAction(() => executeImport(jsonData));
    };

    const executeDeleteAll = async () => {
        try {
            const confirmed = await showConfirm("¿ESTÁ SEGURO? Esto borrará TODO el inventario permanentemente.");
            if (!confirmed) return;

            setLoading(true);
            const batchSize = 500;
            const snapshot = await getDocs(collection(db, "inventory"));

            // Borrar por lotes
            const batches = [];
            let currentBatch = writeBatch(db);
            let count = 0;

            snapshot.docs.forEach((doc, index) => {
                currentBatch.delete(doc.ref);
                count++;
                if (count % batchSize === 0) {
                    batches.push(currentBatch);
                    currentBatch = writeBatch(db);
                }
            });
            if (count % batchSize !== 0) batches.push(currentBatch);

            await Promise.all(batches.map(b => b.commit()));

            showAlert(`Inventario eliminado (${count} productos)`, "success");
            fetchProducts();
        } catch (e) {
            console.error(e);
            showAlert("Error al eliminar inventario", "error");
        } finally {
            setLoading(false);
        }
    };

    const executeImport = async (jsonData) => {
        try {
            setLoading(true);
            const items = JSON.parse(jsonData);
            let count = 0;
            const errors = [];

            for (const item of items) {
                try {
                    await addDoc(collection(db, "inventory"), {
                        name: item.name || "Sin nombre",
                        sku: item.sku || "",
                        category: item.category || "General",
                        price: Number(item.price) || 0,
                        cost: Number(item.cost) || 0,
                        stock: Number(item.stock) || 0,
                        minStock: Number(item.minStock) || 5,
                        imageUrl: item.imageUrl || "",
                        description: item.description || "",
                        publicVisible: !!item.publicVisible,
                        featured: !!item.featured,
                        createdAt: serverTimestamp(),
                        createdBy: profile?.email || "system"
                    });
                    count++;
                } catch (err) {
                    errors.push(item.name || "Unknown");
                }
            }

            let msg = `${count} productos importados correctamente.`;
            if (errors.length > 0) msg += ` Fallaron: ${errors.length}`;
            showAlert(msg, "success");

            setShowImportModal(false);
            setJsonInput("");
            fetchProducts();
        } catch (e) {
            console.error(e);
            showAlert("Error crítico en importación: " + e.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const downloadTemplate = () => {
        const template = [
            {
                "name": "Ejemplo Martillo",
                "sku": "MAR-001",
                "category": "Herramientas",
                "price": 150.50,
                "cost": 100.00,
                "stock": 50,
                "minStock": 10,
                "description": "Martillo de acero forjado",
                "publicVisible": true
            }
        ];
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(template, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "plantilla_inventario.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="bg-background-light min-h-screen font-display text-[#111518]">
            {/* Header */}
            <header className="bg-white border-b border-[#e5e7eb] sticky top-0 z-50">
                <div className="px-4 md:px-10 flex items-center justify-between py-3 max-w-[1440px] mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <div className="size-8 flex items-center justify-center text-primary bg-primary/10 rounded-lg">
                            <span className="material-symbols-outlined text-2xl">inventory</span>
                        </div>
                        <h2 className="text-lg font-bold">Inventario Ferretería</h2>
                    </div>
                    <div className="flex gap-3">
                        {canEdit && (
                            <>
                                <button
                                    onClick={deleteAllTrigger}
                                    className="flex items-center h-10 px-4 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium"
                                    title="Requiere autorización"
                                >
                                    <span className="material-symbols-outlined mr-2 text-[18px]">delete_forever</span>
                                    Borrar Todo
                                </button>
                                <button onClick={() => setShowImportModal(true)} className="flex items-center h-10 px-4 rounded-lg border border-[#dbe1e6] bg-white hover:bg-gray-50 text-sm font-medium">
                                    <span className="material-symbols-outlined mr-2 text-[18px]">upload_file</span>
                                    Importar JSON
                                </button>
                                <button onClick={openNew} className="flex items-center h-10 px-4 rounded-lg bg-primary hover:bg-blue-700 text-white text-sm font-bold">
                                    <span className="material-symbols-outlined mr-2 text-[18px]">add</span>
                                    Nuevo Producto
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-[1440px] mx-auto px-4 md:px-10 py-6">
                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatCard label="Total Productos" value={stats.total} icon="category" />
                    <StatCard label="Stock Bajo" value={stats.lowStock} icon="warning" danger={stats.lowStock > 0} />
                    <StatCard label="Sin Stock" value={stats.outOfStock} icon="remove_shopping_cart" danger={stats.outOfStock > 0} />
                    <StatCard label="Valor Total" value={`$${(stats.totalValue / 1000).toFixed(0)}K`} icon="payments" />
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-4 mb-6">
                    <div className="flex flex-wrap gap-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#60778a]">search</span>
                            <input
                                className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#dbe1e6] bg-white text-sm"
                                placeholder="Buscar por nombre o SKU..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <select
                            className="h-10 px-4 rounded-lg border border-[#dbe1e6] bg-white text-sm min-w-[150px]"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="">Todas las Categorías</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                {/* Mobile View: Cards */}
                <div className="md:hidden grid grid-cols-1 gap-4">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">Cargando...</div>
                    ) : filtered.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">No hay productos</div>
                    ) : filtered.map((p) => {
                        const isLowStock = (p.stock || 0) < (p.minStock || 5);
                        const isOutOfStock = (p.stock || 0) === 0;
                        return (
                            <div key={p.id} className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 ${isOutOfStock ? 'bg-red-50/50' : ''}`}>
                                <div className="flex gap-4">
                                    {/* Image */}
                                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 bg-cover bg-center border border-gray-200"
                                        style={{ backgroundImage: p.imageUrl ? `url('${p.imageUrl}')` : undefined }}
                                    >
                                        {!p.imageUrl && <div className="w-full h-full flex items-center justify-center text-gray-400"><span className="material-symbols-outlined">image</span></div>}
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-[#111518] leading-tight truncate">{p.name}</h3>
                                        <p className="text-xs text-gray-500 font-mono mt-0.5">{p.sku || "Sin SKU"}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{p.category || "General"}</span>
                                            <span className={`text-[10px] font-bold ${p.publicVisible ? 'text-green-600' : 'text-gray-400'}`}>
                                                {p.publicVisible ? 'Visible' : 'Oculto'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-3 border-t border-gray-50 pt-3">
                                    <div>
                                        <span className="block text-[10px] text-gray-400 uppercase">Costo</span>
                                        <span className="font-medium text-sm text-gray-600">${(p.cost || 0).toFixed(2)}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-gray-400 uppercase">Precio</span>
                                        <span className="font-bold text-lg text-[#111518]">${(p.price || 0).toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Stock Actions */}
                                <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg mt-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase ml-1">Stock</span>
                                    <div className="flex items-center gap-3">
                                        {canEdit ? (
                                            <>
                                                <button onClick={() => adjustStock(p.id, -1)} className="w-8 h-8 rounded-lg bg-white shadow-sm border border-gray-200 flex items-center justify-center text-gray-600 active:scale-95 transition-transform">-</button>
                                                <span className={`font-bold text-lg min-w-[30px] text-center ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : ''}`}>
                                                    {p.stock || 0}
                                                </span>
                                                <button onClick={() => adjustStock(p.id, 1)} className="w-8 h-8 rounded-lg bg-white shadow-sm border border-gray-200 flex items-center justify-center text-gray-600 active:scale-95 transition-transform">+</button>
                                            </>
                                        ) : (
                                            <span className={`font-bold text-lg min-w-[30px] text-center ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : ''}`}>
                                                {p.stock || 0}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                {canEdit && (
                                    <div className="flex gap-2 mt-1">
                                        <button onClick={() => openEdit(p)} className="flex-1 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 flex items-center justify-center gap-2">
                                            {canEdit ? (
                                                <>
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                    Editar
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                                                    Ver
                                                </>
                                            )}
                                        </button>
                                        {canEdit && (
                                            <button onClick={() => deleteProduct(p.id)} className="flex-1 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2">
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                                Eliminar
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Producto</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">SKU</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Categoría</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Costo</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Precio</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Stock</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Público</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={8} className="p-8 text-center text-gray-400">Cargando...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={8} className="p-8 text-center text-gray-400">No hay productos</td></tr>
                                ) : filtered.map((p) => {
                                    const isLowStock = (p.stock || 0) < (p.minStock || 5);
                                    const isOutOfStock = (p.stock || 0) === 0;
                                    return (
                                        <tr key={p.id} className={`hover:bg-gray-50 ${isOutOfStock ? 'bg-red-50/30' : isLowStock ? 'bg-yellow-50/30' : ''}`}>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    {p.imageUrl ? (
                                                        <div className="w-10 h-10 rounded bg-cover bg-center border border-gray-200" style={{ backgroundImage: `url('${p.imageUrl}')` }}></div>
                                                    ) : (
                                                        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                                                            <span className="material-symbols-outlined text-sm">image</span>
                                                        </div>
                                                    )}
                                                    <span className="font-medium">{p.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm text-gray-600 font-mono">{p.sku || "-"}</td>
                                            <td className="p-4">
                                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{p.category || "-"}</span>
                                            </td>
                                            <td className="p-4 text-sm font-medium">${(p.cost || 0).toFixed(2)}</td>
                                            <td className="p-4 text-sm font-bold">${(p.price || 0).toFixed(2)}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    {canEdit ? (
                                                        <>
                                                            <button onClick={() => adjustStock(p.id, -1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">-</button>
                                                            <span className={`font-bold min-w-[40px] text-center ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : ''}`}>
                                                                {p.stock || 0}
                                                            </span>
                                                            <button onClick={() => adjustStock(p.id, 1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">+</button>
                                                        </>
                                                    ) : (
                                                        <span className={`font-bold min-w-[40px] text-center ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : ''}`}>
                                                            {p.stock || 0}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`text-xs font-medium ${p.publicVisible ? 'text-green-600' : 'text-gray-400'}`}>
                                                    {p.publicVisible ? '✓ Sí' : 'No'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => openEdit(p)} className="p-1.5 text-gray-500 hover:text-primary hover:bg-blue-50 rounded" title={canEdit ? "Editar" : "Ver Detalles"}>
                                                        <span className="material-symbols-outlined text-[20px]">{canEdit ? 'edit' : 'visibility'}</span>
                                                    </button>
                                                    {canEdit && (
                                                        <button onClick={() => deleteProduct(p.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
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
            </main>

            {/* Product Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
                        <h3 className="font-bold text-lg mb-4">
                            {canEdit ? (selectedProduct ? "Editar Producto" : "Nuevo Producto") : "Detalles del Producto"}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <input
                                className="h-10 px-3 rounded-lg border border-gray-300 text-sm disabled:bg-gray-50 disabled:text-gray-500"
                                placeholder="Nombre del producto"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                disabled={!canEdit}
                            />
                            <input
                                className="h-10 px-3 rounded-lg border border-gray-300 text-sm disabled:bg-gray-50 disabled:text-gray-500"
                                placeholder="SKU"
                                value={form.sku}
                                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                                disabled={!canEdit}
                            />
                            <input
                                className="h-10 px-3 rounded-lg border border-gray-300 text-sm disabled:bg-gray-50 disabled:text-gray-500"
                                placeholder="Categoría"
                                value={form.category}
                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                disabled={!canEdit}
                            />
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 block mb-1">Costo</label>
                                    <input
                                        type="number"
                                        className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm disabled:bg-gray-50 disabled:text-gray-500"
                                        value={form.cost}
                                        onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
                                        disabled={!canEdit}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 block mb-1">Precio</label>
                                    <input
                                        type="number"
                                        className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm disabled:bg-gray-50 disabled:text-gray-500"
                                        value={form.price}
                                        onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                                        disabled={!canEdit}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 block mb-1">Stock</label>
                                    <input
                                        type="number"
                                        className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm disabled:bg-gray-50 disabled:text-gray-500"
                                        value={form.stock}
                                        onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                                        disabled={!canEdit}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 block mb-1">Min Stock</label>
                                    <input
                                        type="number"
                                        className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm disabled:bg-gray-50 disabled:text-gray-500"
                                        value={form.minStock}
                                        onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })}
                                        disabled={!canEdit}
                                    />
                                </div>
                            </div>
                            <input
                                className="md:col-span-2 h-10 px-3 rounded-lg border border-gray-300 text-sm disabled:bg-gray-50 disabled:text-gray-500"
                                placeholder="URL de imagen"
                                value={form.imageUrl}
                                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                                disabled={!canEdit}
                            />
                            <textarea
                                className="md:col-span-2 h-24 p-3 rounded-lg border border-gray-300 text-sm disabled:bg-gray-50 disabled:text-gray-500"
                                placeholder="Descripción"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                disabled={!canEdit}
                            />
                            <div className="md:col-span-2 flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.publicVisible}
                                        onChange={(e) => setForm({ ...form, publicVisible: e.target.checked })}
                                        disabled={!canEdit}
                                    />
                                    <span className="text-sm text-gray-700">Visible al público</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.featured}
                                        onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                                        disabled={!canEdit}
                                    />
                                    <span className="text-sm text-gray-700">Destacado</span>
                                </label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100"
                            >
                                {canEdit ? "Cancelar" : "Cerrar"}
                            </button>
                            {canEdit && (
                                <button
                                    onClick={saveProduct}
                                    className="px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm"
                                >
                                    Guardar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Importar JSON (Masivo)</h3>
                            <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs">
                                <p className="font-bold flex items-center gap-2 mb-1">
                                    <span className="material-symbols-outlined text-sm">info</span>
                                    Instrucciones
                                </p>
                                <p>Esta acción es destructiva si se combina con "Borrar Todo". Requiere código de autorización.</p>
                                <p className="mt-1">Descargue la plantilla para ver el formato requerido.</p>
                            </div>

                            <textarea
                                className="w-full h-48 p-3 rounded-xl border border-gray-300 text-sm font-mono focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder='[{"name": "Producto 1", "stock": 10, ...}]'
                                value={jsonInput}
                                onChange={(e) => setJsonInput(e.target.value)}
                            />

                            <div className="flex justify-between items-center pt-2">
                                <button
                                    onClick={downloadTemplate}
                                    className="text-primary hover:underline text-sm font-medium flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[16px]">download</span>
                                    Descargar Plantilla JSON
                                </button>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowImportModal(false)}
                                        className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-medium text-sm"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => importTrigger(jsonInput)}
                                        disabled={!jsonInput.trim()}
                                        className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">verified_user</span>
                                        Validar e Importar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}




        </div>
    );
}

function StatCard({ label, value, icon, danger }) {
    return (
        <div className={`flex flex-col gap-2 rounded-xl p-5 bg-white border border-[#e5e7eb] shadow-sm ${danger ? 'relative overflow-hidden' : ''}`}>
            {danger && <div className="absolute right-0 top-0 h-full w-1 bg-red-500"></div>}
            <div className="flex justify-between items-start">
                <p className="text-[#60778a] text-sm font-medium">{label}</p>
                <span className={`material-symbols-outlined ${danger ? 'text-red-500' : 'text-primary/60'}`}>{icon}</span>
            </div>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    );
}
