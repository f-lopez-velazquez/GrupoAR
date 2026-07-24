import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getPublicCatalog, getCatalogCategories } from "../../services/catalogService";

const WHATSAPP_NUMBER = "524641390122";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export default function Catalog() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const prods = await getPublicCatalog({ inStock: true });
            setProducts(prods);
        } catch (e) {
            console.error("Error cargando productos:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        const cats = await getCatalogCategories();
        setCategories(cats);
    };

    const filtered = products.filter(p => {
        const matchSearch = search === "" || p.name?.toLowerCase().includes(search.toLowerCase());
        const matchCat = !category || p.category === category;
        return matchSearch && matchCat;
    });

    const featuredProducts = products.filter(p => p.featured).slice(0, 4);

    return (
        <div className="min-h-screen bg-[#f8fafc] font-['Plus_Jakarta_Sans',sans-serif]">
            {/* Floating WhatsApp */}
            <a href={`${WHATSAPP_URL}?text=${encodeURIComponent("Hola, me interesa un producto del catálogo")}`} target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300 animate-pulse-glow" style={{ boxShadow: "0 4px 25px rgba(37,211,102,0.4)" }}>
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
                            <p className="text-[10px] text-[#60778a]">Ferretería y Construcción</p>
                        </div>
                    </Link>
                    <nav className="hidden md:flex items-center gap-6">
                        <Link to="/" className="text-sm font-semibold text-[#60778a] hover:text-[#0066cc] transition-colors">Inicio</Link>
                        <Link to="/catalogo" className="text-sm font-semibold text-[#0066cc]">Catálogo</Link>
                        <Link to="/servicios" className="text-sm font-semibold text-[#60778a] hover:text-[#0066cc] transition-colors">Servicios</Link>
                        <Link to="/contacto" className="text-sm font-semibold text-[#60778a] hover:text-[#0066cc] transition-colors">Contacto</Link>
                    </nav>
                    <Link to="/portal/login" className="text-sm font-semibold text-[#0066cc] hover:underline">Portal</Link>
                </div>
            </header>

            {/* Hero with Better Contrast */}
            <section className="relative py-20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800"></div>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
                <div className="relative max-w-7xl mx-auto px-4 text-center text-white z-10">
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-5 py-2.5 mb-6 border border-white/30">
                        <span className="material-symbols-outlined text-sm">inventory_2</span>
                        <span className="text-sm font-medium">{products.length} productos disponibles</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4 animate-fade-in-up" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>Catálogo de Productos</h1>
                    <p className="text-white/95 max-w-xl mx-auto text-lg" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.3)' }}>Todo lo que necesitas para tu proyecto de construcción y hogar.</p>
                </div>
            </section>

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-4 -mt-8 relative z-10">
                <div className="bg-white rounded-2xl border border-[#e5e7eb] p-5 shadow-lg flex flex-wrap gap-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#60778a]">search</span>
                        <input className="w-full h-12 pl-12 pr-4 rounded-xl border border-[#dbe1e6] bg-[#f8fafc] text-sm focus:border-[#0066cc] focus:ring-4 focus:ring-[#0066cc]/10 transition-all" placeholder="Buscar productos..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <select className="h-12 px-4 rounded-xl border border-[#dbe1e6] bg-[#f8fafc] text-sm min-w-[160px] focus:border-[#0066cc] transition-all" value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="">Todas las Categorías</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {(search || category) && (
                        <button onClick={() => { setSearch(""); setCategory(""); }} className="h-12 px-4 rounded-xl border border-[#dbe1e6] bg-white text-sm text-[#60778a] hover:bg-[#f8fafc] transition-colors flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">close</span>
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            {/* Featured */}
            {featuredProducts.length > 0 && !search && !category && (
                <div className="max-w-7xl mx-auto px-4 mt-12 mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-3xl">⭐</span>
                        <h2 className="text-2xl font-bold text-[#111518]">Productos Destacados</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                        {featuredProducts.map(p => (
                            <ProductCard key={p.id} product={p} featured />
                        ))}
                    </div>
                </div>
            )}

            {/* Products Grid */}
            <main className="max-w-7xl mx-auto px-4 py-12">
                <h2 className="text-xl font-bold text-[#111518] mb-6">
                    {search || category ? `Resultados (${filtered.length})` : "Todos los Productos"}
                </h2>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="w-12 h-12 border-4 border-[#0066cc]/20 border-t-[#0066cc] rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-[#60778a]">Cargando productos...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 text-[#60778a]">
                        <span className="material-symbols-outlined text-5xl mb-4 text-[#dbe1e6]">inventory_2</span>
                        <p>No se encontraron productos</p>
                        <button onClick={() => { setSearch(""); setCategory(""); }} className="mt-4 text-[#0066cc] hover:underline font-semibold">Limpiar filtros</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                        {filtered.map(p => <ProductCard key={p.id} product={p} />)}
                    </div>
                )}
            </main>

            {/* CTA */}
            <section className="bg-gradient-to-r from-[#111518] to-[#1e293b] py-16">
                <div className="max-w-7xl mx-auto px-4 text-center text-white">
                    <h2 className="text-3xl font-extrabold mb-4">¿No encuentras lo que buscas?</h2>
                    <p className="text-white/70 mb-8 max-w-lg mx-auto">Contáctanos por WhatsApp y te ayudamos a encontrar cualquier producto. Manejamos todo tipo de materiales de construcción.</p>
                    <a href={`${WHATSAPP_URL}?text=${encodeURIComponent("Hola, busco un producto específico...")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                        Pedir por WhatsApp
                    </a>
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
                                <p className="text-xs text-white/60">Ferretería y Construcción</p>
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

function ProductCard({ product, featured }) {
    return (
        <div className={`group bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden hover:shadow-xl transition-all duration-500 hover:-translate-y-2 ${featured ? 'ring-2 ring-[#0066cc]/20' : ''}`}>
            <div className="aspect-square bg-gradient-to-br from-[#f8fafc] to-[#e5e7eb] relative overflow-hidden">
                {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#60778a]">
                        <span className="material-symbols-outlined text-5xl mb-2 text-[#dbe1e6]">image</span>
                        <span className="text-xs text-[#a0aec0]">Sin imagen</span>
                    </div>
                )}
                {featured && (
                    <span className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">⭐ Destacado</span>
                )}
                {(product.stock || 0) === 0 && (
                    <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">Agotado</span>
                )}
            </div>
            <div className="p-5">
                <p className="text-xs text-[#60778a] mb-1 uppercase tracking-wider font-semibold">{product.category || "General"}</p>
                <h3 className="font-bold text-[#111518] line-clamp-2 mb-3 group-hover:text-[#0066cc] transition-colors">{product.name}</h3>
                <p className="text-2xl font-extrabold text-[#0066cc] mb-4">${(product.price || 0).toFixed(2)}</p>
                <a href={`https://wa.me/524641390122?text=${encodeURIComponent(`Hola, me interesa: ${product.name}`)}`} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white rounded-xl font-semibold transition-all duration-300 hover:shadow-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    Cotizar
                </a>
            </div>
        </div>
    );
}
