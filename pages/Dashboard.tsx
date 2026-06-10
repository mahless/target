import React, { useState, useMemo, useCallback } from 'react';
import { ServiceEntry, Expense, Branch } from '../types';
import TransferForm from '../components/TransferForm';
import SearchInput from '../components/SearchInput';
import { DollarSign, Users, Clock, Printer, XCircle, AlertTriangle, RefreshCw, ArrowUpCircle, MoreVertical } from 'lucide-react';
import ServiceEntryDetails from '../components/ServiceEntryDetails';
import ActionDropdown from '../components/ActionDropdown';
import { generateReceipt } from '../services/pdfService';
import { normalizeArabic, normalizeDate, searchMultipleFields, useDebounce, toEnglishDigits } from '../utils';
import { useModal } from '../context/ModalContext';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { ROLES, STATUS, STORAGE_KEYS, BRANCHES, SERVICE_TYPES, EXPENSE_CATEGORIES } from '../constants';

// Module-scope constants for stable icon references (S4: Performance optimization)
const ICONS = {
 dollar: <DollarSign />,
 alert: <AlertTriangle />,
 users: <Users />,
 clock: <Clock />
} as const;

interface DashboardProps {
 allEntries: ServiceEntry[];
 allExpenses: Expense[];
 currentDate: string;
 branchId: string;
 onUpdateEntry: (updatedEntry: ServiceEntry) => Promise<boolean>;
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
 dark: 'from-[#01404E] to-[#01404E] text-white shadow-[#01404E]/20',
 luxury: 'from-[#01404E] to-[#01404E] text-white shadow-[#01404E]/20'
 };

 return (
 <div className={`relative overflow-hidden bg-gradient-to-br ${gradientClasses[gradient] || gradientClasses.teal} p-3 rounded-[2rem] shadow-lux transition-all duration-500 hover:translate-y-[-8px] hover:shadow-2xl group animate-premium-in`}>
 {/* Decorative background circle */}
 <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

 <div className="relative z-10 flex justify-between items-start">
 <div>
 <p className="text-[10px] md:text-xs text-white/70 font-black uppercase ] mb-1">{title}</p>
 <div className="flex items-baseline gap-1">
 <p className="text-2xl md:text-[28px] font-black">{value?.toLocaleString('en-US')}</p>
 <span className="text-[9px] md:text-[10px] font-bold opacity-60">ج.م</span>
 </div>
 </div>
 <div className="p-2 bg-white/10 backdrop-blur-md rounded-2xl shadow-premium border border-white/10 group-hover:rotate-12 transition-transform">
 {React.cloneElement(icon, { className:"w-5 h-5 text-white" })}
 </div>
 </div>
 <div className="relative z-10 mt-2.5 pt-1.5 border-t border-white/5 text-[9px] text-white/50 font-bold leading-relaxed flex items-center gap-2">
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
 const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem(STORAGE_KEYS.DASHBOARD_SEARCH_TERM) || '');
 const debouncedSearchTerm = useDebounce(searchTerm, 300);

 // Refresh debounce state (S7: Performance optimization)
 const [lastRefreshTime, setLastRefreshTime] = useState(0);
 const [isRefreshCooldown, setIsRefreshCooldown] = useState(false);
 const [visibleEntriesCount, setVisibleEntriesCount] = useState(50);

 // Update storage when search changes
 React.useEffect(() => {
 if (searchTerm) {
 localStorage.setItem(STORAGE_KEYS.DASHBOARD_SEARCH_TERM, searchTerm);
 } else {
 localStorage.removeItem(STORAGE_KEYS.DASHBOARD_SEARCH_TERM);
 }
 }, [searchTerm]);
 /* Update destructuring */
 const { showModal, hideModal, showQuickStatus, setIsProcessing } = useModal();

 // Pre-normalize comparison strings (S2, S3: Performance optimization)
 const normalizedBranch = useMemo(() => normalizeArabic(branchId), [branchId]);
 const normalizedDateToday = useMemo(() => normalizeDate(currentDate), [currentDate]);
 const normalizedUsername = useMemo(() => normalizeArabic(username), [username]);

 // الفلترة الداخلية الحيوية والموحدة (using pre-normalized values)
 const dailyEntries = useMemo(() => {
   const isHighLevelUser = [ROLES.MANAGER, ROLES.ADMIN, ROLES.ASSISTANT].some(r => normalizeArabic(userRole) === normalizeArabic(r));

   // إذا لم يكن مستخدماً بصلاحيات عالية ولم يختر فرعاً، لا تظهر أي بيانات
   if (!isHighLevelUser && (!branchId || branchId === BRANCHES.ALL)) return [];

   return allEntries.filter(e => {
     const matchesBranch = branchId === BRANCHES.ALL || !branchId || normalizeArabic(e.branchId) === normalizedBranch;
     const matchesDate = normalizeDate(e.entryDate) === normalizedDateToday;
     
     let matchesUser = true;
     if (normalizeArabic(userRole) === normalizeArabic(ROLES.ASSISTANT)) {
       matchesUser = e.recordedBy ? normalizeArabic(e.recordedBy) === normalizedUsername : false;
     }
     
     return matchesBranch && matchesDate && matchesUser;
   });
 }, [allEntries, branchId, normalizedBranch, normalizedDateToday, userRole, normalizedUsername]);

 const filteredEntries = useMemo(() => {
   // حالة البحث: البحث في كل العمليات (كل الفروع وكل التواريخ)
   if (debouncedSearchTerm) {
     return allEntries.filter(e => {
       const matchesSearch = searchMultipleFields(debouncedSearchTerm, [
         e.clientName,
         e.nationalId,
         e.phoneNumber,
         e.workOrderNumber || ''
       ]);
       
       if (normalizeArabic(userRole) === normalizeArabic(ROLES.ASSISTANT)) {
         return matchesSearch && e.recordedBy && normalizeArabic(e.recordedBy) === normalizedUsername;
       }
       return matchesSearch;
     });
   }

   // الحالة الافتراضية: عرض عمليات اليوم فقط للفرع المختار
   return dailyEntries;
 }, [dailyEntries, allEntries, debouncedSearchTerm, userRole, normalizedUsername]);

 const dailyExpenses = useMemo(() => {
   const isHighLevelUser = [ROLES.MANAGER, ROLES.ADMIN, ROLES.ASSISTANT].some(r => normalizeArabic(userRole) === normalizeArabic(r));
   if (!isHighLevelUser && (!branchId || branchId === BRANCHES.ALL)) return [];

   return allExpenses.filter(e => {
     const matchesBranch = branchId === BRANCHES.ALL || !branchId || normalizeArabic(e.branchId) === normalizedBranch;
     const matchesDate = normalizeDate(e.date) === normalizedDateToday;
     
     let matchesUser = true;
     if (normalizeArabic(userRole) === normalizeArabic(ROLES.ASSISTANT)) {
       matchesUser = e.recordedBy ? normalizeArabic(e.recordedBy) === normalizedUsername : false;
     }
     
     return matchesBranch && matchesDate && matchesUser;
   });
 }, [allExpenses, branchId, normalizedBranch, normalizedDateToday, userRole, normalizedUsername]);

 const stats = useDashboardStats(dailyEntries, dailyExpenses, currentDate);

 const currentBranch = useMemo(() => {
 if (branchId === BRANCHES.ALL) return null;
 return branches.find(b => normalizeArabic(b.id) === normalizedBranch);
 }, [branches, normalizedBranch, branchId]);

 const currentBranchBalance = useMemo(() => {
   if (normalizeArabic(userRole) === normalizeArabic(ROLES.ASSISTANT)) {
     const userEntries = allEntries.filter(e => {
       const matchesUser = e.recordedBy && normalizeArabic(e.recordedBy) === normalizedUsername;
       const isNotCancelled = e.status !== 'cancelled';
       const matchesBranch = branchId === BRANCHES.ALL || !branchId || normalizeArabic(e.branchId) === normalizedBranch;
       return matchesUser && isNotCancelled && matchesBranch;
     });
     
     const userExpenses = allExpenses.filter(ex => {
       const matchesUser = ex.recordedBy && normalizeArabic(ex.recordedBy) === normalizedUsername;
       const matchesBranch = branchId === BRANCHES.ALL || !branchId || normalizeArabic(ex.branchId) === normalizedBranch;
       return matchesUser && matchesBranch;
     });

     const totalCollected = userEntries.reduce((acc, curr) => {
       const amount = curr.serviceType === 'تحويل وارد'
         ? (Number(curr.serviceCost) || 0)
         : (Number(curr.amountPaid) || 0);
       return acc + amount;
     }, 0);

     const userCancelledEntries = allEntries.filter(e => {
       const matchesUser = e.recordedBy && normalizeArabic(e.recordedBy) === normalizedUsername;
       const isCancelled = e.status === 'cancelled';
       const matchesBranch = branchId === BRANCHES.ALL || !branchId || normalizeArabic(e.branchId) === normalizedBranch;
       return matchesUser && isCancelled && matchesBranch;
     });
     const totalAdminFees = userCancelledEntries.reduce((acc, curr) => acc + (Number(curr.adminFee) || 0), 0);

     const totalSpent = userExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

     return (totalCollected + totalAdminFees) - totalSpent;
   }

   const isHighLevelUser = [ROLES.MANAGER, ROLES.ADMIN].some(r => normalizeArabic(userRole) === normalizeArabic(r));
   if (!isHighLevelUser && (!branchId || branchId === BRANCHES.ALL)) return 0;

   return (branchId === BRANCHES.ALL || !branchId)
     ? branches.reduce((acc, b) => acc + (b.Current_Balance || b.currentBalance || 0), 0)
     : (currentBranch?.Current_Balance ?? currentBranch?.currentBalance ?? 0);
 }, [branchId, userRole, branches, currentBranch, allEntries, allExpenses, normalizedUsername, normalizedBranch]);

 // Debounced refresh handler (S7: Performance optimization)
 const handleRefreshClick = useCallback(() => {
 const now = Date.now();
 if (now - lastRefreshTime < 300) {
 // Still in cooldown
 return;
 }
 setLastRefreshTime(now);
 setIsRefreshCooldown(true);
 onRefresh();

 // Reset cooldown after 300ms
 setTimeout(() => {
 setIsRefreshCooldown(false);
 }, 300);
 }, [lastRefreshTime, onRefresh]);

 const showCustomerDetails = useCallback((entry: ServiceEntry) => {
 showModal({
 title: 'تفاصيل المعاملة',
 size: 'lg',
 content: <ServiceEntryDetails entry={entry} />,
 confirmText: 'طباعة إيصال',
 confirmIcon: <Printer className="w-4 h-4" />,
 confirmClose: false,
 onConfirm: async () => {
 setIsProcessing(true);
 try {
 await generateReceipt(entry, username);
 } finally {
 setIsProcessing(false);
 }
 },
 cancelText: 'تراجع'
 });
 }, [showModal, setIsProcessing, username]);

 const handlePrint = useCallback(async (entry: ServiceEntry) => {
 setIsProcessing(true);
 try {
 await generateReceipt(entry, username);
 } finally {
 setIsProcessing(false);
 }
 }, [setIsProcessing, username]);

 // --- NEW: Work Order Number handler ---
 const handleSetWorkOrderNumber = useCallback((entry: ServiceEntry) => {
 let workOrderValue = entry.workOrderNumber || '';

 showModal({
 title: 'إدخال رقم أمر الشغل',
 content: (
 <div className="space-y-4 text-right">
 <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
 <p className="text-[10px] text-blue-700 font-black mb-1">العميل: {entry.clientName}</p>
 <p className="text-[10px] text-blue-600 font-bold">الخدمة: {entry.serviceType}</p>
 </div>
 <div className="space-y-2">
 <label className="block text-[10px] font-black text-gray-900 uppercase mr-1">رقم أمر الشغل</label>
 <input
 type="text"
 defaultValue={workOrderValue}
 onChange={(e) => workOrderValue = e.target.value.trim()}
 placeholder="أدخل رقم أمر الشغل"
 className="w-full p-4 bg-gray-100 rounded-2xl border-2 border-transparent focus:border-blue-500 font-black text-lg outline-none transition-all"
 dir="ltr"
 />
 <p className="text-[9px] text-gray-400 font-bold leading-relaxed mr-1 italic">* عند إدخال الرقم سيتم تحويل حالة المعاملة تلقائياً إلى"قيد التنفيذ"</p>
 </div>
 </div>
 ),
 confirmText: 'حفظ رقم أمر الشغل',
 onConfirm: async () => {
 if (!workOrderValue) {
 showQuickStatus('يرجى إدخال رقم أمر الشغل', 'error');
 return;
 }
 setIsProcessing(true);
 try {
 const updatedEntry: ServiceEntry = {
 ...entry,
 workOrderNumber: workOrderValue,
 status: STATUS.IN_PROGRESS as ServiceEntry['status'],
 statusUpdateDate: new Date().toISOString().split('T')[0]
 };
 const success = await onUpdateEntry(updatedEntry);
 if (success) {
 showQuickStatus('تم حفظ رقم أمر الشغل وتحديث الحالة بنجاح');
 onRefresh();
 } else {
 showQuickStatus('فشل الحفظ على السيرفر', 'error');
 }
 } finally {
 setIsProcessing(false);
 }
 },
 cancelText: 'تراجع',
 });
 }, [showModal, showQuickStatus, setIsProcessing, onUpdateEntry, onRefresh, userRole]);

 // --- NEW: Status Update handler ---
 const handleUpdateServiceStatus = useCallback((entry: ServiceEntry, newStatus: ServiceEntry['status'], label: string) => {
 showModal({
 title: `تحديث الحالة`,
 content: (
 <div className="text-right p-2">
 <p className="font-bold text-gray-700">تحديث حالة معاملة <span className="text-[#01404E]">{entry.clientName}</span> إلى:</p>
 <p className="text-lg font-black text-blue-600 mt-2">{label}</p>
 </div>
 ),
 confirmText: `تأكيد التحديث`,
 onConfirm: async () => {
 setIsProcessing(true);
 try {
 const updatedEntry: ServiceEntry = {
 ...entry,
 status: newStatus,
 statusUpdateDate: new Date().toISOString().split('T')[0]
 };
 const success = await onUpdateEntry(updatedEntry);
 if (success) {
 showQuickStatus('تم تحديث الحالة بنجاح');
 onRefresh();
 } else {
 showQuickStatus('فشل تحديث الحالة على السيرفر', 'error');
 }
 } finally {
 setIsProcessing(false);
 }
 },
 cancelText: 'تراجع',
 });
 }, [showModal, showQuickStatus, setIsProcessing, onUpdateEntry, onRefresh, userRole]);

 const handleCancelService = useCallback((entry: ServiceEntry) => {
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
 <label className="block text-[10px] font-black text-gray-900 uppercase mr-1">مبلغ المصروفات المحتجز (في حالة الإلغاء الجزئي)</label>
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
 status: STATUS.CANCELLED,
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
 }, [onUpdateEntry, showModal, showQuickStatus, onRefresh]);

 const handleSettleThirdParty = useCallback((entry: ServiceEntry) => {
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
 costPaidBy: username
 };

 const result = await onUpdateEntry(updatedEntry);
 if (result) {
 // جلب بيانات الطرف الثالث لتسجيل المصروف
 const thirdPartyExpense: Expense = {
 id: `tp-${Date.now()}-${entry.id}`,
 category: EXPENSE_CATEGORIES.THIRD_PARTY,
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
 }, [currentBranchBalance, onUpdateEntry, showModal, showQuickStatus, onAddExpense, onRefresh, currentDate, username]);

 const handleEditData = useCallback((entry: ServiceEntry) => {
 let clientName = entry.clientName;
 let nationalId = entry.nationalId;
 let phoneNumber = entry.phoneNumber;

 showModal({
 title: 'تعديل بيانات العميل',
 content: (
 <div className="space-y-4 text-right">
 <div className="space-y-2">
 <label className="block text-[10px] font-black text-gray-900 uppercase mr-1">الاسم</label>
 <input
 type="text"
 defaultValue={clientName}
 onChange={(e) => clientName = e.target.value.trim()}
 className="w-full p-4 bg-gray-100 rounded-2xl border-2 border-transparent focus:border-blue-500 font-bold outline-none transition-all"
 />
 </div>
 <div className="space-y-2">
 <label className="block text-[10px] font-black text-gray-900 uppercase mr-1">الرقم القومي</label>
 <input
 type="text"
 defaultValue={nationalId}
 onChange={(e) => nationalId = e.target.value.trim()}
 className="w-full p-4 bg-gray-100 rounded-2xl border-2 border-transparent focus:border-blue-500 font-bold outline-none transition-all"
 />
 </div>
 <div className="space-y-2">
 <label className="block text-[10px] font-black text-gray-900 uppercase mr-1">رقم الهاتف</label>
 <input
 type="text"
 defaultValue={phoneNumber}
 onChange={(e) => phoneNumber = e.target.value.trim()}
 className="w-full p-4 bg-gray-100 rounded-2xl border-2 border-transparent focus:border-blue-500 font-bold outline-none transition-all"
 />
 </div>
 </div>
 ),
 confirmText: 'حفظ التعديلات',
 onConfirm: async () => {
 if (!clientName) {
 showQuickStatus('يرجى إدخال اسم العميل', 'error');
 return;
 }
 setIsProcessing(true);
 try {
 const updatedEntry: ServiceEntry = {
 ...entry,
 clientName,
 nationalId,
 phoneNumber
 };
 const success = await onUpdateEntry(updatedEntry);
 if (success) {
 showQuickStatus('تم تحديث البيانات بنجاح');
 onRefresh();
 } else {
 showQuickStatus('فشل السيرفر في التحديث', 'error');
 }
 } finally {
 setIsProcessing(false);
 }
 },
 cancelText: 'تراجع',
 });
 }, [showModal, showQuickStatus, setIsProcessing, onUpdateEntry, onRefresh]);

 const handleDeliver = useCallback(async (entry: ServiceEntry) => {
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
 <p className="text-[10px] text-amber-700 font-black uppercase mb-1">المبلغ المتبقي</p>
 <p className="text-2xl font-black text-amber-600">{remaining} ج.م</p>
 </div>
 <div className="space-y-2">
 <label className="block text-[10px] font-black text-gray-900 uppercase mr-1">المبلغ المستلم الآن</label>
 <input
 type="text"
 inputMode="numeric"
 pattern="[0-9]*"
 defaultValue={remaining}
 onChange={(e) => amountToCollect = Number(toEnglishDigits(e.target.value))}
 className="w-full p-4 bg-gray-100 rounded-2xl border-2 border-transparent focus:border-green-600 font-black text-lg outline-none transition-all"
 />
 <p className="text-[9px] text-gray-400 font-bold leading-relaxed mr-1 italic">* سيتم تسجيل هذا المبلغ كعملية"سداد مديونية" جديدة.</p>
 </div>
 </div>
 ),
 confirmText: 'تأكيد التحصيل والتسليم',
 onConfirm: () => performDelivery(amountToCollect)
 });
 }
 }, [onDeliverOrder, showModal, showQuickStatus, branchId, username]);

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



 return (
 <div className="px-3 pb-3 pt-1 md:px-5 md:pb-5 md:pt-2 space-y-2">
 {/* Stats Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <StatCard title="كاش الخزنة" value={currentBranchBalance} icon={ICONS.dollar} gradient="accent" footer="صافي المبلغ المتوفر بالدرج حالياً" />
 <StatCard title="مصروفات اليوم" value={stats.expenses} icon={ICONS.alert} gradient="luxury" footer="إجمالي مصروفات اليوم" />
 <StatCard title="المتبقي على العملاء" value={stats.remaining} icon={ICONS.users} gradient="dark" footer="مديونيات اليوم" />
 <StatCard title="مصاريف معلقة" value={stats.pendingThirdParty} icon={ICONS.clock} gradient="teal" footer="تكاليف طرف ثالث" />
 </div>

 {/* Main Table Section (Header + Table) */}
 <div className="space-y-2">
 {/* Header Row - Sitting on background */}
 <div className="px-1 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <div className={`w-3 h-10 rounded-full shadow-lg ${debouncedSearchTerm ? 'bg-[#00A6A6] shadow-[#00A6A6]/20' : 'bg-[#036564] shadow-[#036564]/20'}`}></div>
 <div>
 <h3 className="text-xl font-black text-[#01404E] whitespace-nowrap">{debouncedSearchTerm ? 'نتائج البحث المتقدم' : 'سجل العمليات اليومي'}</h3>
 <p className="text-[10px] text-[#036564] font-black uppercase ] mt-1">{debouncedSearchTerm ? `بناءً على: ${debouncedSearchTerm}` : currentDate}</p>
 </div>
 </div>
 <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
 <SearchInput
 value={searchTerm}
 onChange={setSearchTerm}
 placeholder="ابحث بالاسم، رقم قومي، هاتف، أو أمر شغل..."
 className="w-full lg:w-[350px]"
 />
 <div className="flex items-center gap-3 w-full sm:w-auto">
 <button
 type="button"
 onClick={(e) => {
 e.preventDefault();
 e.stopPropagation();
 handleRefreshClick();
 }}
 disabled={isSyncing || isSubmitting || isRefreshCooldown}
 className={`flex-1 flex items-center justify-center gap-3 h-[58px] px-6 rounded-2xl font-black transition-all shadow-md active:scale-95 ${(isSyncing || isSubmitting || isRefreshCooldown) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#01404E] text-white hover:bg-[#01404E]'}`}
 >
 <Clock className={`w-4 h-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
 <span className="text-xs whitespace-nowrap">{isSyncing ? 'جاري السحب...' : 'تحديث البيانات'}</span>
 </button>
 {(userRole === ROLES.MANAGER || userRole === ROLES.ASSISTANT || userRole === ROLES.ADMIN) && (
 <button
 type="button"
 onClick={(e) => {
 e.preventDefault();
 e.stopPropagation();
 handleTransfer();
 }}
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

 {/* Table Body Container - Reverting to white background as per user preference */}
 <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-premium overflow-hidden border border-white/20 animate-premium-in">
 <div className="overflow-x-auto relative min-h-[400px] max-h-[600px] overflow-y-auto custom-scrollbar">
 <table className="w-full border-collapse">
 <thead className="sticky top-0 z-20">
 <tr className="bg-[#01404E] text-white/60 text-[9px] md:text-[10px] font-black ] uppercase border-b border-white/5">
 <th className="py-3 px-8 text-right first:rounded-tr-[2rem]">بيان الحركة</th>
 <th className="py-3 px-8 text-center">الموظف</th>
 <th className="py-3 px-8 text-center">المبلغ</th>
 <th className="py-3 px-8 text-center">المتبقي</th>
 {userRole !== ROLES.VIEWER && <th className="py-3 px-8 text-center last:rounded-tl-[2rem]">الإجراءات</th>}
 </tr>
 </thead>
 <tbody className="divide-y divide-[#01404E]/5 text-xs md:text-sm font-bold">
 {filteredEntries.length === 0 ? (
 <tr><td colSpan={5} className="py-16 text-center text-gray-300 font-black">لا توجد عمليات اليوم</td></tr>
 ) : (
 filteredEntries.slice(0, visibleEntriesCount).map((entry) => (
 <tr key={entry.id} className="hover:bg-[#036564]/5 transition-all group">
 <td className="py-3 px-8">
 <span
 onClick={(e) => {
 e.preventDefault();
 e.stopPropagation();
 showCustomerDetails(entry);
 }}
 className="cursor-pointer text-[#01404E] group-hover:text-[#00A6A6] transition-colors font-black text-sm md:text-base"
 >
 {entry.clientName}
 </span>
 <div className="flex items-center gap-2 mt-0.5">
 <span className="w-1.5 h-1.5 rounded-full bg-[#00A6A6]"></span>
 <span className="text-sm text-[#036564]/70 font-black">{entry.serviceType}</span>
 </div>
 </td>
 <td className="py-3 px-8 text-center font-black text-[#01404E]/60 text-xs md:text-sm">{entry.recordedBy || '-'}</td>
 <td className="py-3 px-8 text-center font-black text-[#01404E] text-sm md:text-base">
 {entry.serviceType === 'تحويل وارد'
 ? toEnglishDigits(String(entry.serviceCost))
 : toEnglishDigits(String(entry.amountPaid))
 }
 </td>
 <td className="py-3 px-8 text-center text-red-600 font-black text-sm md:text-base">{toEnglishDigits(String(entry.remainingAmount))}</td>
 {userRole !== ROLES.VIEWER && (
 <td className="py-3 px-8 text-center">
 <ActionDropdown
 entry={entry}
 userRole={userRole}
 onDeliver={handleDeliver}
 onSetWorkOrder={handleSetWorkOrderNumber}
 onUpdateStatus={handleUpdateServiceStatus}
 onCancel={handleCancelService}
 onSettleThirdParty={handleSettleThirdParty}
 onShowDetails={showCustomerDetails}
 onPrint={handlePrint}
 onEditData={handleEditData}
 isSubmitting={isSubmitting}
 />
 </td>
 )}
 </tr>
 ))
 )}
 </tbody>
 </table>
 {visibleEntriesCount < filteredEntries.length && (
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
 تحميل المزيد ({filteredEntries.length - visibleEntriesCount} متبقي)
 </button>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 );
});

export default Dashboard;