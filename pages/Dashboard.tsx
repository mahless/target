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
  onDeliverOrder: (orderId: string, collectedAmount: number, clientName: string, collectorName: string, branchId: string) => Promise<boolean>;
  onBranchTransfer: (data: { fromBranch: string, toBranch: string, amount: number }) => Promise<{ success: boolean; message?: string }>;
  userRole: string;
}

const StatCard = React.memo(({ title, value, icon, color, footer, gradient }: any) => {
  const gradientClasses: any = {
    teal: 'from-[#036564] to-[#01404E] text-white shadow-[#036564]/20',
    accent: 'from-[#00A6A6] to-[#036564] text-white shadow-[#00A6A6]/20',
    dark: 'from-[#033649] to-[#01404E] text-white shadow-[#033649]/20',
    luxury: 'from-[#01404E] to-[#033649] text-white shadow-[#01404E]/20'
  };

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradientClasses[gradient] || gradientClasses.teal} p-5 rounded-[2rem] shadow-2xl transition-all duration-500 hover:translate-y-[-8px] hover:shadow-lux group animate-premium-in`}>
      {/* Decorative background circle */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p className="text-xs text-white/70 font-black uppercase tracking-[0.2em] mb-1.5">{title}</p>
          <div className="flex items-baseline gap-1">
            <p className="text-3xl font-black">{value?.toLocaleString('en-US')}</p>
            <span className="text-[10px] font-bold opacity-60">ج.م</span>
          </div>
        </div>
        <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 group-hover:rotate-12 transition-transform">
          {React.cloneElement(icon, { className: "w-5.5 h-5.5 text-white" })}
        </div>
      </div>
      <div className="relative z-10 mt-4 pt-3 border-t border-white/5 text-[9px] text-white/50 font-bold leading-relaxed flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00A6A6] animate-pulse"></span>
        {footer}
      </div>
    </div>
  );
});

const Dashboard: React.FC<DashboardProps> = React.memo(({
  allEntries, allExpenses, currentDate, branchId, onUpdateEntry, isSyncing, onRefresh,
  isSubmitting = false, username, onAddExpense, branches, onDeliverOrder, onBranchTransfer, userRole
}) => {
  // Persistence for search term
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('dashboard_search_term') || '');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Update storage when search changes
  React.useEffect(() => {
    if (searchTerm) {
      localStorage.setItem('dashboard_search_term', searchTerm);
    } else {
      localStorage.removeItem('dashboard_search_term');
    }
  }, [searchTerm]);
  /* Update destructuring */
  const { showModal, hideModal, showQuickStatus, setIsProcessing } = useModal();

  // الفلترة الداخلية الحيوية والموحدة
  const dailyEntries = useMemo(() => {
    const normalizedBranch = normalizeArabic(branchId);
    const normalizedDateToday = normalizeDate(currentDate);
    const isManager = normalizeArabic(userRole) === normalizeArabic('مدير');
    const normalizedUsername = normalizeArabic(username);

    return allEntries.filter(e => {
      const matchesBranch = branchId === 'all' || normalizeArabic(e.branchId) === normalizedBranch;
      const matchesDate = normalizeDate(e.entryDate) === normalizedDateToday;
      const matchesUser = isManager || normalizeArabic(e.recordedBy || '') === normalizedUsername;
      return matchesBranch && matchesDate && matchesUser;
    });
  }, [allEntries, branchId, currentDate, userRole, username]);

  const dailyExpenses = useMemo(() => {
    const normalizedBranch = normalizeArabic(branchId);
    const normalizedDateToday = normalizeDate(currentDate);
    const isManager = normalizeArabic(userRole) === normalizeArabic('مدير');
    const normalizedUsername = normalizeArabic(username);

    return allExpenses.filter(e => {
      const matchesBranch = branchId === 'all' || normalizeArabic(e.branchId) === normalizedBranch;
      const matchesDate = normalizeDate(e.date) === normalizedDateToday;
      const matchesUser = isManager || normalizeArabic(e.recordedBy || '') === normalizedUsername;
      return matchesBranch && matchesDate && matchesUser;
    });
  }, [allExpenses, branchId, currentDate, userRole, username]);

  const stats = useDashboardStats(dailyEntries, dailyExpenses, currentDate);

  const currentBranch = useMemo(() => {
    if (branchId === 'all') return null;
    const normId = normalizeArabic(branchId);
    return branches.find(b => normalizeArabic(b.id) === normId);
  }, [branches, branchId]);

  const currentBranchBalance = branchId === 'all'
    ? branches.reduce((acc, b) => acc + (b.Current_Balance || b.currentBalance || 0), 0)
    : (currentBranch?.Current_Balance ?? currentBranch?.currentBalance ?? 0);

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
              <p className="font-black text-gray-800 text-xs">{toEnglishDigits(String(entry.nationalId))}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">رقم الهاتف</span>
              <p className="font-black text-gray-800 text-xs">{toEnglishDigits(String(entry.phoneNumber || '-'))}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">نوع الخدمة</span>
              <p className="font-black text-gray-800 text-xs">{entry.serviceType}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">التكلفة الإجمالية</span>
              <p className="font-black text-blue-600 text-xs">{toEnglishDigits(String(entry.serviceCost))} ج.م</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">المدفوع</span>
              <p className="font-black text-green-600 text-xs">{toEnglishDigits(String(entry.amountPaid))} ج.م</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">المتبقي</span>
              <p className={`font-black text-xs ${entry.remainingAmount > 0 ? 'text-red-600' : 'text-gray-400'}`}>{toEnglishDigits(String(entry.remainingAmount))} ج.م</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">السرعة</span>
              <p className="font-black text-gray-800 text-xs">{entry.speed || '-'}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">مصدر الباركود</span>
              <p className="font-black text-gray-800 text-xs">{entry.Barcode_Source || '-'}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">الموظف المسؤول</span>
              <p className="font-black text-gray-800 text-xs">{entry.recordedBy}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">حالة المعاملة</span>
              <p className={`font-black text-xs ${entry.status === 'active' ? 'text-blue-600' : entry.status === 'cancelled' ? 'text-red-500' : 'text-green-600'}`}>
                {entry.status}
              </p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">تاريخ العملية</span>
              <p className="font-black text-gray-800 text-xs" dir="ltr">
                {entry.entryDate}
                <span className="text-gray-400 mx-1">|</span>
                {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
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
          <p className="text-gray-600 font-bold">متأكد من دفع مبلغ <span className="text-blue-600 font-black">{entry.thirdPartyCost} ج.م</span> للمورد <span className="text-blue-600 font-black">{entry.thirdPartyName}</span>؟</p>
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
            <p className="text-[10px] text-blue-700 leading-relaxed font-bold">سيتم خصم هذا المبلغ من رصيد الخزنة، وسيتم تسجيل العملية باسمك.</p>
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
      const success = await onDeliverOrder(
        entry.id,
        collectedAmount,
        entry.clientName,
        username,
        branchId
      );

      if (success) {
        showQuickStatus('تم تسليم المعاملة وتحديث البيانات بنجاح');
      } else {
        showQuickStatus('فشل تحديث البيانات على السيرفر', 'error');
      }
    };

    if (remaining === 0) {
      showModal({
        title: 'تأكيد التسليم',
        content: (
          <div className="text-right p-2">
            <p className="font-bold text-gray-700">متأكد من إتمام عملية التسليم؟</p>
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
    // حالة البحث: البحث في كل عمليات الفرع (تاريخ مفتوح)
    if (debouncedSearchTerm) {
      const normalizedBranch = normalizeArabic(branchId);
      const isManager = normalizeArabic(userRole) === normalizeArabic('مدير');
      const normalizedUsername = normalizeArabic(username);

      return allEntries.filter(e => {
        const matchesBranch = branchId === 'all' || normalizeArabic(e.branchId) === normalizedBranch;
        const matchesSearch = searchMultipleFields(debouncedSearchTerm, [
          e.clientName,
          e.nationalId,
          e.phoneNumber
        ]);
        const matchesUser = isManager || normalizeArabic(e.recordedBy || '') === normalizedUsername;

        return matchesBranch && matchesSearch && matchesUser;
      });
    }

    // الحالة الافتراضية: عرض عمليات اليوم فقط
    return dailyEntries;
  }, [dailyEntries, allEntries, debouncedSearchTerm, branchId, userRole, username]);

  return (
    <div className="p-3 md:p-5 space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="كاش الخزنة" value={currentBranchBalance} icon={<DollarSign />} gradient="accent" footer="صافي المبلغ المتوفر بالدرج حالياً" />
        <StatCard title="مصروفات اليوم" value={stats.expenses} icon={<AlertTriangle />} gradient="luxury" footer="إجمالي مصروفات اليوم" />
        <StatCard title="المتبقي على العملاء" value={stats.remaining} icon={<Users />} gradient="dark" footer="مديونيات اليوم" />
        <StatCard title="مصاريف معلقة" value={stats.pendingThirdParty} icon={<Clock />} gradient="teal" footer="تكاليف طرف ثالث" />
      </div>

      {/* Main Table Container */}
      <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-premium overflow-hidden border border-white/20 animate-premium-in">
        <div className="p-6 md:p-8 border-b border-[#033649]/5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gradient-to-l from-white/50 to-transparent">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-10 rounded-full shadow-lg ${debouncedSearchTerm ? 'bg-[#00A6A6] shadow-[#00A6A6]/20' : 'bg-[#036564] shadow-[#036564]/20'}`}></div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-[#033649] tracking-tight whitespace-nowrap">{debouncedSearchTerm ? 'نتائج البحث المتقدم' : 'سجل العمليات اليومي'}</h3>
              <p className="text-[10px] text-[#036564] font-black uppercase tracking-[0.3em] mt-1">{debouncedSearchTerm ? `بناءً على: ${debouncedSearchTerm}` : currentDate}</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="ابحث بالاسم، رقم قومي، أو هاتف..."
              className="w-full lg:w-[350px]"
            />
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={onRefresh}
                disabled={isSyncing || isSubmitting}
                className={`flex-1 flex items-center justify-center gap-3 h-[58px] px-6 rounded-2xl font-black transition-all shadow-md active:scale-95 ${(isSyncing || isSubmitting) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#033649] text-white hover:bg-[#01404E]'}`}
              >
                <Clock className={`w-4 h-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="text-xs whitespace-nowrap">{isSyncing ? 'جاري السحب...' : 'تحديث البيانات'}</span>
              </button>
              {(userRole === 'مدير' || userRole === 'مساعد' || userRole === 'Admin') && (
                <button
                  onClick={handleTransfer}
                  disabled={isSyncing || isSubmitting}
                  className="flex-1 flex items-center justify-center gap-3 h-[58px] px-6 rounded-2xl font-black bg-[#036564] text-white hover:bg-[#01404E] transition-all shadow-md active:scale-95 group"
                >
                  <DollarSign className="w-4 h-4 shrink-0 group-hover:scale-125 transition-transform" />
                  <span className="text-xs whitespace-nowrap">تحويل مالي</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto text-right">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#033649] text-white/60 text-[10px] font-black tracking-[0.2em] uppercase border-b border-white/5">
                <th className="py-5 px-8 text-right first:rounded-tr-[2rem]">بيان الحركة</th>
                <th className="py-5 px-8 text-center">الموظف</th>
                <th className="py-5 px-8 text-center">المبلغ</th>
                <th className="py-5 px-8 text-center">المتبقي</th>
                {userRole !== 'مشاهد' && <th className="py-5 px-8 text-center last:rounded-tl-[2rem]">الإجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#033649]/5 text-sm font-bold">
              {filteredEntries.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-gray-300 font-black">لا توجد عمليات اليوم</td></tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#036564]/5 transition-all group">
                    <td className="py-5 px-8">
                      <span
                        onClick={() => showCustomerDetails(entry)}
                        className="cursor-pointer text-[#033649] group-hover:text-[#00A6A6] transition-colors font-black text-base"
                      >
                        {entry.clientName}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00A6A6]"></span>
                        <span className="text-[11px] text-[#036564]/70 font-black">{entry.serviceType}</span>
                      </div>
                    </td>
                    <td className="py-5 px-8 text-center font-black text-[#033649]/60 text-xs">{entry.recordedBy || '-'}</td>
                    <td className="py-5 px-8 text-center font-black text-[#033649] text-lg">{toEnglishDigits(String(entry.amountPaid))}</td>
                    <td className="py-5 px-8 text-center text-red-600 font-black text-lg">{toEnglishDigits(String(entry.remainingAmount))}</td>
                    {userRole !== 'مشاهد' && (
                      <td className="py-5 px-8 text-center">
                        <div className="flex justify-center gap-3">
                          {entry.status === 'active' &&
                            normalizeArabic(entry.serviceType) !== normalizeArabic('سداد مديونية') &&
                            !entry.parentEntryId && (
                              <>
                                {!entry.notes?.includes('بيع استمارة لطرف اخر') && (
                                  <button
                                    onClick={() => handleDeliver(entry)}
                                    disabled={isSubmitting}
                                    className={`bg-[#036564] text-white px-4 py-1.5 rounded-xl text-[10px] font-black transition-all shadow-md group-hover:scale-105 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#00A6A6]'}`}
                                  >
                                    تسليم
                                  </button>
                                )}
                                <button
                                  onClick={() => handleCancelService(entry)}
                                  disabled={isSubmitting}
                                  className={`bg-red-50 to-red-600 text-red-600 px-4 py-1.5 rounded-xl text-[10px] font-black transition-all border border-red-100 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600 hover:text-white'}`}
                                >
                                  إلغاء
                                </button>
                              </>
                            )}
                          {entry.status === 'active' && entry.hasThirdParty && !entry.isCostPaid && (
                            <button
                              onClick={() => handleSettleThirdParty(entry)}
                              disabled={isSubmitting}
                              className={`bg-[#033649] text-white px-4 py-1.5 rounded-xl text-[10px] font-black transition-all shadow-md ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#01404E]'}`}
                            >
                              تسوية
                            </button>
                          )}
                          {entry.status === 'cancelled' && (
                            <span className="text-[10px] text-red-400 font-bold px-3 py-1 bg-red-50 rounded-xl border border-red-100">ملغاة</span>
                          )}
                          {entry.status === 'تم التسليم' && (
                            <span className="text-[10px] text-[#00A6A6] font-bold px-3 py-1 bg-[#00A6A6]/5 rounded-xl border border-[#00A6A6]/20">تم التسليم</span>
                          )}
                        </div>
                      </td>
                    )}
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