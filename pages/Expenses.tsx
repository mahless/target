import React, { useState, useMemo } from 'react';
import { Expense, ExpenseCategory } from '../types';
import { EXPENSE_CATEGORIES } from '../constants';
import { Wallet, Save, Clock, TrendingDown, Info, Printer, AlertTriangle, User } from 'lucide-react';
import { ServiceEntry } from '../types';
import { generateReceipt } from '../services/pdfService';
import { toEnglishDigits } from '../utils';
import { useModal } from '../context/ModalContext';
import CustomSelect from '../components/CustomSelect';

interface ExpensesProps {
    expenses: Expense[];
    entries: ServiceEntry[];
    onAddExpense: (expense: Expense) => Promise<boolean>;
    branchId: string;
    currentDate: string;
    username: string;
    isSubmitting?: boolean;
}

const Expenses: React.FC<ExpensesProps> = ({ expenses, entries, onAddExpense, branchId, currentDate, username, isSubmitting = false }) => {
    const { showModal, showQuickStatus, setIsProcessing } = useModal();
    // Removed local isSubmitting state
    const [category, setCategory] = useState<ExpenseCategory>(EXPENSE_CATEGORIES[0] as ExpenseCategory);
    const [amount, setAmount] = useState<number>(0);
    const [notes, setNotes] = useState('');

    const categoryOptions = useMemo(() => EXPENSE_CATEGORIES.map(c => ({ id: c, name: c })), []);

    const todaysExpenses = expenses.filter(e => e.branchId === branchId && e.date === currentDate);
    const totalExpenses = todaysExpenses.reduce((sum, e) => sum + e.amount, 0);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0 || isSubmitting) return;

        // No local setIsSubmitting(true) needed
        try {
            const newExpense: Expense = {
                id: Date.now().toString(),
                category,
                amount,
                notes,
                branchId,
                date: currentDate,
                timestamp: Date.now(),
                recordedBy: username
            };

            const success = await onAddExpense(newExpense);
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
        // No local finally block needed
    };

    const inputClasses = "w-full p-3.5 border-2 border-red-200 rounded-2xl bg-white text-black font-black placeholder-gray-400 focus:bg-white focus:ring-4 focus:ring-red-50 outline-none transition-all focus:border-red-500";

    return (
        <div className={`p-3 md:p-5 space-y-4 transition-opacity ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-100 rounded-2xl text-red-700 shadow-sm"><Wallet className="w-5 h-5" /></div>
                <h2 className="text-xl font-black text-gray-800">إدارة المصروفات اليومية</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Expense Form */}
                <div className="lg:col-span-1 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 h-fit">
                    <h3 className="text-sm font-black mb-4 text-gray-800 border-b pb-2">إضافة مصروف جديد</h3>
                    <form onSubmit={handleSubmit} className="space-y-6 text-right">
                        <div>
                            <CustomSelect
                                label="نوع المصروف"
                                options={categoryOptions}
                                value={category}
                                onChange={(v) => setCategory(v as ExpenseCategory)}
                                placeholder="اختر النوع..."
                                accentColor="blue"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-900 mb-2 uppercase tracking-widest mr-1">القيمة المالية</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    required
                                    value={amount === 0 ? '' : amount}
                                    onChange={(e) => setAmount(Number(toEnglishDigits(e.target.value)))}
                                    className={`${inputClasses} text-xl text-red-600`}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-900 mb-2 uppercase tracking-widest mr-1">بيان التفاصيل</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={3}
                                className={`${inputClasses} resize-none`}
                                placeholder="اكتب الغرض من المصروف هنا..."
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${isSubmitting ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'}`}
                        >
                            {isSubmitting ? <Clock className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {isSubmitting ? 'جاري الحفظ...' : 'تسجيل المبلغ'}
                        </button>
                    </form>
                </div>

                {/* Expenses List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex justify-between items-center transition-all hover:bg-gray-50 group">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-red-600 transition-colors">إجمالي مصروفات اليوم</span>
                            <span className="text-sm text-gray-400 font-bold mt-1">فرع {branchId} | {currentDate}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-red-50 rounded-2xl text-red-600">
                                <TrendingDown className="w-6 h-6" />
                            </div>
                            <span className="text-4xl font-black text-red-600">{totalExpenses.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                            <h3 className="text-sm font-black text-gray-700">سجل مصروفات اليوم</h3>
                            <Clock className="w-4 h-4 text-gray-300" />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right font-bold">
                                <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                    <tr>
                                        <th className="py-5 px-6">البند</th>
                                        <th className="py-5 px-6">المبلغ</th>
                                        <th className="py-5 px-6">التفاصيل</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 text-sm">
                                    {todaysExpenses.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="py-20 text-center text-gray-300 font-black italic">لم يتم تسجيل أي مصروفات اليوم</td>
                                        </tr>
                                    ) : (
                                        todaysExpenses.map(expense => {
                                            // ربط المصروف بالعميل عبر البحث عن ID العملية في محتوى الملاحظات أو الـ ID
                                            const linkedEntry = (entries || []).find(entry =>
                                                expense.id.includes(entry.id) ||
                                                (expense.notes && expense.notes.includes(entry.id))
                                            );

                                            return (
                                                <tr key={expense.id} className="hover:bg-gray-50 transition-colors group">
                                                    <td className="py-5 px-6 font-black text-gray-900">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-lg text-[10px] w-fit italic">{expense.category}</span>
                                                            {linkedEntry && (
                                                                <button
                                                                    onClick={() => showCustomerDetails(linkedEntry)}
                                                                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors group/btn"
                                                                >
                                                                    <User className="w-3 h-3" />
                                                                    <span className="text-xs font-black underline decoration-dotted underline-offset-4">{linkedEntry.clientName}</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-6 text-red-600 font-black text-lg">{expense.amount}</td>
                                                    <td className="py-5 px-6 text-gray-600 font-medium max-w-xs truncate text-xs">{expense.notes || '-'}</td>
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