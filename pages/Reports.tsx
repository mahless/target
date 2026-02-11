import React, { useMemo, useState } from 'react';
import { ServiceEntry, Expense, Branch } from '../types';
import { Search, DollarSign, Clock, Filter, Printer, TrendingUp, Wallet, ListChecks, Receipt } from 'lucide-react';
import { generateReceipt } from '../services/pdfService';
import { useModal } from '../context/ModalContext';
import { normalizeArabic, normalizeDate, toEnglishDigits } from '../utils';
import CustomSelect from '../components/CustomSelect';

interface ReportsProps {
  entries: ServiceEntry[];
  expenses: Expense[];
  serviceTypes: string[];
  expenseCategories: string[];
  branches: Branch[];
  manualDate: string;
  branchId: string;
  onUpdateEntry: (entry: ServiceEntry) => void;
  onAddExpense: (expense: Expense) => Promise<boolean>;
  isSyncing: boolean;
  onRefresh: () => void;
  username: string;
  userRole: string;
}



const StatCard = ({ title, value, icon, color, footer }: any) => {
  const colorMap: any = {
    blue: { bg: 'from-blue-600 to-blue-900', icon: 'text-blue-500', shadow: 'shadow-blue-900/20' },
    red: { bg: 'from-red-600 to-red-900', icon: 'text-red-500', shadow: 'shadow-red-900/20' },
    emerald: { bg: 'from-[#00A6A6] to-[#036564]', icon: 'text-[#00A6A6]', shadow: 'shadow-[#036564]/20' }
  };
  const theme = colorMap[color] || colorMap.blue;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${theme.bg} p-4 rounded-[2.5rem] ${theme.shadow} shadow-premium group transition-all duration-500 hover:scale-[1.02]`}>
      <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
      <div className="relative z-10 flex flex-col h-full justify-between gap-1.5">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-xs font-black text-white/40 uppercase tracking-[0.3em] mb-1">{title}</span>
            <span className="text-4xl font-black text-white tracking-tighter">{value.toLocaleString()}<span className="text-lg mr-2 opacity-50 uppercase">ج.م</span></span>
          </div>
          <div className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl text-white shadow-xl border border-white/10 group-hover:rotate-12 transition-transform">
            {React.cloneElement(icon, { className: 'w-7 h-7' })}
          </div>
        </div>
        <div className="pt-2 border-t border-white/5 text-[10px] text-white/40 font-black tracking-widest uppercase">
          {footer}
        </div>
      </div>
    </div>
  );
};

const Reports: React.FC<ReportsProps> = ({
  entries, expenses, serviceTypes, expenseCategories, branches, manualDate, branchId, onUpdateEntry, onAddExpense, isSyncing, onRefresh, username, userRole
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    if (userRole === 'مدير') return 'الكل';
    return branchId || (branches.length > 0 ? branches[0].id : 'الكل');
  });
  const [selectedService, setSelectedService] = useState<string>('الكل');
  const [selectedExpenseType, setSelectedExpenseType] = useState<string>('الكل'); // New Filter State
  const [selectedEmployee, setSelectedEmployee] = useState<string>(() => {
    return userRole === 'مدير' ? 'الكل' : username;
  });
  const [activeTab, setActiveTab] = useState<'entries' | 'expenses'>('entries');
  const [visibleEntriesCount, setVisibleEntriesCount] = useState(50);
  const [visibleExpensesCount, setVisibleExpensesCount] = useState(50);

  const { showModal, setIsProcessing } = useModal();

  const showCustomerDetails = (entry: ServiceEntry) => {
    showModal({
      title: 'تفاصيل المعاملة (عرض)',
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
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 font-mono">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">الباركود</span>
              <p className="font-black text-gray-800 text-xs">{entry.barcode || '-'}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">تاريخ العملية</span>
              <p className="font-black text-gray-800 text-xs" dir="ltr">
                {entry.entryDate}
                <span className="text-gray-400 mx-1">|</span>
                {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="col-span-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">ملاحظات</span>
              <p className="font-bold text-gray-600 text-[10px] whitespace-pre-wrap leading-tight">{entry.notes || 'لا توجد ملاحظات'}</p>
            </div>
            {entry.hasThirdParty && (
              <div className="col-span-2 bg-blue-50 p-3 rounded-xl border border-blue-100 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-blue-400 font-black block mb-0.5">المورد/الطرف الثالث</span>
                  <p className="font-black text-blue-800 text-xs">{entry.thirdPartyName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-blue-400 font-black block mb-0.5">تكلفة المورد</span>
                  <p className="font-black text-blue-800 text-xs">{entry.thirdPartyCost} ج.م</p>
                </div>
                <div className="col-span-2 pt-1 border-t border-blue-100 flex justify-between items-center">
                  <span className="text-[10px] font-black text-blue-500">حالة تسوية المصاريف:</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${entry.isCostPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {entry.isCostPaid ? `تم الدفع (${entry.costPaidDate})` : 'لم يتم الدفع بعد'}
                  </span>
                </div>
              </div>
            )}
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

  const filteredData = useMemo(() => {
    const sDate = normalizeDate(startDate);
    const eDate = normalizeDate(endDate);
    const normalizedSelectedBranch = normalizeArabic(selectedBranchId);
    const normalizedSelectedEmployee = normalizeArabic(selectedEmployee);

    const filteredEntries = entries.filter(e => {
      const d = normalizeDate(e.entryDate);
      const matchesDate = d >= sDate && d <= eDate;
      const matchesBranch = selectedBranchId === 'الكل' || normalizeArabic(e.branchId) === normalizedSelectedBranch;
      const matchesService = selectedService === 'الكل' || e.serviceType === selectedService;
      const matchesEmployee = selectedEmployee === 'الكل' || normalizeArabic(e.recordedBy || '') === normalizedSelectedEmployee;
      return matchesDate && matchesBranch && matchesService && matchesEmployee;
    });

    const filteredExpenses = expenses.filter(ex => {
      const d = normalizeDate(ex.date);
      const matchesDate = d >= sDate && d <= eDate;
      const matchesBranch = selectedBranchId === 'الكل' || normalizeArabic(ex.branchId) === normalizedSelectedBranch;
      const matchesService = selectedService === 'الكل' || (ex.notes && ex.notes.includes(selectedService));
      const matchesExpenseType = selectedExpenseType === 'الكل' || ex.category === selectedExpenseType; // New Filter Logic
      const matchesEmployee = selectedEmployee === 'الكل' || normalizeArabic(ex.recordedBy || '') === normalizedSelectedEmployee;
      return matchesDate && matchesBranch && matchesService && matchesExpenseType && matchesEmployee;
    });

    return { entries: filteredEntries, expenses: filteredExpenses };
  }, [entries, expenses, startDate, endDate, selectedBranchId, selectedService, selectedExpenseType, selectedEmployee]);

  const stats = useMemo(() => {
    const totalRevenue = filteredData.entries.reduce((sum, e) => sum + e.amountPaid, 0);
    const totalExpenses = filteredData.expenses.reduce((sum, e) => sum + e.amount, 0);
    return { revenue: totalRevenue, expenses: totalExpenses, net: totalRevenue - totalExpenses };
  }, [filteredData]);

  const branchOptions = useMemo(() => branches.map(b => ({ id: b.id, name: b.name })), [branches]);
  const serviceOptions = useMemo(() => serviceTypes.map(s => ({ id: s, name: s })), [serviceTypes]);
  const expenseTypeOptions = useMemo(() => expenseCategories.map(c => ({ id: c, name: c })), [expenseCategories]); // New Options

  const employeeOptions = useMemo(() => {
    const names = new Set<string>();
    entries.forEach(e => { if (e.recordedBy && e.recordedBy !== 'الموظف') names.add(e.recordedBy); });
    expenses.forEach(ex => { if (ex.recordedBy && ex.recordedBy !== 'الموظف') names.add(ex.recordedBy); });
    return Array.from(names).map(name => ({ id: name, name }));
  }, [entries, expenses]);

  const inputClasses = "w-full p-4 border border-[#033649]/10 rounded-2xl bg-[#033649]/5 text-[#033649] font-black placeholder-[#033649]/30 focus:bg-white focus:border-[#00A6A6] focus:ring-4 focus:ring-[#00A6A6]/5 outline-none transition-all shadow-sm";

  return (
    <div className="p-3 md:p-6 space-y-3 text-right animate-premium-in">
      {/* Header */}
      <div className="bg-[#033649] p-4 md:p-5 rounded-[2.5rem] shadow-premium flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 text-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#00A6A6]/20 rounded-2xl flex items-center justify-center text-[#00A6A6] shadow-lg border border-[#00A6A6]/20 backdrop-blur-md">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight">التقارير التحليلية</h2>
            <p className="text-white/40 text-[10px] font-black tracking-[0.2em] uppercase mt-0.5">متابعة الأداء والتدفقات النقدية</p>
          </div>
        </div>
        {userRole !== 'مدير' && (
          <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00A6A6]"></div>
            <div>
              <p className="text-[10px] text-white/40 font-black uppercase">الموظف الحالي</p>
              <p className="text-xs font-black text-white">{username}</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-xl p-4 md:p-5 rounded-[2.5rem] shadow-premium border border-white/20 space-y-4 relative z-30">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-[#033649]/5">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-[#00A6A6] rounded-full"></div>
            <h3 className="font-black text-[#033649] text-xl">تخصيص البحث والفترة</h3>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto bg-white/50 p-2 rounded-2xl border border-white/40 shadow-premium">
            <div className="flex items-center gap-2 flex-1 md:flex-initial">
              <span className="text-[10px] font-black text-[#033649]/40 whitespace-nowrap px-2">من:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(toEnglishDigits(e.target.value))}
                className="w-full bg-transparent border-none text-xs font-black text-[#033649] focus:ring-0 p-0"
              />
            </div>
            <div className="w-px h-4 bg-[#033649]/10"></div>
            <div className="flex items-center gap-2 flex-1 md:flex-initial">
              <span className="text-[10px] font-black text-[#033649]/40 whitespace-nowrap px-2">إلى:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(toEnglishDigits(e.target.value))}
                className="w-full bg-transparent border-none text-xs font-black text-[#033649] focus:ring-0 p-0"
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">

          <div className="space-y-3">
            <CustomSelect
              label="فرع البحث"
              options={branchOptions}
              value={selectedBranchId}
              onChange={setSelectedBranchId}
              placeholder="كل الفروع"
              showAllOption={true}
            />
          </div>

          <div className="space-y-3">
            <CustomSelect
              label="نوع الخدمة"
              options={serviceOptions}
              value={selectedService}
              onChange={setSelectedService}
              placeholder="كل الخدمات"
            />
          </div>

          <div className="space-y-3">
            <CustomSelect
              label="نوع المصروف"
              options={expenseTypeOptions}
              value={selectedExpenseType}
              onChange={setSelectedExpenseType}
              placeholder="كل المصروفات"
            />
          </div>

          {userRole === 'مدير' && (
            <div className="space-y-3">
              <CustomSelect
                label="الموظف"
                options={employeeOptions}
                value={selectedEmployee}
                onChange={setSelectedEmployee}
                placeholder="كل الموظفين"
              />
            </div>
          )}
        </div>
      </div >

      {/* Stats Cards */}
      < div className="grid grid-cols-1 md:grid-cols-3 gap-4" >
        <StatCard title="إجمالي الإيرادات" value={stats.revenue} icon={<TrendingUp />} color="blue" footer="حصيلة العمليات وسداد المديونيات" />
        <StatCard title="إجمالي المصروفات" value={stats.expenses} icon={<Wallet />} color="red" footer="المصروفات النثرية والمكافآت" />
        <StatCard title="صافي الربح" value={stats.net} icon={<DollarSign />} color="emerald" footer="الإيرادات مطروحاً منها المصروفات" />
      </div >

      {/* Tabs and Table */}
      < div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-premium overflow-hidden" >
        <div className="bg-[#033649]/5 p-4 border-b border-[#033649]/5">
          <div className="flex bg-[#033649]/10 rounded-2xl p-1.5 gap-2 shadow-lux">
            <button
              onClick={() => setActiveTab('entries')}
              className={`flex-1 py-4 rounded-xl font-black text-sm flex items-center justify-center gap-3 transition-all duration-300 ${activeTab === 'entries' ? 'bg-[#033649] text-white shadow-premium scale-[1.02]' : 'text-[#033649]/40 hover:text-[#033649] hover:bg-white/50'}`}
            >
              <ListChecks className="w-5 h-5" />
              سجل العمليات ({filteredData.entries.length})
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex-1 py-4 rounded-xl font-black text-sm flex items-center justify-center gap-3 transition-all duration-300 ${activeTab === 'expenses' ? 'bg-red-600 text-white shadow-premium scale-[1.02]' : 'text-red-400/40 hover:text-red-600 hover:bg-white/50'}`}
            >
              <Receipt className="w-5 h-5" />
              سجل المصروفات ({filteredData.expenses.length})
            </button>
          </div>
        </div>

        <div className="p-0">
          {activeTab === 'entries' ? (
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#033649] text-white/50 text-[10px] font-black tracking-[0.2em] uppercase border-b border-white/5">
                    <th className="py-5 px-8 text-right">بيان الحركة والعميل</th>
                    <th className="py-5 px-6 text-center">المبلغ</th>
                    <th className="py-5 px-6 text-center">الفرع</th>
                    <th className="py-5 px-6 text-center">الموظف</th>
                    <th className="py-5 px-8 text-center">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#033649]/5 font-bold relative text-right">
                  {filteredData.entries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-[#033649]/5 rounded-full flex items-center justify-center text-[#033649]/20">
                            <ListChecks className="w-8 h-8" />
                          </div>
                          <span className="text-gray-300 font-black italic">لا توجد عمليات تطابق البحث</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredData.entries.slice(0, visibleEntriesCount).map(e => (
                      <tr key={e.id} className="hover:bg-[#036564]/5 transition-all group font-black text-right">
                        <td className="py-5 px-8">
                          <div className="flex flex-col gap-1 items-start">
                            <span onClick={() => showCustomerDetails(e)} className="font-black text-[#033649] text-lg cursor-pointer hover:text-[#00A6A6] transition-colors">{e.clientName}</span>
                            <span className="bg-[#00A6A6]/10 text-[#00A6A6] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit">{e.serviceType}</span>
                          </div>
                        </td>
                        <td className="py-5 px-6 text-center">
                          <span className="text-2xl font-black text-emerald-600 tracking-tighter">+{e.amountPaid.toLocaleString()}<span className="text-[10px] mr-1 opacity-50 uppercase">ج.م</span></span>
                        </td>
                        <td className="py-5 px-6 text-center">
                          <span className="bg-[#033649]/5 text-[#033649] px-3 py-1 rounded-xl text-[10px] font-black">{e.branchId}</span>
                        </td>
                        <td className="py-5 px-6 text-center">
                          <span className="bg-[#00A6A6]/5 text-[#00A6A6] px-3 py-1 rounded-xl text-[10px] font-black">{e.recordedBy || '-'}</span>
                        </td>
                        <td className="py-5 px-8 text-center text-[#033649]/40 text-[11px] font-black tracking-tighter">{e.entryDate}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {visibleEntriesCount < filteredData.entries.length && (
                <div className="p-6 text-center border-t border-[#033649]/5">
                  <button
                    onClick={() => setVisibleEntriesCount(prev => prev + 50)}
                    className="px-6 py-3 bg-[#00A6A6] text-white font-black rounded-2xl hover:bg-[#036564] transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    تحميل المزيد ({filteredData.entries.length - visibleEntriesCount} متبقي)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-red-900 text-white/50 text-[10px] font-black tracking-[0.2em] uppercase border-b border-white/5">
                    <th className="py-5 px-8 text-right">البند / التصنيف</th>
                    <th className="py-5 px-6 text-center">المبلغ</th>
                    <th className="py-5 px-6 text-center">الفرع</th>
                    <th className="py-5 px-6 text-center">الموظف</th>
                    <th className="py-5 px-8 text-center">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-900/5 font-bold relative text-right">
                  {filteredData.expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-200">
                            <Receipt className="w-8 h-8" />
                          </div>
                          <span className="text-gray-300 font-black italic">لا توجد مصروفات تطابق البحث</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredData.expenses.slice(0, visibleExpensesCount).map(ex => (
                      <tr key={ex.id} className="hover:bg-red-50 transition-all group font-black text-right">
                        <td className="py-5 px-8">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="font-black text-red-900 text-lg uppercase">{ex.category}</span>
                            <span className="text-[11px] text-red-900/40 font-bold italic">{ex.notes || 'بدون تفاصيل'}</span>
                          </div>
                        </td>
                        <td className="py-5 px-6 text-center">
                          <span className="text-2xl font-black text-red-600 tracking-tighter">-{ex.amount.toLocaleString()}<span className="text-[10px] mr-1 opacity-50 uppercase">ج.م</span></span>
                        </td>
                        <td className="py-5 px-6 text-center">
                          <span className="bg-red-50 text-red-900/60 px-3 py-1 rounded-xl text-[10px] font-black">{ex.branchId}</span>
                        </td>
                        <td className="py-5 px-6 text-center">
                          <span className="bg-[#033649]/5 text-[#033649] px-3 py-1 rounded-xl text-[10px] font-black">{ex.recordedBy || '-'}</span>
                        </td>
                        <td className="py-5 px-8 text-center text-red-900/40 text-[11px] font-black tracking-tighter">{ex.date}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {visibleExpensesCount < filteredData.expenses.length && (
                <div className="p-6 text-center border-t border-red-900/5">
                  <button
                    onClick={() => setVisibleExpensesCount(prev => prev + 50)}
                    className="px-6 py-3 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    تحميل المزيد ({filteredData.expenses.length - visibleExpensesCount} متبقي)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div >
    </div >
  );
};

export default Reports;