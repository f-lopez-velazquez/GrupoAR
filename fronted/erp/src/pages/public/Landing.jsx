import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

const WHATSAPP_NUMBER = "524641390122";
const EMAIL = "grupo.ar.cyd@gmail.com";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

// Services Data
const services = [
    { icon: "📐", title: "Diseño Arquitectónico & Estructural", desc: "Proyectos de ingeniería con software especializado y modelado 3D profesional." },
    { icon: "🏗️", title: "Obra Civil y Cimentaciones", desc: "Construcción de cimientos, losas, muros y estructura para proyectos industriales y comerciales." },
    { icon: "🦾", title: "Estructuras Metálicas", desc: "Fabricación, montaje y soldadura de estructuras de acero para naves y edificios." },
    { icon: "🛠️", title: "Soldadura y Pailería Industrial", desc: "Trabajos especializados en acero al carbón, inoxidable y aluminio." },
    { icon: "🔩", title: "Titanes y Grúas para Izaje", desc: "Flotilla propia de titanes y grúas para izaje, montaje y maniobras industriales." },
    { icon: "⚡", title: "Electricidad Industrial", desc: "Instalaciones eléctricas, transformadores, subestaciones y automatización." },
    { icon: "🚚", title: "Maquinaria y Equipo", desc: "Renta de equipo pesado y flotilla de transporte especializado." },
    { icon: "🧼", title: "Acero Inoxidable Grado Alimenticio", desc: "Fabricación de mobiliario y equipos para industria alimenticia." },
    { icon: "🏢", title: "Remodelación y Ampliaciones", desc: "Renovación de espacios comerciales, oficinas y naves industriales." },
    { icon: "🛡️", title: "Certificación y Garantía", desc: "Cumplimiento OSHA, NOM, ANSI, ASME con garantía respaldada." }
];

// Portfolio Data
const portfolio = [
    { img: "https://i.imgur.com/TFsNz7f.jpeg", desc: "Farmacia y consultorio franquicia, apertura llave en mano." },
    { img: "https://i.imgur.com/KmV6LpG.jpeg", desc: "Soldadura industrial: armado y racks en planta." },
    { img: "https://i.imgur.com/uBMUszz.jpeg", desc: "Izaje de estructura de acero con titán." },
    { img: "https://i.imgur.com/p77wqn1.jpeg", desc: "Maniobra de titán para contenedor industrial." },
    { img: "https://i.imgur.com/P3xrk9d.jpeg", desc: "Colocación de contenedor metálico con pluma hidráulica." },
    { img: "https://i.imgur.com/QPdiquP.jpeg", desc: "Estructura de placas de acero para nave industrial." },
    { img: "https://i.imgur.com/YbkgaeN.jpeg", desc: "Soldadura en obra para tanque industrial." },
    { img: "https://i.imgur.com/1Kd5cV9.jpeg", desc: "Diseño y modelado estructural con software especializado." },
    { img: "https://i.imgur.com/fhTkrbk.jpeg", desc: "Montaje y operación de gran contenedor en planta." },
    { img: "https://i.imgur.com/NNecFzA.jpeg", desc: "Máquina soldada para producción industrial." },
    { img: "https://i.imgur.com/Aj5aN7R.jpeg", desc: "Racks móviles y estructura para logística de almacén." },
    { img: "https://i.imgur.com/xvCib6j.jpeg", desc: "Techado de nave industrial para almacenaje." },
    { img: "https://i.imgur.com/TQYpJMU.jpeg", desc: "Levantamiento y montaje de estructura con garrocha." },
    { img: "https://i.imgur.com/vQ3tXYB.jpeg", desc: "Ensamblado de estructuras metálicas en taller." },
    { img: "https://i.imgur.com/NRrYuNF.jpeg", desc: "Fabricación de maquinaria en acero grado alimenticio." },
    { img: "https://i.imgur.com/1gqzFyl.jpeg", desc: "Soldadura en grandes pipas y contenedores." },
    { img: "https://i.imgur.com/aXIZqUY.jpeg", desc: "Instalación eléctrica: transformadores en nave." },
    { img: "https://i.imgur.com/QQVwjMN.jpeg", desc: "Impermeabilización profesional en losa." },
    { img: "https://i.imgur.com/37nbTWw.jpeg", desc: "Cocina industrial de diseño premium." },
    { img: "https://i.imgur.com/cLTupmF.jpeg", desc: "Paneles de yeso con diseño arquitectónico." },
    { img: "https://i.imgur.com/3E0cp5h.jpeg", desc: "Closet y mobiliario en panelería profesional." },
    { img: "https://i.imgur.com/7gmOQe3.jpeg", desc: "Sobre firme industrial: piso para planta." },
    { img: "https://i.imgur.com/ZFaZKQt.jpeg", desc: "Remodelación de recámara con panel LED." },
    { img: "https://i.imgur.com/Ne8aRhM.jpeg", desc: "Centro de llenado de agua industrial." }
];

