import React, { useMemo, useState } from 'react';
import { ServiceEntry, Expense, Branch } from '../types';
import { SERVICE_TYPES } from '../constants';
import { Search, DollarSign, Clock, Filter, Printer, TrendingUp, Wallet, ListChecks, Receipt } from 'lucide-react';
import { generateReceipt } from '../services/pdfService';
import { useModal } from '../context/ModalContext';
import { normalizeArabic, normalizeDate, toEnglishDigits } from '../utils';
import CustomSelect from '../components/CustomSelect';

interface ReportsProps {
  entries: ServiceEntry[];
  expenses: Expense[];
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
  const colorClasses: any = {
    blue: 'border-blue-600 text-blue-600 bg-blue-50',
    red: 'border-red-500 text-red-600 bg-red-50',
    emerald: 'border-emerald-500 text-emerald-600 bg-emerald-50'
  };
  return (
    <div className={`bg-white p-4 rounded-3xl shadow-sm border-r-8 ${colorClasses[color].split(' ')[0]} transition-all hover:translate-y-[-4px] hover:shadow-lg w-full`}>
      <div className="flex justify-between items-start text-right">
        <div className="flex-1">
          <p className="text-[10px] text-gray-900 font-black uppercase tracking-widest mb-1">{title}</p>
          <p className="text-2xl font-black text-gray-900">{value.toLocaleString()}</p>
        </div>
        <div className={`p-2.5 rounded-2xl shadow-inner ${colorClasses[color].split(' ').slice(1).join(' ')}`}>{icon}</div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-50 text-[10px] text-gray-500 font-bold leading-relaxed">{footer}</div>
    </div>
  );
};

