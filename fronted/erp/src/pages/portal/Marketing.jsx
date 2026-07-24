import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { uploadToCloudinary } from "../../services/uploadService";
import { useAuth } from "../../state/AuthContext";

export default function Marketing() {
    const { hasPermission } = useAuth();
    const canEdit = hasPermission('marketing', 2);
    const [leads, setLeads] = useState([]);
    const [pendingQuotes, setPendingQuotes] = useState([]);
    const [posts, setPosts] = useState([]);
    const [activities, setActivities] = useState([]);
    const [quickReplies, setQuickReplies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    const [viewMode, setViewMode] = useState("calendar");
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const [form, setForm] = useState({
        title: "", content: "", instructions: "", platform: [], scheduledDate: "", scheduledTime: "",
        imageUrl: "", status: "draft", type: "post", isLead: false, isActivity: false,
        activityCategory: "marketing", dueDate: ""
    });

    const platforms = [
        { id: "facebook", label: "Facebook", icon: "📘" },
        { id: "instagram", label: "Instagram", icon: "📷" },
        { id: "tiktok", label: "TikTok", icon: "🎵" },
        { id: "whatsapp", label: "WhatsApp", icon: "💬" },
        { id: "email", label: "Email", icon: "📧" }
    ];

    const postTypes = [
        { value: "post", label: "Publicación" },
        { value: "story", label: "Historia" },
        { value: "reel", label: "Reel/Video" },
        { value: "promo", label: "Promoción" },
        { value: "reminder", label: "Recordatorio a Cliente" }
    ];

    useEffect(() => {
        if (showModal) window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [showModal]);

    useEffect(() => {
        fetchPosts(); fetchLeads(); fetchPendingQuotes(); fetchActivities(); fetchQuickReplies();
    }, []);

    const fetchPosts = async () => {
        try {
            const q = query(collection(db, "marketing_posts"), orderBy("scheduledDate", "desc"));
            const snap = await getDocs(q);
            setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); }
    };

    const fetchLeads = async () => {
        try {
            const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); }
    };

    const fetchPendingQuotes = async () => {
        try {
            const q = query(collection(db, "quotes"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            setPendingQuotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); }
    };

    const fetchActivities = async () => {
        try {
            const q = query(collection(db, "activities"), where("category", "==", "marketing"), orderBy("dueDate", "asc"));
            const snap = await getDocs(q);
            setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchQuickReplies = async () => {
        try {
            const snap = await getDocs(collection(db, "marketing_replies"));
            setQuickReplies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); }
    };

    const openNewPost = () => {
        setSelectedPost(null);
        setForm({
            title: "", content: "", instructions: "", platform: [], scheduledDate: "", scheduledTime: "",
            imageUrl: "", status: "draft", type: "post", isLead: false, isActivity: false,
            activityCategory: "marketing", dueDate: ""
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            const collectionName = form.isLead ? "leads" : form.isActivity ? "activities" : "marketing_posts";
            const data = { ...form, updatedAt: new Date() };
            if (!selectedPost) {
                data.createdAt = new Date();
                await addDoc(collection(db, collectionName), data);
            } else {
                await updateDoc(doc(db, collectionName, selectedPost.id), data);
            }
            setShowModal(false);
            fetchPosts(); fetchLeads(); fetchActivities();
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id, col) => {
        if (!confirm("¿Eliminar este registro?")) return;
        try {
            await deleteDoc(doc(db, col, id));
            fetchPosts(); fetchLeads(); fetchActivities();
        } catch (e) { console.error(e); }
    };

    const togglePlatform = (platId) => {
        const current = form.platform || [];
        if (current.includes(platId)) setForm({ ...form, platform: current.filter(p => p !== platId) });
        else setForm({ ...form, platform: [...current, platId] });
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear(), month = date.getMonth();
        const firstDay = new Date(year, month, 1), lastDay = new Date(year, month + 1, 0);
        const days = [];
        for (let i = 0; i < firstDay.getDay(); i++) days.push({ date: null, events: [] });
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            days.push({ date: d, dateStr, events: posts.filter(p => p.scheduledDate === dateStr) });
        }
        return days;
    };

    const calendarDays = getDaysInMonth(currentMonth);

    if (loading) return <div className="p-8 text-center">Cargando Marketing...</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Marketing & Prospectación</h1>
                    <p className="text-slate-500">Gestión de contenido, leads y seguimiento comercial.</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                    {["calendar", "crm", "agenda"].map(m => (
                        <button
                            key={m}
                            onClick={() => setViewMode(m)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === m ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            {m.toUpperCase()}
                        </button>
                    ))}
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard label="Leads Activos" value={leads.length} icon="person_search" color="blue" />
                <StatCard label="Posts Programados" value={posts.filter(p => p.status === 'scheduled').length} icon="calendar_month" color="purple" />
                <StatCard label="Tareas Pendientes" value={activities.filter(a => a.status === 'pending').length} icon="checklist" color="orange" />
                <StatCard label="Cotizaciones x Seguir" value={pendingQuotes.length} icon="request_quote" color="green" />
            </div>

            <main className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                {viewMode === "calendar" && (
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-600">calendar_today</span>
                                Calendario de Publicaciones
                            </h2>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-2 hover:bg-slate-100 rounded-full">
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                                <span className="font-bold text-lg min-w-[150px] text-center">
                                    {currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                                </span>
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-2 hover:bg-slate-100 rounded-full">
                                    <span className="material-symbols-outlined">chevron_right</span>
                                </button>
                                {canEdit && (
                                    <button onClick={openNewPost} className="ml-4 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200">
                                        <span className="material-symbols-outlined">add_box</span>
                                        Nueva Publicación
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-7 border-t border-l border-slate-100">
                            {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(d => (
                                <div key={d} className="p-3 text-center text-xs font-black uppercase text-slate-400 bg-slate-50/50 border-r border-b border-slate-100">{d}</div>
                            ))}
                            {calendarDays.map((day, i) => (
                                <div key={i} className={`min-h-[140px] p-2 border-r border-b border-slate-100 transition-colors ${day.date ? 'hover:bg-slate-50/30' : 'bg-slate-50/20'}`}>
                                    {day.date && (
                                        <>
                                            <span className="text-sm font-bold text-slate-400 mb-2 block">{day.date}</span>
                                            <div className="space-y-1">
                                                {day.events.map(e => (
                                                    <div key={e.id} onClick={() => { setSelectedPost(e); setForm(e); setShowModal(true); }} className="p-1.5 rounded-lg bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-700 cursor-pointer hover:scale-95 transition-transform overflow-hidden whitespace-nowrap text-ellipsis">
                                                        {e.title}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {viewMode === "crm" && (
                    <div className="p-6">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-green-600">hub</span>
                            Pipeline de Prospectos
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {["nuevo", "seguimiento", "cerrado"].map(status => (
                                <div key={status} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                                    <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-4 flex items-center justify-between">
                                        {status}
                                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">{leads.filter(l => l.status === status).length}</span>
                                    </h3>
                                    <div className="space-y-3">
                                        {leads.filter(l => l.status === status).map(l => (
                                            <div key={l.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-slate-800">{l.name || l.client}</h4>
                                                    <button onClick={() => handleDelete(l.id, 'leads')} className="text-slate-300 hover:text-red-500">
                                                        <span className="material-symbols-outlined text-sm">delete</span>
                                                    </button>
                                                </div>
                                                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{l.notes || l.content}</p>
                                                <div className="flex items-center gap-2">
                                                    <a href={`https://wa.me/${l.phone}`} target="_blank" className="bg-green-100 text-green-700 p-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-sm">chat</span>
                                                        WhatsApp
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {viewMode === "agenda" && (
                    <div className="p-6">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-600">assignment</span>
                            Seguimiento de Tareas
                        </h2>
                        <div className="space-y-4">
                            {activities.map(a => (
                                <div key={a.id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl hover:bg-slate-100 transition-colors">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${a.status === 'completed' ? 'bg-green-500' : 'bg-orange-500'}`}>
                                        <span className="material-symbols-outlined">{a.status === 'completed' ? 'check_circle' : 'pending'}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-800">{a.title}</h3>
                                        <p className="text-xs text-slate-500">{a.dueDate} - {a.activityCategory}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => updateDoc(doc(db, "activities", a.id), { status: a.status === 'completed' ? 'pending' : 'completed' })} className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600">
                                            <span className="material-symbols-outlined text-sm">sync</span>
                                        </button>
                                        <button onClick={() => handleDelete(a.id, 'activities')} className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 hover:text-red-600">
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {showModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-8 border-b border-slate-100 sticky top-0 bg-white z-10 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800">{selectedPost ? 'Editar' : 'Nuevo'} Registro</h2>
                                <p className="text-slate-500 text-sm">Completa la información para sincronizar con el CRM.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="bg-slate-100 text-slate-500 p-2 rounded-full hover:bg-red-50 hover:text-red-500">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setForm({ ...form, isLead: false, isActivity: false })} className={`p-4 rounded-2xl border-2 font-bold transition-all ${!form.isLead && !form.isActivity ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400'}`}>Post Social</button>
                                <button onClick={() => setForm({ ...form, isLead: true, isActivity: false })} className={`p-4 rounded-2xl border-2 font-bold transition-all ${form.isLead ? 'border-green-600 bg-green-50 text-green-700' : 'border-slate-100 text-slate-400'}`}>Nuevo Lead</button>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-400 mb-2">Título / Nombre</label>
                                <input className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 ring-blue-500/20" value={form.title || form.name || ""} onChange={(e) => setForm({ ...form, title: e.target.value, name: e.target.value })} placeholder="Ej: Promo de Febrero o Juan Pérez" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-400 mb-2">Fecha Programada</label>
                                    <input type="date" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold" value={form.scheduledDate || form.dueDate || ""} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value, dueDate: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-400 mb-2">Plataformas</label>
                                    <div className="flex gap-2">
                                        {platforms.map(p => (
                                            <button key={p.id} onClick={() => togglePlatform(p.id)} className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${form.platform?.includes(p.id) ? 'bg-blue-600 shadow-lg -translate-y-1' : 'bg-slate-100 opacity-40 hover:opacity-100'}`}>
                                                {p.icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-400 mb-2">Contenido / Notas</label>
                                <textarea className="w-full bg-slate-50 border-none rounded-2xl p-4 font-medium h-32" value={form.content || form.notes || ""} onChange={(e) => setForm({ ...form, content: e.target.value, notes: e.target.value })} placeholder="Descripción detallada..." />
                            </div>
                        </div>
                        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-4 font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
                            <button onClick={handleSave} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all">
                                {selectedPost ? 'ACTUALIZAR' : 'GUARDAR REGISTRO'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, icon, color }) {
    const colors = {
        blue: "text-blue-600 bg-blue-50",
        purple: "text-purple-600 bg-purple-50",
        orange: "text-orange-600 bg-orange-50",
        green: "text-green-600 bg-green-50"
    };
    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors[color]}`}>
                <span className="material-symbols-outlined text-3xl">{icon}</span>
            </div>
            <div>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest">{label}</p>
                <p className="text-2xl font-black text-slate-800">{value}</p>
            </div>
        </div>
    );
}
