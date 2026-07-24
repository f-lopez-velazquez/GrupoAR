import React from "react";
import { logError } from "../utils/errorHandler";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });

        // Log to Firebase
        logError(error, {
            componentStack: errorInfo?.componentStack,
            component: this.props.fallbackComponent || "Unknown"
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
                    <div className="max-w-md w-full bg-white rounded-2xl border border-[#e5e7eb] p-8 text-center shadow-lg">
                        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-4xl">error</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[#111518] mb-2">Algo salió mal</h1>
                        <p className="text-[#60778a] mb-6">
                            Ha ocurrido un error inesperado. Por favor recarga la página o intenta de nuevo.
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full py-3 px-6 bg-gradient-to-r from-[#0066cc] to-[#0099ff] text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">refresh</span>
                                Recargar Página
                            </button>
                            <button
                                onClick={() => {
                                    this.setState({ hasError: false, error: null, errorInfo: null });
                                    window.location.href = "/";
                                }}
                                className="w-full py-3 px-6 border border-[#e5e7eb] text-[#60778a] rounded-xl font-semibold hover:bg-[#f8fafc] transition-all"
                            >
                                Ir al Inicio
                            </button>
                        </div>
                        {process.env.NODE_ENV === "development" && this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="text-sm text-[#60778a] cursor-pointer hover:text-[#111518]">
                                    Detalles del error (desarrollo)
                                </summary>
                                <pre className="mt-2 p-4 bg-[#f8fafc] rounded-lg text-xs overflow-auto max-h-40 text-red-600">
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