// Categories for services
const categories = [
    { id: "industrial", name: "Industrial", icon: "factory" },
    { id: "comercial", name: "Comercial", icon: "store" },
    { id: "construccion", name: "Construcción", icon: "construction" },
    { id: "mantenimiento", name: "Mantenimiento", icon: "build" }
];

// Stats
const stats = [
    { value: "15+", label: "Años de Experiencia" },
    { value: "500+", label: "Proyectos Completados" },
    { value: "100%", label: "Clientes Satisfechos" },
    { value: "24/7", label: "Soporte Disponible" }
];

export default function Landing() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activePortfolio, setActivePortfolio] = useState(0);
    const [visibleSections, setVisibleSections] = useState({});
    const observerRefs = useRef({});

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setVisibleSections((prev) => ({ ...prev, [entry.target.id]: true }));
                    }
                });
            },
            { threshold: 0.1 }
        );

        document.querySelectorAll("[data-animate]").forEach((el) => {
            observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    // Auto-rotate portfolio
    useEffect(() => {
        const interval = setInterval(() => {
            setActivePortfolio((prev) => (prev + 1) % Math.ceil(portfolio.length / 4));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-[#f8fafc] font-['Plus_Jakarta_Sans',sans-serif] overflow-x-hidden">
            {/* Floating WhatsApp Button */}
            <a
                href={`${WHATSAPP_URL}?text=${encodeURIComponent("Hola, me interesa una cotización con Grupo AR")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300 animate-pulse-glow"
                style={{ boxShadow: "0 4px 25px rgba(37,211,102,0.4)" }}
            >
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
            </a>

            {/* Header */}
            <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${isScrolled ? 'bg-white/95 backdrop-blur-xl shadow-lg py-3' : 'bg-transparent py-5'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-3 group">
                            <div className="logo-circle w-12 h-12">
                                <img src="/assets/logo.png" alt="Grupo AR" />
                            </div>
                            <div className="hidden sm:block">
                                <p className={`font-bold text-lg transition-colors ${isScrolled ? 'text-[#111518]' : 'text-[#111518]'}`}>Grupo AR</p>
                                <p className={`text-xs font-medium transition-colors ${isScrolled ? 'text-[#60778a]' : 'text-[#60778a]'}`}>Construcción & Industrial</p>
                            </div>
                        </Link>

                        {/* Desktop Nav */}
                        <nav className="hidden lg:flex items-center gap-8">
                            {["Inicio", "Servicios", "Portafolio", "Cotizador", "Contacto"].map((item) => (
                                <a
                                    key={item}
                                    href={`#${item.toLowerCase()}`}
                                    className={`text-sm font-semibold transition-all duration-300 hover:scale-105 ${isScrolled ? 'text-[#111518] hover:text-[#0066cc]' : 'text-[#111518] hover:text-[#0066cc]'}`}
                                >
                                    {item}
                                </a>
                            ))}
                        </nav>

                        {/* CTA Buttons */}
                        <div className="hidden lg:flex items-center gap-4">
                            <Link to="/portal/login" className={`text-sm font-semibold transition-colors ${isScrolled ? 'text-[#60778a] hover:text-[#0066cc]' : 'text-[#60778a] hover:text-[#0066cc]'}`}>
                                Portal
                            </Link>
                            <a href={`${WHATSAPP_URL}?text=${encodeURIComponent("Hola, necesito información")}`} target="_blank" rel="noopener noreferrer" className="group relative overflow-hidden bg-gradient-to-r from-green-400 to-green-600 text-white text-sm font-bold py-2.5 px-6 rounded-full shadow-lg hover:shadow-2xl hover:from-green-500 hover:to-green-700 transition-all duration-300 transform hover:scale-105 flex items-center gap-2">
                                <svg className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                <span className="relative z-10">Cotizar</span>
                                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </a>
                        </div>

                        {/* Mobile Menu Button */}
                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2">
                            <span className={`material-symbols-outlined text-2xl ${isScrolled ? 'text-[#111518]' : 'text-[#111518]'}`}>
                                {mobileMenuOpen ? 'close' : 'menu'}
                            </span>
                        </button>
                    </div>

                    {/* Mobile Menu */}
                    {mobileMenuOpen && (
                        <div className="lg:hidden mt-4 pb-4 border-t border-gray-100 pt-4 animate-fade-in-up">
                            <nav className="flex flex-col gap-3">
                                {["Inicio", "Servicios", "Portafolio", "Cotizador", "Contacto"].map((item) => (
                                    <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMobileMenuOpen(false)} className={`text-base font-semibold py-2 text-[#111518]`}>
                                        {item}
                                    </a>
                                ))}
                                <Link to="/portal/login" className="text-base font-semibold py-2 text-[#0066cc]">Portal Interno</Link>
                            </nav>
                        </div>
                    )}
                </div>
            </header>

            {/*  Catálogo Ferretería - Sección Destacada Premium */}
            <section id="catalogo-preview" data-animate className="bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20 relative overflow-hidden">
                {/* Parallax Background Elements */}
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-10 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl" style={{ animation: 'parallax-float 6s ease-in-out infinite' }}></div>
                    <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" style={{ animation: 'parallax-float 8s ease-in-out infinite reverse' }}></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className={`text-center mb-12 ${visibleSections['catalogo-preview'] ? 'opacity-100' : 'opacity-0'}`} style={visibleSections['catalogo-preview'] ? { animation: 'smooth-slide-up 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' } : {}}>
                        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-blue-200 rounded-full px-6 py-3 mb-6 shadow-lg">
                            <span className="material-symbols-outlined text-blue-600 animate-pulse">store</span>
                            <span className="text-sm font-bold text-blue-600">Ferretería & Materiales</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">Catálogo de <span className="text-blue-600">Productos</span></h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">Todo lo que necesitas para tu obra: herramientas, materiales de construcción, equipo industrial y más.</p>
                    </div>

                    {/* Featured Products Preview */}
                    <div className="grid md:grid-cols-3 gap-8 mb-12">
                        {[
                            { icon: "construction", name: "Herramientas", desc: "Eléctricas y manuales", color: "blue" },
                            { icon: "hardware", name: "Materiales", desc: "Construcción e industria", color: "green" },
                            { icon: "settings", name: "Equipo Industrial", desc: "Maquinaria y accesorios", color: "purple" }
                        ].map((cat, i) => (
                            <div key={i} className={`group relative bg-white/60 backdrop-blur-xl rounded-3xl p-8 border border-gray-200/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl ${visibleSections['catalogo-preview'] ? 'opacity-100' : 'opacity-0'}`} style={visibleSections['catalogo-preview'] ? { animation: `scale-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 * (i + 1)}s forwards` } : {}}>
                                <div className={`w-16 h-16 ${i === 0 ? 'bg-gradient-to-br from-blue-400 to-blue-600' : i === 1 ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-purple-400 to-purple-600'} rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform duration-300`}>
                                    <span className="material-symbols-outlined text-white text-3xl">{cat.icon}</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{cat.name}</h3>
                                <p className="text-gray-600">{cat.desc}</p>
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </div>
                        ))}
                    </div>

                    {/* CTA to Full Catalog */}
                    <div className="text-center">
                        <Link to="/catalogo" className="group inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-lg font-bold py-4 px-10 rounded-full shadow-xl hover:shadow-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105">
                            <span className="material-symbols-outlined group-hover:rotate-12 transition-transform duration-300">storefront</span>
                            Ver Catálogo Completo
                            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform duration-300">arrow_forward</span>
                        </Link>
                        <p className="mt-4 text-sm text-gray-500">Precios competitivos • Envío disponible • Facturación</p>
                    </div>
                </div>

                {/* Inline Keyframes for Animations */}
                <style>{`
                    @keyframes parallax-float {
                        0%, 100% { transform: translateY(0px) translateX(0px); }
                        50% { transform: translateY(-30px) translateX(-15px); }
                    }
                    @keyframes smooth-slide-up {
                        from { opacity: 0; transform: translateY(60px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes scale-in {
                        from { opacity: 0; transform: scale(0.85); }
                        to { opacity: 1; transform: scale(1); }
                    }
                `}</style>
            </section>
            <section id="inicio" className="relative min-h-screen flex items-center hero-gradient overflow-hidden">
                {/* Floating Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-[#0066cc]/5 rounded-full blur-3xl float-element"></div>
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#0066cc]/5 rounded-full blur-3xl float-element"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-[#0066cc]/5 to-transparent rounded-full blur-3xl"></div>
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
                    <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
                        <div className="text-left animate-fade-in-up">
                            <div className="inline-flex items-center gap-2 bg-blue-50 text-[#0066cc] border border-blue-200 rounded-full px-5 py-2.5 mb-6 shadow-sm hover:shadow-md transition-shadow">
                                <span className="w-2.5 h-2.5 bg-[#0066cc] rounded-full animate-pulse"></span>
                                <span className="text-sm font-bold">+15 años transformando la industria</span>
                            </div>

                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 text-[#111518]">
                                Construcción Industrial <span className="text-[#0066cc]">y Mantenimiento</span>
                            </h1>
                            <div className="mt-10 flex flex-wrap gap-6 items-center">
                                <div className="flex items-center gap-2 text-[#60778a] text-sm font-medium">
                                    <span className="material-symbols-outlined text-[#0066cc]">verified</span>
                                    OSHA Certified
                                </div>
                                <div className="flex items-center gap-2 text-[#60778a] text-sm font-medium">
                                    <span className="material-symbols-outlined text-[#0066cc]">verified</span>
                                    NOM Compliance
                                </div>
                                <div className="flex items-center gap-2 text-[#60778a] text-sm font-medium">
                                    <span className="material-symbols-outlined text-[#0066cc]">verified</span>
                                    ASME Standards
                                </div>
                            </div>
                        </div>

                        {/* Hero Image/Stats */}
                        <div className="relative animate-fade-in-scale delay-200">
                            <div className="grid grid-cols-2 gap-4">
                                {stats.map((stat, i) => (
                                    <div key={i} className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                                        <p className="text-3xl sm:text-4xl font-extrabold text-[#0066cc] mb-1">{stat.value}</p>
                                        <p className="text-sm text-[#60778a] font-medium">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                    <a href="#servicios" className="text-[#0066cc] hover:text-[#004d99] transition-colors">
                        <span className="material-symbols-outlined text-3xl">expand_more</span>
                    </a>
                </div>
            </section>

            {/* Services Section */}
            <section id="servicios" data-animate className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className={`text-center mb-16 ${visibleSections.servicios ? 'animate-fade-in-up' : 'opacity-0'}`}>
                        <span className="badge-premium mb-4">Nuestros Servicios</span>
                        <h2 className="section-title text-[#111518]">Soluciones Integrales</h2>
                        <p className="section-subtitle">Todo lo que necesitas para tu proyecto industrial o comercial, en un solo lugar.</p>
                    </div>

                    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 ${visibleSections.servicios ? 'animate-fade-in-up delay-200' : 'opacity-0'}`}>
                        {services.map((service, i) => (
                            <div key={i} className="group card-premium p-6 hover:border-[#0066cc]/30 relative cursor-pointer" style={{ animationDelay: `${i * 0.1}s` }}>
                                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{service.icon}</div>
                                <h3 className="font-bold text-[#111518] mb-2 group-hover:text-[#0066cc] transition-colors">{service.title}</h3>
                                <p className="text-sm text-[#60778a] line-clamp-3">{service.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Portfolio Section */}
            <section id="portafolio" data-animate className="py-24 bg-[#f8fafc] particle-bg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className={`text-center mb-16 ${visibleSections.portafolio ? 'animate-fade-in-up' : 'opacity-0'}`}>
                        <span className="badge-premium mb-4">Portafolio</span>
                        <h2 className="section-title text-[#111518]">Proyectos Realizados</h2>
                        <p className="section-subtitle">Más de 500 proyectos exitosos en toda la República Mexicana.</p>
                    </div>

                    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${visibleSections.portafolio ? 'animate-fade-in-up delay-200' : 'opacity-0'}`}>
                        {portfolio.slice(0, 12).map((item, i) => (
                            <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden img-zoom" style={{ animationDelay: `${i * 0.05}s` }}>
                                <img src={item.img} alt={item.desc} className="w-full h-full object-cover" loading="lazy" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                    <p className="text-white text-sm font-medium">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-10">
                        <a href={`${WHATSAPP_URL}?text=${encodeURIComponent("Hola, me gustaría ver más proyectos de su portafolio")}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                            <span className="material-symbols-outlined">photo_library</span>
                            Ver Más Proyectos
                        </a>
                    </div>
                </div>
            </section>

            {/* Quote CTA Section */}
            <section id="cotizador" data-animate className="py-24 bg-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className={`text-center ${visibleSections.cotizador ? 'animate-fade-in-up' : 'opacity-0'}`}>
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#e8f4fc] text-[#0a6ec8] rounded-full text-sm font-semibold mb-6">
                            <span className="material-symbols-outlined text-lg">request_quote</span>
                            Cotizaciones Profesionales
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111518] mb-4">¿Necesitas una Cotización?</h2>
                        <p className="text-lg text-[#60778a] max-w-2xl mx-auto mb-8">
                            Contáctanos por WhatsApp y uno de nuestros asesores te enviará una cotización detallada con precios competitivos.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <a
                                href={`${WHATSAPP_URL}?text=${encodeURIComponent('Hola, me gustaría solicitar una cotización para mi proyecto')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#25d366] text-white font-bold rounded-xl hover:bg-[#1fb855] transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                Solicitar Cotización
                            </a>
                            <a
                                href="tel:+524641390122"
                                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-[#111518] font-bold rounded-xl border-2 border-[#e5e7eb] hover:border-[#0a6ec8] hover:text-[#0a6ec8] transition-all"
                            >
                                <span className="material-symbols-outlined">call</span>
                                464 139 0122
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contacto" data-animate className="py-24 bg-white border-t border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className={`grid lg:grid-cols-2 gap-12 items-center ${visibleSections.contacto ? 'animate-fade-in-up' : 'opacity-0'}`}>
                        <div>
                            <h2 className="text-3xl sm:text-4xl font-extrabold mb-6 text-[#111518]">¿Listo para tu proyecto?</h2>
                            <p className="text-lg text-[#60778a] mb-8">
                                Contáctanos hoy y recibe asesoría personalizada sin costo.
                                Nuestro equipo te ayudará a encontrar la mejor solución para tu proyecto.
                            </p>

                            <div className="space-y-4">
                                <a href={`tel:+52${WHATSAPP_NUMBER}`} className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-colors">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[#0066cc]">phone</span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-[#60778a]">Teléfono</p>
                                        <p className="font-bold text-[#111518]">464 139 0122</p>
                                    </div>
                                </a>
                                <a href={`mailto:${EMAIL}`} className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-colors">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[#0066cc]">mail</span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-[#60778a]">Email</p>
                                        <p className="font-bold text-[#111518]">{EMAIL}</p>
                                    </div>
                                </a>
                                <a href={`${WHATSAPP_URL}?text=${encodeURIComponent("Hola, me gustaría una cotización")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-400 to-green-600 rounded-xl hover:from-green-500 hover:to-green-700 transition-all shadow-lg hover:shadow-xl">
                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-sm text-white/90">WhatsApp</p>
                                        <p className="font-bold text-white">Enviar Mensaje</p>
                                    </div>
                                </a>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 text-[#111518]">
                            <h3 className="text-xl font-bold mb-6">Envíanos un Mensaje</h3>
                            <ContactForm />
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#111518] text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-8 mb-12">
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="logo-circle w-12 h-12">
                                    <img src="/assets/logo.png" alt="Grupo AR" />
                                </div>
                                <div>
                                    <p className="font-bold text-lg">Grupo AR</p>
                                    <p className="text-sm text-white/60">Construcción & Industrial</p>
                                </div>
                            </div>
                            <p className="text-white/60 text-sm max-w-md mb-4">
                                Soluciones integrales en construcción, estructuras metálicas, izaje industrial y más.
                                Más de 15 años de experiencia respaldando nuestro trabajo.
                            </p>
                            <div className="flex gap-4">
                                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-green-500/30 transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                </a>
                                <a href={`mailto:${EMAIL}`} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-blue-500/30 transition-colors">
                                    <span className="material-symbols-outlined">mail</span>
                                </a>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold mb-4">Servicios</h4>
                            <ul className="space-y-2 text-sm text-white/60">
                                <li><a href="#servicios" className="hover:text-white transition-colors">Estructuras Metálicas</a></li>
                                <li><a href="#servicios" className="hover:text-white transition-colors">Obra Civil</a></li>
                                <li><a href="#servicios" className="hover:text-white transition-colors">Titanes e Izaje</a></li>
                                <li><a href="#servicios" className="hover:text-white transition-colors">Electricidad Industrial</a></li>
                                <li><a href="#servicios" className="hover:text-white transition-colors">Remodelación</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-white/60">
                                <li><Link to="/terminos" className="hover:text-white transition-colors">Términos y Condiciones</Link></li>
                                <li><Link to="/privacidad" className="hover:text-white transition-colors">Aviso de Privacidad</Link></li>
                                <li><a href="#cotizador" className="hover:text-white transition-colors">Cotizador</a></li>
                                <li><Link to="/portal/login" className="hover:text-white transition-colors">Portal Empleados</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                            <p className="text-sm text-white/40">© 2026 Grupo AR. Todos los derechos reservados.</p>
                            <span className="hidden md:inline text-white/20">|</span>
                            <a href="https://zolvek-mx.web.app" target="_blank" rel="noopener noreferrer" className="text-sm text-white/40 hover:text-white transition-colors">
                                programado por ZOLVEK -- Francisco Lopez Velázquez
                            </a>
                        </div>
                        <p className="text-sm text-white/40">Salamanca, Guanajuato</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

// Contact Form Component
function ContactForm() {
    const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.message) return;

        setSending(true);
        // Send via WhatsApp as backup
        const message = `*Nuevo Contacto desde Web*\n\n*Nombre:* ${form.name}\n*Email:* ${form.email}\n*Teléfono:* ${form.phone}\n*Mensaje:* ${form.message}`;
        window.open(`${WHATSAPP_URL}?text=${encodeURIComponent(message)}`, "_blank");
        setSent(true);
        setSending(false);
    };

    if (sent) {
        return (
            <div className="text-center py-8">
                <span className="material-symbols-outlined text-green-500 text-5xl mb-4">check_circle</span>
                <p className="text-xl font-bold mb-2">¡Mensaje Enviado!</p>
                <p className="text-[#60778a]">Te contactaremos pronto.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input className="input-premium" placeholder="Tu Nombre *" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
                <input className="input-premium" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <input className="input-premium" placeholder="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <textarea className="input-premium min-h-[120px]" placeholder="Tu Mensaje *" required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            <button type="submit" disabled={sending} className="w-full btn-primary justify-center">
                {sending ? "Enviando..." : "Enviar Mensaje"}
            </button>
        </form>
    );
}
