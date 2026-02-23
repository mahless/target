import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { ServiceEntry } from '../types';
import { STATUS } from '../constants';
import { decodeId } from '../utils';
import {
    ClipboardCheck,
    Settings,
    CheckCircle2,
    PartyPopper,
    User,
    FileText,
    Calendar,
    Wrench,
    ArrowRight,
    Search,
    Clock,
    ShieldCheck,
    AlertCircle
} from 'lucide-react';

// Service lifecycle steps
const STEPS = [
    { key: 'received', label: 'قيد المراجعة', icon: ClipboardCheck, color: '#6366f1' },
    { key: 'in-progress', label: 'قيد التنفيذ', icon: Settings, color: '#3b82f6' },
    { key: 'ready', label: 'جاهز للاستلام', icon: CheckCircle2, color: '#10b981' },
    { key: 'completed', label: 'تم التسليم', icon: PartyPopper, color: '#059669' },
];

const getStepIndex = (status: string): number => {
    switch (status) {
        case 'active':
        case STATUS.PENDING: return 0;
        case STATUS.IN_PROGRESS: return 1;
        case STATUS.READY: return 2;
        case STATUS.DELIVERED: return 3;
        default: return 0;
    }
};

const getStatusLabel = (status: string): string => {
    switch (status) {
        case 'active':
        case STATUS.PENDING: return 'قيد المراجعة';
        case STATUS.IN_PROGRESS: return 'قيد التنفيذ';
        case STATUS.READY: return 'جاهز للاستلام';
        case STATUS.DELIVERED: return 'تم التسليم بنجاح';
        case 'cancelled': return 'ملغاة';
        default: return status;
    }
};

