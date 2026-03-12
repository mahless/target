import React, { useState, useMemo } from 'react';
import { ServiceEntry, Expense, Branch } from '../types';
import SearchInput from '../components/SearchInput';
import { Users, Clock, Printer, CheckCircle2, Filter, AlertCircle } from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { searchMultipleFields, useDebounce, normalizeArabic, getTodayDate } from '../utils';
import { SERVICE_TYPES, EXPENSE_CATEGORIES, ROLES } from '../constants';
import ServiceEntryDetails from '../components/ServiceEntryDetails';
import { generateReceipt } from '../services/pdfService';

interface ThirdPartySettlementsProps {
    entries: ServiceEntry[];
    onUpdateEntry: (updatedEntry: ServiceEntry) => Promise<boolean>;
    onAddExpense: (expense: Expense) => Promise<boolean>;
    branchId: string;
    currentDate: string;
    username: string;
    isSyncing: boolean;
    onRefresh: () => void;
    isSubmitting?: boolean;
    branches: Branch[];
    userRole: string;
}

const ThirdPartySettlements: React.FC<ThirdPartySettlementsProps> = ({
    entries, onUpdateEntry, onAddExpense, branchId, currentDate, username, isSyncing, onRefresh, isSubmitting = false, branches, userRole
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const { showModal, showQuickStatus, setIsProcessing } = useModal();

    const currentBranch = useMemo(() => {
        const normId = normalizeArabic(branchId);
        return branches.find(b => normalizeArabic(b.id) === normId);
    }, [branches, branchId]);

    const currentBranchBalance = (currentBranch as any)?.Current_Balance ?? (currentBranch as any)?.currentBalance ?? 0;

    const handleSettleThirdParty = (entry: ServiceEntry) => {
        showModal({
            title: 'تسوية تكلفة المكتب الخارجي ',
            type: 'info',
            content: (
                <div className="space-y-3 text-right">
                    <p className="text-gray-600 font-bold">متأكد من دفع مبلغ <span className="text-blue-600 font-black">{entry.thirdPartyCost} ج.م</span> للمكتب الخارجي <span className="text-blue-600 font-black">{entry.thirdPartyName}</span>؟</p>
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                        <p className="text-[10px] text-blue-700 leading-relaxed font-bold">سيتم خصم المبلغ من رصيد الخزنة، وسيتم تسجيل العملية باسمك.</p>
                    </div>
                </div>
            ),
            confirmText: 'تأكيد الصرف والتسوية',
            onConfirm: async () => {
                if ((entry.thirdPartyCost || 0) > currentBranchBalance) {
                    showQuickStatus('لا يوجد كاش كافٍ في الفرع لإتمام التسوية', 'error');
                    return;
                }

                const updatedEntry: ServiceEntry = {
                    ...entry,
                    isCostPaid: true,
                    costPaidDate: getTodayDate(),
                    costPaidBy: username
                };

                const result = await onUpdateEntry(updatedEntry);
                if (result) {
                    const thirdPartyExpense: Expense = {
                        id: `tp-${Date.now()}-${entry.id}`,
                        category: EXPENSE_CATEGORIES.THIRD_PARTY,
                        amount: entry.thirdPartyCost || 0,
                        notes: `تسوية للمكتب الخارجي: ${entry.thirdPartyName} | العميل: ${entry.clientName} | ${entry.serviceType}`,
                        branchId: entry.branchId,
                        date: currentDate,
                        timestamp: Date.now(),
                        recordedBy: username
                    };

                    await onAddExpense(thirdPartyExpense);
                    showQuickStatus('تمت التسوية وتسجيل المصروف بنجاح');
                } else {
                    showQuickStatus('فشل السيرفر في التحديث', 'error');
                }
            }
        });
    };

    const showCustomerDetails = (entry: ServiceEntry) => {
        showModal({
            title: 'تفاصيل المعاملة',
            size: 'lg',
            content: <ServiceEntryDetails entry={entry} userRole={userRole} />,
            confirmText: 'طباعة إيصال',
            confirmIcon: <Printer className="w-4 h-4" />,
            confirmClose: false,
            onConfirm: async () => {
                setIsProcessing(true);
                try {
                    await generateReceipt(entry);
                } finally {
                    setIsProcessing(false);
                }
            },
            cancelText: 'تراجع'
        });
    };

    const [visibleCount, setVisibleCount] = useState(50);

    const filteredEntries = useMemo(() => {
        return entries.filter(e => {
            const isUnpaidThirdParty = e.hasThirdParty &&
                (Number(e.thirdPartyCost) || 0) > 0 &&
                !e.isCostPaid &&
                e.status !== 'cancelled' &&
                normalizeArabic(e.serviceType) !== normalizeArabic(SERVICE_TYPES.DEBT_SETTLEMENT);
            const isSearchMatch = searchMultipleFields(debouncedSearchTerm, [
                e.clientName,
                e.nationalId,
                e.phoneNumber,
                e.thirdPartyName || '',
                e.workOrderNumber || ''
            ]);
            return isUnpaidThirdParty && isSearchMatch;
        });
    }, [entries, debouncedSearchTerm]);

    return (
        <div className={`px-3 pb-3 pt-1 md:px-6 md:pb-6 md:pt-2 space-y-2 transition-opacity animate-premium-in ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>

            {/* Header Section - Simplified & Integrated */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1 relative z-30">
                <div className="flex items-center gap-4 shrink-0">
                    <div className="w-1.5 h-10 bg-[#00A6A6] rounded-full shadow-lg shadow-[#00A6A6]/20"></div>
                    <div>
                        <h3 className="text-xl font-black text-[#01404E] tracking-tight whitespace-nowrap">بحث في التسويات</h3>
                        <p className="text-[10px] text-[#036564] font-black uppercase tracking-[0.3em] mt-1">{currentDate}</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="w-full lg:w-[350px]">
                        <SearchInput
                            value={searchTerm}
                            onChange={setSearchTerm}
                            placeholder="ابحث باسم العميل، الرقم، أو أمر الشغل..."
                            className="w-full"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onRefresh();
                        }}
                        disabled={isSyncing || isSubmitting}
                        className={`w-full md:w-auto px-6 h-[58px] rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-md active:scale-95 shrink-0 ${(isSyncing || isSubmitting) ? 'bg-gray-100 text-gray-400' : 'bg-[#01404E] text-white hover:bg-[#036564]'}`}
                    >
                        <Clock className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span className="text-xs whitespace-nowrap">{isSyncing ? 'جاري السحب...' : 'تحديث البيانات'}</span>
                    </button>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-premium overflow-hidden">
                <div className="min-h-[400px] max-h-[600px] overflow-y-auto custom-scrollbar text-right">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-20">
                            <tr className="bg-[#01404E] text-white/50 text-[10px] md:text-xs font-black tracking-[0.2em] uppercase border-b border-white/5">
                                <th className="py-2.5 px-8 text-right first:rounded-tr-[2rem]">بيان المعاملة والمكتب</th>
                                <th className="py-2.5 px-6 text-center">الموظف</th>
                                <th className="py-2.5 px-6 text-center">تكلفة المكتب الخارجي</th>
                                <th className="py-2.5 px-8 text-center last:rounded-tl-[2rem]">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#01404E]/5 font-bold relative text-xs md:text-sm">
                            {filteredEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-200">
                                                <CheckCircle2 className="w-8 h-8" />
                                            </div>
                                            <span className="text-gray-300 font-black italic">لا توجد تسويات معلقة حالياً</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredEntries.slice(0, visibleCount).map((entry) => (
                                    <tr key={entry.id} className="hover:bg-[#036564]/5 transition-all group">
                                        <td className="py-2.5 px-8">
                                            <div className="flex flex-col gap-0.5">
                                                <span
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        showCustomerDetails(entry);
                                                    }}
                                                    className="font-black text-[#01404E] text-base md:text-lg cursor-pointer hover:text-[#00A6A6] transition-colors"
                                                >
                                                    {entry.clientName}
                                                </span>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="bg-[#00A6A6]/10 text-[#00A6A6] px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest">{entry.serviceType}</span>
                                                    <span className="bg-[#01404E]/5 text-[#01404E] px-2 py-0.5 rounded-lg text-[8px] font-black">المكتب: {entry.thirdPartyName}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold">{entry.entryDate}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-6 text-center">
                                            <div className="flex flex-col items-center gap-0.5 group-hover:scale-110 transition-transform">
                                                <span className="bg-gray-100 text-[#01404E] px-2 py-1 rounded-lg text-[10px] font-black">{entry.recordedBy || 'غير مسجل'}</span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-6 text-center">
                                            <div className="flex flex-col items-center gap-0.5 group-hover:scale-110 transition-transform">
                                                <span className="text-sm md:text-base font-black text-blue-600 tracking-tighter">{entry.thirdPartyCost?.toLocaleString()}<span className="text-[8px] md:text-[10px] mr-1 opacity-50 uppercase">ج.م</span></span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-8 text-center">
                                            {userRole !== ROLES.VIEWER && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleSettleThirdParty(entry);
                                                    }}
                                                    disabled={isSubmitting}
                                                    className={`relative overflow-hidden group/btn px-6 py-3 rounded-2xl font-black text-xs transition-all duration-300 shadow-lux active:scale-95 mx-auto ${isSubmitting ? 'bg-gray-100 text-gray-300' : 'bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:shadow-blue-600/20'}`}
                                                >
                                                    <div className="absolute top-0 left-0 w-full h-full bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform"></div>
                                                    <div className="relative z-10 flex items-center justify-center gap-3">
                                                        <CheckCircle2 className="w-4 h-4 text-[#00A6A6]" />
                                                        <span>تسوية الآن</span>
                                                    </div>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    {visibleCount < filteredEntries.length && (
                        <div className="p-6 text-center border-t border-[#01404E]/5">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setVisibleCount(prev => prev + 50);
                                }}
                                className="px-6 py-3 bg-[#00A6A6] text-white font-black rounded-2xl hover:bg-[#036564] transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                                تحميل المزيد ({filteredEntries.length - visibleCount} متبقي)
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {filteredEntries.length > 0 && (
                <div className="bg-amber-500/10 backdrop-blur-md border border-amber-500/20 p-6 rounded-[2rem] flex items-start gap-4 shadow-xl">
                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-black text-amber-700 text-sm mb-1">ملاحظة هامة حول التسويات</h4>
                        <p className="text-xs text-amber-800/70 font-bold leading-relaxed">
                            هذه الصفحة تعرض جميع المعاملات التي تتضمن "طرف ثالث" ولم يتم دفع تكلفتها للمكتب الخارجي بعد. عند الضغط على "تسوية"، سيتم خصم المبلغ من الرصيد الحالي للفرع وتسجيل مصروف تلقائي.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThirdPartySettlements;
