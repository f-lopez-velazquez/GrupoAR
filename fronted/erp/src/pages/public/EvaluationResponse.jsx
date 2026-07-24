import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDoc, doc, updateDoc, addDoc, collection } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { toPng } from "html-to-image";

const DAYS = [
    { id: 'mon', label: 'Lun' },
    { id: 'tue', label: 'Mar' },
    { id: 'wed', label: 'Mie' },
    { id: 'thu', label: 'Jue' },
    { id: 'fri', label: 'Vie' },
    { id: 'sat', label: 'Sab' }
];

const ATTENDANCE_VALUES = {
    present: { icon: 'check_circle', color: 'text-green-500', bg: 'bg-green-50', label: 'Asistencia' },
    absent: { icon: 'cancel', color: 'text-red-500', bg: 'bg-red-50', label: 'Falta' },
    late: { icon: 'schedule', color: 'text-amber-500', bg: 'bg-amber-50', label: 'Retardo' },
    na: { icon: 'block', color: 'text-gray-400', bg: 'bg-gray-100', label: 'N/A' }
};

export default function EvaluationResponse() {
    const { requestId } = useParams();
    const navigate = useNavigate();
    const summaryRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [request, setRequest] = useState(null);
    const [step, setStep] = useState(0); // 0: Start, 1: Eval, 2: Success
    const [employees, setEmployees] = useState([]);
    const [config, setConfig] = useState({
        absencePenalty: 250,
        latePenalty: 100
    });

    useEffect(() => {
        const fetchRequest = async () => {
            try {
                const docRef = doc(db, "evaluationRequests", requestId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    setRequest({ id: snap.id, ...data });

                    if (data.config) {
                        setConfig(data.config);
                    }

                    if (data.status === 'completed') {
                        setStep(3);
                    } else {
                        setEmployees(data.employees.map(e => ({
                            id: e.id,
                            name: e.name,
                            role: e.role,
                            baseSalary: e.salary || 2800,
                            rating: 3,
                            attendance: { mon: 'present', tue: 'present', wed: 'present', thu: 'present', fri: 'present', sat: 'present' },
                            notes: "",
                            isDiscarded: false
                        })));
                    }
                } else {
                    alert("Solicitud no encontrada");
                }
            } catch (e) {
                console.error(e);
                alert("Error cargando solicitud");
            } finally {
                setLoading(false);
            }
        };
        fetchRequest();
    }, [requestId]);

    const updateEmployee = (idx, updates) => {
        const updated = [...employees];
        updated[idx] = { ...updated[idx], ...updates };
        setEmployees(updated);
    };

    const toggleAttendance = (empIdx, dayId) => {
        const current = employees[empIdx].attendance[dayId];
        let next = 'present';
        if (current === 'present') next = 'late';
        else if (current === 'late') next = 'absent';
        else if (current === 'absent') next = 'na';
        else if (current === 'na') next = 'present';

        const newAttendance = { ...employees[empIdx].attendance, [dayId]: next };
        updateEmployee(empIdx, { attendance: newAttendance });
    };

    const calculateSalary = (emp) => {
        if (emp.isDiscarded) return { net: 0, base: emp.baseSalary, absences: 0, lates: 0, na: 0, deductions: 0 };

        const counts = Object.values(emp.attendance).reduce((acc, status) => {
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, { absent: 0, late: 0, na: 0 });

        const deductions = (counts.absent * config.absencePenalty) + (counts.late * config.latePenalty);

        return {
            net: Math.max(0, emp.baseSalary - deductions),
            base: emp.baseSalary,
            absences: counts.absent,
            lates: counts.late,
            na: counts.na,
            deductions
        };
    };

    const handleGenerateImage = async () => {
        if (!summaryRef.current) return;
        try {
            const dataUrl = await toPng(summaryRef.current, { quality: 0.95, pixelRatio: 2 });
            const link = document.createElement('a');
            link.download = `Reporte-${request.projectName}-${request.weekStart}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Capture error:", err);
        }
    };

    const handleSubmit = async () => {
        try {
            const evaluationPromises = employees.filter(e => !e.isDiscarded).map(emp => {
                const stats = calculateSalary(emp);
                return addDoc(collection(db, "evaluations"), {
                    employeeId: emp.id,
                    employeeName: emp.name,
                    projectId: request.projectId,
                    projectName: request.projectName,
                    weekStart: request.weekStart,
                    performance: emp.rating,
                    attendance: emp.attendance,
                    baseSalary: emp.baseSalary,
                    finalPayment: stats.net,
                    deductions: stats.deductions,
                    notes: emp.notes,
                    supervisor: "Encargado de Obra",
                    sourceRequestId: request.id,
                    createdAt: new Date()
                });
            });

            await Promise.all(evaluationPromises);
            await updateDoc(doc(db, "evaluationRequests", requestId), {
                status: 'completed',
                completedAt: new Date()
            });

            setStep(2);
        } catch (e) {
            console.error(e);
            alert("Error al enviar reporte");
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center font-black text-[#0B1B32]">CARGANDO HERRAMIENTA V22...</div>;
    if (step === 3) return <div className="flex flex-col h-screen items-center justify-center p-6 text-center bg-white"><span className="material-symbols-outlined text-8xl text-green-500 mb-6">verified</span><h1 className="text-3xl font-black text-[#0B1B32]">REPORTE COMPLETADO</h1><p className="text-slate-400 mt-2">Este reporte ya fue enviado satisfactoriamente.</p></div>;
    if (step === 2) return <div className="flex flex-col h-screen items-center justify-center p-6 text-center animate-in zoom-in duration-300 bg-[#0B1B32] text-white">
        <span className="material-symbols-outlined text-[100px] text-[#BF953F] mb-6">task_alt</span>
        <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase">¡RECIBIDO!</h1>
        <p className="opacity-60 font-bold uppercase tracking-widest text-sm">Información enviada a administración</p>
        <button onClick={() => setStep(3)} className="mt-12 bg-white text-black px-10 py-4 rounded-2xl font-black uppercase text-sm tracking-widest">Listo</button>
    </div>;

    return (
        <div className="min-h-screen bg-[#f8fafc] font-jakarta pb-32">

            {/* Header */}
            <header className="bg-[#0B1B32] p-6 shadow-xl sticky top-0 z-[100] text-white border-b-4 border-[#BF953F]">
                <div className="max-w-2xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <img src="/assets/logo.png" className="h-12 w-auto object-contain brightness-200 drop-shadow-md" alt="Grupo AR" />
                        <div>
                            <h1 className="font-black text-xl tracking-tighter uppercase leading-none">EVALUACIÓN DE OBRA</h1>
                            <p className="text-[10px] opacity-70 font-bold uppercase tracking-[0.2em]">{request.projectName} • {request.weekStart}</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-md mx-auto p-4 space-y-6">

                {step === 0 && (
                    <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-200 text-center py-12 animate-in fade-in slide-in-from-bottom-6">
                        <div className="size-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl">
                            <span className="material-symbols-outlined text-4xl">inventory</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 leading-none mb-4">REPORTE SEMANAL</h2>
                        <p className="text-slate-500 font-medium mb-10">Confirma la asistencia y el desempeño de la cuadrilla para la semana <span className="font-black text-slate-900">{request.weekStart}</span></p>

                        <button
                            onClick={() => setStep(1)}
                            className="w-full py-5 bg-[#0B1B32] text-white rounded-3xl font-black text-xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            Comenzar Evaluación
                        </button>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">

                        {/* Legend */}
                        <div className="flex flex-wrap gap-3 justify-center text-[10px] font-bold uppercase tracking-widest text-[#0B1B32]/70 mb-4 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Asistencia</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Retardo ${config.latePenalty}</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Falta ${config.absencePenalty}</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400"></span> N/A (Desc)</div>
                        </div>

                        {/* Summary Card for Preview */}
                        <div className="bg-[#0B1B32] p-6 rounded-[2rem] shadow-xl text-white mb-8 border-b-8 border-[#BF953F]">
                            <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.3em] mb-4">Resumen de Nómina Estimada</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-2xl font-black font-mono">
                                        ${employees.reduce((acc, emp) => acc + calculateSalary(emp).net, 0).toLocaleString()}
                                    </p>
                                    <p className="text-[9px] font-black opacity-50 uppercase tracking-widest">Total cuadrilla</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black font-mono text-red-400">
                                        -${employees.reduce((acc, emp) => acc + calculateSalary(emp).deductions, 0).toLocaleString()}
                                    </p>
                                    <p className="text-[9px] font-black opacity-50 uppercase tracking-widest">Deducciones</p>
                                </div>
                            </div>
                        </div>

                        {employees.map((emp, idx) => {
                            const stats = calculateSalary(emp);
                            return (
                                <div key={emp.id} className={`bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden relative group transition-all transform ${emp.isDiscarded ? 'opacity-50 grayscale scale-[0.98]' : 'hover:scale-[1.01]'}`}>

                                    {/* Dedicated Discard Header Strip */}
                                    <div className={`p-4 flex justify-between items-center border-b ${emp.isDiscarded ? 'bg-red-500' : 'bg-slate-50'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`size-8 rounded-full flex items-center justify-center font-black text-xs ${emp.isDiscarded ? 'bg-white text-red-600' : 'bg-[#0B1B32] text-white'}`}>
                                                {idx + 1}
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${emp.isDiscarded ? 'text-white' : 'text-slate-500'}`}>
                                                {emp.isDiscarded ? 'TRABAJADOR EXCLUIDO DE ESTA SEMANA' : 'DETALLES DEL TRABAJADOR'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => updateEmployee(idx, { isDiscarded: !emp.isDiscarded })}
                                            className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg ${emp.isDiscarded
                                                ? 'bg-white text-red-600 hover:scale-105 active:scale-95'
                                                : 'bg-red-600 text-white hover:bg-red-700 hover:rotate-1 active:scale-95'}`}
                                        >
                                            {emp.isDiscarded ? '✅ Habilitar Trabajador' : '🚫 No trabajó esta semana'}
                                        </button>
                                    </div>

                                    {/* Discarded Overlay Label */}
                                    {emp.isDiscarded && (
                                        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                                            <div className="bg-red-600 text-white px-10 py-4 rounded-full font-black text-xs uppercase tracking-[0.5em] shadow-2xl rotate-12 ring-8 ring-white/20">FUERA DE NÓMINA</div>
                                        </div>
                                    )}

                                    {/* Deduction Indicator */}
                                    {!emp.isDiscarded && (
                                        <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl text-[10px] font-black text-white z-20 ${stats.deductions > 0 ? 'bg-red-600' : 'bg-green-600'}`}>
                                            ${stats.net.toLocaleString()} NETO
                                        </div>
                                    )}

                                    <div className="p-8">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="flex-1">
                                                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">{emp.name}</h3>
                                                <p className="text-[10px] text-[#BF953F] font-black uppercase tracking-widest mt-1">{emp.role}</p>
                                            </div>
                                        </div>

                                        <div className={`transition-all ${emp.isDiscarded ? 'pointer-events-none blur-[2px]' : ''}`}>
                                            {/* Critical Attendance Alert */}
                                            {!emp.isDiscarded && (stats.absences >= 2 || stats.lates >= 3) && (
                                                <div className="mb-4 bg-red-50 border-l-4 border-red-600 p-3 rounded-r-xl flex items-center gap-3 animate-pulse">
                                                    <span className="material-symbols-outlined text-red-600">warning</span>
                                                    <p className="text-[10px] font-black text-red-800 uppercase tracking-widest">
                                                        ALERTA: {stats.absences >= 2 ? `${stats.absences} FALTAS` : ''}
                                                        {stats.absences >= 2 && stats.lates >= 3 ? ' Y ' : ''}
                                                        {stats.lates >= 3 ? `${stats.lates} RETARDOS` : ''}
                                                        - REQUIERE LLAMADA DE ATENCIÓN
                                                    </p>
                                                </div>
                                            )}

                                            {/* Attendance Grid */}
                                            <div className="mb-6">
                                                <div className="grid grid-cols-6 gap-2">
                                                    {DAYS.map(day => {
                                                        const status = emp.attendance[day.id];
                                                        const configStyle = ATTENDANCE_VALUES[status];
                                                        return (
                                                            <button
                                                                key={day.id}
                                                                onClick={() => toggleAttendance(idx, day.id)}
                                                                className={`flex flex-col items-center justify-center py-3 rounded-2xl border-2 transition-all active:scale-90 ${configStyle.bg} ${status === 'present' ? 'border-transparent' : 'border-current'}`}
                                                            >
                                                                <span className="text-[8px] font-black uppercase mb-1 opacity-60 font-mono">{day.label}</span>
                                                                <span className={`material-symbols-outlined text-[18px] ${configStyle.color}`}>
                                                                    {configStyle.icon}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Rating Emoji Select */}
                                            <div className="flex gap-1 justify-between bg-slate-50 p-2 rounded-2xl">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <button
                                                        key={star}
                                                        onClick={() => updateEmployee(idx, { rating: star })}
                                                        className={`size-10 rounded-xl flex items-center justify-center text-xl transition-all ${emp.rating === star ? 'bg-white shadow-md scale-110' : 'opacity-30 grayscale'}`}
                                                    >
                                                        {star === 1 ? '😡' : star === 2 ? '☹️' : star === 3 ? '😐' : star === 4 ? '🙂' : '🤩'}
                                                    </button>
                                                ))}
                                            </div>

                                            <input
                                                className="w-full mt-4 p-2 text-xs border-b border-slate-100 focus:border-[#BF953F] outline-none placeholder:text-slate-300 font-bold"
                                                placeholder="Notas de desempeño (opcional)..."
                                                value={emp.notes}
                                                onChange={(e) => updateEmployee(idx, { notes: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <div className="pt-6">
                            <button
                                onClick={handleSubmit}
                                className="w-full py-5 bg-[#BF953F] text-white rounded-3xl font-black text-xl shadow-2xl hover:bg-[#AA771C] active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                <span className="material-symbols-outlined">verified</span>
                                Enviar Reporte Final
                            </button>
                            <p className="text-center text-[10px] text-slate-400 mt-6 font-bold uppercase tracking-widest px-8">Al enviar, confirmas que la cuadrilla ha cumplido con los criterios establecidos.</p>
                        </div>
                    </div>
                )}
            </main>

            {/* Hidden for Capture */}
            <div className="fixed -left-[2000px] top-0">
                <div ref={summaryRef} className="w-[800px] bg-white p-12 border-[20px] border-[#0B1B32]">
                    <div className="flex justify-between items-end border-b-8 border-[#BF953F] pb-8 mb-10">
                        <div>
                            <h1 className="text-5xl font-black text-[#0B1B32] tracking-tighter uppercase leading-none">REPORTE DE OBRA</h1>
                            <p className="text-xl font-bold text-[#BF953F] uppercase tracking-[0.3em]">RESUMEN DE ASISTENCIA V22</p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-black text-[#0B1B32] mb-1">{request?.projectName || 'OBRA'}</p>
                            <p className="text-lg font-bold text-slate-400 uppercase">SEMANA: {request?.weekStart}</p>
                        </div>
                    </div>

                    <table className="w-full mb-12">
                        <thead className="bg-[#0B1B32] text-white">
                            <tr>
                                <th className="p-4 text-left font-black uppercase text-sm">TRABAJADOR</th>
                                <th className="p-4 text-center font-black uppercase text-sm">F/R</th>
                                <th className="p-4 text-right font-black uppercase text-sm">PAGO NETO</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.filter(e => !e.isDiscarded).map(emp => {
                                const s = calculateSalary(emp);
                                const isCritical = s.absences >= 2 || s.lates >= 3;
                                return (
                                    <tr key={emp.id} className={`border-b-2 border-slate-100 ${isCritical ? 'bg-red-50' : ''}`}>
                                        <td className="p-5">
                                            <p className={`text-2xl font-black uppercase ${isCritical ? 'text-red-600 border-b-4 border-red-600 inline-block' : 'text-[#0B1B32]'}`}>{emp.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-sm font-bold text-slate-400">DESEMPEÑO: {emp.rating} Σ</p>
                                                {isCritical && (
                                                    <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter">ALERTA DE CONDUCTA</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-5 text-center">
                                            <div className="flex justify-center gap-3 font-black text-2xl">
                                                <span className={`${s.absences > 0 ? 'text-red-600' : 'text-slate-100'} ${s.absences >= 2 ? 'underline decoration-4' : ''}`}>{s.absences}F</span>
                                                <span className={`${s.lates > 0 ? 'text-amber-500' : 'text-slate-100'} ${s.lates >= 3 ? 'underline decoration-4' : ''}`}>{s.lates}R</span>
                                            </div>
                                        </td>
                                        <td className="p-5 text-right">
                                            <p className="text-3xl font-black text-slate-900 font-mono">${s.net.toLocaleString()}</p>
                                            <p className="text-[10px] font-black text-red-500">DESC: -${s.deductions.toLocaleString()}</p>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sticky Actions */}
            {step === 1 && (
                <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t border-slate-200 p-4 flex gap-3 z-[200]">
                    <button
                        onClick={handleGenerateImage}
                        className="flex-1 bg-teal-600 text-white py-4 rounded-3xl font-black text-sm uppercase flex items-center justify-center gap-2 shadow-xl"
                    >
                        <span className="material-symbols-outlined">image</span>
                        Guardar Comprobante
                    </button>
                </div>
            )}
        </div>
    );
}
