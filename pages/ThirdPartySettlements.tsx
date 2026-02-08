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
                    <p className="text-gray-600 font-bold">متأكد من دفع مبلغ <span className="text-blue-600 font-black">{entry.thirdPartyCost} ج.م</span> للمورد <span className="text-blue-600 font-black">{entry.thirdPartyName}</span>؟</p>
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
                        notes: `تسوية للمورد: ${entry.thirdPartyName} | العميل: ${entry.clientName} | ${entry.serviceType}`,
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
        <div className="p-3 md:p-5 space-y-4 text-right">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-3">
                <div className="flex items-center gap-3 border-b border-gray-50 pb-3 mb-1">
                    <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                    <h3 className="text-lg font-black text-gray-800">تسويات المكاتب الخارجية</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mr-1">بحث شامل</label>
                        <SearchInput
                            value={searchTerm}
                            onChange={setSearchTerm}
                            placeholder="ابحث بالعميل، المورد، أو الرقم..."
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={onRefresh}
                            disabled={isSyncing || isSubmitting}
                            className={`w-full p-3 rounded-2xl border-2 font-black text-xs h-[52px] flex items-center justify-center gap-2 transition-all active:scale-95 ${(isSyncing || isSubmitting) ? 'bg-gray-100 text-gray-400 border-transparent cursor-not-allowed' : 'bg-white border-blue-100 text-blue-600 hover:bg-blue-50'}`}
                        >
                            <Clock className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'جاري التحديث...' : 'تحديث البيانات'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
                <div className="overflow-x-auto text-right">
                    <table className="w-full">
                        <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-black tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="py-3 px-6 text-right">بيان المعاملة</th>
                                <th className="py-3 px-6 text-center">تكلفة المورد</th>
                                <th className="py-3 px-6 text-center">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm font-bold">
                            {filteredEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="py-20 text-center text-gray-300 font-black flex flex-col items-center gap-4 border-none">
                                        <CheckCircle2 className="w-16 h-16 text-gray-100" />
                                        لا توجد تسويات معلقة حالياً
                                    </td>
                                </tr>
                            ) : (
                                filteredEntries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-blue-50/20 transition-all group">
                                        <td className="py-3 px-6 font-black">
                                            <span
                                                onClick={() => showCustomerDetails(entry)}
                                                className="cursor-pointer hover:text-blue-600 transition-colors uppercase"
                                            >
                                                {entry.clientName}
                                            </span>
                                            <br />
                                            <span className="text-[10px] text-blue-600 font-bold">{entry.serviceType}</span>
                                            <div className="flex gap-2 items-center mt-0.5">
                                                <span className="text-[9px] text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded-md font-black">المكتب: {entry.thirdPartyName}</span>
                                                <span className="text-[9px] text-gray-400 font-bold">{entry.entryDate}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-6 text-center text-blue-600 font-black">
                                            <span className="text-lg">{entry.thirdPartyCost} ج.م</span>
                                        </td>
                                        <td className="py-3 px-6 text-center">
                                            {userRole !== 'مشاهد' && (
                                                <button
                                                    onClick={() => handleSettleThirdParty(entry)}
                                                    disabled={isSubmitting}
                                                    className={`bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-[11px] font-black transition-all border border-blue-100 shadow-sm flex items-center gap-2 mx-auto ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 hover:text-white hover:shadow-blue-200'}`}
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    تسوية الآن
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
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 font-bold leading-relaxed">
                        هذه الصفحة تعرض جميع المعاملات التي تتضمن "طرف ثالث" ولم يتم دفع تكلفتها للمورد بعد. عند الضغط على "تسوية"، سيتم خصم المبلغ من الرصيد الحالي للفرع وتسجيل مصروف تلقائي.
                    </p>
                </div>
            )}
        </div>
    );
};

export default ThirdPartySettlements;
