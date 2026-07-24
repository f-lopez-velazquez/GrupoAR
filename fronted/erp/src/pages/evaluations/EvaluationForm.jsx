import { useState, useRef } from "react";
import { useAuth } from "../../state/AuthContext";
import { createEvaluation } from "../../services/evaluations";
import { useNavigate } from "react-router-dom";
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
    late: { icon: 'schedule', color: 'text-amber-500', bg: 'bg-amber-50', label: 'Retardo' }
};

export default function EvaluationForm() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const summaryRef = useRef(null);

    const [step, setStep] = useState(0); // 0: Config, 1: Employees, 2: Finalize
    const [config, setConfig] = useState({
        weekStart: new Date().toISOString().split('T')[0],
        projectId: "Obra-General",
        absencePenalty: 250,
        latePenalty: 100,
        showCapture: false
    });

    const [employees, setEmployees] = useState([
        {
            id: Date.now(),
            name: "",
            rating: 3,
            baseSalary: 2800,
            attendance: { mon: 'present', tue: 'present', wed: 'present', thu: 'present', fri: 'present', sat: 'present' },
            notes: "",
            isDiscarded: false
        }
    ]);

    const addEmployee = () => {
        setEmployees([...employees, {
            id: Date.now(),
            name: "",
            rating: 3,
            baseSalary: 2800,
            attendance: { mon: 'present', tue: 'present', wed: 'present', thu: 'present', fri: 'present', sat: 'present' },
            notes: "",
            isDiscarded: false
        }]);
    };

    const updateEmployee = (idx, updates) => {
        const updated = [...employees];
        updated[idx] = { ...updated[idx], ...updates };
        setEmployees(updated);
    };

    const toggleAttendance = (empIdx, dayId) => {
        const current = employees[empIdx].attendance[dayId];
        let next = 'present';
        if (current === 'present') next = 'absent';
        else if (current === 'absent') next = 'late';

        const newAttendance = { ...employees[empIdx].attendance, [dayId]: next };
        updateEmployee(empIdx, { attendance: newAttendance });
    };

    const calculateSalary = (emp) => {
        const counts = Object.values(emp.attendance).reduce((acc, status) => {
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, { absent: 0, late: 0 });

        const deductions = (counts.absent * config.absencePenalty) + (counts.late * config.latePenalty);
        return {
            net: emp.baseSalary - deductions,
            absences: counts.absent,
            lates: counts.late,
            deductions
        };
    };

    const handleGenerateImage = async () => {
        if (!summaryRef.current) return;
        try {
            const dataUrl = await toPng(summaryRef.current, { quality: 0.95, pixelRatio: 2 });
            const link = document.createElement('a');
            link.download = `Reporte-Semanal-${config.weekStart}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Capture error:", err);
        }
    };

    const handleSubmit = async () => {
        try {
            const activeEmployees = employees.filter(e => !e.isDiscarded);
            if (activeEmployees.length === 0) {
                alert("⚠️ Debe haber al menos un empleado activo.");
                return;
            }

            const payload = {
                managerId: user?.uid || "public-link",
                managerName: user?.displayName || "Encargado de Obra",
                projectId: config.projectId,
                weekStart: config.weekStart,
                penalties: { absence: config.absencePenalty, late: config.latePenalty },
                employees: activeEmployees.map(emp => ({
                    ...emp,
                    salaryDetails: calculateSalary(emp)
                })),
                timestamp: new Date()
            };
            await createEvaluation(payload);
            alert("✅ Reporte de Nómina y Evaluación guardado.");
            navigate("/dashboard");
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    return (
        <div className="min-h-screen bg-[#f1f5f9] font-jakarta pb-32">

            {/* Header */}
            <header className="bg-[#0B1B32] p-6 shadow-xl sticky top-0 z-[100] text-white flex justify-between items-center border-b-4 border-[#BF953F]">
                <div>
                    <h1 className="font-black text-xl tracking-tighter uppercase">EVALUACIÓN SEMANAL</h1>
                    <p className="text-[10px] opacity-60 font-bold uppercase tracking-widest">Grupo AR • Control de Nómina</p>
                </div>
                <div className="bg-[#BF953F] px-4 py-1 rounded-full text-[10px] font-black shadow-lg">
                    PASO {step + 1} DE 2
                </div>
            </header>

            <div className="max-w-xl mx-auto p-4 space-y-6">

                {/* STEP 0: Configuration */}
                {step === 0 && (
                    <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-6">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="size-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                                <span className="material-symbols-outlined">settings</span>
                            </div>
                            <h2 className="text-xl font-black text-slate-800">CONFIGURACIÓN DE SEMANA</h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Inicio de Semana</label>
                                <input
                                    type="date"
                                    className="w-full bg-slate-50 p-4 rounded-2xl font-black border-2 border-slate-100 focus:border-[#BF953F] outline-none transition-all"
                                    value={config.weekStart}
                                    onChange={(e) => setConfig({ ...config, weekStart: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Penalización Falta</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 p-4 pl-8 rounded-2xl font-black border-2 border-slate-100 focus:border-red-500 outline-none"
                                            value={config.absencePenalty}
                                            onChange={(e) => setConfig({ ...config, absencePenalty: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Penalización Retardo</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 p-4 pl-8 rounded-2xl font-black border-2 border-slate-100 focus:border-amber-500 outline-none"
                                            value={config.latePenalty}
                                            onChange={(e) => setConfig({ ...config, latePenalty: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setStep(1)}
                                className="w-full bg-[#0B1B32] text-white py-5 rounded-2xl font-black text-lg shadow-2xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                                Empezar Evaluación
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 1: Evaluation List */}
                {step === 1 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
                        {/* Instructional Banner */}
                        <div className="bg-[#0B1B32] text-white p-6 rounded-3xl shadow-xl flex items-center gap-4 border-l-8 border-[#BF953F]">
                            <span className="material-symbols-outlined text-[#BF953F] text-3xl">info</span>
                            <div className="flex-1">
                                <p className="text-sm font-black uppercase tracking-tight">Indicaciones Especiales</p>
                                <p className="text-[11px] opacity-80 leading-snug">Si un trabajador no laboró esta semana, use el botón <b>"Descartar"</b>. Esto lo excluirá del reporte final y del cálculo de nómina.</p>
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
                                                <input
                                                    placeholder="Nombre del trabajador..."
                                                    className="w-full text-2xl font-black border-none focus:ring-0 outline-none placeholder:text-slate-200 uppercase tracking-tighter"
                                                    value={emp.name}
                                                    onChange={(e) => updateEmployee(idx, { name: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                {idx > 0 && (
                                                    <button
                                                        onClick={() => setEmployees(employees.filter((_, i) => i !== idx))}
                                                        className="text-slate-300 hover:text-red-500 transition-colors p-2"
                                                        title="Eliminar de la lista"
                                                    >
                                                        <span className="material-symbols-outlined">delete</span>
                                                    </button>
                                                )}
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
                                            <div className="mb-8">
                                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Control de Asistencia</h3>
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
                                                                <span className="text-[9px] font-black uppercase mb-1 opacity-60">{day.label}</span>
                                                                <span className={`material-symbols-outlined text-[20px] ${configStyle.color}`}>
                                                                    {configStyle.icon}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Salary & Rating Grid */}
                                            <div className="grid grid-cols-2 gap-6 items-center">
                                                <div>
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Salario Base</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-slate-50 p-2 pl-6 rounded-xl font-black text-sm border border-slate-100"
                                                            value={emp.baseSalary}
                                                            onChange={(e) => updateEmployee(idx, { baseSalary: parseInt(e.target.value) || 0 })}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex gap-1 justify-end">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <button
                                                            key={star}
                                                            onClick={() => updateEmployee(idx, { rating: star })}
                                                            className={`size-8 rounded-lg flex items-center justify-center transition-all ${emp.rating === star ? 'bg-[#BF953F] text-white shadow-lg scale-110' : 'bg-slate-50 text-slate-200'}`}
                                                        >
                                                            {star === 1 ? '😡' : star === 2 ? '☹️' : star === 3 ? '😐' : star === 4 ? '🙂' : '🤩'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <button
                            onClick={addEmployee}
                            className="w-full py-6 border-4 border-dashed border-[#0B1B32]/10 rounded-3xl text-[#0B1B32]/40 font-black uppercase tracking-[0.2em] hover:bg-white hover:text-[#0B1B32] hover:border-[#0B1B32]/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                            <span className="material-symbols-outlined">person_add</span>
                            Anexar Trabajador
                        </button>
                    </div>
                )}

            </div>

            {/* HIDDEN CAPTURE CONTAINER (For PNG Generation) */}
            <div className="fixed -left-[2000px] top-0">
                <div ref={summaryRef} className="w-[800px] bg-white p-12 border-[20px] border-[#0B1B32]">
                    <div className="flex justify-between items-end border-b-8 border-[#BF953F] pb-8 mb-10">
                        <div>
                            <img src="/assets/logo.png" alt="AR" className="h-20 mb-4" />
                            <h1 className="text-5xl font-black text-[#0B1B32] tracking-tighter uppercase leading-none">REPORTE SEMANAL</h1>
                            <p className="text-xl font-bold text-[#BF953F] uppercase tracking-[0.3em]">RELACIÓN DE NÓMINA Y ASISTENCIA</p>
                        </div>
                        <div className="text-right">
                            <p className="text-4xl font-black text-[#0B1B32] mb-1">CORTE: {config.weekStart}</p>
                            <p className="text-lg font-bold text-slate-400 uppercase">PROYECTO: {config.projectId}</p>
                        </div>
                    </div>

                    <table className="w-full mb-12">
                        <thead className="bg-[#0B1B32] text-white">
                            <tr>
                                <th className="p-4 text-left font-black uppercase tracking-widest text-sm">TRABAJADOR</th>
                                <th className="p-4 text-center font-black uppercase tracking-widest text-sm">FALTAS</th>
                                <th className="p-4 text-center font-black uppercase tracking-widest text-sm">RETARDOS</th>
                                <th className="p-4 text-right font-black uppercase tracking-widest text-sm">PAGO NETO</th>
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
                                        <td className={`p-5 text-center text-2xl font-black ${s.absences > 0 ? 'text-red-600' : 'text-slate-200'} ${s.absences >= 2 ? 'underline decoration-4' : ''}`}>{s.absences}</td>
                                        <td className={`p-5 text-center text-2xl font-black ${s.lates > 0 ? 'text-amber-500' : 'text-slate-200'} ${s.lates >= 3 ? 'underline decoration-4' : ''}`}>{s.lates}</td>
                                        <td className="p-5 text-right">
                                            <p className="text-3xl font-black text-slate-900 font-mono">${s.net.toLocaleString()}</p>
                                            <p className="text-[10px] font-black text-red-500">DESC: -${s.deductions.toLocaleString()}</p>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <div className="grid grid-cols-2 gap-12 mt-20">
                        <div className="border-t-4 border-slate-900 pt-4 text-center">
                            <p className="font-black text-xs uppercase tracking-[0.3em]">FIRMA ENCARGADO</p>
                            <p className="text-slate-400 mt-1 font-bold">{user?.displayName || 'Dpto. Operativo'}</p>
                        </div>
                        <div className="border-t-4 border-slate-900 pt-4 text-center">
                            <p className="font-black text-xs uppercase tracking-[0.3em]">SELLO CORPORATIVO</p>
                            <p className="text-[#BF953F] mt-1 font-black">GRUPO AR S.A. DE C.V.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Navigation Footer */}
            <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t-2 border-slate-200 p-6 flex gap-4 z-[200]">
                {step > 0 && (
                    <button
                        onClick={() => setStep(step - 1)}
                        className="px-8 py-4 rounded-2xl bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[10px]"
                    >
                        Atrás
                    </button>
                )}
                {step === 1 && (
                    <>
                        <button
                            onClick={handleGenerateImage}
                            className="bg-teal-600 text-white px-6 py-4 rounded-2xl font-black text-sm uppercase flex items-center gap-2 shadow-xl hover:bg-teal-700 active:scale-95"
                        >
                            <span className="material-symbols-outlined">image</span>
                            Generar PNG
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="flex-1 bg-[#BF953F] text-white py-4 rounded-2xl font-black text-lg uppercase shadow-2xl hover:bg-[#AA771C] active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <span className="material-symbols-outlined">save_as</span>
                            Finalizar Reporte
                        </button>
                    </>
                )}
            </div>
        </div >
    );
}
