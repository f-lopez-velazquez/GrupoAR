import { QRCodeSVG } from 'qrcode.react';

export const EmployeeBadge = ({ user, elementRef }) => {
    const verificationUrl = `https://gpo-ar.web.app/verificar-empleado/${user.id}`;

    return (
        <div ref={elementRef} className="w-[320px] h-[500px] bg-white rounded-xl shadow-2xl overflow-hidden relative flex flex-col font-sans border border-slate-200">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #0f172a 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>

            {/* Header */}
            <div className="bg-[#0f172a] h-32 relative flex flex-col items-center justify-center p-4">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#fbbf24]"></div>
                <img src="/assets/logo.png" alt="Grupo AR" className="h-12 object-contain mb-2 brightness-0 invert" />
                <p className="text-[#fbbf24] text-[10px] uppercase font-bold tracking-[0.2em]">Identificación Oficial</p>
            </div>

            {/* Photo Container */}
            <div className="relative -mt-16 self-center mb-4">
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-200 overflow-hidden">
                    {user.photoUrl ? (
                        <img src={user.photoUrl} alt="Empleado" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100">
                            <span className="material-symbols-outlined text-4xl text-slate-300">person</span>
                        </div>
                    )}
                </div>
                <div className="absolute bottom-1 right-1 bg-green-500 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>
                </div>
            </div>

            {/* Info */}
            <div className="text-center px-6 flex-1">
                <h2 className="text-2xl font-bold text-slate-900 leading-tight mb-1">{user.displayName || "Nombre Empleado"}</h2>
                <div className="inline-block px-3 py-1 bg-slate-100 rounded-full text-slate-600 text-xs font-bold uppercase tracking-wide mb-4">
                    {user.role || "Cargo"}
                </div>

                <div className="grid grid-cols-2 gap-2 text-left bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                    <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">ID Empleado</p>
                        <p className="text-xs font-mono font-bold text-slate-700">#{user.id?.slice(0, 6).toUpperCase()}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Vigencia</p>
                        <p className="text-xs font-bold text-slate-700">DIC 2026</p>
                    </div>
                </div>
            </div>

            {/* Footer / QR */}
            <div className="bg-slate-900 p-4 flex items-center gap-4">
                <div className="bg-white p-1 rounded">
                    <QRCodeSVG value={verificationUrl} size={64} />
                </div>
                <div className="flex-1">
                    <p className="text-[9px] text-slate-400 uppercase leading-relaxed text-justify">
                        Esta tarjeta es propiedad de Grupo AR. Su uso es personal e intransferible. Escanee el código QR para verificar la validez de este empleado en tiempo real.
                    </p>
                </div>
            </div>
        </div>
    );
};
