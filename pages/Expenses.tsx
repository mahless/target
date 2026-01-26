import React, { useState, useMemo } from 'react';
import { Expense, ExpenseCategory } from '../types';
import { EXPENSE_CATEGORIES } from '../constants';
import { Wallet, Save, Clock, TrendingDown, Printer, Search, UserCheck, RefreshCw } from 'lucide-react';
import { toEnglishDigits } from '../utils';
import { useModal } from '../context/ModalContext';
import CustomSelect from '../components/CustomSelect';
import { generateReceipt } from '../services/pdfService';
import { ServiceEntry } from '../types';

interface ExpensesProps {
  expenses: Expense[];
  entries: ServiceEntry[];
  onAddExpense: (expense: Expense) => Promise<boolean>;
  branchId: string;
  currentDate: string;
  username: string;
}

const Expenses: React.FC<ExpensesProps> = ({ expenses, entries, onAddExpense, branchId, currentDate, username }) => {
  const { showModal, showQuickStatus } = useModal();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>(EXPENSE_CATEGORIES[0] as ExpenseCategory);
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Client Search State for manual linkage
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string | undefined>(undefined);
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const categoryOptions = useMemo(() => EXPENSE_CATEGORIES.map(c => ({ id: c, name: c })), []);

  const matchingEntries = useMemo(() => {
    if (clientSearchTerm.length < 2) return [];
    const term = clientSearchTerm.toLowerCase();
    return entries.filter(e =>
      e.clientName.toLowerCase().includes(term) ||
      e.nationalId.includes(term) ||
      e.phoneNumber.includes(term)
    ).slice(0, 5);
  }, [clientSearchTerm, entries]);

  const handleSelectClient = (entry: ServiceEntry) => {
    setSelectedEntryId(entry.id);
    setSelectedClientName(entry.clientName);
    setClientSearchTerm('');
    setShowSearchResults(false);
    // Auto-fill some notes if empty
    if (!notes) setNotes(`مرتبط بـ: ${entry.clientName} | ${entry.serviceType}`);
  };

  const todaysExpenses = expenses.filter(e => e.branchId === branchId && e.date === currentDate);
  const totalExpenses = todaysExpenses.reduce((sum, e) => sum + e.amount, 0);

  const showCustomerDetails = (entry: ServiceEntry) => {
    showModal({
      title: 'تفاصيل المعاملة كاملة',
      content: (
        <div className="space-y-4 text-right">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-[9px] text-gray-400 font-black block mb-1">العميل</span>
              <p className="font-black text-gray-800 text-xs">{entry.clientName}</p>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-[9px] text-gray-400 font-black block mb-1">الرقم القومي</span>
              <p className="font-black text-gray-800 text-xs">{entry.nationalId}</p>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 font-mono">
              <span className="text-[9px] text-gray-400 font-black block mb-1">رقم الهاتف</span>
              <p className="font-black text-gray-800 text-xs">{entry.phoneNumber}</p>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-[9px] text-gray-400 font-black block mb-1">نوع الخدمة</span>
              <p className="font-black text-blue-600 text-xs">{entry.serviceType}</p>
            </div>
            <div className="bg-gray-100 p-2.5 rounded-xl border border-gray-200 col-span-full">
              <span className="text-[9px] text-gray-500 font-black block mb-1">ملاحظات</span>
              <p className="font-bold text-gray-700 text-[10px] leading-relaxed">{entry.notes || 'بدون ملاحظات'}</p>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-[9px] text-gray-400 font-black block mb-1">الموظف</span>
              <p className="font-black text-gray-800 text-xs">{entry.recordedBy}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => generateReceipt(entry)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-600/20 active:scale-95 mt-2 transition-all"
          >
            <Printer className="w-5 h-5" />
            طباعة إيصال العميل
          </button>
        </div>
      ),
      confirmText: 'إغلاق'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newExpense: Expense = {
        id: Date.now().toString(),
        category,
        amount,
        notes: selectedClientName ? `[${category}] عميل: ${selectedClientName} | ${notes}` : notes,
        branchId,
        date: currentDate,
        timestamp: Date.now(),
        recordedBy: username,
        relatedEntryId: selectedEntryId
      };

      const success = await onAddExpense(newExpense);
      if (success) {
        showQuickStatus('تم تسجيل المصروف بنجاح');
        setAmount(0);
        setNotes('');
        setSelectedEntryId(undefined);
        setSelectedClientName(null);
      } else {
        showQuickStatus('فشل في تسجيل المصروف', 'error');
      }
    } catch (err) {
      showQuickStatus('حدث خطأ أثناء الاتصال', 'error');
    } finally {
      setIsSubmitting(false);
    }
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
                onChange={(v) => {
                  setCategory(v as ExpenseCategory);
                  if (v !== 'تحصيل إلكتروني' && v !== 'طرف ثالث') {
                    setSelectedEntryId(undefined);
                    setSelectedClientName(null);
                  }
                }}
                placeholder="اختر النوع..."
                accentColor="blue"
              />
            </div>

            {(category === 'تحصيل إلكتروني' || category === 'طرف ثالث') && (
              <div className="relative animate-fadeIn">
                <label className="block text-[10px] font-black text-blue-600 mb-2 uppercase tracking-widest mr-1">ربط بعميل (اختياري)</label>
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={clientSearchTerm}
                    onChange={(e) => { setClientSearchTerm(e.target.value); setShowSearchResults(true); }}
                    placeholder="ابحث باسم العميل أو رقمه..."
                    className={`${inputClasses} pr-11 !border-blue-100 focus:!border-blue-500`}
                  />
                  {selectedClientName && !clientSearchTerm && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> {selectedClientName}
                    </div>
                  )}
                </div>
                {showSearchResults && matchingEntries.length > 0 && (
                  <div className="absolute top-full right-0 left-0 mt-1 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                    {matchingEntries.map(e => (
                      <button key={e.id} type="button" onClick={() => handleSelectClient(e)} className="w-full flex items-center justify-between p-3 hover:bg-blue-50 border-b last:border-none text-right group">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="font-black text-gray-900 text-xs">{e.clientName}</p>
                            <p className="text-[9px] text-gray-500 font-bold">{e.serviceType} | {e.entryDate}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-gray-900 mb-2 uppercase tracking-widest mr-1">القيمة المالية</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
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

            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20 active:scale-95">
              <Save className="w-5 h-5" />
              تسجيل المبلغ
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
                      // محاولة العثور على العميل المرتبط
                      let linkedEntry = entries.find(e => e.id === expense.relatedEntryId);

                      // إذا لم يوجد ID، نحاول استخراج الاسم من الملاحظات (للبيانات القديمة)
                      let clientDisplayName = '';

                      if (expense.category === 'تحصيل إلكتروني' || expense.category === 'طرف ثالث' || expense.notes?.includes('عميل')) {
                        if (linkedEntry) {
                          clientDisplayName = linkedEntry.clientName;
                        } else {
                          // محاولة ذكية لاستخراج الاسم من الملاحظات بأي صيغة
                          const nameMatch = expense.notes?.match(/(?:عميل|العميل|بواسطة|اسم|لـ):\s*([^|]+)/);
                          if (nameMatch) {
                            clientDisplayName = nameMatch[1].trim();
                            // محاولة البحث عن العميل في القائمة بالاسم لربطه تلقائياً
                            const found = entries.find(e => e.clientName.includes(clientDisplayName));
                            if (found) linkedEntry = found;
                          }
                        }
                      }

                      const cleanNotes = expense.notes?.split('|').pop()?.trim() || expense.notes;

                      return (
                        <tr key={expense.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="py-5 px-6 font-black text-gray-900">
                            <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-xs block w-fit mb-1">{expense.category}</span>
                            {clientDisplayName && (
                              <div className="mt-1">
                                <span
                                  onClick={() => linkedEntry && showCustomerDetails(linkedEntry)}
                                  className={`text-[10px] font-black ${linkedEntry ? 'text-blue-600 cursor-pointer hover:underline' : 'text-gray-500'}`}
                                >
                                  عميل: {clientDisplayName}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-5 px-6 text-red-600 font-black text-lg">{expense.amount}</td>
                          <td className="py-5 px-6 text-gray-600 font-medium max-w-xs truncate text-xs">{cleanNotes || '-'}</td>
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