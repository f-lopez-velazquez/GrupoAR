import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";

// Reliable SVG Icons for "Inclonable" and 100% loading guarantee
const Icons = {
    Verified: () => (
        <svg viewBox="0 0 24 24" className="fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.78L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z" />
        </svg>
    ),
    Warning: () => (
        <svg viewBox="0 0 24 24" className="fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M12,2L1,21H23L12,2M12,6L19.53,19H4.47L12,6M11,10V14H13V10H11M11,16V18H13V16H11Z" />
        </svg>
    ),
    Badge: () => (
        <svg viewBox="0 0 24 24" className="fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M17,3H7C5.89,3 5,3.89 5,5V21L12,18L19,21V5C19,3.89 18.11,3 17,3M17,18L12,15.82L7,18V5H17V18M12,7C10.34,7 9,8.34 9,10C9,11.66 10.34,13 12,13C13.66,13 15,11.66 15,10C15,8.34 13.66,7 12,7M12,11C11.45,11 11,10.55 11,10C11,9.45 11.45,9 12,9C12.55,9 13,9.45 13,10C13,10.55 12.55,11 12,11Z" />
        </svg>
    ),
    Print: () => (
        <svg viewBox="0 0 24 24" className="fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M18,3H6V7H18M19,12A1,1 0 0,1 18,11A1,1 0 0,1 19,10A1,1 0 0,1 20,11A1,1 0 0,1 19,12M16,19H8V14H16M19,8H5C3.34,8 2,9.34 2,11V17H6V21H18V17H22V11C22,9.34 20.66,8 19,8Z" />
        </svg>
    )
};

