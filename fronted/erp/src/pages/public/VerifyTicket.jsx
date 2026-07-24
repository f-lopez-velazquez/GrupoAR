import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { toPng } from 'html-to-image';

const BASE_URL = "https://gpo-ar.web.app";

export default function VerifyTicket() {
    const { saleId } = useParams();
    const [sale, setSale] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const ticketRef = useRef(null);

    const downloadTicket = async () => {
        if (!ticketRef.current) return;
        try {
            const dataUrl = await toPng(ticketRef.current, { backgroundColor: '#ffffff', quality: 1.0, pixelRatio: 2 });
            const link = document.createElement('a');
            link.download = `ticket-${sale.folio}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error(err);
            alert("No se pudo descargar el ticket");
        }
    };

    useEffect(() => {
        fetchSale();
    }, [saleId]);


    const fetchSale = async () => {
        try {
            setLoading(true);
            const saleDoc = await getDoc(doc(db, 'sales', saleId));

            if (!saleDoc.exists()) {
                setError('Ticket no encontrado');
                return;
            }

            setSale({ id: saleDoc.id, ...saleDoc.data() });
        } catch (e) {
            console.error(e);
            setError('Error al cargar el ticket');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Verificando ticket...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <span className="material-symbols-outlined text-6xl text-red-500 mb-4 block">error</span>
                    <p className="text-xl font-bold text-gray-900 mb-2">{error}</p>
                    <a href="/" className="text-primary hover:underline">Volver al inicio</a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-lg mx-auto relative">
                {/* Banner flotante de seguridad */}
                <div className="fixed top-0 left-0 right-0 bg-slate-800 text-white text-center py-2 z-50 shadow-md">
                    <p className="text-xs font-bold flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-sm">lock</span>
                        DOCUMENTO OFICIAL NO EDITABLE
                        <span className="opacity-50 mx-1">|</span>
                        <span className="font-normal text-gray-300">Verificado por Grupo AR</span>
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-8 mb-4 mt-6" ref={ticketRef}>
                    <div className="text-center mb-6">
                        <div className="w-24 h-24 mx-auto mb-4 overflow-hidden rounded-full shadow-lg border-2 border-primary/20">
                            <img
                                src="/assets/logo.png"
                                alt="Grupo AR Logo"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">GRUPO AR</h1>
                        <p className="text-gray-600">Ferretería y Construcción</p>
                    </div>

                    {/* Estado de verificación o cancelación */}
                    {sale.status === "cancelled" ? (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-3xl text-red-600">cancel</span>
                                <div className="flex-1">
                                    <p className="font-bold text-red-900">Ticket Cancelado</p>
                                    <p className="text-sm text-red-700 mt-1">Este comprobante ha sido anulado</p>
                                    {sale.cancellationReason && (
                                        <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800">
                                            <p className="font-semibold">Motivo:</p>
                                            <p>{sale.cancellationReason}</p>
                                        </div>
                                    )}
                                    {sale.cancelledAt && (
                                        <p className="text-xs text-red-600 mt-1">
                                            Cancelado: {new Date(sale.cancelledAt.seconds * 1000).toLocaleString()}
                                        </p>
                                    )}
                                    {sale.cancelledBy && (
                                        <p className="text-xs text-red-600">
                                            Por: {sale.cancelledBy}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 mb-6">
                            <span className="material-symbols-outlined text-3xl text-green-600">verified</span>
                            <div>
                                <p className="font-bold text-green-900">Ticket Verificado</p>
                                <p className="text-sm text-green-700">Este comprobante es auténtico</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="border-t border-b border-gray-200 py-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-600">Folio</span>
                                <span className="font-mono font-bold">{sale.folio}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Fecha</span>
                                <span>{new Date(sale.date).toLocaleString()}</span>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold mb-2">Productos</h3>
                            {sale.items.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm mb-1">
                                    <span>{item.name} x{item.qty}</span>
                                    <span>${(item.price * item.qty).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-gray-200 pt-4">
                            <div className="flex justify-between font-bold text-lg mb-2">
                                <span>TOTAL</span>
                                <span className="text-primary">${sale.total.toFixed(2)}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                                <p>Subtotal: ${sale.subtotal.toFixed(2)}</p>
                                <p>IVA (16%): ${sale.tax.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-200">
                        {/* Términos y Condiciones */}
                        <div className="text-center mb-4">
                            <p className="text-xs font-bold text-gray-700 mb-2">TÉRMINOS Y CONDICIONES</p>
                            <div className="text-[10px] text-gray-500 leading-relaxed space-y-1">
                                <p>Este comprobante no es válido como factura fiscal.</p>
                                <p>Para solicitar factura, proporcione sus datos fiscales al momento de la compra.</p>
                                <p className="font-medium text-gray-700 mt-2 border-t border-gray-200 pt-2">
                                    Cambios y devoluciones: 10 días naturales con este comprobante.
                                </p>
                                <p className="text-[9px] text-gray-400 mt-1">
                                    *Solo aplica para productos con defectos de fábrica o fallas no causadas por mal uso, uso indebido,
                                    accidentes, modificaciones no autorizadas o desgaste normal. Producto debe presentarse en su empaque
                                    original, sin uso y con todos sus accesorios. Sujeto a inspección y aprobación. GRUPO AR se reserva
                                    el derecho de aceptar o rechazar devoluciones.
                                </p>
                            </div>
                        </div>

                        {/* Datos fiscales */}
                        <div className="text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
                            <p className="font-semibold mb-1">PEDRO GUTIERREZ 119</p>
                            <p>Guanajuato, 36780 Salamanca, Gto.</p>
                            <p className="mt-1">Teléfono: 464 126 2821</p>
                        </div>
                    </div>
                </div>

                {/* Botón de descarga fuera del area capturada */}
                <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-bottom duration-500 delay-300">
                    <button
                        onClick={downloadTicket}
                        className="flex items-center gap-3 bg-slate-800 text-white px-6 py-4 rounded-xl shadow-xl hover:bg-slate-700 transition active:scale-95 font-bold text-sm tracking-wide"
                    >
                        <span className="material-symbols-outlined text-lg">download</span>
                        DESCARGAR TICKET OFICIAL
                    </button>
                </div>
            </div>
        </div>
    );
}
