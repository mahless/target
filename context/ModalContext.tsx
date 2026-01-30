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
                <div className="fixed inset-0 pointer-events-none z-[200] flex items-center justify-center animate-statusPopOut">
                    <div className={`px-12 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-3 backdrop-blur-md border ${quickStatus.type === 'error' ? 'bg-red-600/90 text-white border-red-400' : 'bg-green-600/90 text-white border-green-400'
                        }`}>
                        {quickStatus.type === 'error' ? <AlertTriangle className="w-12 h-12" /> : <CheckCircle2 className="w-12 h-12" />}
                        <span className="text-3xl font-black">{quickStatus.message}</span>
                    </div>
                </div>
            )}
            {modal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-scaleIn">
                    <div className={`bg-white rounded-3xl shadow-2xl w-full p-6 border border-white/20 relative flex flex-col max-h-[95vh] transition-all duration-300 ${modal.size === 'xl' ? 'max-w-4xl' : modal.size === 'lg' ? 'max-w-2xl' : 'max-w-md'
                        }`}>
                        <button
                            onClick={hideModal}
                            className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-[110]"
                            aria-label="إغلاق"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <div className={`absolute top-0 right-0 left-0 h-1.5 ${modal.type === 'danger' ? 'bg-red-600' : modal.type === 'success' ? 'bg-green-500' : 'bg-blue-700'}`}></div>

                        <div className="flex items-center gap-4 mb-4 text-right">
                            <div className={`p-3 rounded-2xl ${modal.type === 'danger' ? 'bg-red-50 text-red-600' : modal.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-700'}`}>
                                {modal.type === 'danger' ? <AlertTriangle className="w-6 h-6" /> : modal.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                            </div>
                            <div>
                                <h3 className={`text-xl font-black ${modal.type === 'danger' ? 'text-red-700' : 'text-blue-900'}`}>
                                    {modal.title}
                                </h3>
                            </div>
                        </div>

                        <div className="text-gray-600 mb-6 font-bold leading-relaxed text-right overflow-y-auto custom-scrollbar">
                            {modal.content}
                        </div>
                        {!modal.hideFooter && (
                            <div className="flex gap-3 mt-2">
                                <button
                                    onClick={hideModal}
                                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 font-black transition-colors"
                                >
                                    {modal.cancelText || 'تراجع'}
                                </button>
                                {modal.onConfirm && (
                                    <button
                                        onClick={() => {
                                            modal.onConfirm?.();
                                            hideModal();
                                        }}
                                        className={`flex-1 px-4 py-3 text-white rounded-xl font-black shadow-lg transition-all active:scale-95 ${modal.type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 'bg-blue-700 hover:bg-blue-800 shadow-blue-700/20'
                                            }`}
                                    >
                                        {modal.confirmText || 'تأكيد'}
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