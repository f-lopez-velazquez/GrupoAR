import { useState } from 'react';
import { useLocation } from 'react-router-dom';

const HELP_CONTENT = {
    'default': {
        title: 'Ayuda General - ERP Grupo AR',
        steps: [
            { icon: 'dashboard', title: 'Panel Principal', desc: 'Resumen de toda la actividad de la empresa.' },
            { icon: 'menu', title: 'Menú Lateral', desc: 'Navega entre los módulos según tus permisos.' },
            { icon: 'account_circle', title: 'Perfil', desc: 'Gestiona tu cuenta y cierra sesión.' }
        ]
    },
    '/portal/pos': {
        title: 'Guía Terminal Punto de Venta (POS)',
        steps: [
            { icon: 'search', title: 'Buscar Items', desc: 'Escribe el nombre o escanea el código.' },
            { icon: 'shopping_cart', title: 'Carrito', desc: 'Ajusta cantidades o elimina items.' },
            { icon: 'request_quote', title: 'IVA', desc: 'Activa/Desactiva el IVA con el checkbox antes de cobrar.' },
            { icon: 'point_of_sale', title: 'Cobrar', desc: 'Selecciona método de pago y finaliza la venta.' }
        ]
    },
    '/portal/cotizador': {
        title: 'Guía del Cotizador',
        steps: [
            { icon: 'toggle_on', title: 'Modo Dual', desc: 'Cambia entre "Ferretería" (rápido) y "Proyecto" (detallado) en la parte superior.' },
            { icon: 'add_shopping_cart', title: 'Agregar Ítems', desc: 'Busca productos o escribe conceptos libres. Usa "Sin precio" para informativos.' },
            { icon: 'settings', title: 'Condiciones', desc: 'Abre el panel lateral para modificar anticipos y cláusulas.' },
            { icon: 'check_circle', title: 'Aprobar', desc: 'Convierte la cotización en una Obra/Proyecto automáticamente.' }
        ]
    },
    '/portal/resumen': {
        title: 'Guía de Resumen General',
        steps: [
            { icon: 'visibility', title: 'Solo Lectura', desc: 'Vista panorámica de todas las áreas.' },
            { icon: 'history', title: 'Cotizaciones', desc: 'Retoma cotizaciones antiguas o apruébalas desde aquí.' }
        ]
    },
    '/portal/obras': {
        title: 'Guía de Obras',
        steps: [
            { icon: 'add', title: 'Nueva Obra', desc: 'Crea un proyecto manual o desde una cotización.' },
            { icon: 'group', title: 'Asignar', desc: 'Gestiona empleados y registra materiales usados.' }
        ]
    }
};

export function GlobalHelp() {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    // Find best match for content
    const path = location.pathname;
    const contentKey = Object.keys(HELP_CONTENT).find(k => path.startsWith(k) && k !== 'default') || 'default';
    const content = HELP_CONTENT[contentKey];

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                title="Ayuda / Guía"
            >
                <span className="material-symbols-outlined text-[20px]">help</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden scale-in-center animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="bg-slate-900 p-6 text-white relative">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-yellow-400">lightbulb</span>
                                {content.title}
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                {content.steps.map((step, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-blue-600">{step.icon}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm">{step.title}</h4>
                                            <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    ¡Entendido!
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
