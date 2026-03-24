import React, { useMemo, useState } from 'react';
import { ServiceEntry, Expense, Branch } from '../types';
import { Search, DollarSign, Clock, Filter, Printer, TrendingUp, Wallet, ListChecks, Receipt, X, Activity, BarChart2, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import ServiceEntryDetails from '../components/ServiceEntryDetails';
import { generateReceipt } from '../services/pdfService';
import { useModal } from '../context/ModalContext';
import { normalizeArabic, normalizeDate, toEnglishDigits, searchMultipleFields, useDebounce, getTodayDate } from '../utils';
import SearchInput from '../components/SearchInput';
import CustomSelect from '../components/CustomSelect';
import { ROLES, STORAGE_KEYS } from '../constants';

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



const StatCard = React.memo(({ title, value, icon, color, footer }: any) => {
  const colorMap: any = {
    blue: { bg: 'from-blue-600 to-blue-900', icon: 'text-blue-500', shadow: 'shadow-blue-900/20' },
    red: { bg: 'from-red-600 to-red-900', icon: 'text-red-500', shadow: 'shadow-red-900/20' },
    emerald: { bg: 'from-[#00A6A6] to-[#036564]', icon: 'text-[#00A6A6]', shadow: 'shadow-[#036564]/20' }
  };
  const theme = colorMap[color] || colorMap.blue;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${theme.bg} p-2.5 rounded-[2rem] shadow-lux group transition-all duration-500 hover:scale-[1.02]`}>
      <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
      <div className="relative z-10 flex flex-col h-full justify-between gap-0.5">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-[10px] md:text-xs font-black text-white/40 uppercase tracking-[0.3em] mb-1">{title}</span>
            <span className="text-2xl md:text-[24px] font-black text-white tracking-tighter">{value.toLocaleString()}<span className="text-sm md:text-lg mr-2 opacity-50 uppercase">ج.م</span></span>
          </div>
          <div className="p-2.5 bg-white/10 backdrop-blur-xl rounded-2xl text-white shadow-xl border border-white/10 group-hover:rotate-12 transition-transform">
            {React.cloneElement(icon, { className: 'w-6 h-6' })}
          </div>
        </div>
        <div className="pt-1.5 border-t border-white/5 text-[10px] text-white/40 font-black tracking-widest uppercase">
          {footer}
        </div>
      </div>
    </div>
  );
});

const Reports: React.FC<ReportsProps> = React.memo(({
  entries, expenses, serviceTypes, expenseCategories, branches, manualDate, branchId, onUpdateEntry, onAddExpense, isSyncing, onRefresh, username, userRole
}) => {
  const today = getTodayDate();
  const defaultBranch = userRole === ROLES.MANAGER ? 'الكل' : (branchId || (branches.length > 0 ? branches[0].id : 'الكل'));
  const defaultEmployee = userRole === ROLES.MANAGER ? 'الكل' : username;

  // Helper to persist filter values in sessionStorage
  const usePersistedState = <T extends string>(key: string, defaultValue: T): [T, (val: T) => void] => {
    const [value, setValue] = useState<T>(() => {
      const stored = sessionStorage.getItem(`${STORAGE_KEYS.ADMIN_DASHBOARD_TAB}_reports_${key}`);
      return (stored !== null ? stored : defaultValue) as T;
    });
    const setPersistedValue = (val: T) => {
      sessionStorage.setItem(`${STORAGE_KEYS.ADMIN_DASHBOARD_TAB}_reports_${key}`, val);
      setValue(val);
    };
    return [value, setPersistedValue];
  };

  const [startDate, setStartDate] = usePersistedState('rpt_startDate', today);
  const [endDate, setEndDate] = usePersistedState('rpt_endDate', today);
  const [perfStartDate, setPerfStartDate] = usePersistedState('rpt_perfStartDate', today);
  const [perfEndDate, setPerfEndDate] = usePersistedState('rpt_perfEndDate', today);
  const [selectedBranchId, setSelectedBranchId] = usePersistedState('rpt_branch', defaultBranch);
  const [selectedService, setSelectedService] = usePersistedState('rpt_service', 'الكل');
  const [selectedExpenseType, setSelectedExpenseType] = usePersistedState('rpt_expenseType', 'الكل');
  const [selectedEmployee, setSelectedEmployee] = usePersistedState('rpt_employee', defaultEmployee);
  const [activeTab, setActiveTab] = usePersistedState<'entries' | 'expenses' | 'performance'>('rpt_tab', 'entries');
  const [searchTerm, setSearchTerm] = usePersistedState('rpt_search', '');

  const [visibleEntriesCount, setVisibleEntriesCount] = useState(50);
  const [visibleExpensesCount, setVisibleExpensesCount] = useState(50);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { showModal, setIsProcessing } = useModal();

  const isFilterActive = startDate !== today || endDate !== today || selectedBranchId !== defaultBranch || selectedService !== 'الكل' || selectedExpenseType !== 'الكل' || selectedEmployee !== defaultEmployee || searchTerm !== '';

  const resetFilters = () => {
    setStartDate(today);
    setEndDate(today);
    setSelectedBranchId(defaultBranch);
    setSelectedService('الكل');
    setSelectedExpenseType('الكل');
    setSelectedEmployee(defaultEmployee);
    setSearchTerm('');
  };

  const showCustomerDetails = (entry: ServiceEntry) => {
    showModal({
      title: 'تفاصيل المعاملة (عرض)',
      size: 'xl',
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

      // Add search filtering
      const matchesSearch = !debouncedSearchTerm || searchMultipleFields(debouncedSearchTerm, [
        e.clientName,
        e.nationalId,
        e.phoneNumber,
        e.workOrderNumber || ''
      ]);

      // If search is active, it overrides date constraint IF it's a search match
      if (debouncedSearchTerm) {
        return matchesSearch && matchesBranch && matchesService && matchesEmployee;
      }

      return matchesDate && matchesBranch && matchesService && matchesEmployee && matchesSearch;
    });

    const filteredExpenses = expenses.filter(ex => {
      const d = normalizeDate(ex.date);
      const matchesDate = d >= sDate && d <= eDate;
      const matchesBranch = selectedBranchId === 'الكل' || normalizeArabic(ex.branchId) === normalizedSelectedBranch;
      const matchesService = selectedService === 'الكل' || (ex.notes && String(ex.notes).includes(selectedService));
      const matchesExpenseType = selectedExpenseType === 'الكل' || ex.category === selectedExpenseType;
      const matchesEmployee = selectedEmployee === 'الكل' || normalizeArabic(ex.recordedBy || '') === normalizedSelectedEmployee;

      // Add search filtering for expenses
      const matchesSearch = !debouncedSearchTerm || searchMultipleFields(debouncedSearchTerm, [
        ex.notes || '',
        ex.category
      ]);

      // If search is active, it overrides date constraint IF it's a search match
      if (debouncedSearchTerm) {
        return matchesSearch && matchesBranch && matchesService && matchesExpenseType && matchesEmployee;
      }

      return matchesDate && matchesBranch && matchesService && matchesExpenseType && matchesEmployee && matchesSearch;
    });

    return { entries: filteredEntries, expenses: filteredExpenses };
  }, [entries, expenses, startDate, endDate, selectedBranchId, selectedService, selectedExpenseType, selectedEmployee, debouncedSearchTerm]);

  const performanceData = useMemo(() => {
    const sDate = normalizeDate(perfStartDate);
    const eDate = normalizeDate(perfEndDate);

    const fEntries = entries.filter(e => {
      const d = normalizeDate(e.entryDate);
      return d >= sDate && d <= eDate;
    });

    const fExpenses = expenses.filter(ex => {
      const d = normalizeDate(ex.date);
      return d >= sDate && d <= eDate;
    });

    return { entries: fEntries, expenses: fExpenses };
  }, [entries, expenses, perfStartDate, perfEndDate]);

  const stats = useMemo(() => {
    const totalRevenue = filteredData.entries.reduce((sum, e) => {
      const amount = e.serviceType === 'تحويل وارد' ? e.serviceCost : e.amountPaid;
      return sum + amount;
    }, 0);
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

  const inputClasses = "w-full p-4 border border-[#01404E]/10 rounded-2xl bg-[#01404E]/5 text-[#01404E] font-black placeholder-[#01404E]/30 focus:bg-white focus:border-[#00A6A6] focus:ring-4 focus:ring-[#00A6A6]/5 outline-none transition-all shadow-sm";

  return (
    <div className="px-3 pb-3 pt-1 md:px-6 md:pb-6 md:pt-2 space-y-2 text-right animate-premium-in">
      {/* Header */}
      <div className="bg-[#01404E] p-3 md:p-4 rounded-[2rem] shadow-premium border-b border-white/5 text-white">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#00A6A6]/20 rounded-2xl flex items-center justify-center text-[#00A6A6] shadow-lg border border-[#00A6A6]/20 backdrop-blur-md">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black tracking-tight">التقارير التحليلية</h2>
                {userRole === ROLES.MANAGER && (
                  <button
                    onClick={() => setActiveTab(activeTab === 'performance' ? 'entries' : 'performance')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-[10px] transition-all border ${activeTab === 'performance'
                      ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <Activity className={`w-3 h-3 ${activeTab === 'performance' ? 'animate-pulse' : ''}`} />
                    أداء الفروع
                  </button>
                )}
              </div>
              <p className="text-white/40 text-[10px] font-black tracking-[0.2em] uppercase mt-0.5">متابعة الأداء والتدفقات النقدية</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
            {/* Search Input in Header */}
            <div className="w-full lg:w-[350px]">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="ابحث بالاسم، رقم قومي، هاتف، أو أمر شغل..."
                className="w-full"
              />
            </div>

            {userRole !== ROLES.MANAGER && (
              <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3 whitespace-nowrap">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00A6A6]"></div>
                <div>
                  <p className="text-[10px] text-white/40 font-black uppercase">الموظف الحالي</p>
                  <p className="text-xs font-black text-white">{username}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'performance' ? (
        <div className="space-y-2">
          {/* Performance Header & Internal Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/50 p-4 rounded-[2rem] border border-white/40 shadow-premium">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#01404E]">تحليلات أداء الفروع</h3>
                <p className="text-[10px] text-blue-600 font-black uppercase mt-0.5">مقارنة الفروع والنمو</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/60 p-2 rounded-2xl border border-white/40 shadow-inner">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-[#01404E]/60">من:</span>
                <input
                  type="date"
                  value={perfStartDate}
                  onChange={(e) => setPerfStartDate(toEnglishDigits(e.target.value))}
                  className="bg-transparent border-none text-xs font-black text-[#01404E] focus:ring-0 p-0 w-[110px]"
                />
              </div>
              <div className="w-px h-4 bg-[#01404E]/10"></div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-[#01404E]/60">إلى:</span>
                <input
                  type="date"
                  value={perfEndDate}
                  onChange={(e) => setPerfEndDate(toEnglishDigits(e.target.value))}
                  className="bg-transparent border-none text-xs font-black text-[#01404E] focus:ring-0 p-0 w-[110px]"
                />
              </div>
            </div>
          </div>

          {/* Performance Analytics Content */}
          {(() => {
            const chartData = branches.map(b => {
              const bEntries = performanceData.entries.filter(e => normalizeArabic(e.branchId || '') === normalizeArabic(b.name));
              const bExpenses = performanceData.expenses.filter(ex => normalizeArabic(ex.branchId || '') === normalizeArabic(b.name));

              const revenue = bEntries.reduce((sum, e) => {
                const amount = e.serviceType === 'تحويل وارد' ? (e.serviceCost || 0) : (e.amountPaid || 0);
                return sum + amount;
              }, 0);
              const debt = bEntries.reduce((sum, e) => sum + (e.remainingAmount || 0), 0);
              const expenseValue = bExpenses.reduce((sum, ex) => sum + (ex.amount || 0), 0);

              return {
                name: b.name,
                إيرادات: revenue,
                مصروفات: expenseValue,
                صافي: revenue - expenseValue,
                مديونية: debt,
                عمليات: bEntries.length
              };
            }).filter(d => d.إيرادات > 0 || d.مصروفات > 0 || d.عمليات > 0 || d.مديونية > 0)
              .sort((a, b) => b.إيرادات - a.إيرادات);

            const topBranch = chartData[0] || { name: '-', إيرادات: 0 };
            const mostActive = [...chartData].sort((a, b) => b.عمليات - a.عمليات)[0] || { name: '-', عمليات: 0 };

            return (
              <div className="space-y-2">
                {/* Performance Mini Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white/80 p-4 rounded-3xl border border-white/40 shadow-premium flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-black uppercase">أعلى فرع إيراداً</p>
                      <p className="text-base font-black text-[#01404E]">{topBranch.name}</p>
                    </div>
                  </div>
                  <div className="bg-white/80 p-4 rounded-3xl border border-white/40 shadow-premium flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-black uppercase">الأكثر حركية</p>
                      <p className="text-base font-black text-[#01404E]">{mostActive.name}</p>
                    </div>
                  </div>
                  <div className="bg-white/80 p-4 rounded-3xl border border-white/40 shadow-premium flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center">
                      <ArrowUpRight className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-black uppercase">إجمالي العائد</p>
                      <p className="text-base font-black text-[#01404E]">{performanceData.entries.reduce((sum, e) => sum + (e.serviceType === 'تحويل وارد' ? e.serviceCost : e.amountPaid), 0).toLocaleString()} ج.م</p>
                    </div>
                  </div>
                  <div className="bg-white/80 p-4 rounded-3xl border border-white/40 shadow-premium flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-500/10 text-red-600 rounded-2xl flex items-center justify-center">
                      <ArrowDownRight className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-black uppercase">إجمالي النفقات</p>
                      <p className="text-base font-black text-[#01404E]">{performanceData.expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()} ج.م</p>
                    </div>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {/* Bar Chart: Revenue vs Expenses per Branch */}
                  <div className="bg-white/80 backdrop-blur-xl p-4 rounded-[2.5rem] border border-white/40 shadow-premium">
                    <h4 className="text-sm font-black text-[#01404E] mb-2 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-blue-600" />
                      مقارنة الإيرادات والمصروفات للفروع
                    </h4>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#01404E' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#01404E' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 900 }}
                            itemStyle={{ fontSize: '12px' }}
                          />
                          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontWeight: 900, fontSize: '12px' }} />
                          <Bar dataKey="إيرادات" fill="#00A6A6" radius={[6, 6, 0, 0]} barSize={20} />
                          <Bar dataKey="مصروفات" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Pie Chart: Debt Distribution */}
                  <div className="bg-white/80 backdrop-blur-xl p-4 rounded-[2.5rem] border border-white/40 shadow-premium">
                    <h4 className="text-sm font-black text-[#01404E] mb-2 flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4 text-red-600" />
                      توزيع المديونيات على الفروع (المتبقي)
                    </h4>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="مديونية"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#ef4444', '#f97316', '#dc2626', '#b91c1c', '#991b1b'][index % 5]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 900 }}
                          />
                          <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontWeight: 900, fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Performance Leaderboard Table */}
                <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/40 shadow-premium overflow-hidden">
                  <div className="p-6 border-b border-[#01404E]/5 flex items-center justify-between">
                    <h4 className="text-sm font-black text-[#01404E] flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-blue-600" />
                      ترتيب أداء الفروع
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#01404E]/5">
                        <tr className="text-[10px] md:text-xs font-black uppercase text-gray-400 tracking-widest border-b border-[#01404E]/5">
                          <th className="py-4 px-6 text-right">الفرع</th>
                          <th className="py-4 px-6 text-center">الإيرادات</th>
                          <th className="py-4 px-6 text-center">المصروفات</th>
                          <th className="py-4 px-6 text-center">المديونية</th>
                          <th className="py-4 px-6 text-center">الصافي</th>
                          <th className="py-4 px-6 text-center">حجم العمليات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#01404E]/5">
                        {chartData.map((data, idx) => (
                          <tr key={data.name} className="hover:bg-blue-50/50 transition-all">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {idx + 1}
                                </span>
                                <span className="font-black text-[#01404E] text-xs md:text-sm">{data.name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center font-black text-emerald-600">+{data.إيرادات.toLocaleString()} ج.م</td>
                            <td className="py-4 px-6 text-center font-black text-red-500">-{data.مصروفات.toLocaleString()} ج.م</td>
                            <td className="py-4 px-6 text-center font-black text-orange-600">{data.مديونية.toLocaleString()} ج.م</td>
                            <td className="py-4 px-6 text-center font-black text-[#01404E] text-xs md:text-sm">{data.صافي.toLocaleString()} ج.م</td>
                            <td className="py-4 px-6 text-center font-black text-blue-600">{data.عمليات} عملية</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <>
          {/* Filters Section - Two-Row Integrated Layout */}
          <div className="space-y-2 px-1 relative z-30">
            {/* Row 1: Title + Date Range + Refresh */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-1.5 h-10 bg-[#00A6A6] rounded-full shadow-lg shadow-[#00A6A6]/20"></div>
                <div>
                  <h3 className="text-xl font-black text-[#01404E] tracking-tight whitespace-nowrap">تخصيص البحث والفترة</h3>
                  <p className="text-[10px] text-[#036564] font-black uppercase tracking-[0.3em] mt-1">تصفية النتائج</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 bg-white/50 p-1.5 rounded-2xl border border-white/40 shadow-premium">
                {/* Date Range Group */}
                <div className="flex items-center gap-2 bg-white/40 p-2 rounded-xl border border-white/40 shadow-inner shrink-0">
                  <span className="text-[10px] font-black text-[#01404E]/60 whitespace-nowrap px-1">من:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(toEnglishDigits(e.target.value))}
                    className="bg-transparent border-none text-xs font-black text-[#01404E] focus:ring-0 p-0 w-[110px]"
                  />
                  <div className="w-px h-4 bg-[#01404E]/10"></div>
                  <span className="text-[10px] font-black text-[#01404E]/60 whitespace-nowrap px-1">إلى:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(toEnglishDigits(e.target.value))}
                    className="bg-transparent border-none text-xs font-black text-[#01404E] focus:ring-0 p-0 w-[110px]"
                  />
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRefresh();
                  }}
                  disabled={isSyncing}
                  className={`px-6 h-[44px] rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 shrink-0 ${isSyncing ? 'bg-gray-100 text-gray-400' : 'bg-[#01404E] text-white hover:bg-[#036564]'}`}
                >
                  <Clock className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="text-[10px] whitespace-nowrap uppercase tracking-widest">{isSyncing ? 'جاري السحب' : 'تحديث البيانات'}</span>
                </button>
              </div>
            </div>

            {/* Row 2: Selectors + Reset */}
            <div className="flex flex-wrap items-center gap-3 bg-white/40 p-1.5 rounded-2xl border border-white/30 shadow-sm ml-auto">
              <div className="w-full md:w-[160px]">
                <CustomSelect
                  options={branchOptions}
                  value={selectedBranchId}
                  onChange={setSelectedBranchId}
                  placeholder="كل الفروع"
                  showAllOption={true}
                  className="p-3 bg-white/40 border-white/40 rounded-xl text-xs font-black"
                />
              </div>

              <div className="w-full md:w-[160px]">
                <CustomSelect
                  options={serviceOptions}
                  value={selectedService}
                  onChange={setSelectedService}
                  placeholder="كل الخدمات"
                  className="p-3 bg-white/40 border-white/40 rounded-xl text-xs font-black"
                />
              </div>

              <div className="w-full md:w-[160px]">
                <CustomSelect
                  options={expenseTypeOptions}
                  value={selectedExpenseType}
                  onChange={setSelectedExpenseType}
                  placeholder="كل المصروفات"
                  className="p-3 bg-white/40 border-white/40 rounded-xl text-xs font-black"
                />
              </div>

              {userRole === ROLES.MANAGER && (
                <div className="w-full md:w-[160px]">
                  <CustomSelect
                    options={employeeOptions}
                    value={selectedEmployee}
                    onChange={setSelectedEmployee}
                    placeholder="كل الموظفين"
                    className="p-3 bg-white/40 border-white/40 rounded-xl text-xs font-black"
                  />
                </div>
              )}

              {isFilterActive && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    resetFilters();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-xl text-xs font-black transition-all border border-red-500/20 active:scale-95"
                >
                  <X className="w-4 h-4" />
                  <span>إلغاء الفلاتر</span>
                </button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" >
            <StatCard title="إجمالي الإيرادات" value={stats.revenue} icon={<TrendingUp />} color="blue" footer="حصيلة العمليات وسداد المديونيات" />
            <StatCard title="إجمالي المصروفات" value={stats.expenses} icon={<Wallet />} color="red" footer="المصروفات النثرية والمكافآت" />
            <StatCard title="صافي الربح" value={stats.net} icon={<DollarSign />} color="emerald" footer="الإيرادات مطروحاً منها المصروفات" />
          </div >

          {/* Tabs and Table */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/20 shadow-premium overflow-hidden" >
            <div className="bg-[#01404E]/5 p-3 border-b border-[#01404E]/5">
              <div className="flex bg-[#01404E]/10 rounded-2xl p-1 gap-2 shadow-lux">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveTab('entries');
                  }}
                  className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-3 transition-all duration-300 ${activeTab === 'entries' ? 'bg-[#01404E] text-white shadow-premium scale-[1.02]' : 'text-[#01404E]/40 hover:text-[#01404E] hover:bg-white/50'}`}
                >
                  <ListChecks className="w-5 h-5" />
                  سجل العمليات ({filteredData.entries.length})
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveTab('expenses');
                  }}
                  className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-3 transition-all duration-300 ${activeTab === 'expenses' ? 'bg-red-600 text-white shadow-premium scale-[1.02]' : 'text-red-400/40 hover:text-red-600 hover:bg-white/50'}`}
                >
                  <Receipt className="w-5 h-5" />
                  سجل المصروفات ({filteredData.expenses.length})
                </button>
              </div>
            </div>

            <div className="p-0">
              {activeTab === 'entries' ? (
                <div className="min-h-[400px] max-h-[600px] overflow-y-auto custom-scrollbar">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-20">
                      <tr className="bg-[#01404E] text-white/50 text-xs font-black tracking-[0.2em] uppercase border-b border-white/5">
                        <th className="py-3 px-8 text-right">بيان الحركة والعميل</th>
                        <th className="py-3 px-6 text-center">المبلغ</th>
                        <th className="py-3 px-6 text-center">الفرع</th>
                        <th className="py-3 px-6 text-center">الموظف</th>
                        <th className="py-3 px-8 text-center">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#01404E]/5 font-bold relative text-right text-sm">
                      {filteredData.entries.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-20 text-center">
                            <div className="flex flex-col items-center gap-4">
                              <div className="w-16 h-16 bg-[#01404E]/5 rounded-full flex items-center justify-center text-[#01404E]/20">
                                <ListChecks className="w-8 h-8" />
                              </div>
                              <span className="text-gray-300 font-black italic">لا توجد عمليات تطابق البحث</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredData.entries.slice(0, visibleEntriesCount).map(e => (
                          <tr key={e.id} className="hover:bg-[#036564]/5 transition-all group font-black text-right">
                            <td className="py-3 px-8">
                              <div className="flex flex-col gap-0.5 items-start">
                                <span
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    showCustomerDetails(e);
                                  }}
                                  className="font-black text-[#01404E] text-base cursor-pointer hover:text-[#00A6A6] transition-colors"
                                >
                                  {e.clientName}
                                </span>
                                <span className="bg-[#00A6A6]/10 text-[#00A6A6] px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest w-fit">{e.serviceType}</span>
                              </div>
                            </td>
                            <td className="py-3 px-6 text-center">
                              <span className="text-2xl font-black text-emerald-600 tracking-tighter">
                                +{(e.serviceType === 'تحويل وارد' ? e.serviceCost : e.amountPaid).toLocaleString()}
                                <span className="text-[10px] mr-1 opacity-50 uppercase">ج.م</span>
                              </span>
                            </td>
                            <td className="py-3 px-6 text-center">
                              <span className="bg-[#01404E]/5 text-[#01404E] px-3 py-1 rounded-xl text-[10px] font-black">{e.branchId}</span>
                            </td>
                            <td className="py-3 px-6 text-center">
                              <span className="bg-[#00A6A6]/5 text-[#00A6A6] px-3 py-1 rounded-xl text-[10px] font-black">{e.recordedBy || '-'}</span>
                            </td>
                            <td className="py-3 px-8 text-center text-[#01404E]/40 text-[10px] font-black tracking-tighter">{e.entryDate}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {visibleEntriesCount < filteredData.entries.length && (
                    <div className="p-6 text-center border-t border-[#01404E]/5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setVisibleEntriesCount(prev => prev + 50);
                        }}
                        className="px-6 py-3 bg-[#00A6A6] text-white font-black rounded-2xl hover:bg-[#036564] transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        تحميل المزيد ({filteredData.entries.length - visibleEntriesCount} متبقي)
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="min-h-[400px] max-h-[600px] overflow-y-auto custom-scrollbar">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-20">
                      <tr className="bg-red-900 text-white/50 text-xs font-black tracking-[0.2em] uppercase border-b border-white/5">
                        <th className="py-3 px-8 text-right">البند / التصنيف</th>
                        <th className="py-3 px-6 text-center">المبلغ</th>
                        <th className="py-3 px-6 text-center">الفرع</th>
                        <th className="py-3 px-6 text-center">الموظف</th>
                        <th className="py-3 px-8 text-center">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-900/5 font-bold relative text-right text-sm">
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
                            <td className="py-3 px-8">
                              <div className="flex flex-col gap-0.5 items-start">
                                <span className="font-black text-red-900 text-base uppercase">{ex.category}</span>
                                <span className="text-[10px] text-red-900/40 font-bold italic">{ex.notes || 'بدون تفاصيل'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-6 text-center">
                              <span className="text-2xl font-black text-red-600 tracking-tighter">-{ex.amount.toLocaleString()}<span className="text-[10px] mr-1 opacity-50 uppercase">ج.م</span></span>
                            </td>
                            <td className="py-3 px-6 text-center">
                              <span className="bg-red-50 text-red-900/60 px-3 py-1 rounded-xl text-[10px] font-black">{ex.branchId}</span>
                            </td>
                            <td className="py-3 px-6 text-center">
                              <span className="bg-[#01404E]/5 text-[#01404E] px-3 py-1 rounded-xl text-[10px] font-black">{ex.recordedBy || '-'}</span>
                            </td>
                            <td className="py-3 px-8 text-center text-red-900/40 text-[10px] font-black tracking-tighter">{ex.date}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {visibleExpensesCount < filteredData.expenses.length && (
                    <div className="p-6 text-center border-t border-red-900/5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setVisibleExpensesCount(prev => prev + 50);
                        }}
                        className="px-6 py-3 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        تحميل المزيد ({filteredData.expenses.length - visibleExpensesCount} متبقي)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div >
  );
});

export default Reports;