export default function VerifyEmployee() {
    const { uid } = useParams();
    const [status, setStatus] = useState("loading"); // loading, active, invalid, error, leave, inactive
    const [employee, setEmployee] = useState(null);

    useEffect(() => {
        if (!uid) {
            setStatus("invalid");
            return;
        }

        const verify = async () => {
            try {
                const docRef = doc(db, "publicEmployees", uid);
                const snap = await getDoc(docRef);

                if (snap.exists()) {
                    const data = snap.data();
                    setEmployee(data);
                    setStatus(data.status || "active");
                } else {
                    setStatus("invalid");
                }
            } catch (e) {
                console.error(e);
                setStatus("error");
            }
        };

        verify();
    }, [uid]);

    const isAuthorized = status === "active" || status === "leave";

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col font-jakarta text-slate-900 select-none relative overflow-x-hidden">

            {/* Global Holographic Style Injector */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes holographicShift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .hologram-effect {
                    background: linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
                    background-size: 200% 200%;
                    animation: holographicShift 3s infinite linear;
                }
                .metallic-gold {
                    background: linear-gradient(135deg, #BF953F 0%, #FCF6BA 25%, #B38728 50%, #FBF5B7 75%, #AA771C 100%);
                }
            `}} />

            {/* Background Security Mesh */}
            <div className="fixed inset-0 z-0 opacity-[0.05] pointer-events-none mix-blend-multiply" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50' y='50' fill='%230B1B32' font-family='Arial' font-weight='bold' font-size='12' transform='rotate(-45 50 50)' text-anchor='middle'%3EGRUPO AR VERIFIED%3C/text%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat'
            }}></div>

            {/* Header */}
            <header className="relative z-10 bg-[#0B1B32] text-white py-5 border-b-[6px] shadow-xl"
                style={{ borderImage: 'linear-gradient(to right, #BF953F, #FCF6BA, #AA771C) 1' }}>
                <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-1 rounded-lg">
                            <img src="/assets/logo.png" alt="AR" className="h-12 w-auto object-contain" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase leading-tight">GRUPO AR</h1>
                            <p className="text-[10px] md:text-xs text-[#BF953F] font-bold uppercase tracking-[0.3em]">VALIDACIÓN OFICIAL</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="relative z-10 flex-1 flex flex-col items-center py-6 md:py-12 px-4">
                <div className="w-full max-w-[500px]">

                    {/* Loading */}
                    {status === "loading" && (
                        <div className="bg-white rounded-3xl p-16 text-center shadow-2xl border border-slate-100">
                            <div className="size-20 border-4 border-slate-100 border-t-[#BF953F] rounded-full animate-spin mx-auto mb-8"></div>
                            <h2 className="text-lg font-black text-[#0B1B32]">BUSCANDO REGISTRO...</h2>
                        </div>
                    )}

                    {/* NOT VALID / INACTIVE */}
                    {(!isAuthorized && status !== "loading") && (
                        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-red-100 transform active:scale-95 transition-transform">
                            <div className="bg-red-600 p-8 flex flex-col items-center text-center">
                                <div className="size-24 bg-white/10 rounded-full flex items-center justify-center mb-6 ring-8 ring-white/5">
                                    <div className="size-16 text-white"><Icons.Warning /></div>
                                </div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">IDENTIDAD NO VÁLIDA</h2>
                                <div className="bg-black/20 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                                    ESTADO: {status === 'inactive' ? 'REVOCADO' : 'SISTEMA'}
                                </div>
                            </div>
                            <div className="p-10 text-center">
                                <p className="text-slate-600 font-medium leading-relaxed mb-10">
                                    {status === 'inactive' ?
                                        'Esta identificación ha sido desactivada por la empresa. El portador ya no cuenta con autorización oficial.' :
                                        'Este código de seguridad no existe o ha sido manipulado. Reporte este incidente inmediatamente.'}
                                </p>
                                <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-black shadow-xl mb-4 flex items-center justify-center gap-2">
                                    <div className="size-5 text-red-500"><Icons.Warning /></div>
                                    Reportar Fraude
                                </button>
                                <Link to="/" className="text-slate-400 font-bold text-xs uppercase tracking-widest">Volver al inicio</Link>
                            </div>
                        </div>
                    )}

                    {/* AUTHORIZED */}
                    {isAuthorized && employee && (
                        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden relative">

                            {/* Hologram Overlay Effect */}
                            <div className="absolute inset-0 hologram-effect pointer-events-none z-30 opacity-30"></div>

                            {/* Status Header */}
                            <div className={`${status === 'active' ? 'bg-[#059669]' : 'bg-[#2563eb]'} p-6 text-white flex flex-col items-center relative z-20`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="size-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"><Icons.Verified /></div>
                                    <span className="font-black tracking-[0.2em] text-sm uppercase">CERTIFICADO VIGENTE</span>
                                </div>
                                <span className="font-mono text-[10px] bg-black/20 px-4 py-1 rounded-full border border-white/10 font-bold uppercase">
                                    ID: {uid?.toUpperCase()}
                                </span>
                            </div>

                            <div className="p-6 md:p-10 relative z-20">
                                {/* Photo Section */}
                                <div className="flex flex-col items-center mb-8">
                                    <div className="relative group p-2 bg-white rounded-3xl shadow-xl">
                                        <div className="absolute inset-0 rounded-3xl metallic-gold opacity-50 z-0"></div>
                                        <div className="relative z-10 size-40 md:size-48 bg-slate-50 rounded-2xl overflow-hidden border-4 border-white">
                                            {employee.photoUrl ? (
                                                <img src={employee.photoUrl} alt="Titular" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-200 bg-slate-100">
                                                    <div className="size-24"><Icons.Badge /></div>
                                                </div>
                                            )}
                                        </div>
                                        {/* Security Stamp Overlay */}
                                        <div className="absolute -bottom-3 -right-3 size-16 p-2 bg-white rounded-full shadow-2xl z-30 flex items-center justify-center">
                                            <div className="size-full text-green-600"><Icons.Verified /></div>
                                        </div>
                                    </div>
                                    <div className="mt-8 bg-[#0B1B32] px-6 py-1.5 rounded-full text-[10px] font-black text-[#BF953F] uppercase tracking-[0.3em] shadow-md border border-[#BF953F]/20">
                                        {employee.department}
                                    </div>
                                </div>

                                {/* Textual Data */}
                                <div className="space-y-8">
                                    <div className="text-center">
                                        <h2 className="text-[10px] font-black text-[#BF953F] uppercase tracking-[0.4em] mb-1">TITULAR DEL GAFETE</h2>
                                        <p className="text-3xl font-black text-[#0B1B32] uppercase leading-none tracking-tighter">
                                            {employee.name}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 border-y border-slate-100 py-8">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PUESTO</span>
                                            <span className="font-black text-[#0B1B32] text-sm md:text-base leading-tight uppercase">{employee.position}</span>
                                        </div>
                                        <div className="flex flex-col gap-1 items-end text-right">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ESTATUS</span>
                                            <span className={`font-black text-sm md:text-base ${status === 'active' ? 'text-green-600' : 'text-blue-600'} uppercase`}>
                                                {status === 'active' ? 'ACTIVO' : 'PERMISO'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SEGURO (NSS)</span>
                                            <span className="font-mono text-slate-800 font-black text-sm">{employee.nss || "CERTIFICADO"}</span>
                                        </div>
                                        <div className="flex flex-col gap-1 items-end text-right">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SANGRE</span>
                                            <span className="font-black text-red-600 text-sm">{employee.bloodType || "O+"}</span>
                                        </div>
                                    </div>

                                    {/* Legal Banner */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-4 items-center mb-6">
                                        <div className="size-10 text-[#BF953F] flex-shrink-0"><Icons.Verified /></div>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed tracking-tighter">
                                            DOCUMENTO DIGITAL PROTEGIDO. LA ALTERACIÓN DE ESTA BASE DE DATOS O DEL CODIGO DE SEGURIDAD ES UN DELITO.
                                        </p>
                                    </div>

                                    <button onClick={() => window.print()} className="w-full bg-[#0B1B32] text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95">
                                        <div className="size-5"><Icons.Print /></div>
                                        Imprimir Cédula
                                    </button>
                                </div>
                            </div>

                            {/* Bottom Footer Accent */}
                            <div className="h-2 metallic-gold w-full mt-auto"></div>
                        </div>
                    )}
                </div>
            </main>

            <footer className="relative z-10 bg-white border-t border-slate-200 py-10 px-6 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    © {new Date().getFullYear()} GRUPO AR CONSTRUCCIÓN Y DISEÑO - SISTEMA DE PROTECCIÓN DE IDENTIDAD
                </p>
            </footer>
        </div>
    );
}
