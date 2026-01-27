import React, { useMemo, useState, useEffect } from 'react';
import { ServiceEntry, Expense, Branch, User } from '../types';
import { SERVICE_TYPES } from '../constants';
import { Search, DollarSign, Clock, Filter, Printer, TrendingUp, Wallet, ListChecks, Receipt, Lock, MapPin } from 'lucide-react';
import { generateReceipt } from '../services/pdfService';
import { useModal } from '../context/ModalContext';
import { normalizeArabic, normalizeDate } from '../utils';
import { BRANCHES } from '../constants';
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
  user: User;
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
  entries, expenses, branches, manualDate, branchId, onUpdateEntry, onAddExpense, isSyncing, onRefresh, username, user
}) => {
  const [startDate, setStartDate] = useState(manualDate);
  const [endDate, setEndDate] = useState(manualDate);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branchId);
  const [selectedService, setSelectedService] = useState<string>('الكل');
  const [activeTab, setActiveTab] = useState<'entries' | 'expenses'>('entries');

  const isRestricted = !!user.assignedBranchId;

  // If user is restricted, lock them to their assigned branch
  useEffect(() => {
    if (isRestricted && user.assignedBranchId) {
      setSelectedBranchId(user.assignedBranchId);
    }
  }, [isRestricted, user.assignedBranchId]);

  const { showModal } = useModal();

  const showCustomerDetails = (entry: ServiceEntry) => {
    showModal({
      title: 'تفاصيل المعاملة',
      content: (
        <div className="space-y-4 text-right">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-1">العميل</span>
              <p className="font-black text-gray-800">{entry.clientName}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-1">الرقم القومي</span>
              <p className="font-black text-gray-800">{entry.nationalId}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-1">نوع الخدمة</span>
              <p className="font-black text-blue-600">{entry.serviceType}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 font-mono">
              <span className="text-[10px] text-gray-400 font-black block mb-1">الباركود</span>
              <p className="font-black text-gray-800">{entry.barcode || '-'}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-1">تاريخ العملية</span>
              <p className="font-black text-gray-800">{entry.entryDate}</p>
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

  const filteredData = useMemo(() => {
    const sDate = normalizeDate(startDate);
    const eDate = normalizeDate(endDate);
    const normalizedSelectedBranch = normalizeArabic(selectedBranchId);

    const filteredEntries = entries.filter(e => {
      const d = normalizeDate(e.entryDate);
      const matchesDate = d >= sDate && d <= eDate;
      const matchesBranch = selectedBranchId === 'الكل' || normalizeArabic(e.branchId) === normalizedSelectedBranch;
      const matchesService = selectedService === 'الكل' || e.serviceType === selectedService;
      return matchesDate && matchesBranch && matchesService;
    });

    const filteredExpenses = expenses.filter(ex => {
      const d = normalizeDate(ex.date);
      const matchesDate = d >= sDate && d <= eDate;
      const matchesBranch = selectedBranchId === 'الكل' || normalizeArabic(ex.branchId) === normalizedSelectedBranch;

      // منطق ذكي: إذا تم اختيار خدمة محددة، نظهر فقط المصروفات المرتبطة بها (عن طريق البحث في الملاحظات)
      const matchesService = selectedService === 'الكل' || (ex.notes && ex.notes.includes(selectedService));

      return matchesDate && matchesBranch && matchesService;
    });

    return { entries: filteredEntries, expenses: filteredExpenses };
  }, [entries, expenses, startDate, endDate, selectedBranchId, selectedService]);

  const stats = useMemo(() => {
    const totalRevenue = filteredData.entries.reduce((sum, e) => sum + e.amountPaid, 0);
    const totalExpenses = filteredData.expenses.reduce((sum, e) => sum + e.amount, 0);
    return { revenue: totalRevenue, expenses: totalExpenses, net: totalRevenue - totalExpenses };
  }, [filteredData]);

  const branchOptions = useMemo(() => branches.map(b => ({ id: b.id, name: b.name })), [branches]);
  const serviceOptions = useMemo(() => SERVICE_TYPES.map(s => ({ id: s, name: s })), []);

  return (
    <div className="p-3 md:p-5 space-y-4 text-right">
      {/* Filters Header */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center gap-3 border-b border-gray-50 pb-3 mb-1">
          <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
          <h3 className="text-lg font-black text-gray-800">تخصيص عرض التقارير</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {isRestricted ? (
            <div className="flex-1">
              <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mr-1 mb-1">فرع البحث</label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-2xl border-2 border-gray-200 text-gray-700 font-bold text-sm cursor-not-allowed">
                <Lock className="w-4 h-4 text-gray-400" />
                <span>{branches.find(b => b.id === selectedBranchId)?.name || selectedBranchId}</span>
              </div>
            </div>
          ) : (
            <CustomSelect
              label="فرع البحث"
              options={[{ id: 'الكل', name: 'كل الفروع' }, ...branches.map(b => ({ id: b.id, name: b.name }))]}
              value={selectedBranchId}
              onChange={setSelectedBranchId}
              placeholder="كل الفروع"
              icon={<Filter className="w-3.5 h-3.5" />}
            />
          )}

          <CustomSelect
            label="نوع الخدمة"
            options={serviceOptions}
            value={selectedService}
            onChange={setSelectedService}
            placeholder="كل الخدمات"
            icon={<Filter className="w-3.5 h-3.5" />}
          />

          <div className="space-y-1">
            <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mr-1">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-3.5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 font-bold text-xs outline-none transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mr-1">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-3.5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 font-bold text-xs outline-none transition-all"
            />
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