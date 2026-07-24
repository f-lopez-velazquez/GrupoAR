import { useState } from "react";
import { Link } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/firebase";

const WHATSAPP_NUMBER = "524641390122";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
const EMAIL = "grupo.ar.cyd@gmail.com";

export default function Contact() {
    const [form, setForm] = useState({
        name: "", email: "", phone: "", company: "", service: "", message: ""
    });
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    const services = [
        "Obra Civil / Construcción",
        "Estructuras Metálicas",
        "Soldadura / Pailería",
        "Titanes e Izaje",
        "Electricidad Industrial",
        "Remodelación / Mantenimiento",
        "Acero Inoxidable",
        "Ferretería / Productos",
        "Otro"
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.phone || !form.message) {
            setError("Por favor completa los campos obligatorios");
            return;
        }

        setSending(true);
        setError("");

        try {
            // Save to Firebase leads collection
            await addDoc(collection(db, "leads"), {
                ...form,
                source: "website-contact",
                status: "new",
                createdAt: serverTimestamp()
            });
            setSent(true);
        } catch (e) {
            console.error(e);
            // Fallback to WhatsApp
            const message = `*Nuevo Contacto*\n\n*Nombre:* ${form.name}\n*Teléfono:* ${form.phone}\n*Email:* ${form.email}\n*Empresa:* ${form.company}\n*Servicio:* ${form.service}\n*Mensaje:* ${form.message}`;
            window.open(`${WHATSAPP_URL}?text=${encodeURIComponent(message)}`, "_blank");
            setSent(true);
        }
        setSending(false);
    };

    const businessHours = [
        { day: "Lunes - Viernes", hours: "8:00 AM - 6:00 PM" },
        { day: "Sábado", hours: "9:00 AM - 2:00 PM" },
        { day: "Domingo", hours: "Cerrado" }
    ];

    return (
        <div className="min-h-screen bg-[#f8fafc] font-['Plus_Jakarta_Sans',sans-serif]">
            {/* Floating WhatsApp */}
            <a href={`${WHATSAPP_URL}?text=${encodeURIComponent("Hola, me gustaría más información")}`} target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300" style={{ boxShadow: "0 4px 25px rgba(37,211,102,0.4)" }}>
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
            </a>

            {/* Header */}
            <header className="bg-white border-b border-[#e5e7eb] sticky top-0 z-50 backdrop-blur-xl bg-white/95">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="logo-circle w-11 h-11">
                            <img src="/assets/logo.png" alt="Grupo AR" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <p className="font-bold text-[#111518]">Grupo AR</p>
                            <p className="text-[10px] text-[#60778a]">Construcción & Industrial</p>
                        </div>
                    </Link>
                    <nav className="hidden md:flex items-center gap-6">
                        <Link to="/" className="text-sm font-semibold text-[#60778a] hover:text-[#0066cc] transition-colors">Inicio</Link>
                        <Link to="/catalogo" className="text-sm font-semibold text-[#60778a] hover:text-[#0066cc] transition-colors">Catálogo</Link>
                        <Link to="/servicios" className="text-sm font-semibold text-[#60778a] hover:text-[#0066cc] transition-colors">Servicios</Link>
                        <Link to="/contacto" className="text-sm font-semibold text-[#0066cc]">Contacto</Link>
                    </nav>
                    <Link to="/portal/login" className="text-sm font-semibold text-[#0066cc] hover:underline">Portal</Link>
                </div>
            </header>

            {/* Hero */}
            <section className="bg-white py-16 relative overflow-hidden border-b border-gray-100">
                <div className="absolute inset-0 bg-[url('https://i.imgur.com/1Kd5cV9.jpeg')] bg-cover bg-center opacity-5"></div>
                <div className="relative max-w-7xl mx-auto px-4 text-center">
                    <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-2 mb-6 animate-fade-in-up">
                        <span className="material-symbols-outlined text-sm text-[#0066cc]">support_agent</span>
                        <span className="text-sm font-medium text-[#0066cc]">Atención personalizada</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4 animate-fade-in-up text-[#111518]">Contáctanos</h1>
                    <p className="text-[#60778a] max-w-xl mx-auto text-lg animate-fade-in-up delay-200">Estamos listos para ayudarte con tu próximo proyecto. Respuesta en menos de 24 horas.</p>
                </div>
            </section>

            {/* Contact Content */}
            <main className="max-w-7xl mx-auto px-4 py-16">
                <div className="grid lg:grid-cols-5 gap-12">
                    {/* Contact Form */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-3xl border border-[#e5e7eb] p-8 shadow-sm">
                            <h2 className="text-2xl font-bold text-[#111518] mb-6">Envíanos un Mensaje</h2>

                            {sent ? (
                                <div className="text-center py-16">
                                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white text-4xl">check</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-[#111518] mb-2">¡Mensaje Enviado!</h3>
                                    <p className="text-[#60778a] mb-6">Te contactaremos pronto. También puedes escribirnos directamente:</p>
                                    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                        Escribir por WhatsApp
                                    </a>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {error && (
                                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                                            {error}
                                        </div>
                                    )}

                                    <div className="grid md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-[#111518] mb-2">Nombre *</label>
                                            <input className="input-premium" placeholder="Tu nombre completo" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-[#111518] mb-2">Teléfono *</label>
                                            <input className="input-premium" type="tel" placeholder="449 123 4567" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-[#111518] mb-2">Email</label>
                                            <input className="input-premium" type="email" placeholder="tu@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-[#111518] mb-2">Empresa</label>
                                            <input className="input-premium" placeholder="Nombre de tu empresa" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-[#111518] mb-2">Servicio de Interés</label>
                                        <select className="input-premium" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
                                            <option value="">Selecciona un servicio</option>
                                            {services.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-[#111518] mb-2">Mensaje *</label>
                                        <textarea className="input-premium min-h-[140px] resize-none" placeholder="Cuéntanos sobre tu proyecto..." required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <button type="submit" disabled={sending} className="flex-1 btn-primary justify-center text-base py-4">
                                            {sending ? (
                                                <>
                                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                    Enviando...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined">send</span>
                                                    Enviar Mensaje
                                                </>
                                            )}
                                        </button>
                                        <a href={`${WHATSAPP_URL}?text=${encodeURIComponent("Hola, me gustaría más información")}`} target="_blank" rel="noopener noreferrer" className="btn-whatsapp justify-center py-4">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                            WhatsApp
                                        </a>
                                    </div>

                                    <p className="text-xs text-[#60778a] text-center">
                                        Al enviar aceptas nuestro <Link to="/privacidad" className="text-[#0066cc] hover:underline">Aviso de Privacidad</Link>
                                    </p>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Direct Contact */}
                        <div className="bg-white rounded-3xl border border-[#e5e7eb] p-6">
                            <h3 className="text-lg font-bold text-[#111518] mb-6">Contacto Directo</h3>
                            <div className="space-y-4">
                                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors group">
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                    </div>
                                    <div>
                                        <p className="font-bold text-green-700">WhatsApp</p>
                                        <p className="text-sm text-green-600">464 139 0122</p>
                                    </div>
                                </a>

                                <a href={`mailto:${EMAIL}`} className="flex items-center gap-4 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group">
                                    <div className="w-12 h-12 bg-gradient-to-br from-[#0066cc] to-[#0099ff] rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-white">mail</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">Email</p>
                                        <p className="text-sm text-white/90">{EMAIL}</p>
                                    </div>
                                </a>

                                <div className="flex items-center gap-4 p-4 rounded-xl bg-[#f8fafc]">
                                    <div className="w-12 h-12 bg-gradient-to-br from-[#111518] to-[#374151] rounded-xl flex items-center justify-center shadow-md">
                                        <span className="material-symbols-outlined text-white">location_on</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#111518]">Ubicación</p>
                                        <p className="text-sm text-[#60778a]">Salamanca, Guanajuato, México</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Business Hours */}
                        <div className="bg-white rounded-3xl border border-[#e5e7eb] p-6">
                            <h3 className="text-lg font-bold text-[#111518] mb-6">Horario de Atención</h3>
                            <div className="space-y-3">
                                {businessHours.map((h, i) => (
                                    <div key={i} className="flex justify-between items-center py-2 border-b border-[#e5e7eb] last:border-0">
                                        <span className="font-medium text-[#111518]">{h.day}</span>
                                        <span className={`text-sm ${h.hours === 'Cerrado' ? 'text-red-500' : 'text-[#60778a]'}`}>{h.hours}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Quote */}
                        <div className="bg-gradient-to-br from-[#0066cc] to-[#0099ff] rounded-3xl p-6 text-white">
                            <h3 className="text-lg font-bold mb-3">Cotización Rápida</h3>
                            <p className="text-white/80 text-sm mb-4">Genera tu cotización en línea y recíbela al instante.</p>
                            <Link to="/#cotizador" className="inline-flex items-center gap-2 bg-white text-[#0066cc] px-5 py-3 rounded-xl font-bold hover:shadow-lg transition-all hover:scale-105">
                                <span className="material-symbols-outlined">calculate</span>
                                Ir al Cotizador
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-[#111518] text-white py-12">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <div className="logo-circle w-10 h-10">
                                <img src="/assets/logo.png" alt="Grupo AR" className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <p className="font-bold">Grupo AR</p>
                                <p className="text-xs text-white/60">Construcción & Industrial</p>
                            </div>
                        </div>
                        <div className="flex gap-6 text-sm text-white/60">
                            <Link to="/terminos" className="hover:text-white transition-colors">Términos</Link>
                            <Link to="/privacidad" className="hover:text-white transition-colors">Privacidad</Link>
                            <Link to="/servicios" className="hover:text-white transition-colors">Servicios</Link>
                        </div>
                    </div>
                    <div className="border-t border-white/10 mt-8 pt-8 flex flex-col items-center gap-2 text-center text-sm text-white/40">
                        <p>© 2026 Grupo AR. Todos los derechos reservados.</p>
                        <a href="https://zolvek-mx.web.app" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                            programado por ZOLVEK -- Francisco Lopez Velázquez
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