const Reports: React.FC<ReportsProps> = ({
  entries, expenses, branches, manualDate, branchId, onUpdateEntry, onAddExpense, isSyncing, onRefresh, username, userRole
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    if (userRole === 'مدير') return 'الكل';
    return branchId || (branches.length > 0 ? branches[0].id : 'الكل');
  });
  const [selectedService, setSelectedService] = useState<string>('الكل');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('الكل');
  const [activeTab, setActiveTab] = useState<'entries' | 'expenses'>('entries');

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
        </div>
      ),
      confirmText: 'إغلاق'
    });
  };

  const filteredData = useMemo(() => {
    const sDate = normalizeDate(startDate);
    const eDate = normalizeDate(endDate);
    const normalizedSelectedBranch = normalizeArabic(selectedBranchId);

    const filteredEntries = entries.filter(e => {
      const d = normalizeDate(e.entryDate);
      const matchesDate = d >= sDate && d <= eDate;
      const matchesBranch = selectedBranchId === 'الكل' || normalizeArabic(e.branchId) === normalizedSelectedBranch;
      const matchesService = selectedService === 'الكل' || e.serviceType === selectedService;
      const matchesEmployee = selectedEmployee === 'الكل' || e.recordedBy === selectedEmployee;
      return matchesDate && matchesBranch && matchesService && matchesEmployee;
    });

    const filteredExpenses = expenses.filter(ex => {
      const d = normalizeDate(ex.date);
      const matchesDate = d >= sDate && d <= eDate;
      const matchesBranch = selectedBranchId === 'الكل' || normalizeArabic(ex.branchId) === normalizedSelectedBranch;
      const matchesService = selectedService === 'الكل' || (ex.notes && ex.notes.includes(selectedService));
      const matchesEmployee = selectedEmployee === 'الكل' || ex.recordedBy === selectedEmployee;
      return matchesDate && matchesBranch && matchesService && matchesEmployee;
    });

    return { entries: filteredEntries, expenses: filteredExpenses };
  }, [entries, expenses, startDate, endDate, selectedBranchId, selectedService, selectedEmployee]);

  const stats = useMemo(() => {
    const totalRevenue = filteredData.entries.reduce((sum, e) => sum + e.amountPaid, 0);
    const totalExpenses = filteredData.expenses.reduce((sum, e) => sum + e.amount, 0);
    return { revenue: totalRevenue, expenses: totalExpenses, net: totalRevenue - totalExpenses };
  }, [filteredData]);

  const branchOptions = useMemo(() => branches.map(b => ({ id: b.id, name: b.name })), [branches]);
  const serviceOptions = useMemo(() => SERVICE_TYPES.map(s => ({ id: s, name: s })), []);

  const employeeOptions = useMemo(() => {
    const names = new Set<string>();
    entries.forEach(e => { if (e.recordedBy) names.add(e.recordedBy); });
    expenses.forEach(ex => { if (ex.recordedBy) names.add(ex.recordedBy); });
    return Array.from(names).map(name => ({ id: name, name }));
  }, [entries, expenses]);

  return (
    <div className="p-3 md:p-5 space-y-4 text-right">
      {/* Welcome Message for Non-Managers */}
      {userRole !== 'مدير' && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-3xl border-2 border-blue-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">👤</span>
            </div>
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">عرض التقارير الخاصة بك</p>
              <p className="text-lg font-black text-blue-900">{username}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters Header */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center gap-3 border-b border-gray-50 pb-3 mb-1">
          <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
          <h3 className="text-lg font-black text-gray-800">تخصيص عرض التقارير</h3>
        </div>
        <div className="space-y-4">
          {/* Manager-only filters */}
          {userRole === 'مدير' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <CustomSelect
                label="فرع البحث"
                options={branchOptions}
                value={selectedBranchId}
                onChange={setSelectedBranchId}
                placeholder="كل الفروع"
                icon={<Filter className="w-3.5 h-3.5" />}
                showAllOption={true}
              />

              <CustomSelect
                label="نوع الخدمة"
                options={serviceOptions}
                value={selectedService}
                onChange={setSelectedService}
                placeholder="كل الخدمات"
                icon={<Filter className="w-3.5 h-3.5" />}
              />

              <CustomSelect
                label="الموظف"
                options={employeeOptions}
                value={selectedEmployee}
                onChange={setSelectedEmployee}
                placeholder="كل الموظفين"
                icon={<Search className="w-3.5 h-3.5" />}
              />
            </div>
          )}

          {/* Date filters for all users */}
          <div className={`grid grid-cols-2 gap-3 ${userRole === 'مدير' ? 'pt-3 border-t border-gray-50' : ''}`}>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mr-1">من تاريخ</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(toEnglishDigits(e.target.value))}
                className="w-full p-3.5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 font-bold text-xs outline-none transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mr-1">إلى تاريخ</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(toEnglishDigits(e.target.value))}
                className="w-full p-3.5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 font-bold text-xs outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="إجمالي الإيرادات" value={stats.revenue} icon={<TrendingUp className="w-6 h-6" />} color="blue" footer="حصيلة العمليات وسداد المديونيات" />
        <StatCard title="إجمالي المصروفات" value={stats.expenses} icon={<Wallet className="w-6 h-6" />} color="red" footer="المصروفات النثرية والمكافآت" />
        <StatCard title="صافي الربح" value={stats.net} icon={<DollarSign className="w-6 h-6" />} color="emerald" footer="الإيرادات مطروحاً منها المصروفات" />
      </div>

      <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
        <div className="bg-gray-50/50 p-2 border-b border-gray-100">
          <div className="flex bg-white rounded-2xl p-1 gap-1 shadow-sm border border-gray-100">
            <button
              onClick={() => setActiveTab('entries')}
              className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'entries' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <ListChecks className="w-4 h-4" />
              سجل العمليات ({filteredData.entries.length})
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'expenses' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Receipt className="w-4 h-4" />
              سجل المصروفات ({filteredData.expenses.length})
            </button>
          </div>
        </div>

        <div className="p-0">
          {activeTab === 'entries' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-right font-bold">
                <thead className="bg-gray-50 text-gray-400 text-[10px] font-black tracking-widest uppercase">
                  <tr>
                    <th className="py-3 px-6 text-right">الحركة</th>
                    <th className="py-3 px-6 text-center">المبلغ</th>
                    <th className="py-3 px-6 text-center">الفرع</th>
                    <th className="py-3 px-6 text-center">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm font-bold">
                  {filteredData.entries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-16 text-center text-gray-300 font-black italic">لا توجد عمليات تطابق البحث</td>
                    </tr>
                  ) : (
                    filteredData.entries.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-6 text-right">
                          <span onClick={() => showCustomerDetails(e)} className="cursor-pointer hover:text-blue-600 transition-colors">{e.clientName}</span>
                          <br />
                          <span className="text-[10px] text-blue-600 font-bold">{e.serviceType}</span>
                        </td>
                        <td className="py-3 px-6 text-center text-emerald-600">+{e.amountPaid}</td>
                        <td className="py-3 px-6 text-center text-[10px] text-gray-400">{e.branchId}</td>
                        <td className="py-3 px-6 text-center text-gray-400 text-xs">{e.entryDate}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right font-bold">
                <thead className="bg-gray-50 text-gray-400 text-[10px] font-black tracking-widest uppercase">
                  <tr>
                    <th className="py-3 px-6 text-right">البند / التصنيف</th>
                    <th className="py-3 px-6 text-center">المبلغ</th>
                    <th className="py-3 px-6 text-center">الفرع</th>
                    <th className="py-3 px-6 text-center">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm font-bold">
                  {filteredData.expenses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-16 text-center text-gray-300 font-black italic">لا توجد مصروفات تطابق البحث</td>
                    </tr>
                  ) : (
                    filteredData.expenses.map(ex => (
                      <tr key={ex.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-6 text-right">
                          <span className="text-gray-900">{ex.category}</span>
                          <br />
                          <span className="text-[10px] text-gray-400 font-medium">{ex.notes || 'بدون تفاصيل'}</span>
                        </td>
                        <td className="py-3 px-6 text-center text-red-600">-{ex.amount}</td>
                        <td className="py-3 px-6 text-center text-[10px] text-gray-400">{ex.branchId}</td>
                        <td className="py-3 px-6 text-center text-gray-400 text-xs">{ex.date}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;