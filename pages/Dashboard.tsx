import React, { useState, useMemo } from 'react';
import { ServiceEntry, Expense, Branch } from '../types';
import TransferForm from '../components/TransferForm';
import SearchInput from '../components/SearchInput';
import { DollarSign, Users, Clock, Printer, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { generateReceipt } from '../services/pdfService';
import { normalizeArabic, normalizeDate, searchMultipleFields, useDebounce, toEnglishDigits } from '../utils';
import { useModal } from '../context/ModalContext';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { GoogleSheetsService } from '../services/googleSheetsService';

interface DashboardProps {
  allEntries: ServiceEntry[];
  allExpenses: Expense[];
  currentDate: string;
  branchId: string;
  onUpdateEntry: (updatedEntry: ServiceEntry) => void;
  isSyncing: boolean;
  onRefresh: () => void;
  isSubmitting?: boolean;
  username: string;
  onAddExpense: (expense: Expense) => Promise<boolean>;
  branches: Branch[];
  onBranchTransfer: (data: { fromBranch: string, toBranch: string, amount: number }) => Promise<{ success: boolean; message?: string }>;
  userRole: string;
}

const StatCard = React.memo(({ title, value, icon, color, footer }: any) => {
  const colorClasses: any = {
    blue: 'border-blue-600 text-blue-600 bg-blue-50',
    red: 'border-red-500 text-red-600 bg-red-50',
    amber: 'border-amber-500 text-amber-600 bg-amber-50',
    emerald: 'border-emerald-500 text-emerald-600 bg-emerald-50'
  };
  return (
    <div className={`bg-white p-4 rounded-3xl shadow-sm border-r-8 ${colorClasses[color]?.split(' ')[0] || ''} transition-all hover:translate-y-[-4px] hover:shadow-lg`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] text-gray-900 font-black uppercase tracking-widest mb-1">{title}</p>
          <p className="text-2xl font-black text-gray-900">{value?.toLocaleString()}</p>
        </div>
        <div className={`p-2.5 rounded-2xl shadow-inner ${colorClasses[color]?.split(' ').slice(1).join(' ') || ''}`}>{icon}</div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-50 text-[10px] text-gray-500 font-bold leading-relaxed">{footer}</div>
    </div>
  );
});

const Dashboard: React.FC<DashboardProps> = React.memo(({ allEntries, allExpenses, currentDate, branchId, onUpdateEntry, isSyncing, onRefresh, isSubmitting = false, username, onAddExpense, branches, onBranchTransfer, userRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  /* Update destructuring */
  const { showModal, hideModal, showQuickStatus, setIsProcessing } = useModal();

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

  const currentBranch = useMemo(() => {
    const normId = normalizeArabic(branchId);
    return branches.find(b => normalizeArabic(b.id) === normId);
  }, [branches, branchId]);

  const currentBranchBalance = currentBranch?.Current_Balance ?? currentBranch?.currentBalance ?? 0;

  const showCustomerDetails = (entry: ServiceEntry) => {
    showModal({
      title: 'تفاصيل المعاملة',
      content: (
        <div className="space-y-3 text-right">
          {/* ... existing content ... */}
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
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">رقم الهاتف</span>
              <p className="font-black text-gray-800 text-xs">{entry.phoneNumber || '-'}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">نوع الخدمة</span>
              <p className="font-black text-gray-800 text-xs">{entry.serviceType}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">التكلفة الإجمالية</span>
              <p className="font-black text-blue-600 text-xs">{entry.serviceCost} ج.م</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">المدفوع</span>
              <p className="font-black text-green-600 text-xs">{entry.amountPaid} ج.م</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">المتبقي</span>
              <p className="font-black text-red-600 text-xs">{entry.remainingAmount} ج.م</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 font-mono">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">الباركود</span>
              <p className="font-black text-gray-800 text-xs">{entry.barcode || '-'}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">طريقة الدفع/التحصيل</span>
              <p className="font-bold text-gray-800 text-[10px]">
                {entry.isElectronic ? `إلكتروني(${entry.electronicMethod} - ${entry.electronicAmount})` : 'نقدي'}
              </p>
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
                  <span className="text-[10px] text-blue-400 font-black block mb-0.5">الطرف الثالث</span>
                  <p className="font-black text-blue-800 text-xs">{entry.thirdPartyName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-blue-400 font-black block mb-0.5">تكلفة المورد</span>
                  <p className="font-black text-blue-800 text-xs">{entry.thirdPartyCost} ج.م</p>
                </div>
                <div className="col-span-2 pt-1 border-t border-blue-100 flex justify-between items-center">
                  <span className="text-[10px] font-black text-blue-500">حالة تسوية المصاريف:</span>
                  <span className={`text - [10px] font - black px - 2 py - 0.5 rounded - full ${entry.isCostPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} `}>
                    {entry.isCostPaid ? `تم الدفع(${entry.costPaidDate}) بواسطة ${entry.costSettledBy || 'غير مسجل'} ` : 'لم يتم الدفع بعد'}
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

  const handleCancelService = (entry: ServiceEntry) => {
    let expenseAmount = 0;

    showModal({
      title: 'إلغاء المعاملة والخدمة',
      type: 'danger',
      content: (
        <div className="space-y-6 text-right">
          <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
            <p className="text-xs font-black text-red-700 mb-1">تنبيه:</p>
            <p className="text-[11px] text-red-600 font-bold leading-relaxed">أنت الآن تقوم بإلغاء جاري للخدمة: <span className="underline">{entry.serviceType}</span> للعميل <span className="underline">{entry.clientName}</span>.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mr-1">مبلغ المصروفات المحتجز (في حالة الإلغاء الجزئي)</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0 = استرداد كامل"
              onChange={(e) => expenseAmount = Number(toEnglishDigits(e.target.value))}
              className="w-full p-4 bg-gray-100 rounded-2xl border-2 border-transparent focus:border-red-600 font-bold text-sm outline-none transition-all"
            />
            <p className="text-[9px] text-gray-400 font-bold leading-relaxed mr-1 italic">* أترك الخانة (0) لاسترداد المبلغ بالكامل للعميل. في حالة كتابة مبلغ، سيتم خصمه كمصاريف وإرجاع الباقي.</p>
          </div>
        </div>
      ),
      confirmText: 'تأكيد الإلغاء',
      onConfirm: async () => {
        const isFullRefund = expenseAmount === 0;
        const updatedEntry: ServiceEntry = {
          ...entry,
          status: 'cancelled',
          amountPaid: isFullRefund ? 0 : expenseAmount,
          remainingAmount: 0,
          notes: `[ملغاة] ${isFullRefund ? 'استرداد كامل' : 'خصم مصروفات ' + expenseAmount} | ${entry.notes || ''} `
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

  const handleSettleThirdParty = (entry: ServiceEntry) => {
    showModal({
      title: 'تسوية تكلفة الطرف الثالث',
      type: 'info',
      content: (
        <div className="space-y-3 text-right">
          <p className="text-gray-600 font-bold">هل أنت متأكد من دفع مبلغ <span className="text-blue-600 font-black">{entry.thirdPartyCost} ج.م</span> للمورد <span className="text-blue-600 font-black">{entry.thirdPartyName}</span>؟</p>
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
            <p className="text-[10px] text-blue-700 leading-relaxed font-bold">سيتم خصم هذا المبلغ من رصيد الخزنة الفعلي فور التأكيد، وسيتم تسجيل العملية باسمك.</p>
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
          // جلب بيانات الطرف الثالث لتسجيل المصروف
          const thirdPartyExpense: Expense = {
            id: `tp - ${Date.now()} -${entry.id} `,
            category: 'طرف ثالث',
            amount: entry.thirdPartyCost || 0,
            notes: `تسوية للمورد: ${entry.thirdPartyName} | العميل: ${entry.clientName} | ${entry.serviceType} `,
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

  const handleDeliver = async (entry: ServiceEntry) => {
    const remaining = entry.remainingAmount;
    let amountToCollect = remaining;

    const performDelivery = async (collectedAmount: number) => {
      setIsProcessing(true);
      try {
        const success = await GoogleSheetsService.deliverOrder(
          entry.id,
          collectedAmount,
          entry.clientName,
          username,
          branchId
        );

        if (success) {
          showQuickStatus('تم تسليم المعاملة وتحديث البيانات بنجاح');
          onRefresh();
        } else {
          showQuickStatus('فشل تحديث البيانات على السيرفر', 'error');
        }
      } finally {
        setIsProcessing(false);
      }
    };

    if (remaining === 0) {
      showModal({
        title: 'تأكيد التسليم',
        content: (
          <div className="text-right p-2">
            <p className="font-bold text-gray-700">هل أنت متأكد من إتمام عملية التسليم؟</p>
            <p className="text-[10px] text-gray-400 mt-2 italic">لا توجد مديونية متبقية على هذه المعاملة.</p>
          </div>
        ),
        confirmText: 'تأكيد التسليم',
        onConfirm: () => performDelivery(0)
      });
    } else {
      showModal({
        title: 'تحصيل المتبقي وتسليم المعاملة',
        content: (
          <div className="space-y-4 text-right">
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
              <p className="text-[10px] text-amber-700 font-black uppercase tracking-widest mb-1">المبلغ المتبقي</p>
              <p className="text-2xl font-black text-amber-600">{remaining} ج.م</p>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mr-1">المبلغ المستلم الآن</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                defaultValue={remaining}
                onChange={(e) => amountToCollect = Number(toEnglishDigits(e.target.value))}
                className="w-full p-4 bg-gray-100 rounded-2xl border-2 border-transparent focus:border-green-600 font-black text-lg outline-none transition-all"
              />
              <p className="text-[9px] text-gray-400 font-bold leading-relaxed mr-1 italic">* سيتم تسجيل هذا المبلغ كعملية "سداد مديونية" جديدة.</p>
            </div>
          </div>
        ),
        confirmText: 'تأكيد التحصيل والتسليم',
        onConfirm: () => performDelivery(amountToCollect)
      });
    }
  };

  const handleTransfer = () => {
    showModal({
      title: 'تحويل مالي بين الفروع',
      content: (
        <TransferForm
          branches={branches}
          currentBalance={currentBranchBalance}
          fromBranchId={branchId}
          onTransfer={onBranchTransfer}
          onClose={hideModal}
          onSuccess={onRefresh}
          showQuickStatus={showQuickStatus}
        />
      ),
      hideFooter: true
    });
  };

  const filteredEntries = useMemo(() => {
    return dailyEntries.filter(entry =>
      searchMultipleFields(debouncedSearchTerm, [
        entry.clientName,
        entry.nationalId,
        entry.phoneNumber
      ])
    );
  }, [dailyEntries, debouncedSearchTerm]);

  return (
    <div className="p-3 md:p-5 space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="كاش الخزنة" value={currentBranchBalance} icon={<DollarSign className="w-6 h-6" />} color="blue" footer="صافي المبلغ المتوفر بالدرج حالياً" />
        <StatCard title="مصروفات اليوم" value={stats.expenses} icon={<AlertTriangle className="w-6 h-6" />} color="red" footer="إجمالي ما تم صرفه اليوم" />
        <StatCard title="إجمالي مبالغ آجلة" value={stats.remaining} icon={<Users className="w-6 h-6" />} color="amber" footer="مديونيات اليوم الجديدة" />
        <StatCard title="طرف ثالث (معلق)" value={stats.pendingThirdParty} icon={<Clock className="w-6 h-6" />} color="blue" footer="تكاليف معلقة للموردين" />
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
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="ابحث بالاسم، رقم قومي، أو هاتف..."
              className="w-full lg:w-[320px]"
            />
            <button
              onClick={onRefresh}
              disabled={isSyncing || isSubmitting}
              className={`flex items - center gap - 2 py - 3 px - 5 rounded - 2xl font - black transition - all shadow - sm active: scale - 95 whitespace - nowrap ${(isSyncing || isSubmitting) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-800 text-white hover:bg-blue-900'} `}
            >
              <Clock className={`w - 4 h - 4 ${isSyncing ? 'animate-spin' : ''} `} />
              <div className="flex flex-col items-start leading-tight text-right">
                <span className="text-[10px]">{isSyncing ? 'جاري السحب...' : 'تحديث البيانات'}</span>
                <span className="text-[9px] opacity-70">السجلات: {allEntries.length}</span>
              </div>
            </button>
            {userRole === 'مدير' && (
              <button
                onClick={handleTransfer}
                disabled={isSyncing || isSubmitting}
                className="flex items-center gap-2 py-3 px-5 rounded-2xl font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
              >
                <DollarSign className="w-4 h-4" />
                <span>تحويل مالي</span>
              </button>
            )}
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
                        {entry.status === 'active' && entry.serviceType !== 'سداد مديونية' && (
                          <>
                            <button
                              onClick={() => handleDeliver(entry)}
                              disabled={isSubmitting}
                              className={`bg-green-50 text-green-600 px-2 py-1 rounded-lg text-[10px] font-black transition-all border border-green-100 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-100'}`}
                            >
                              تسليم
                            </button>
                            <button
                              onClick={() => handleCancelService(entry)}
                              disabled={isSubmitting}
                              className={`bg-red-50 text-red-600 px-2 py-1 rounded-lg text-[10px] font-black transition-all border border-red-100 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-100'}`}
                            >
                              إلغاء
                            </button>
                          </>
                        )}
                        {entry.status === 'active' && entry.hasThirdParty && !entry.isCostPaid && (
                          <button
                            onClick={() => handleSettleThirdParty(entry)}
                            disabled={isSubmitting}
                            className={`bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[10px] font-black transition-all border border-blue-100 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-100'}`}
                          >
                            تسوية
                          </button>
                        )}
                        {entry.status === 'cancelled' && (
                          <span className="text-[10px] text-gray-400 font-black px-2 py-1 bg-gray-100 rounded-lg">ملغاة</span>
                        )}
                        {entry.status === 'تم التسليم' && (
                          <span className="text-[10px] text-green-600 font-black px-2 py-1 bg-green-50 rounded-lg">تم التسليم</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div >
    </div >
  );
});

export default Dashboard;