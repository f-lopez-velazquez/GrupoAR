import { useState } from 'react';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from '../state/AuthContext';

export default function AuthCodeGenerator({ onClose, type = "cancel_ticket" }) {
    const { profile } = useAuth();
    const [code, setCode] = useState(null);
    const [loading, setLoading] = useState(false);

    const generateCode = async () => {
        try {
            setLoading(true);

            // Generar código aleatorio de 6 caracteres
            const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();

            // Calcular expiración (24 horas)
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);

            // Guardar en Firestore
            await addDoc(collection(db, "authCodes"), {
                code: newCode,
                type,
                generatedBy: profile?.email,
                generatedAt: serverTimestamp(),
                usedAt: null,
                usedBy: null,
                status: "active",
                expiresAt: Timestamp.fromDate(expiresAt)
            });

            setCode(newCode);
        } catch (error) {
            console.error(error);
            alert("Error al generar código");
        } finally {
            setLoading(false);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(code);
        alert("Código copiado al portapapeles");
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">Generar Código de Autorización</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {!code ? (
                        <div>
                            <p className="text-gray-600 mb-6">
                                Este código permitirá cancelar tickets y devolver inventario.
                                <strong className="block mt-2">Válido por 24 horas.</strong>
                            </p>

                            <button
                                onClick={generateCode}
                                disabled={loading}
                                className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? "Generando..." : "Generar Código"}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="bg-gray-50 border-2 border-primary rounded-xl p-8 mb-6">
                                <p className="text-sm text-gray-600 mb-2">Código de Autorización</p>
                                <p className="text-4xl font-mono font-bold text-primary tracking-wider">
                                    {code}
                                </p>
                                <p className="text-xs text-gray-500 mt-3">
                                    Válido por 24 horas • Un solo uso
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={copyCode}
                                    className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[20px]">content_copy</span>
                                    Copiar
                                </button>

                                <button
                                    onClick={() => {
                                        setCode(null);
                                        onClose();
                                    }}
                                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-700"
                                >
                                    Listo
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
