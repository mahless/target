import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Printer, Settings, Search } from 'lucide-react';
import { ServiceEntry } from '../types';
import { STATUS, ROLES, SERVICE_TYPES } from '../constants';
import { normalizeArabic } from '../utils';

interface ActionDropdownProps {
    entry: ServiceEntry;
    userRole: string;
    onDeliver: (entry: ServiceEntry, isFinal?: boolean) => void;
    onCollectDebt?: (entry: ServiceEntry) => void;
    onSetWorkOrder: (entry: ServiceEntry) => void;
    onUpdateStatus: (entry: ServiceEntry, status: ServiceEntry['status'], label: string) => void;
    onCancel: (entry: ServiceEntry) => void;
    onSettleThirdParty: (entry: ServiceEntry) => void;
    onShowDetails: (entry: ServiceEntry) => void;
    onPrint: (entry: ServiceEntry) => void;
    onEditData: (entry: ServiceEntry) => void;
    isSubmitting: boolean;
}

const ActionDropdown: React.FC<ActionDropdownProps> = ({
    entry,
    userRole,
    onDeliver,
    onCollectDebt,
    onSetWorkOrder,
    onUpdateStatus,
    onCancel,
    onSettleThirdParty,
    onShowDetails,
    onPrint,
    onEditData,
    isSubmitting
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleAction = (action: () => void) => {
        setIsOpen(false);
        action();
    };

    const isCancelled = entry.status === STATUS.CANCELLED;
    const isDelivered = entry.status === STATUS.DELIVERED;

    if (isCancelled) return <span className="text-[10px] text-red-400 font-bold px-3 py-1 bg-red-50 rounded-xl border border-red-100">ملغاة</span>;
    if (isDelivered) return <span className="text-[10px] text-[#00A6A6] font-bold px-3 py-1 bg-[#00A6A6]/5 rounded-xl border border-[#00A6A6]/20 whitespace-nowrap">تم التسليم</span>;

    return (
        <div className="relative inline-block text-right" ref={menuRef}>
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                disabled={isSubmitting}
                className={`p-2 rounded-xl transition-all duration-300 ${isOpen ? 'bg-[#01404E] text-white shadow-lg' : 'bg-[#036564] text-white hover:bg-[#00A6A6] shadow-md border border-[#036564]/10'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
            >
                <MoreVertical className="w-5 h-5 text-white" />
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-premium-in py-1">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAction(() => onShowDetails(entry));
                        }}
                        className="w-full text-right px-4 py-2.5 text-xs font-black text-[#01404E] hover:bg-[#036564]/5 transition-colors border-b border-gray-50 flex items-center justify-between"
                    >
                        <span>عرض التفاصيل</span>
                        <Search size={14} className="text-[#01404E]/40" />
                    </button>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAction(() => onEditData(entry));
                        }}
                        className="w-full text-right px-4 py-2.5 text-xs font-black text-[#01404E] hover:bg-[#036564]/5 transition-colors border-b border-gray-50 flex items-center justify-between"
                    >
                        <span>تعديل البيانات</span>
                        <Settings size={14} className="text-[#01404E]/40" />
                    </button>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAction(() => onPrint(entry));
                        }}
                        className="w-full text-right px-4 py-2.5 text-xs font-black text-blue-600 hover:bg-blue-50 transition-colors border-b border-gray-50 flex items-center justify-between"
                    >
                        <span>طباعة إيصال</span>
                        <Printer size={14} className="text-blue-500" />
                    </button>

                    {/* الحاﻻت المالية والتسليم - تظهر لمعظم الحاﻻت النشطة */}
                    {!isDelivered && !isCancelled && (
                        <>
                            {/* تحصيل المتبقي - يظهر دائما في حال وجود مديونية */}
                            {entry.remainingAmount > 0 && onCollectDebt && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleAction(() => onCollectDebt(entry));
                                    }}
                                    className="w-full text-right px-4 py-2.5 text-xs font-black text-amber-600 hover:bg-amber-50 transition-colors border-b border-gray-50 flex items-center justify-between"
                                >
                                    <span>تحصيل المتبقي</span>
                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                </button>
                            )}

                            {/* التسليم - يعتمد على الحالة والمديونية */}
                            {entry.remainingAmount <= 0 && (
                                <>
                                    {entry.status === STATUS.READY && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleAction(() => onDeliver(entry, true));
                                            }}
                                            className="w-full text-right px-4 py-2.5 text-xs font-black text-[#036564] hover:bg-[#036564]/5 transition-colors border-b border-gray-50 flex items-center justify-between"
                                        >
                                            <span>تسليم نهائي</span>
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                        </button>
                                    )}
                                </>
                            )}

                            {/* رقم أمر الشغل - متاح دائما للكل - يخفي في حال سداد مديونية */}
                            {normalizeArabic(entry.serviceType) !== normalizeArabic(SERVICE_TYPES.DEBT_SETTLEMENT) && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleAction(() => onSetWorkOrder(entry));
                                    }}
                                    className="w-full text-right px-4 py-2.5 text-xs font-black text-blue-600 hover:bg-blue-50 transition-colors border-b border-gray-50"
                                >
                                    رقم أمر الشغل
                                </button>
                            )}

                            {/* تغيير الحالة */}
                            {entry.status === STATUS.IN_PROGRESS && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleAction(() => onUpdateStatus(entry, STATUS.READY as ServiceEntry['status'], 'جاهزة للتسليم'));
                                    }}
                                    className="w-full text-right px-4 py-2.5 text-xs font-black text-green-600 hover:bg-green-50 transition-colors border-b border-gray-50 flex items-center justify-between"
                                >
                                    <span>جاهزة للتسليم</span>
                                    <div className="w-2 h-2 rounded-full bg-green-400" />
                                </button>
                            )}

                            {/* تسوية طرف ثالث */}
                            {entry.status === STATUS.ACTIVE && entry.hasThirdParty && !entry.isCostPaid && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleAction(() => onSettleThirdParty(entry));
                                    }}
                                    className="w-full text-right px-4 py-2.5 text-xs font-black text-[#01404E] hover:bg-[#01404E]/5 transition-colors border-b border-gray-50"
                                >
                                    تسوية مكتب خارجي
                                </button>
                            )}

                            {/* إلغاء المعاملة - يخفي في حال سداد مديونية */}
                            {normalizeArabic(entry.serviceType) !== normalizeArabic(SERVICE_TYPES.DEBT_SETTLEMENT) && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleAction(() => onCancel(entry));
                                    }}
                                    className="w-full text-right px-4 py-2.5 text-xs font-black text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    إلغاء المعاملة
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ActionDropdown;
