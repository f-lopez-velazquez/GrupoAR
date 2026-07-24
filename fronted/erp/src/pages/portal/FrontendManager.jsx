import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase/firebase";
import { useAuth } from "../../state/AuthContext";

export default function FrontendManager() {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState("services");
    const [services, setServices] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingService, setEditingService] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    const [form, setForm] = useState({
        title: "",
        description: "",
        imageUrl: "",
        category: "",
        price: "",
        published: false
    });

    const [config, setConfig] = useState({
        companyName: "GRUPO AR",
        tagline: "Ferretería y Construcción",
        phone: "464 126 2821",
        email: "contacto@grupoar.com",
        address: "PEDRO GUTIERREZ 119, Guanajuato, 36780 Salamanca, Gto.",
        socialMedia: {
            facebook: "",
            instagram: "",
            whatsapp: ""
        }
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [servSnap, prodSnap, catSnap, configSnap] = await Promise.all([
                getDocs(query(collection(db, "services"), orderBy("title"))),
                getDocs(query(collection(db, "inventory"), orderBy("name"))),
                getDocs(collection(db, "categories")),
                getDocs(collection(db, "siteConfig"))
            ]);

            setServices(servSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            if (!configSnap.empty) {
                setConfig({ ...config, ...configSnap.docs[0].data() });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Upload de imagen
    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("La imagen no debe superar 5MB");
            return;
        }

        try {
            setUploadingImage(true);
            const timestamp = Date.now();
            const fileName = `services/${timestamp}_${file.name}`;
            const storageRef = ref(storage, fileName);

            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            setForm({ ...form, imageUrl: url });
            alert("Imagen subida correctamente");
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Error al subir imagen");
        } finally {
            setUploadingImage(false);
        }
    };

    const saveService = async () => {
        if (!form.title) return alert("El título es obligatorio");

        try {
            const serviceData = {
                ...form,
                price: form.price ? parseFloat(form.price) : null,
                updatedAt: serverTimestamp()
            };

            if (editingService) {
                await updateDoc(doc(db, "services", editingService.id), serviceData);
            } else {
                await addDoc(collection(db, "services"), {
                    ...serviceData,
                    createdAt: serverTimestamp()
                });
            }

            setForm({ title: "", description: "", imageUrl: "", category: "", price: "", published: false });
            setEditingService(null);
            fetchData();
        } catch (e) {
            console.error(e);
            alert("Error al guardar");
        }
    };

    const editService = (s) => {
        setEditingService(s);
        setForm({
            title: s.title,
            description: s.description || "",
            imageUrl: s.imageUrl || "",
            category: s.category || "",
            price: s.price?.toString() || "",
            published: s.published || false
        });
    };

    const deleteService = async (id) => {
        if (!confirm("¿Eliminar este servicio?")) return;
        await deleteDoc(doc(db, "services", id));
        fetchData();
    };

    const toggleProductVisibility = async (p) => {
        await updateDoc(doc(db, "inventory", p.id), { publicVisible: !p.publicVisible });
        fetchData();
    };

    const toggleProductFeatured = async (p) => {
        await updateDoc(doc(db, "inventory", p.id), { featured: !p.featured });
        fetchData();
    };

    const saveConfig = async () => {
        try {
            const configRef = collection(db, "siteConfig");
            const configSnap = await getDocs(configRef);

            if (configSnap.empty) {
                await addDoc(configRef, { ...config, updatedAt: serverTimestamp() });
            } else {
                await updateDoc(doc(db, "siteConfig", configSnap.docs[0].id), {
                    ...config,
                    updatedAt: serverTimestamp()
                });
            }

            alert("Configuración guardada");
        } catch (error) {
            console.error(error);
            alert("Error al guardar configuración");
        }
    };

    return (
        <div className="bg-background-light min-h-screen">
            {/* Header */}
            <header className="bg-white sticky top-0 z-50 border-b border-[#dbe1e6] px-6 py-3 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-2xl">grid_view</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-[#111518]">Frontend Manager</h1>
                            <p className="text-xs text-[#60778a] font-medium uppercase tracking-wider">Gestión de Contenidos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <a href="/" target="_blank" className="flex items-center justify-center h-10 px-4 rounded-lg border border-[#dbe1e6] bg-white hover:bg-gray-50 text-[#111518] text-sm font-semibold transition-colors">
                            <span className="material-symbols-outlined text-[18px] mr-2">visibility</span>
                            Vista Previa
                        </a>
                        <span className="text-sm font-semibold text-[#111518]">{profile?.displayName || "Admin"}</span>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full px-6 py-8">
                {/* Tabs */}
                <div className="mb-8 border-b border-[#dbe1e6]">
                    <nav className="flex gap-8">
                        {[
                            { id: "services", label: "Servicios", icon: "architecture" },
                            { id: "catalog", label: "Catálogo", icon: "hardware" },
                            { id: "config", label: "Configuración", icon: "settings" }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`group flex items-center gap-2 border-b-2 py-4 px-1 ${activeTab === tab.id ? "border-primary" : "border-transparent hover:border-gray-300"}`}
                            >
                                <span className={`material-symbols-outlined ${activeTab === tab.id ? "text-primary" : "text-[#60778a]"}`}>{tab.icon}</span>
                                <p className={`text-sm font-bold ${activeTab === tab.id ? "text-primary" : "text-[#60778a]"}`}>{tab.label}</p>
                            </button>
                        ))}
                    </nav>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-[#60778a]">Cargando...</div>
                ) : activeTab === "services" ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Editor */}
                        <div className="lg:col-span-7 flex flex-col gap-6">
                            <div className="bg-white rounded-xl shadow-sm border border-[#dbe1e6] overflow-hidden">
                                <div className="px-6 py-5 border-b border-[#dbe1e6] flex justify-between items-center bg-gray-50/50">
                                    <h2 className="text-lg font-bold text-[#111518] flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">edit_document</span>
                                        {editingService ? "Editar Servicio" : "Nuevo Servicio"}
                                    </h2>
                                    {editingService && (
                                        <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded">Editando</span>
                                    )}
                                </div>

                                <div className="p-6 flex flex-col gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-[#111518]">Título del Servicio *</label>
                                        <input
                                            className="w-full rounded-lg border-[#dbe1e6] bg-white px-4 py-3 text-sm text-[#111518] placeholder-[#60778a] focus:border-primary focus:ring-1 focus:ring-primary"
                                            placeholder="Ej: Diseño Arquitectónico Residencial"
                                            value={form.title}
                                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-[#111518]">Categoría</label>
                                        <input
                                            className="w-full rounded-lg border-[#dbe1e6] bg-white px-4 py-3 text-sm text-[#111518] placeholder-[#60778a] focus:border-primary focus:ring-1 focus:ring-primary"
                                            placeholder="Ej: Construcción, Electricidad, Plomería"
                                            value={form.category}
                                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-[#111518]">Precio (opcional)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full rounded-lg border-[#dbe1e6] bg-white px-4 py-3 text-sm text-[#111518] placeholder-[#60778a] focus:border-primary focus:ring-1 focus:ring-primary"
                                            placeholder="0.00"
                                            value={form.price}
                                            onChange={(e) => setForm({ ...form, price: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-[#111518]">Descripción Detallada</label>
                                        <textarea
                                            className="w-full min-h-[160px] rounded-lg border-[#dbe1e6] bg-white px-4 py-3 text-sm text-[#111518] placeholder-[#60778a] focus:border-primary focus:ring-1 focus:ring-primary resize-y"
                                            placeholder="Describe el servicio, materiales y alcance..."
                                            value={form.description}
                                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-[#111518]">Imagen</label>
                                        {form.imageUrl && (
                                            <div className="mb-3">
                                                <img src={form.imageUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            disabled={uploadingImage}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark disabled:opacity-50"
                                        />
                                        {uploadingImage && <p className="text-sm text-primary">Subiendo imagen...</p>}
                                    </div>

                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={form.published}
                                            onChange={(e) => setForm({ ...form, published: e.target.checked })}
                                            className="rounded border-[#dbe1e6] text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm font-medium text-[#111518]">Publicar en el sitio web</span>
                                    </label>
                                </div>

                                <div className="bg-gray-50 px-6 py-4 border-t border-[#dbe1e6] flex items-center justify-end gap-3">
                                    {editingService && (
                                        <button onClick={() => { setEditingService(null); setForm({ title: "", description: "", imageUrl: "", category: "", price: "", published: false }); }} className="px-4 py-2 text-sm font-semibold text-[#60778a] hover:text-[#111518]">
                                            Cancelar
                                        </button>
                                    )}
                                    <button onClick={saveService} className="px-6 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">save</span>
                                        {editingService ? "Actualizar" : "Guardar Servicio"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Services List */}
                        <div className="lg:col-span-5 flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-[#111518]">Servicios ({services.length})</h3>
                            </div>
                            <div className="space-y-4">
                                {services.map((s) => (
                                    <div key={s.id} className="group bg-white rounded-xl border border-[#dbe1e6] shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-row h-32">
                                        <div className="w-32 bg-gray-100 shrink-0">
                                            {s.imageUrl && <img className="w-full h-full object-cover" src={s.imageUrl} alt={s.title} />}
                                        </div>
                                        <div className="flex-1 p-4 flex flex-col justify-between">
                                            <div>
                                                <h4 className="font-bold text-[#111518] line-clamp-1">{s.title}</h4>
                                                {s.category && <p className="text-xs text-primary mt-0.5">{s.category}</p>}
                                                <p className="text-xs text-[#60778a] mt-1 line-clamp-2">{s.description}</p>
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${s.published ? "bg-green-50 text-green-700 border-green-100" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                                    <span className={`size-1.5 rounded-full ${s.published ? "bg-green-500" : "bg-gray-400"}`}></span>
                                                    {s.published ? "Publicado" : "Oculto"}
                                                </span>
                                                <div className="flex gap-1">
                                                    <button onClick={() => editService(s)} className="p-1.5 text-[#60778a] hover:text-primary hover:bg-blue-50 rounded">
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                    </button>
                                                    <button onClick={() => deleteService(s.id)} className="p-1.5 text-[#60778a] hover:text-red-600 hover:bg-red-50 rounded">
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : activeTab === "catalog" ? (
                    /* Catalog Tab */
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-[#111518]">Productos del Inventario</h3>
                            <div className="flex items-center gap-2 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">
                                <span className="size-2 bg-green-500 rounded-full animate-pulse"></span>
                                Sincronizado con ERP
                            </div>
                        </div>
                        <div className="bg-white rounded-lg border border-[#dbe1e6] overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-[#60778a] font-semibold border-b border-[#dbe1e6]">
                                        <tr>
                                            <th className="px-6 py-3">Producto</th>
                                            <th className="px-6 py-3">SKU</th>
                                            <th className="px-6 py-3">Categoría</th>
                                            <th className="px-6 py-3">Stock</th>
                                            <th className="px-6 py-3">Precio</th>
                                            <th className="px-6 py-3">Publicado en Web</th>
                                            <th className="px-6 py-3">Destacado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#dbe1e6]">
                                        {products.map((p) => (
                                            <tr key={p.id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-3 font-medium text-[#111518]">{p.name}</td>
                                                <td className="px-6 py-3 text-[#60778a] font-mono text-xs">{p.sku || p.id.slice(0, 8)}</td>
                                                <td className="px-6 py-3 text-[#60778a]">{p.category || "-"}</td>
                                                <td className="px-6 py-3 text-[#111518]">{p.stock || 0} un.</td>
                                                <td className="px-6 py-3 font-mono text-[#111518]">${(p.price || 0).toFixed(2)}</td>
                                                <td className="px-6 py-3">
                                                    <button
                                                        onClick={() => toggleProductVisibility(p)}
                                                        className={`px-2 py-1 rounded text-xs font-bold ${p.publicVisible ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                                                    >
                                                        {p.publicVisible ? "Sí, Publicar" : "No, Ocultar"}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <button
                                                        onClick={() => toggleProductFeatured(p)}
                                                        className={`px-2 py-1 rounded text-xs font-bold ${p.featured ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}
                                                    >
                                                        {p.featured ? "★ Sí" : "No"}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Config Tab */
                    <div className="max-w-3xl">
                        <div className="bg-white rounded-xl shadow-sm border border-[#dbe1e6] overflow-hidden">
                            <div className="px-6 py-5 border-b border-[#dbe1e6] bg-gray-50/50">
                                <h2 className="text-lg font-bold text-[#111518] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">settings</span>
                                    Configuración General del Sitio
                                </h2>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-[#111518]">Nombre de la Empresa</label>
                                        <input
                                            className="w-full rounded-lg border-[#dbe1e6] bg-white px-4 py-3 text-sm text-[#111518]"
                                            value={config.companyName}
                                            onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-[#111518]">Eslogan</label>
                                        <input
                                            className="w-full rounded-lg border-[#dbe1e6] bg-white px-4 py-3 text-sm text-[#111518]"
                                            value={config.tagline}
                                            onChange={(e) => setConfig({ ...config, tagline: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-[#111518]">Dirección</label>
                                    <input
                                        className="w-full rounded-lg border-[#dbe1e6] bg-white px-4 py-3 text-sm text-[#111518]"
                                        value={config.address}
                                        onChange={(e) => setConfig({ ...config, address: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-[#111518]">Teléfono</label>
                                        <input
                                            className="w-full rounded-lg border-[#dbe1e6] bg-white px-4 py-3 text-sm text-[#111518]"
                                            value={config.phone}
                                            onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-[#111518]">Email</label>
                                        <input
                                            type="email"
                                            className="w-full rounded-lg border-[#dbe1e6] bg-white px-4 py-3 text-sm text-[#111518]"
                                            value={config.email}
                                            onChange={(e) => setConfig({ ...config, email: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-[#dbe1e6] pt-6">
                                    <h3 className="text-md font-bold text-[#111518] mb-4">Redes Sociales</h3>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-[#60778a]">Facebook URL</label>
                                            <input
                                                className="w-full rounded-lg border-[#dbe1e6] bg-white px-4 py-3 text-sm text-[#111518]"
                                                placeholder="https://facebook.com/..."
                                                value={config.socialMedia?.facebook || ""}
                                                onChange={(e) => setConfig({
                                                    ...config,
                                                    socialMedia: { ...config.socialMedia, facebook: e.target.value }
                                                })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-[#60778a]">Instagram URL</label>
                                            <input
                                                className="w-full rounded-lg border-[#dbe1e6] bg-white px-4 py-3 text-sm text-[#111518]"
                                                placeholder="https://instagram.com/..."
                                                value={config.socialMedia?.instagram || ""}
                                                onChange={(e) => setConfig({
                                                    ...config,
                                                    socialMedia: { ...config.socialMedia, instagram: e.target.value }
                                                })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-[#60778a]">WhatsApp (número)</label>
                                            <input
                                                className="w-full rounded-lg border-[#dbe1e6] bg-white px-4 py-3 text-sm text-[#111518]"
                                                placeholder="5214641234567"
                                                value={config.socialMedia?.whatsapp || ""}
                                                onChange={(e) => setConfig({
                                                    ...config,
                                                    socialMedia: { ...config.socialMedia, whatsapp: e.target.value }
                                                })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 px-6 py-4 border-t border-[#dbe1e6] flex items-center justify-end">
                                <button onClick={saveConfig} className="px-6 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">save</span>
                                    Guardar Configuración
                                </button>
                            </div>
                        </div>
                    </div>
                )
                }
            </main >
        </div >
    );
}
