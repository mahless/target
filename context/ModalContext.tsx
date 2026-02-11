import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import LoadingOverlay from '../components/LoadingOverlay';

interface ModalOptions {
    title: string;
    content: ReactNode;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'info' | 'danger' | 'success';
    hideFooter?: boolean;
    confirmClose?: boolean;
    confirmIcon?: ReactNode;
    cancelIcon?: ReactNode;
    size?: 'md' | 'lg' | 'xl';
}

interface ModalContextType {
    showModal: (options: ModalOptions) => void;
    hideModal: () => void;
    showQuickStatus: (message: string, type?: 'success' | 'error') => void;
    isProcessing: boolean;
    setIsProcessing: (loading: boolean) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [modal, setModal] = useState<ModalOptions | null>(null);
    const [quickStatus, setQuickStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const showModal = (options: ModalOptions) => setModal(options);
    const hideModal = () => setModal(null);

    const showQuickStatus = (message: string, type: 'success' | 'error' = 'success') => {
        setQuickStatus({ message, type });
        setTimeout(() => setQuickStatus(null), 1500);
    };

    return (
        <ModalContext.Provider value={{ showModal, hideModal, showQuickStatus, isProcessing, setIsProcessing }}>
            {children}
            <LoadingOverlay isVisible={isProcessing} />
            {quickStatus && (
                <div className="fixed inset-0 pointer-events-none z-[2000] flex items-center justify-center animate-statusPopOut p-6">
                    <div className={`px-12 py-8 rounded-[2.5rem] shadow-premium flex flex-col items-center gap-4 backdrop-blur-xl border-2 transition-all duration-500 scale-110 ${quickStatus.type === 'error'
                        ? 'bg-red-600/90 text-white border-red-400/30'
                        : 'bg-[#01404E]/95 text-white border-[#00A6A6]/30'
                        }`}>
                        <div className={`p-4 rounded-2xl ${quickStatus.type === 'error' ? 'bg-white/10' : 'bg-[#00A6A6]/20'} shadow-inner`}>
                            {quickStatus.type === 'error' ? <AlertTriangle className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10 text-[#00A6A6]" />}
                        </div>
                        <span className="text-2xl font-black tracking-tight">{quickStatus.message}</span>
                    </div>
                </div>
            )}
            {modal && (
                <div className="fixed inset-0 bg-[#01404E]/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-scaleIn">
                    <div className={`bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-lux w-full p-8 border border-white relative flex flex-col max-h-[95vh] transition-all duration-300 ${modal.size === 'xl' ? 'max-w-4xl' : modal.size === 'lg' ? 'max-w-2xl' : 'max-w-md'
                        }`}>
                        <button
                            onClick={hideModal}
                            className="absolute top-6 left-6 p-2.5 text-gray-400 hover:text-[#01404E] hover:bg-gray-100 rounded-2xl transition-all z-[110] active:scale-90"
                            aria-label="إغلاق"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="flex items-center gap-5 mb-8 text-right">
                            <div className={`p-4 rounded-[1.25rem] shadow-inner ${modal.type === 'danger' ? 'bg-red-50 text-red-600' : modal.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-[#00A6A6]/10 text-[#00A6A6]'}`}>
                                {modal.type === 'danger' ? <AlertTriangle className="w-7 h-7" /> : modal.type === 'success' ? <CheckCircle2 className="w-7 h-7" /> : <Info className="w-7 h-7" />}
                            </div>
                            <div>
                                <h3 className={`text-2xl font-black tracking-tight ${modal.type === 'danger' ? 'text-red-700' : 'text-[#01404E]'}`}>
                                    {modal.title}
                                </h3>
                                <div className={`h-1 w-12 rounded-full mt-1 ${modal.type === 'danger' ? 'bg-red-600/30' : 'bg-[#00A6A6]/30'}`}></div>
                            </div>
                        </div>

                        <div className="text-[#01404E]/80 mb-8 font-bold leading-relaxed text-right overflow-y-auto custom-scrollbar px-1">
                            {modal.content}
                        </div>

                        {!modal.hideFooter && (
                            <div className="flex gap-4 mt-auto">
                                <button
                                    onClick={hideModal}
                                    className="flex-1 px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[#01404E]/60 hover:bg-gray-100 hover:text-[#01404E] font-black transition-all flex items-center justify-center gap-2 active:scale-95 text-sm"
                                >
                                    {modal.cancelIcon}
                                    {modal.cancelText || 'تراجع'}
                                </button>
                                {modal.onConfirm && (
                                    <button
                                        onClick={() => {
                                            modal.onConfirm?.();
                                            if (modal.confirmClose !== false) {
                                                hideModal();
                                            }
                                        }}
                                        className={`flex-[1.5] relative overflow-hidden group px-6 py-4 text-white rounded-2xl font-black shadow-lux transition-all active:scale-95 flex items-center justify-center gap-2 text-sm ${modal.type === 'danger'
                                            ? 'bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 shadow-red-600/20'
                                            : 'bg-gradient-to-r from-[#01404E] to-[#01404E] hover:from-[#00A6A6] hover:to-[#036564] shadow-[#01404E]/20'
                                            }`}
                                    >
                                        <div className="absolute top-0 left-0 w-full h-full bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                                        <div className="relative z-10 flex items-center gap-2">
                                            {modal.confirmIcon}
                                            <span>{modal.confirmText || 'تأكيد'}</span>
                                        </div>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) throw new Error('useModal must be used within a ModalProvider');
    return context;
};