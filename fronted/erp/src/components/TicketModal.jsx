import { useRef, useState, useEffect } from "react";
import QRCode from "qrcode";
import { toPng } from "html-to-image";

const BASE_URL = "https://gpo-ar.web.app";

export default function TicketModal({ sale, onClose, title = "Venta Completada" }) {
    const ticketRef = useRef(null);
    const [qrCode, setQrCode] = useState("");
    const [showShareOptions, setShowShareOptions] = useState(false);
    const [customerEmail, setCustomerEmail] = useState(sale.customerEmail || "");

    useEffect(() => {
        if (sale?.id) {
            const url = `${BASE_URL}/verificar/ticket/${sale.id}`;
            QRCode.toDataURL(url, { width: 200 }).then(setQrCode).catch(console.error);
        }
    }, [sale]);

    const downloadTicket = async () => {
        if (!ticketRef.current) return;
        try {
            const dataUrl = await toPng(ticketRef.current, {
                quality: 0.95,
                backgroundColor: '#ffffff',
                cacheBust: true,
                skipFonts: true
            });
            const link = document.createElement('a');
            link.download = `ticket-${sale.folio}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Error al descargar:', error);
            alert("Error al generar imagen");
        }
    };

    const shareViaWhatsApp = async () => {
        try {
            const dataUrl = await toPng(ticketRef.current, { backgroundColor: '#ffffff', cacheBust: true, skipFonts: true });
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const file = new File([blob], `ticket-${sale.folio}.png`, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Ticket GRUPO AR - ${sale.folio}`,
                    text: `Comprobante de compra GRUPO AR\nFolio: ${sale.folio}\nTotal: $${sale.total.toFixed(2)}`
                });
            } else {
                const text = `*Ticket de compra GRUPO AR*\n\nFolio: ${sale.folio}\nTotal: $${sale.total.toFixed(2)}\n\nVerificar:\n${BASE_URL}/verificar/ticket/${sale.id}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
            }
        } catch (error) {
            const text = `*Ticket de compra GRUPO AR*\n\nFolio: ${sale.folio}\nTotal: $${sale.total.toFixed(2)}\n\nVerificar:\n${BASE_URL}/verificar/ticket/${sale.id}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        }
    };

    if (!sale) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col mb-10">
                <div className="flex-shrink-0 p-4 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-2xl">
                    <h2 className="font-bold text-lg">{title}</h2>
                    <div className="flex gap-4">
                        <button onClick={() => setShowShareOptions(true)} className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[20px]">share</span>
                            Compartir
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <div ref={ticketRef} className="bg-white p-6 shadow-sm mx-auto max-w-[350px]">
                        {/* Cabecera Oficial */}
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 mx-auto mb-3 overflow-hidden rounded-full shadow-md border-2 border-gray-100">
                                <img src="/assets/logo.png" alt="Logo" className="w-full h-full object-cover" />
                            </div>
                            <p className="font-bold text-xl uppercase tracking-tight text-gray-900">GRUPO AR</p>
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Ferretería y Construcción</p>
                            <div className="mt-4 pt-2 border-t border-gray-100">
                                <p className="text-[11px] font-black tracking-widest text-[#0B1B32]">COMPROBANTE DE VENTA</p>
                            </div>
                        </div>

                        {/* Datos de tienda */}
                        <div className="text-center text-[10px] text-gray-600 space-y-0.5 mb-6">
                            <p className="font-bold text-gray-900">PEDRO GUTIERREZ 119</p>
                            <p>Guanajuato, 36780 Salamanca, Gto.</p>
                            <p className="font-bold">Tel: 464 126 2821</p>
                        </div>

                        {/* Folio y Fecha */}
                        <div className="border-y border-dashed border-gray-300 py-3 mb-6 grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                                <p className="text-gray-400 font-bold uppercase mb-0.5">Folio</p>
                                <p className="font-mono font-bold text-gray-900 text-sm">#{sale.folio}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-gray-400 font-bold uppercase mb-0.5">Fecha</p>
                                <p className="font-bold text-gray-900">{new Date(sale.createdAt?.toDate ? sale.createdAt.toDate() : (sale.date || Date.now())).toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Conceptos */}
                        <div className="mb-6">
                            <table className="w-full text-[11px]">
                                <thead>
                                    <tr className="border-b-2 border-gray-900 text-left">
                                        <th className="py-1 font-black">CANT</th>
                                        <th className="py-1 font-black">PRODUCTO</th>
                                        <th className="py-1 text-right font-black">SUB</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(sale.items || []).map((item, i) => (
                                        <tr key={i}>
                                            <td className="py-2 align-top font-bold">{item.qty}</td>
                                            <td className="py-2 px-2">
                                                <p className="font-bold text-gray-900 uppercase leading-none">{item.name}</p>
                                                <p className="text-[9px] text-gray-400 mt-1">${item.price.toFixed(2)} c/u</p>
                                            </td>
                                            <td className="py-2 text-right align-top font-bold">${(item.price * item.qty).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totales */}
                        <div className="border-t-2 border-gray-900 pt-3 space-y-1 mb-6">
                            <div className="flex justify-between text-[11px] font-bold">
                                <span>Subtotal</span>
                                <span>${(sale.subtotal || sale.total * 0.84).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-[11px] font-bold">
                                <span>IVA (16%)</span>
                                <span>${(sale.tax || sale.total * 0.16).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-base font-black border-t border-gray-900 pt-1 mt-1">
                                <span>TOTAL</span>
                                <span>${sale.total.toFixed(2)}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 text-center mt-2 uppercase font-bold italic">
                                Pago en {sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}
                            </p>
                        </div>

                        {/* QR */}
                        <div className="text-center mb-6">
                            <img src={qrCode} alt="QR" className="w-24 h-24 mx-auto mb-2 opacity-90" />
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Verificación Digital</p>
                            <p className="text-[8px] text-gray-300 break-all">{BASE_URL}/verificar/ticket/{sale.id}</p>
                        </div>

                        {/* Términos */}
                        <div className="border-t border-gray-100 pt-4 text-center">
                            <p className="text-[9px] font-black text-gray-900 mb-2 uppercase tracking-widest">Aviso Importante</p>
                            <div className="text-[8px] text-gray-500 leading-tight space-y-1 text-justify">
                                <p>1. Este documento no representa una factura fiscal electrónica.</p>
                                <p>2. Para facturación, solicítela al momento de su compra con sus datos vigentes.</p>
                                <p>3. Cambios o devoluciones permitidos hasta 10 días naturales posteriores a la fecha de compra, presentando este comprobante íntegro.</p>
                                <p className="font-black text-gray-400 pt-2 text-center uppercase">¡Gracias por preferir GRUPO AR!</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
                    <button onClick={downloadTicket} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined">download</span>
                        Guardar PNG
                    </button>
                    <button onClick={shareViaWhatsApp} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined">share</span>
                        Enviar Ticket
                    </button>
                </div>
            </div>

            {/* Modal de Compartir Secundario */}
            {showShareOptions && (
                <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold">Opciones de Compartir</h3>
                            <button onClick={() => setShowShareOptions(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={shareViaWhatsApp} className="p-4 border rounded-xl flex flex-col items-center gap-2 hover:bg-green-50 hover:border-green-200 transition-all">
                                <span className="text-3xl">💬</span>
                                <span className="text-xs font-bold">WhatsApp</span>
                            </button>
                            <button onClick={() => {
                                const subject = `Ticket GRUPO AR - ${sale.folio}`;
                                const body = `Gracias por su compra. Puede ver su ticket en: ${BASE_URL}/verificar/ticket/${sale.id}`;
                                window.location.href = `mailto:${customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                            }} className="p-4 border rounded-xl flex flex-col items-center gap-2 hover:bg-blue-50 hover:border-blue-200 transition-all">
                                <span className="text-3xl">📧</span>
                                <span className="text-xs font-bold">Email</span>
                            </button>
                        </div>
                        <button onClick={() => {
                            navigator.clipboard.writeText(`${BASE_URL}/verificar/ticket/${sale.id}`);
                            alert("Link copiado al portapapeles");
                        }} className="w-full mt-3 py-3 border border-gray-200 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50">
                            <span className="material-symbols-outlined text-base">content_copy</span>
                            Copiar Enlace Directo
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
