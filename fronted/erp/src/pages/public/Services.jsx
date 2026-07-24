import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase/firebase";

const WHATSAPP_NUMBER = "524641390122";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
const EMAIL = "grupo.ar.cyd@gmail.com";

// Default services from the catalog reference
const defaultServices = [
    { id: "1", icon: "📐", title: "Diseño Arquitectónico & Estructural", desc: "Proyectos de ingeniería con software especializado y modelado 3D profesional. Planos, renders y cálculos estructurales.", features: ["Planos arquitectónicos", "Cálculo estructural", "Modelado 3D", "Renders profesionales"] },
    { id: "2", icon: "🏗️", title: "Obra Civil y Cimentaciones", desc: "Construcción de cimientos, losas, muros y estructura para proyectos industriales y comerciales.", features: ["Cimentaciones", "Losas y entrepisos", "Muros de contención", "Acabados"] },
    { id: "3", icon: "🦾", title: "Estructuras Metálicas", desc: "Fabricación, montaje y soldadura de estructuras de acero para naves industriales, bodegas y edificios.", features: ["Fabricación en taller", "Montaje en sitio", "Estructuras para naves", "Mezzanines y entrepisos"] },
    { id: "4", icon: "🛠️", title: "Soldadura y Pailería Industrial", desc: "Trabajos especializados en soldadura de acero al carbón, inoxidable y aluminio. Tanques, pipas y estructuras.", features: ["Soldadura MIG/TIG", "Tanques y contenedores", "Pailería industrial", "Reparaciones"] },
    { id: "5", icon: "🔩", title: "Titanes, Grúas e Izaje", desc: "Flotilla propia de titanes y grúas para izaje, montaje y maniobras industriales en toda la República.", features: ["Titanes propios", "Maniobras especializadas", "Carga pesada", "Transporte especializado"] },
    { id: "6", icon: "⚡", title: "Electricidad & Automatización", desc: "Instalaciones eléctricas industriales, transformadores, subestaciones y sistemas de automatización.", features: ["Alta y baja tensión", "Subestaciones", "Automatización", "Mantenimiento preventivo"] },
    { id: "7", icon: "🧼", title: "Acero Inoxidable Grado Alimenticio", desc: "Fabricación de mobiliario y equipos industriales de acero inoxidable para industria alimenticia.", features: ["Mesas de trabajo", "Campanas y ductos", "Tanques sanitarios", "Equipo custom"] },
    { id: "8", icon: "🏢", title: "Remodelación & Mantenimiento", desc: "Renovación de espacios comerciales, oficinas e industriales. Pintura, paneles y acabados.", features: ["Remodelación integral", "Acabados premium", "Mantenimiento industrial", "Ampliaciones"] }
];

// Portfolio images
const portfolio = [
    { img: "https://i.imgur.com/TFsNz7f.jpeg", desc: "Farmacia y consultorio franquicia, apertura llave en mano." },
    { img: "https://i.imgur.com/KmV6LpG.jpeg", desc: "Soldadura industrial: armado y racks en planta." },
    { img: "https://i.imgur.com/uBMUszz.jpeg", desc: "Izaje de estructura de acero con titán." },
    { img: "https://i.imgur.com/p77wqn1.jpeg", desc: "Maniobra de titán para contenedor industrial." },
    { img: "https://i.imgur.com/QPdiquP.jpeg", desc: "Estructura de placas de acero para nave industrial." },
    { img: "https://i.imgur.com/YbkgaeN.jpeg", desc: "Soldadura en obra para tanque industrial." },
    { img: "https://i.imgur.com/fhTkrbk.jpeg", desc: "Montaje y operación de gran contenedor en planta." },
    { img: "https://i.imgur.com/37nbTWw.jpeg", desc: "Cocina industrial de diseño premium." }
];

// Benefits
const benefits = [
    { icon: "verified", title: "Profesionalismo & Experiencia", desc: "Equipo certificado y con experiencia real en industria y construcción de alto nivel." },
    { icon: "precision_manufacturing", title: "Titanes & Maquinaria Propia", desc: "Flotilla propia para izaje, montaje y maniobras industriales en toda la República." },
    { icon: "handyman", title: "Solución 100% Integral", desc: "Desde el diseño hasta la obra civil, titanes, montaje y mantenimiento: todo en un solo equipo." },
    { icon: "schedule", title: "Entrega y Cumplimiento", desc: "Cumplimiento estricto de plazos, gestión profesional y seguridad total en cada proyecto." },
    { icon: "workspace_premium", title: "Certificación & Garantía", desc: "Cumplimos OSHA, NOM, ANSI, ASME y brindamos garantía y calidad respaldada." }
];

