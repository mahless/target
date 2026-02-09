import React, { useState, useMemo } from 'react';
import { Expense, ExpenseCategory } from '../types';
import { Wallet, Save, Clock, TrendingDown, Info, Printer, AlertTriangle, User, Trash2 } from 'lucide-react';
import { ServiceEntry } from '../types';
import { generateReceipt } from '../services/pdfService';
import { toEnglishDigits } from '../utils';
import { useModal } from '../context/ModalContext';
import CustomSelect from '../components/CustomSelect';
import { GoogleSheetsService } from '../services/googleSheetsService';

interface ExpensesProps {
    expenses: Expense[];
    entries: ServiceEntry[];
    expenseCategories: string[];
    onAddExpense: (expense: Expense) => Promise<boolean>;
    branchId: string;
    currentDate: string;
    username: string;
    isSubmitting?: boolean;
    branches: import('../types').Branch[];
    onDeleteExpense: (id: string, amount: number, branchId: string) => Promise<{ success: boolean; message?: string }>;
}


const Expenses: React.FC<ExpensesProps> = ({ expenses, entries, expenseCategories, onAddExpense, branchId, currentDate, username, isSubmitting = false, branches, onDeleteExpense }) => {
    const { showModal, showQuickStatus, setIsProcessing } = useModal();
    // Removed local isSubmitting state
    // @ts-ignore
    const [category, setCategory] = useState<ExpenseCategory>('');
    const [amount, setAmount] = useState<number>(0);
    const [notes, setNotes] = useState('');

    const categoryOptions = useMemo(() => expenseCategories.map(c => ({ id: c, name: c })), [expenseCategories]);

    const todaysExpenses = expenses.filter(e => e.branchId === branchId && e.date === currentDate);
    const totalExpenses = todaysExpenses.reduce((sum, e) => sum + e.amount, 0);

    const currentBranch = branches.find(b => b.id === branchId);
    const currentBalance = currentBranch?.Current_Balance ?? currentBranch?.currentBalance ?? 0;


    const showCustomerDetails = (entry: ServiceEntry) => {
        showModal({
            title: 'تفاصيل المعاملة (مرتبط بمصروف)',
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
                            <span className="text-[10px] text-gray-400 font-black block mb-0.5">تاريخ العملية</span>
                            <p className="font-black text-gray-800 text-xs" dir="ltr">
                                {entry.entryDate}
                                <span className="text-gray-400 mx-1">|</span>
                                {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                    {entry.hasThirdParty && (
                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-[10px] text-blue-400 font-black block mb-0.5">المورد</span>
                                <p className="font-black text-blue-800 text-xs">{entry.thirdPartyName}</p>
                            </div>
                            <div>
                                <span className="text-[10px] text-blue-400 font-black block mb-0.5">تكلفة المورد</span>
                                <p className="font-black text-blue-800 text-xs">{entry.thirdPartyCost} ج.م</p>
                            </div>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={async () => {
                            setIsProcessing(true);
                            try {
                                await generateReceipt(entry);
                            } finally {
                                setIsProcessing(false);
                            }
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-black shadow-lg shadow-blue-600/20 active:scale-95 mt-1 transition-all text-sm"
                    >
                        <Printer className="w-4 h-4" />
                        طباعة إيصال العميل
                    </button>
                    <button
                        onClick={() => showModal(null as any)}
                        className="w-full py-3 rounded-xl font-bold text-gray-500 bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-all active:scale-[0.98] text-xs"
                    >
                        إغلاق
                    </button>
                </div>
            ),
            hideFooter: true
        });
    };

    const handleDelete = (expense: Expense) => {
        showModal({
            title: 'حذف مصروف',
            type: 'danger',
            content: (
                <div className="space-y-3 text-right">
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                        <p className="text-xs font-black text-red-700 mb-1">تنبيه:</p>
                        <p className="text-[11px] text-red-600 font-bold leading-relaxed">
                            أنت على وشك حذف مصروف بقيمة <span className="underline">{expense.amount} ج.م</span> من فئة <span className="underline">{expense.category}</span>
                        </p>
                    </div>
                    <p className="text-xs text-gray-600 font-bold">سيتم إعادة المبلغ تلقائياً إلى رصيد الخزنة.</p>
                </div>
            ),
            confirmText: 'تأكيد الحذف',
            onConfirm: async () => {
                setIsProcessing(true);
                try {
                    const result = await onDeleteExpense(expense.id, expense.amount, expense.branchId);
                    if (result.success) {
                        showQuickStatus('تم حذف المصروف بنجاح');
                    } else {
                        showQuickStatus(result.message || 'فشل حذف المصروف', 'error');
                    }
                } catch (error) {
                    showQuickStatus('حدث خطأ أثناء الحذف', 'error');
                } finally {
                    setIsProcessing(false);
                }
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!category) {
            showQuickStatus('يرجى اختيار نوع المصروف أولاً', 'error');
            return;
        }

        if (amount < 0 || amount > currentBalance) {
            showQuickStatus('المبلغ غير صالح أو يتجاوز الرصيد المتاح', 'error');
            return;
        }

        const expense: Expense = {
            id: `exp-${Date.now()}`,
            category,
            amount,
            notes,
            branchId,
            date: currentDate,
            timestamp: Date.now(),
            recordedBy: username
        };


        try {
            const success = await onAddExpense(expense);
            if (success) {
                showQuickStatus('تم تسجيل المصروف بنجاح');
                setAmount(0);
                setNotes('');
            } else {
                showQuickStatus('فشل في تسجيل المصروف', 'error');
            }
        } catch (err) {
            showQuickStatus('حدث خطأ أثناء الاتصال', 'error');
        }
    };


    const inputClasses = "w-full p-4 border border-[#033649]/10 rounded-2xl bg-[#033649]/5 text-[#033649] font-black placeholder-[#033649]/30 focus:bg-white focus:border-[#00A6A6] focus:ring-4 focus:ring-[#00A6A6]/5 outline-none transition-all shadow-sm";

    return (
        <div className={`p-4 md:p-8 space-y-8 transition-opacity animate-premium-in ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Expense Form */}
                <div className="lg:col-span-1 bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/20 shadow-premium space-y-8 relative z-30">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-red-500 rounded-full"></div>
                        <h3 className="font-black text-[#033649] text-lg">إضافة مصروف جديد</h3>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 text-right">
                        <div>
                            <CustomSelect
                                label="نوع المصروف"
                                options={categoryOptions}
                                value={category}
                                onChange={(v) => setCategory(v as ExpenseCategory)}
                                placeholder="اختر النوع..."
                                showAllOption={false}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-[#033649]/40 mb-3 ml-1 uppercase tracking-widest">القيمة المالية</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    required
                                    value={amount}
                                    onChange={(e) => setAmount(Number(toEnglishDigits(e.target.value)))}
                                    className={`${inputClasses} text-2xl text-red-600 !py-5`}
                                    placeholder="0.00"
                                />
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 bg-white/10 px-3 py-1 rounded-lg">ج.م</div>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-3 font-bold flex items-center gap-2 px-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00A6A6]"></div>
                                الرصيد المتاح: <span className="text-[#033649] dir-ltr">{currentBalance.toLocaleString()}</span> ج.م
                            </p>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-[#033649]/40 mb-3 ml-1 uppercase tracking-widest">بيان التفاصيل</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={4}
                                className={`${inputClasses} resize-none !rounded-[1.5rem]`}
                                placeholder="اكتب الغرض من المصروف هنا..."
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full relative overflow-hidden group font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 transition-all duration-500 shadow-lux active:scale-[0.98] ${isSubmitting ? 'bg-gray-100 text-gray-300' : 'bg-gradient-to-r from-red-600 to-red-800 text-white hover:from-red-500 hover:to-red-700'}`}
                        >
                            <div className="absolute top-0 left-0 w-full h-full bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                            <div className="relative z-10 flex items-center gap-3">
                                {isSubmitting ? <Clock className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 border-white group-hover:scale-110 transition-transform" />}
                                <span className="text-lg">{isSubmitting ? 'جاري الحفظ...' : 'تسجيل المبلغ'}</span>
                            </div>
                        </button>
                    </form>
                </div>

                {/* Expenses List */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="relative overflow-hidden bg-gradient-to-br from-red-600 to-red-900 p-8 rounded-[2.5rem] shadow-premium flex justify-between items-center group">
                        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
                        <div className="relative z-10 flex flex-col">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2">إجمالي مصروفات اليوم</span>
                            <span className="text-sm text-white/60 font-black">فرع {branchId} <span className="mx-2 opacity-30">|</span> {currentDate}</span>
                        </div>
                        <div className="relative z-10 flex items-center gap-6">
                            <div className="p-5 bg-white/10 backdrop-blur-xl rounded-2xl text-white shadow-xl border border-white/10 group-hover:rotate-12 transition-transform">
                                <TrendingDown className="w-8 h-8" />
                            </div>
                            <span className="text-5xl font-black text-white tracking-tighter">{totalExpenses.toLocaleString()}<span className="text-lg mr-2 opacity-50">ج.م</span></span>
                        </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-premium overflow-hidden">
                        <div className="p-6 md:p-8 border-b border-[#033649]/5 flex justify-between items-center bg-gradient-to-l from-[#033649]/5 to-transparent">
                            <h3 className="font-black text-xl text-[#033649] flex items-center gap-3">
                                <Clock className="w-6 h-6 text-[#00A6A6]" />  سجل المصروفات
                            </h3>
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        </div>
                        <div className="overflow-x-auto text-right">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-[#033649] text-white/50 text-[10px] font-black tracking-[0.2em] uppercase border-b border-white/5">
                                        <th className="py-5 px-6 text-center first:rounded-tr-[2rem]">البند</th>
                                        <th className="py-5 px-6 text-center">المبلغ</th>
                                        <th className="py-5 px-6 text-center last:rounded-tl-[2rem]">التفاصيل والإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#033649]/5 font-bold relative">
                                    {todaysExpenses.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-200">
                                                        <Wallet className="w-8 h-8" />
                                                    </div>
                                                    <span className="text-gray-300 font-black italic">لم يتم تسجيل أي مصروفات اليوم</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        todaysExpenses.map(expense => {
                                            // ربط المصروف بالعميل عبر البحث عن ID العملية في محتوى الملاحظات أو الـ ID
                                            const linkedEntry = (entries || []).find(entry =>
                                                expense.id.includes(entry.id) ||
                                                (expense.notes && expense.notes.includes(entry.id))
                                            );

                                            return (
                                                <tr key={expense.id} className="hover:bg-[#036564]/5 transition-all group">
                                                    <td className="py-6 px-6">
                                                        <div className="flex flex-col gap-2 items-center">
                                                            <span className="bg-red-50 text-red-600 px-3 py-1 rounded-xl text-[9px] font-black tracking-widest uppercase">{expense.category}</span>
                                                            {linkedEntry && (
                                                                <button
                                                                    onClick={() => showCustomerDetails(linkedEntry)}
                                                                    className="flex items-center gap-2 text-[#00A6A6] hover:text-[#036564] transition-colors group/btn"
                                                                >
                                                                    <div className="w-6 h-6 bg-[#00A6A6]/10 rounded-lg flex items-center justify-center">
                                                                        <User className="w-3.5 h-3.5" />
                                                                    </div>
                                                                    <span className="text-xs font-black underline decoration-dotted underline-offset-4">{linkedEntry.clientName}</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-6 px-6 text-red-600 font-black text-2xl text-center tracking-tighter">{expense.amount.toLocaleString()}<span className="text-[10px] mr-1 opacity-50 uppercase">ج.م</span></td>
                                                    <td className="py-6 px-6">
                                                        <div className="flex justify-between items-center gap-4">
                                                            <div className="bg-[#033649]/5 p-3 rounded-xl border border-[#033649]/5 flex-1 max-w-xs transition-colors group-hover:bg-white">
                                                                <p className="text-[10px] text-gray-600 font-bold leading-relaxed">{expense.notes || '-'}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleDelete(expense)}
                                                                disabled={isSubmitting}
                                                                className="w-10 h-10 bg-red-50 text-red-300 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-300 flex items-center justify-center shrink-0 active:scale-90"
                                                                title="حذف المصروف"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Expenses;