const TrackingPage = () => {
    const { id } = useParams<{ id: string }>();
    const [entry, setEntry] = useState<ServiceEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchEntry = async () => {
            if (!id) {
                setError('رقم المعاملة غير صالح');
                setLoading(false);
                return;
            }
            try {
                const decodedId = decodeId(id);
                const result = await GoogleSheetsService.getEntryById(decodedId);
                if (result) {
                    setEntry(result);
                } else {
                    setError('لم يتم العثور على المعاملة. تأكد من صحة الرقم.');
                }
            } catch {
                setError('حدث خطأ في الاتصال بالسيرفر.');
            } finally {
                setLoading(false);
            }
        };
        fetchEntry();
    }, [id]);

    if (loading) {
        return (
            <div className="h-screen bg-[#01404E] flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                <div className="w-16 h-16 border-4 border-[#00A6A6]/20 border-t-[#00A6A6] rounded-full animate-spin mb-6"></div>
                <h2 className="text-white text-xl font-black mb-2 animate-pulse">جاري جلب بيانات المعاملة</h2>
                <p className="text-white/60 text-sm font-bold">لحظات وسنكون معك...</p>
            </div>
        );
    }

    if (error || !entry) {
        return (
            <div className="h-screen bg-[#01404E] flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 text-red-500">
                    <AlertCircle size={48} />
                </div>
                <h2 className="text-white text-2xl font-black mb-4 tracking-tight">{error || 'عذراً، المعاملة غير موجودة'}</h2>
                <p className="text-white/60 text-base font-bold mb-8 max-w-sm leading-relaxed">قم بمسح الـ QR من الإيصال مرة أخرى</p>
                <button
                    onClick={() => window.location.href = 'https://target4gov.com'}
                    className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-2xl font-black transition-all border border-white/10 active:scale-95 flex items-center gap-2"
                >
                    <ArrowRight size={18} /> العودة للموقع الرسمي
                </button>
            </div>
        );
    }

    const currentStepIndex = getStepIndex(entry.status);
    const isCancelled = entry.status === 'cancelled';

    return (
        <div className="h-screen bg-[#F2E3D5] flex flex-col items-center justify-center p-4 md:p-6 font-['Cairo'] selection:bg-[#00A6A6]/20 overflow-hidden relative" dir="rtl">
            <div className="absolute inset-0 bg-gradient-to-b from-[#01404E]/5 to-transparent pointer-events-none"></div>

            {/* Main Content Card */}
            <div className="w-full max-w-lg relative z-10 animate-scaleIn">
                {/* Status Top Bar */}
                <div className={`w-full ${isCancelled ? 'bg-red-500' : 'bg-[#01404E]'} p-4 rounded-t-[2.5rem] flex items-center justify-between px-8 shadow-xl border-t border-x border-white/20`}>
                    <div className="flex items-center gap-2 text-white">
                        <Clock size={16} />
                        <span className="text-xs font-black">حالة الطلب:</span>
                    </div>
                    <span className="bg-white/20 backdrop-blur-md text-white px-4 py-1 rounded-full text-sm font-black ring-1 ring-white/30">
                        {getStatusLabel(entry.status)}
                    </span>
                </div>

                {/* Content Body */}
                <div className="bg-white/80 backdrop-blur-2xl p-6 md:p-2 rounded-b-[2.5rem] shadow-premium border-x border-b border-white/50 space-y-1">

                    {/* Integrated Header */}
                    <div className="text-center pb-1 border-b border-gray-100/50">
                        <div className="w-24 h-14 mx-auto rounded-xl bg-white shadow-sm p-1.5 mb-3 border border-gray-100 overflow-hidden flex items-center justify-center">
                            <img src="./assets/sidebar-logo.jpg" alt="Target Logo" className="w-full h-full object-contain" />
                        </div>
                        <h1 className="text-lg md:text-xl font-black text-[#01404E] tracking-tight">تارجت للخدمات الحكومية</h1>
                    </div>

                    {/* Basic Info Grid */}
                    <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center gap-4 bg-white/50 p-4 rounded-2xl border border-white shadow-sm group hover:border-[#00A6A6]/30 transition-all">
                            <div className="w-10 h-10 rounded-xl bg-[#01404E]/5 flex items-center justify-center text-[#01404E] group-hover:bg-[#00A6A6] group-hover:text-white transition-all">
                                <User size={20} />
                            </div>
                            <div>
                                <p className="text-[8px] md:text-[10px] font-black text-[#01404E]/40 uppercase mb-0.5 tracking-wider">اسم العميل</p>
                                <p className="text-sm md:text-base font-black text-[#01404E]">{entry.clientName}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-4 bg-white/50 p-4 rounded-2xl border border-white shadow-sm group hover:border-[#00A6A6]/30 transition-all">
                                <div className="w-10 h-10 rounded-xl bg-[#01404E]/5 flex items-center justify-center text-[#01404E] group-hover:bg-[#00A6A6] group-hover:text-white transition-all">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <p className="text-[8px] md:text-[10px] font-black text-[#01404E]/40 uppercase mb-0.5 tracking-wider">نوع الخدمة</p>
                                    <p className="text-sm md:text-base font-black text-[#01404E]">{entry.serviceType}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-white/50 p-4 rounded-2xl border border-white shadow-sm group hover:border-[#00A6A6]/30 transition-all">
                                <div className="w-10 h-10 rounded-xl bg-[#01404E]/5 flex items-center justify-center text-[#01404E] group-hover:bg-[#00A6A6] group-hover:text-white transition-all">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <p className="text-[8px] md:text-[10px] font-black text-[#01404E]/40 uppercase mb-0.5 tracking-wider">التاريخ</p>
                                    <p className="text-sm md:text-base font-black text-[#01404E]">{entry.entryDate}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progressive Stepper */}
                    {!isCancelled && (
                        <div className="pt-2">
                            <div className="relative">
                                {/* Connector Background Line */}
                                <div className="absolute top-6 left-6 right-6 h-1 bg-gray-100 rounded-full">
                                    {/* Dynamic Progress Overly Line */}
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                                        style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
                                    ></div>
                                </div>

                                {/* Steps */}
                                <div className="relative z-10 flex justify-between">
                                    {STEPS.map((step, index) => {
                                        const isActive = index <= currentStepIndex;
                                        const isCurrent = index === currentStepIndex;
                                        const StepIcon = step.icon;

                                        return (
                                            <div key={step.key} className="flex flex-col items-center gap-3 flex-1 group">
                                                <div className={`
                                                    w-12 h-12 rounded-2xl border-4 transition-all duration-500 flex items-center justify-center
                                                    ${isActive
                                                        ? 'bg-white shadow-xl scale-110'
                                                        : 'bg-gray-50 border-gray-100 text-gray-300'}
                                                    ${isCurrent ? 'animate-bounce border-[#00A6A6] text-[#00A6A6]' : (isActive ? 'border-green-500 text-green-500' : 'border-transparent')}
                                                `}>
                                                    <StepIcon size={20} strokeWidth={isActive ? 3 : 2} />
                                                </div>
                                                <span className={`
                                                    text-[10px] font-black tracking-tighter transition-colors duration-300
                                                    ${isCurrent ? 'text-[#00A6A6]' : (isActive ? 'text-green-600' : 'text-gray-400')}
                                                `}>
                                                    {step.label}
                                                </span>

                                                {/* Visual Current Indicator Dot */}
                                                {isCurrent && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#00A6A6] animate-ping"></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Status Specific Messages */}
                    {entry.status === STATUS.READY && (
                        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-center gap-2 mt-4 animate-pulse text-center">
                            <AlertCircle size={20} className="text-emerald-600 shrink-0" />
                            <p className="text-emerald-700 font-black text-sm">
                                برجاء التوجه للمكتب لاستلام {entry.serviceType}
                            </p>
                        </div>
                    )}

                    {/* Integrated Footer Links */}
                    <div className="pt-6 border-t border-gray-50 space-y-4">
                        <div className="flex items-center justify-between text-[#01404E]/40 text-[8px] font-bold italic">
                            <div className="flex items-center gap-1.5">
                                <ShieldCheck size={12} />
                                <span>بيانات مؤمنة رسمياً</span>
                            </div>
                            <span>تحديث: {new Date(entry.timestamp).toLocaleDateString('ar-EG')}</span>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                            <p className="text-[10px] font-black text-[#01404E]/50">تارجت للخدمات الحكومية © 2026</p>
                            <div className="flex items-center justify-center gap-4 text-[8px] font-bold text-[#01404E]/60">
                                <span>الشروط والأحكام</span>
                                <div className="w-1 h-1 rounded-full bg-[#01404E]/10"></div>
                                <span>سياسة الخصوصية</span>
                                <div className="w-1 h-1 rounded-full bg-[#01404E]/10"></div>
                                <span>تواصل معنا</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrackingPage;
