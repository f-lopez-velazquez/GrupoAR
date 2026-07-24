import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import * as htmlToImage from 'html-to-image';

export const BadgeGenerator = ({ user, onClose }) => {
    const badgeRef = useRef(null);

    const downloadBadge = async () => {
        if (badgeRef.current) {
            const dataUrl = await htmlToImage.toPng(badgeRef.current);
            const link = document.createElement('a');
            link.download = `gafete-${user.displayName || 'empleado'}.png`;
            link.href = dataUrl;
            link.click();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-10 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-sm w-full">
                <div ref={badgeRef} className="bg-white relative overflow-hidden h-[500px] w-full flex flex-col items-center text-center">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-900 to-slate-900 h-32 z-0"></div>

                    <div className="relative z-10 mt-12 bg-white p-1 rounded-full shadow-lg">
                        <img src="/assets/logo.png" className="h-24 w-24 rounded-full object-cover" alt="Logo" />
                    </div>

                    <div className="mt-4 px-6 relative z-10">
                        <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight leading-tight">
                            {user.displayName || "Nombre Empleado"}
                        </h2>
                        <p className="text-sm font-semibold text-blue-600 mt-1 uppercase tracking-widest">{user.role || "Puesto"}</p>
                        <div className="w-16 h-1 bg-slate-200 mx-auto my-4 rounded"></div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full bg-slate-50 py-6 border-t border-slate-100">
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                            <QRCodeSVG
                                value={`https://gpo-ar.web.app/consulta-empleado/${user.uid}`}
                                size={120}
                                level="H"
                                includeMargin={false}
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-3 font-mono">ID: {user.uid?.substr(0, 8).toUpperCase()}</p>
                    </div>

                    {/* Footer Strip */}
                    <div className="w-full bg-blue-900 h-4 absolute bottom-0"></div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cerrar</button>
                    <button onClick={downloadBadge} className="flex-1 py-2 text-sm font-semibold bg-primary text-white hover:bg-blue-700 rounded-lg shadow-sm">Descargar PNG</button>
                </div>
            </div>
        </div>
    );
};
