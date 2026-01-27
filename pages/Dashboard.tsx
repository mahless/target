import React, { useState, useMemo } from 'react';
import { ServiceEntry, Expense } from '../types';
import { Search, DollarSign, Users, Clock, Printer, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { generateReceipt } from '../services/pdfService';
import { normalizeArabic, normalizeDate, toEnglishDigits } from '../utils';
import { useModal } from '../context/ModalContext';
import { useDashboardStats } from '../hooks/useDashboardStats';

interface DashboardProps {
  allEntries: ServiceEntry[];
  allExpenses: Expense[];
  currentDate: string;
  branchId: string;
  onUpdateEntry: (updatedEntry: ServiceEntry) => void;
  isSyncing: boolean;
  onRefresh: () => void;
}

const StatCard = ({ title, value, icon, color, footer }: any) => {
  const colorClasses: any = {
    blue: 'border-blue-600 text-blue-600 bg-blue-50',
    red: 'border-red-500 text-red-600 bg-red-50',
    amber: 'border-amber-500 text-amber-600 bg-amber-50'
  };
  return (
    <div className={`bg-white p-4 rounded-3xl shadow-sm border-r-8 ${colorClasses[color].split(' ')[0]} transition-all hover:translate-y-[-4px] hover:shadow-lg`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] text-gray-900 font-black uppercase tracking-widest mb-1">{title}</p>
          <p className="text-2xl font-black text-gray-900">{value.toLocaleString()}</p>
        </div>
        <div className={`p-2.5 rounded-2xl shadow-inner ${colorClasses[color].split(' ').slice(1).join(' ')}`}>{icon}</div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-50 text-[10px] text-gray-500 font-bold leading-relaxed">{footer}</div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ allEntries, allExpenses, currentDate, branchId, onUpdateEntry, isSyncing, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { showModal, showQuickStatus } = useModal();

  // الفلترة الداخلية الحيوية والموحدة
  const dailyEntries = useMemo(() => {
    const normalizedBranch = normalizeArabic(branchId);
    const normalizedDateToday = normalizeDate(currentDate);

    return allEntries.filter(e =>
      normalizeArabic(e.branchId) === normalizedBranch &&
      normalizeDate(e.entryDate) === normalizedDateToday
    );
  }, [allEntries, branchId, currentDate]);

  const dailyExpenses = useMemo(() => {
    const normalizedBranch = normalizeArabic(branchId);
    const normalizedDateToday = normalizeDate(currentDate);

    return allExpenses.filter(e =>
      normalizeArabic(e.branchId) === normalizedBranch &&
      normalizeDate(e.date) === normalizedDateToday
    );
  }, [allExpenses, branchId, currentDate]);

  const stats = useDashboardStats(dailyEntries, dailyExpenses, currentDate);

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
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-[9px] text-gray-400 font-black block mb-1">السرعة</span>
              <p className="font-black text-gray-800 text-xs">{entry.speed || '-'}</p>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 font-mono">
              <span className="text-[9px] text-gray-400 font-black block mb-1">الباركود</span>
              <p className="font-black text-gray-800 text-xs">{entry.barcode || '-'}</p>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-[9px] text-gray-400 font-black block mb-1">التكلفة الإجمالية</span>
              <p className="font-black text-gray-800 text-xs">{entry.serviceCost} ج.م</p>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-[9px] text-gray-400 font-black block mb-1">المبلغ المحصل</span>
              <p className="font-black text-green-600 text-xs">{entry.amountPaid} ج.م</p>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-[9px] text-gray-400 font-black block mb-1">المبلغ المتبقي</span>
              <p className="font-black text-red-600 text-xs">{entry.remainingAmount} ج.م</p>
            </div>
            {entry.isElectronic && (
              <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100 col-span-2">
                <span className="text-[9px] text-blue-400 font-black block mb-1">تحصيل إلكتروني ({entry.electronicMethod})</span>
                <p className="font-black text-blue-700 text-xs">{entry.electronicAmount} ج.م</p>
              </div>
            )}
            {entry.hasThirdParty && (
              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100 col-span-full">
                <span className="text-[9px] text-amber-500 font-black block mb-1">طرف ثالث: {entry.thirdPartyName}</span>
                <p className="font-black text-amber-700 text-xs">تكلفة المورد: {entry.thirdPartyCost} ج.م</p>
              </div>
            )}
            <div className="bg-gray-100 p-2.5 rounded-xl border border-gray-200 col-span-full">
              <span className="text-[9px] text-gray-500 font-black block mb-1">ملاحظات</span>
              <p className="font-bold text-gray-700 text-[10px] leading-relaxed">{entry.notes || 'بدون ملاحظات'}</p>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-[9px] text-gray-400 font-black block mb-1">الموظف</span>
              <p className="font-black text-gray-800 text-xs">{entry.recordedBy}</p>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-[9px] text-gray-400 font-black block mb-1">الحالة</span>
              <p className={`font-black text-xs ${entry.status === 'cancelled' ? 'text-red-600' : 'text-green-600'}`}>
                {entry.status === 'cancelled' ? 'ملغاة' : 'نشطة'}
              </p>
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

  const handleSettleThirdParty = (entry: ServiceEntry) => {
    if (!entry.thirdPartyCost) return;

    showModal({
      title: 'تسوية تكلفة مورد',
      content: (
        <div className="space-y-4 text-right">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <p className="text-sm font-black text-blue-900 mb-1">تأكيد خروج مبلغ من الخزنة:</p>
            <p className="text-[11px] text-blue-700 font-bold leading-relaxed">
              سيتم تسجيل أن مبلغ <span className="font-black text-gray-900">{entry.thirdPartyCost} ج.م</span> قد خرج فعلياً من الخزنة كمدفوعات لـ <span className="underline">{entry.thirdPartyName}</span>.
            </p>
          </div>
        </div>
      ),
      confirmText: 'تأكيد الصرف الآن',
      onConfirm: async () => {
        const updatedEntry: ServiceEntry = {
          ...entry,
          isCostPaid: true,
          costPaidDate: new Date().toLocaleString('ar-EG'),
          costPaidBy: localStorage.getItem('target_user') ? JSON.parse(localStorage.getItem('target_user')!).name : 'غير معروف'
        };

        // تحديث لحظي (Optimistic Update)
        onUpdateEntry(updatedEntry);
        showQuickStatus('تمت التسوية بنجاح');
      }
    });
  };

  const handleCancelService = (entry: ServiceEntry) => {
    let treasuryRetainedAmount = 0;

    showModal({
      title: 'إلغاء المعاملة والخدمة',
      type: 'danger',
      content: (
        <div className="space-y-6 text-right">
          <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
            <p className="text-xs font-black text-red-700 mb-1">تنبيه الإلغاء:</p>
            <p className="text-[11px] text-red-600 font-bold leading-relaxed">
              تقوم الآن بإلغاء خدمة <span className="underline">{entry.serviceType}</span> للعميل <span className="underline">{entry.clientName}</span>.
              <br />
              إجمالي المبلغ الذي تم تحصيله فعلياً: <span className="font-black text-gray-900">{entry.amountPaid} ج.م</span>
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mr-1">المبلغ الذي سيبقى في الخزنة (مصروفات إدارية بربح المعمل)</label>
            <input
              type="number"
              placeholder="0 (استرداد كامل للعميل)"
              defaultValue={0}
              onChange={(e) => treasuryRetainedAmount = Number(e.target.value)}
              className="w-full p-4 bg-white border-2 border-red-200 rounded-2xl focus:border-red-600 font-black text-lg outline-none transition-all shadow-sm"
            />
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
              <p className="text-[9px] text-blue-700 font-bold leading-relaxed">
                💡 توضيح:
                <br />• إذا أدخلت <span className="font-black">0</span>: سيتم إرجاع كامل المبلغ ({entry.amountPaid}) للعميل.
                <br />• إذا أدخلت <span className="font-black">50</span> مـثلاً: سيتم إرجاع المبلغ الباقي ({entry.amountPaid - 50}) للعميل، ويتبقى الـ 50 في تقاريرك كإيراد.
              </p>
            </div>
          </div>
        </div>
      ),
      confirmText: 'تأكيد الإلغاء النهائي',
      onConfirm: async () => {
        const updatedEntry: ServiceEntry = {
          ...entry,
          status: 'cancelled',
          amountPaid: treasuryRetainedAmount, // المبلغ الذي يتبقى في الخزنة فعلياً
          remainingAmount: 0,
          notes: `[ملغاة] بمصروفات محتجزة: ${treasuryRetainedAmount} ج.م | ${entry.notes || ''}`
        };

        const result = await onUpdateEntry(updatedEntry);
        if (result) {
          showQuickStatus('تم إلغاء المعاملة بنجاح');
          onRefresh();
        } else {
          showQuickStatus('فشل تحديث البيانات على السيرفر', 'error');
        }
      }
    });
  };

  const filteredEntries = dailyEntries.filter(entry => {
    const term = searchTerm.toLowerCase();
    return (
      entry.clientName.toLowerCase().includes(term) ||
      entry.nationalId.includes(term) ||
      entry.phoneNumber.includes(term)
    );
  });

  return (
    <div className="p-3 md:p-5 space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="كاش الخزنة اليومي" value={stats.netCash} icon={<DollarSign className="w-6 h-6" />} color="blue" footer="تحصيل اليوم - مصروفات - تكاليف موردين مسددة" />
        <StatCard title="مصروفات اليوم" value={stats.expenses} icon={<DollarSign className="w-6 h-6" />} color="red" footer="بند المصروفات النثرية" />
        <StatCard title="التزامات لم تخرج" value={stats.liabilities || 0} icon={<AlertTriangle className="w-6 h-6" />} color="amber" footer="تكاليف موردين لم تُسدد بعد" />
        <StatCard title="مبالغ آجلة اليوم" value={stats.remaining} icon={<Users className="w-6 h-6" />} color="blue" footer="مديونيات جديدة للعملاء" />
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-4 md:p-5 border-b border-gray-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-50/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-6 bg-blue-600 rounded-full shadow-sm shadow-blue-200"></div>
            <div>
              <h3 className="text-lg font-black text-gray-800">سجل عمليات الخزنة اليومي</h3>
              <p className="text-[10px] text-gray-900 font-black uppercase tracking-widest mt-0.5">{currentDate}</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full lg:w-[320px]">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث سريع للعمليات..."
                className="w-full pr-11 pl-4 py-3 text-sm rounded-2xl bg-white shadow-inner border-2 border-blue-200 text-black font-black focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
              />
            </div>
            <button
              onClick={onRefresh}
              disabled={isSyncing}
              className={`flex items-center gap-2 py-3 px-5 rounded-2xl font-black transition-all shadow-sm active:scale-95 whitespace-nowrap ${isSyncing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-800 text-white hover:bg-blue-900'}`}
            >
              <Clock className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <div className="flex flex-col items-start leading-tight text-right">
                <span className="text-[10px]">{isSyncing ? 'جاري السحب...' : 'تحديث البيانات'}</span>
                <span className="text-[9px] opacity-70">السجلات: {allEntries.length}</span>
              </div>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto text-right">
          <table className="w-full">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-black tracking-widest border-b border-gray-100">
              <tr>
                <th className="py-3 px-6 text-right">بيان الحركة</th>
                <th className="py-3 px-6 text-center">المبلغ</th>
                <th className="py-3 px-6 text-center">المتبقي</th>
                <th className="py-3 px-6 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm font-bold">
              {filteredEntries.length === 0 ? (
                <tr><td colSpan={4} className="py-16 text-center text-gray-300 font-black">لا توجد عمليات لهذا اليوم</td></tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-blue-50/20 transition-all">
                    <td className="py-3 px-6 font-black">
                      <span
                        onClick={() => showCustomerDetails(entry)}
                        className="cursor-pointer hover:text-blue-600 transition-colors"
                      >
                        {entry.clientName}
                      </span>
                      <br />
                      <span className="text-[10px] text-blue-600 font-bold">{entry.serviceType}</span>
                    </td>
                    <td className="py-3 px-6 text-center font-black">{entry.amountPaid}</td>
                    <td className="py-3 px-6 text-center text-red-500 font-black">{entry.remainingAmount}</td>
                    <td className="py-3 px-6 text-center">
                      <div className="flex justify-center gap-2">
                        {entry.status === 'active' && (
                          <>
                            {entry.hasThirdParty && entry.thirdPartyCost && !entry.isCostPaid && (
                              <button
                                onClick={() => handleSettleThirdParty(entry)}
                                className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100"
                              >
                                دفع للمورد
                              </button>
                            )}
                            <button
                              onClick={() => handleCancelService(entry)}
                              className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-red-600 hover:text-white transition-all border border-red-100"
                            >
                              إلغاء الخدمة
                            </button>
                          </>
                        )}
                        {entry.status === 'cancelled' && (
                          <span className="text-[10px] text-gray-400 font-black px-3 py-1.5 bg-gray-100 rounded-xl">ملغاة</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;