export default function Services() {
    const [services, setServices] = useState(defaultServices);
    const [activeService, setActiveService] = useState(null);

    useEffect(() => {
        // Try to load from Firebase, fallback to defaults
        const fetchServices = async () => {
            try {
                const snap = await getDocs(query(collection(db, "services"), orderBy("order", "asc")));
                if (!snap.empty) {
                    setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                }
            } catch (e) { console.error(e); }
        };
        fetchServices();
    }, []);

    return (
        <div className="min-h-screen bg-[#f8fafc] font-['Plus_Jakarta_Sans',sans-serif]">
            {/* Floating WhatsApp */}
            <a href={`${WHATSAPP_URL}?text=${encodeURIComponent("Hola, me interesa cotizar un servicio")}`} target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300" style={{ boxShadow: "0 4px 25px rgba(37,211,102,0.4)" }}>
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
                        <Link to="/servicios" className="text-sm font-semibold text-[#0066cc]">Servicios</Link>
                        <Link to="/contacto" className="text-sm font-semibold text-[#60778a] hover:text-[#0066cc] transition-colors">Contacto</Link>
                    </nav>
                    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-full text-sm font-semibold hover:shadow-lg transition-all">
                        💬 Cotizar
                    </a>
                </div>
            </header>

            {/* Hero */}
            <section className="hero-gradient text-white py-20 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://i.imgur.com/xvCib6j.jpeg')] bg-cover bg-center opacity-20"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70"></div>
                <div className="relative max-w-7xl mx-auto px-4 text-center z-10">
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-4 py-2 mb-6 animate-fade-in-up border border-white/30">
                        <span className="material-symbols-outlined text-sm">construction</span>
                        <span className="text-sm font-medium">+500 proyectos exitosos</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold mb-6 animate-fade-in-up" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>Servicios de Construcción<br /><span className="text-cyan-300">& Industria</span></h1>
                    <p className="text-xl text-white/95 max-w-2xl mx-auto mb-8 animate-fade-in-up delay-200" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}>Soluciones integrales desde el diseño hasta la entrega. Experiencia, maquinaria propia y calidad garantizada.</p>
                    <div className="flex flex-wrap justify-center gap-4 animate-fade-in-up delay-300">
                        <a href="#servicios" className="btn-primary text-lg px-8 py-4">Ver Servicios</a>
                        <a href={`${WHATSAPP_URL}?text=${encodeURIComponent("Hola, quiero cotizar un proyecto")}`} target="_blank" rel="noopener noreferrer" className="btn-whatsapp text-lg px-8 py-4">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                            Cotizar Proyecto
                        </a>
                    </div>
                </div>
            </section>

            {/* Services Grid */}
            <section id="servicios" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <span className="badge-premium mb-4">Nuestros Servicios</span>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-[#111518] mb-4">Todo lo que Necesitas</h2>
                        <p className="text-[#60778a] max-w-xl mx-auto">Ofrecemos soluciones completas para proyectos industriales, comerciales y residenciales.</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {services.map((service, i) => (
                            <div
                                key={service.id}
                                className="group bg-[#f8fafc] rounded-2xl p-6 border border-[#e5e7eb] hover:bg-white hover:shadow-xl hover:border-[#0066cc]/30 transition-all duration-500 cursor-pointer hover:-translate-y-2"
                                onClick={() => setActiveService(activeService === service.id ? null : service.id)}
                                style={{ animationDelay: `${i * 0.1}s` }}
                            >
                                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{service.icon}</div>
                                <h3 className="text-lg font-bold text-[#111518] mb-2 group-hover:text-[#0066cc] transition-colors">{service.title}</h3>
                                <p className="text-sm text-[#60778a] leading-relaxed mb-4">{service.desc}</p>

                                {service.features && activeService === service.id && (
                                    <div className="space-y-2 mt-4 pt-4 border-t border-[#e5e7eb] animate-fade-in-up">
                                        {service.features.map((f, j) => (
                                            <div key={j} className="flex items-center gap-2 text-sm text-[#60778a]">
                                                <span className="material-symbols-outlined text-green-500 text-[16px]">check_circle</span>
                                                {f}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <a href={`${WHATSAPP_URL}?text=${encodeURIComponent(`Hola, me interesa el servicio de: ${service.title}`)}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-[#0066cc] font-semibold hover:gap-3 transition-all">
                                    Cotizar <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Portfolio Gallery */}
            <section className="py-20 bg-[#f8fafc]">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <span className="badge-premium mb-4">Portafolio</span>
                        <h2 className="text-3xl font-extrabold text-[#111518] mb-4">Proyectos Realizados</h2>
                        <p className="text-[#60778a]">Más de 15 años de experiencia respaldando nuestro trabajo.</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {portfolio.map((item, i) => (
                            <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden">
                                <img src={item.img} alt={item.desc} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                    <p className="text-white text-sm font-medium">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefits */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <span className="badge-premium mb-4">¿Por qué Elegirnos?</span>
                        <h2 className="text-3xl font-extrabold text-[#111518]">Nuestras Ventajas</h2>
                    </div>

                    <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {benefits.map((b, i) => (
                            <div key={i} className="text-center p-6 rounded-2xl hover:bg-[#f8fafc] transition-colors duration-300">
                                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#0066cc] to-[#0099ff] rounded-2xl flex items-center justify-center shadow-lg">
                                    <span className="material-symbols-outlined text-white text-2xl">{b.icon}</span>
                                </div>
                                <h3 className="font-bold text-[#111518] mb-2">{b.title}</h3>
                                <p className="text-sm text-[#60778a]">{b.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="hero-gradient py-20 text-white">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-extrabold mb-6">¿Listo para tu Proyecto?</h2>
                    <p className="text-xl text-white/80 mb-8">Contáctanos hoy y recibe asesoría personalizada sin costo.</p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <a href={`${WHATSAPP_URL}?text=${encodeURIComponent("Hola, me gustaría agendar una visita para cotizar mi proyecto")}`} target="_blank" rel="noopener noreferrer" className="btn-whatsapp text-lg px-8 py-4">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                            Agendar Visita
                        </a>
                        <a href={`mailto:${EMAIL}`} className="btn-secondary text-lg px-8 py-4">
                            <span className="material-symbols-outlined">mail</span>
                            Enviar Email
                        </a>
                    </div>
                </div>
            </section>

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
                            <Link to="/contacto" className="hover:text-white transition-colors">Contacto</Link>
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
