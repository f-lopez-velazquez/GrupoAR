import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";

export default function Verify() {
    const { type, id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, [type, id]);

    const fetchData = async () => {
        try {
            let docRef;
            switch (type) {
                case "employee":
                case "badge":
                    docRef = doc(db, "employees", id);
                    break;
                case "ticket":
                case "sale":
                    docRef = doc(db, "sales", id);
                    break;
                case "loan":
                    docRef = doc(db, "warehouseLoans", id);
                    break;
                default:
                    throw new Error("Tipo de verificación no válido");
            }

            const snap = await getDoc(docRef);
            if (!snap.exists()) {
                throw new Error("Documento no encontrado");
            }
            setData({ id: snap.id, ...snap.data() });
        } catch (e) {
            console.error(e);
            setError(e.message);
        }
        finally { setLoading(false); }
    };

    const renderEmployee = () => (
        <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center overflow-hidden">
                {data.photoUrl ? (
                    <img src={data.photoUrl} alt={data.name} className="w-full h-full object-cover" />
                ) : (
                    <span className="material-symbols-outlined text-primary text-4xl">person</span>
                )}
            </div>
            <h2 className="text-xl font-bold text-[#111518] mb-1">{data.name}</h2>
            <p className="text-sm text-[#60778a] mb-4">{data.position}</p>

            <div className="flex justify-center mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${data.status === 'active' ? 'bg-green-100 text-green-700' :
                        data.status === 'inactive' ? 'bg-gray-100 text-gray-600' :
                            'bg-yellow-100 text-yellow-700'
                    }`}>
                    {data.status === 'active' ? '✓ Activo' : data.status === 'inactive' ? 'Inactivo' : data.status}
                </span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
                <div className="flex justify-between">
                    <span className="text-sm text-[#60778a]">Departamento:</span>
                    <span className="text-sm font-medium">{data.department || "-"}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm text-[#60778a]">ID Empleado:</span>
                    <span className="text-sm font-mono">{data.id.slice(0, 8).toUpperCase()}</span>
                </div>
                {data.startDate && (
                    <div className="flex justify-between">
                        <span className="text-sm text-[#60778a]">Fecha de Ingreso:</span>
                        <span className="text-sm font-medium">{data.startDate}</span>
                    </div>
                )}
            </div>

            <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 font-medium">
                    <span className="material-symbols-outlined text-sm mr-1 align-middle">verified</span>
                    Empleado verificado de Grupo AR
                </p>
            </div>
        </div>
    );

    const renderTicket = () => (
        <div>
            <div className="text-center mb-6">
                <span className="material-symbols-outlined text-primary text-5xl mb-2">receipt_long</span>
                <h2 className="text-xl font-bold text-[#111518]">Ticket #{data.folio || data.id.slice(-6).toUpperCase()}</h2>
                <p className="text-sm text-[#60778a]">{data.createdAt?.toDate?.()?.toLocaleString() || data.date}</p>
            </div>

            <div className="border-t border-b border-gray-200 py-4 mb-4">
                <h3 className="text-sm font-bold text-[#60778a] mb-2">Productos</h3>
                <div className="space-y-2">
                    {(data.items || []).map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                            <span>{item.name} x{item.qty}</span>
                            <span className="font-medium">${(item.price * item.qty).toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                    <span className="text-[#60778a]">Subtotal:</span>
                    <span>${(data.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-[#60778a]">IVA (16%):</span>
                    <span>${(data.tax || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">${(data.total || 0).toFixed(2)}</span>
                </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="text-[#60778a]">Método: <span className="font-medium">{data.paymentMethod || "Efectivo"}</span></p>
                <p className="text-[#60778a]">Atendió: <span className="font-medium">{data.cashier || "-"}</span></p>
            </div>

            <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">
                    <span className="material-symbols-outlined text-sm mr-1 align-middle">verified</span>
                    Ticket válido - Grupo AR Ferretería
                </p>
            </div>
        </div>
    );

    const renderLoan = () => (
        <div>
            <div className="text-center mb-6">
                <span className="material-symbols-outlined text-primary text-5xl mb-2">assignment</span>
                <h2 className="text-xl font-bold text-[#111518]">Comprobante de Préstamo</h2>
                <p className="text-sm text-[#60778a]">ID: {data.id.slice(0, 8).toUpperCase()}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary">person</span>
                    </div>
                    <div>
                        <p className="font-medium">{data.employeeName}</p>
                        <p className="text-xs text-[#60778a]">Responsable</p>
                    </div>
                </div>
                {data.project && (
                    <p className="text-sm text-[#60778a]">Proyecto: <span className="font-medium">{data.project}</span></p>
                )}
            </div>

            <div className="border-t border-b border-gray-200 py-4 mb-4">
                <h3 className="text-sm font-bold text-[#60778a] mb-2">Artículos Prestados</h3>
                <div className="space-y-2">
                    {(data.items || []).map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                            <span>{item.name}</span>
                            <span className="font-medium">x{item.qty}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                    <p className="text-[#60778a]">Salida:</p>
                    <p className="font-medium">{data.checkoutTime ? new Date(data.checkoutTime).toLocaleString() : "-"}</p>
                </div>
                <div>
                    <p className="text-[#60778a]">Estado:</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${data.status === 'returned' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {data.status === 'returned' ? 'Devuelto' : 'Prestado'}
                    </span>
                </div>
            </div>

            {data.status === 'returned' && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm mb-4">
                    <p className="text-[#60778a]">Devuelto: {data.returnTime ? new Date(data.returnTime).toLocaleString() : "-"}</p>
                    <p className="text-[#60778a]">Condición: <span className="font-medium">{data.returnCondition || "-"}</span></p>
                    {data.returnNotes && <p className="text-[#60778a]">Notas: {data.returnNotes}</p>}
                </div>
            )}

            <div className={`p-3 rounded-lg ${data.status === 'returned' ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <p className={`text-sm font-medium ${data.status === 'returned' ? 'text-green-700' : 'text-yellow-700'}`}>
                    <span className="material-symbols-outlined text-sm mr-1 align-middle">
                        {data.status === 'returned' ? 'check_circle' : 'pending'}
                    </span>
                    {data.status === 'returned' ? 'Préstamo completado y devuelto' : 'Préstamo activo - Pendiente de devolución'}
                </p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background-light font-display">
            {/* Header */}
            <header className="bg-white border-b border-[#e5e7eb] py-4">
                <div className="max-w-lg mx-auto px-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">AR</div>
                        <span className="font-bold text-[#111518]">Grupo AR</span>
                    </Link>
                    <span className="text-xs text-[#60778a] bg-gray-100 px-2 py-1 rounded">Verificación</span>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-lg mx-auto px-4 py-8">
                <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-[#60778a]">Verificando...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <span className="material-symbols-outlined text-4xl text-red-400 mb-4">error</span>
                            <h2 className="text-lg font-bold text-[#111518] mb-2">Error de Verificación</h2>
                            <p className="text-sm text-[#60778a]">{error}</p>
                        </div>
                    ) : (
                        <>
                            {(type === "employee" || type === "badge") && renderEmployee()}
                            {(type === "ticket" || type === "sale") && renderTicket()}
                            {type === "loan" && renderLoan()}
                        </>
                    )}
                </div>

                <p className="text-center text-xs text-[#60778a] mt-6">
                    Este es un documento verificado por el sistema ERP de Grupo AR.<br />
                    Los datos son inmutables y públicos.
                </p>
            </main>
        </div>
    );
}
