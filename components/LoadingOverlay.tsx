import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
    isVisible: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible }) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-all duration-500 animate-fadeIn pointer-events-auto">
            {/* Background Blur Overlay */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />

            {/* Content Container */}
            <div className="relative flex flex-col items-center gap-6 p-10 rounded-3xl bg-white/10 border border-white/20 shadow-2xl animate-scaleIn">
                <div className="relative">
                    {/* Outer Ring Animation */}
                    <div className="absolute inset-0 rounded-full border-4 border-white/20 scale-125" />
                    <Loader2 className="w-16 h-16 text-white animate-spin drop-shadow-lg" />
                </div>

                <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl font-black text-white tracking-widest uppercase">جاري التنفيذ...</span>
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                    </div>
                </div>
            </div>

            {/* Pointer Events Interceptor */}
            <div className="absolute inset-0 pointer-events-auto cursor-wait" />
        </div>
    );
};

export default LoadingOverlay;
