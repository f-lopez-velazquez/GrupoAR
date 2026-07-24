import React, { useRef, useState } from "react";
import { importInventoryFromJson } from "../services/inventory";

const InventoryImport = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(null);
  const fileInputRef = useRef(null);

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    setStatus("");
    setProgress(null);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const dropped = event.dataTransfer.files?.[0] || null;
    if (dropped) {
      setFile(dropped);
      setStatus("");
      setProgress(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setStatus("Importando...");
    setProgress(null);

    try {
      const total = await importInventoryFromJson(file, (done, totalItems) => {
        setProgress({ done, total: totalItems });
      });
      setStatus(`Importados ${total} productos.`);
    } catch (error) {
      setStatus(error.message || "Error al importar.");
    }
  };

  const handleDownloadTemplate = () => {
    const sample = [
      { name: "Martillo 16oz", sku: "HM-16-ST", stock: 120, price: 145.5 },
      { name: "Guantes de seguridad", sku: "SG-LG-PRO", stock: 340, price: 85 },
    ];
    const blob = new Blob([JSON.stringify(sample, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla-inventario.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-white font-display">
      <div className="mx-auto w-full max-w-4xl px-4 py-10 space-y-8">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span>Inicio</span>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span>Inventario</span>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-slate-900 dark:text-white font-semibold">Importar</span>
        </nav>

        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black">Importar inventario</h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
            Carga cambios masivos en formato JSON. Verifica el esquema antes de subir.
          </p>
        </div>

        <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700 p-6 md:p-10 space-y-8 shadow-sm">
          <div
            className="group relative flex flex-col items-center justify-center w-full min-h-[320px] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-primary/5 hover:border-primary transition-all duration-300 cursor-pointer"
            onClick={handlePickFile}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex flex-col items-center gap-5 p-6 text-center max-w-md z-10">
              <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-primary text-[40px]">description</span>
              </div>
              <div className="space-y-1">
                <p className="text-slate-900 dark:text-white text-xl font-bold">
                  Arrastra tu archivo aqui
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  o haz click para buscar en tu computadora
                </p>
              </div>
              <button
                className="mt-4 flex min-w-[160px] items-center justify-center gap-2 rounded-lg h-11 px-6 bg-primary hover:bg-blue-700 text-white text-sm font-bold shadow-md transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">upload_file</span>
                <span className="truncate">Seleccionar JSON</span>
              </button>
              {file && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Archivo: {file.name}
                </div>
              )}
            </div>
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-slate-300 dark:border-slate-600 rounded-tl-lg m-2" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-slate-300 dark:border-slate-600 rounded-tr-lg m-2" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-slate-300 dark:border-slate-600 rounded-bl-lg m-2" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-slate-300 dark:border-slate-600 rounded-br-lg m-2" />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 border-t border-slate-100 dark:border-slate-800 pt-6 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">data_object</span>
              <span>Formato: <strong>.json</strong></span>
            </div>
            <div className="hidden md:block w-px h-4 bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">straighten</span>
              <span>Max size: <strong>25MB</strong></span>
            </div>
            <div className="hidden md:block w-px h-4 bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">code</span>
              <span>Encoding: <strong>UTF-8</strong></span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              className="flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-blue-700 text-white font-bold py-3 px-6 transition-all shadow-md disabled:opacity-50"
              onClick={handleImport}
              type="button"
              disabled={!file}
            >
              <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
              Importar
            </button>
            {progress && (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {progress.done} de {progress.total} productos
              </div>
            )}
          </div>
          {status && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 px-4 py-3 text-sm text-slate-700 dark:text-blue-200">
              {status}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <p>Necesitas ayuda con el formato?</p>
          <button
            className="flex items-center gap-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 font-bold"
            onClick={handleDownloadTemplate}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Descargar plantilla JSON
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryImport;
