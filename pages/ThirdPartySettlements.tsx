import React, { useState, useMemo } from 'react';
import { ServiceEntry, Expense, Branch } from '../types';
import SearchInput from '../components/SearchInput';
import { Users, Clock, Printer, CheckCircle2, Filter, AlertCircle } from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { searchMultipleFields, useDebounce, normalizeArabic } from '../utils';
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
                    costPaidDate: new Date().toISOString().split('T')[0],
                    costSettledBy: username
                };

                const result = await onUpdateEntry(updatedEntry);
                if (result) {
                    const thirdPartyExpense: Expense = {
                        id: `tp-${Date.now()}-${entry.id}`,
                        category: 'طرف ثالث',
                        amount: entry.thirdPartyCost || 0,
                        notes: `تسوية للمكتب الخارجي: ${entry.thirdPartyName} | العميل: ${entry.clientName} | ${entry.serviceType}`,
                        branchId: entry.branchId,
                        date: currentDate,
                        timestamp: Date.now(),
                        recordedBy: username
                    };

                    await onAddExpense(thirdPartyExpense);
                    showQuickStatus('تمت التسوية وتسجيل المصروف بنجاح');
                    onRefresh();
                } else {
                    showQuickStatus('فشل السيرفر في التحديث', 'error');
                }
            }
        });
    };

    const showCustomerDetails = (entry: ServiceEntry) => {
        showModal({
            title: 'تفاصيل المعاملة',
            content: (
                <div className="space-y-3 text-right">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                            <span className="text-[10px] text-gray-400 font-black block mb-0.5">العميل</span>
                            <p className="font-black text-gray-800 text-xs">{entry.clientName}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                            <span className="text-[10px] text-gray-400 font-black block mb-0.5">الرقم القومي</span>
                            <p className="font-black text-gray-800 text-xs">{entry.nationalId}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                            <span className="text-[10px] text-gray-400 font-black block mb-0.5">نوع الخدمة</span>
                            <p className="font-black text-blue-600 text-xs">{entry.serviceType}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                            <span className="text-[10px] text-gray-400 font-black block mb-0.5">المكتب</span>
                            <p className="font-black text-blue-800 text-xs">{entry.thirdPartyName}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                            <span className="text-[10px] text-gray-400 font-black block mb-0.5">تكلفة المكتب</span>
                            <p className="font-black text-blue-800 text-xs">{entry.thirdPartyCost} ج.م</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                            <span className="text-[10px] text-gray-400 font-black block mb-0.5">تاريخ العملية</span>
                            <p className="font-black text-gray-800 text-xs" dir="ltr">
                                {entry.entryDate}
                                <span className="text-gray-400 mx-1">|</span>
                                {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </p>
                        </div>
                    </div>
                </div>
            ),
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

    const filteredEntries = useMemo(() => {
        return entries.filter(e => {
            const isUnpaidThirdParty = e.hasThirdParty &&
                (Number(e.thirdPartyCost) || 0) > 0 &&
                !e.isCostPaid &&
                e.status !== 'cancelled' &&
                normalizeArabic(e.serviceType) !== normalizeArabic('سداد مديونية');
            const isSearchMatch = searchMultipleFields(debouncedSearchTerm, [
                e.clientName,
                e.nationalId,
                e.phoneNumber,
                e.thirdPartyName || ''
            ]);
            return isUnpaidThirdParty && isSearchMatch;
        });
    }, [entries, debouncedSearchTerm]);

    return (
        <div className={`p-3 md:p-6 space-y-4 transition-opacity animate-premium-in ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>

            <div className="bg-white/80 backdrop-blur-xl p-5 rounded-[2.5rem] shadow-premium border border-white/20 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-[#00A6A6] rounded-full"></div>
                    <h3 className="font-black text-[#033649] text-xl">بحث في التسويات</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-[#033649]/40 uppercase tracking-widest mr-1">بحث شامل</label>
                        <SearchInput
                            value={searchTerm}
                            onChange={setSearchTerm}
                            placeholder="ابحث باسم العميل، أو الرقم..."
                            className="w-full"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={onRefresh}
                            disabled={isSyncing || isSubmitting}
                            className={`w-full relative overflow-hidden group font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all duration-500 shadow-lux active:scale-[0.98] ${(isSyncing || isSubmitting) ? 'bg-gray-100 text-gray-300' : 'bg-gradient-to-r from-[#033649] to-[#01404E] text-white hover:from-[#00A6A6] hover:to-[#036564]'}`}
                        >
                            <div className="absolute top-0 left-0 w-full h-full bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                            <div className="relative z-10 flex items-center gap-3">
                                <Clock className={`w-5 h-5 ${isSyncing ? 'animate-spin text-[#00A6A6]' : 'text-white/60 group-hover:rotate-180 transition-transform duration-700'}`} />
                                <span className="text-sm font-black tracking-tight">{isSyncing ? 'جاري التحديث...' : 'تحديث البيانات'}</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-premium overflow-hidden">
                <div className="overflow-x-auto text-right">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-[#033649] text-white/50 text-[10px] font-black tracking-[0.2em] uppercase border-b border-white/5">
                                <th className="py-5 px-8 text-right first:rounded-tr-[2rem]">بيان المعاملة والمكتب</th>
                                <th className="py-5 px-6 text-center">تكلفة المكتب الخارجي</th>
                                <th className="py-5 px-8 text-center last:rounded-tl-[2rem]">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#033649]/5 font-bold relative">
                            {filteredEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-200">
                                                <CheckCircle2 className="w-8 h-8" />
                                            </div>
                                            <span className="text-gray-300 font-black italic">لا توجد تسويات معلقة حالياً</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredEntries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-[#036564]/5 transition-all group">
                                        <td className="py-5 px-8">
                                            <div className="flex flex-col gap-1">
                                                <span
                                                    onClick={() => showCustomerDetails(entry)}
                                                    className="font-black text-[#033649] text-lg cursor-pointer hover:text-[#00A6A6] transition-colors"
                                                >
                                                    {entry.clientName}
                                                </span>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="bg-[#00A6A6]/10 text-[#00A6A6] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">{entry.serviceType}</span>
                                                    <span className="bg-[#033649]/5 text-[#033649] px-2 py-0.5 rounded-lg text-[9px] font-black">المكتب: {entry.thirdPartyName}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold">{entry.entryDate}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex flex-col items-center gap-1 group-hover:scale-110 transition-transform">
                                                <span className="text-2xl font-black text-blue-600 tracking-tighter">{entry.thirdPartyCost?.toLocaleString()}<span className="text-[10px] mr-1 opacity-50 uppercase">ج.م</span></span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8 text-center">
                                            {userRole !== 'مشاهد' && (
                                                <button
                                                    onClick={() => handleSettleThirdParty(entry)}
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
