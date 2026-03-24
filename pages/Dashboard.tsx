import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ServiceEntry, Expense, Branch } from '../types';
import TransferForm from '../components/TransferForm';
import SearchInput from '../components/SearchInput';
import { DollarSign, Users, Clock, Printer, XCircle, AlertTriangle, RefreshCw, ArrowUpCircle, MoreVertical, Paperclip } from 'lucide-react';
import ServiceEntryDetails from '../components/ServiceEntryDetails';
import ActionDropdown from '../components/ActionDropdown';
import ImageViewerModal from '../components/ImageViewerModal';
import AttachmentModal from '../components/AttachmentModal';
import { generateReceipt } from '../services/pdfService';
import { normalizeArabic, normalizeDate, toEnglishDigits, searchMultipleFields, useDebounce, getTodayDate } from '../utils';
import { CollectionModalContent } from '../components/CollectionModal';
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
  onDeliverOrder: (orderId: string, collectedAmount: number, clientName: string, collectorName: string, branchId: string, isElectronic?: boolean, electronicMethod?: string, notes?: string) => Promise<boolean>;
  onBranchTransfer: (data: { fromBranch: string, toBranch: string, amount: number }) => Promise<{ success: boolean; message?: string }>;
  userRole: string;
}

const EditEntryFormModal = ({ entry, onSave, onCancel, showQuickStatus, setIsProcessing }: any) => {
  const [clientName, setClientName] = useState(entry.clientName || '');
  const [nationalId, setNationalId] = useState(entry.nationalId || '');
  const [phoneNumber, setPhoneNumber] = useState(entry.phoneNumber || '');
  const [isAttachmentModalOpen, setAttachmentModalOpen] = useState(false);
  const [newImages, setNewImages] = useState<{ file: File; preview: string }[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<string[]>(entry.attachments ? entry.attachments.split(',').filter(Boolean) : []);
  const [deleteConfirmUrl, setDeleteConfirmUrl] = useState<string | null>(null);

  const handleDeleteExisting = (url: string) => {
    setDeleteConfirmUrl(url);
  };

  const confirmDelete = () => {
    if (deleteConfirmUrl) {
      setExistingAttachments(prev => prev.filter(u => u !== deleteConfirmUrl));
      setDeleteConfirmUrl(null);
    }
  };

  const handleSave = async () => {
    if (!clientName) {
      showQuickStatus('يرجى إدخال اسم العميل', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      let uploadedUrls: string[] = [];
      if (newImages.length > 0) {
        const filesToUpload = await Promise.all(newImages.map(async (img) => {
          return new Promise<{ name: string, type: string, base64: string }>((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(img.file);
            reader.onload = () => {
              const base64String = (reader.result as string).split(',')[1];
              resolve({
                name: `${entry.id}_${img.file.name}`,
                type: img.file.type,
                base64: base64String
              });
            };
          });
        }));
        const uploadResult = await GoogleSheetsService.uploadFiles(filesToUpload);
        if (uploadResult.success && uploadResult.urls) {
          uploadedUrls = uploadResult.urls;
        } else {
          showQuickStatus('فشل رفع بعض المرفقات', 'error');
          setIsProcessing(false);
          return;
        }
      }

      const allAttachments = [...existingAttachments, ...uploadedUrls].join(',');

      await onSave({
        ...entry,
        clientName,
        nationalId,
        phoneNumber,
        attachments: allAttachments
      });
    } catch (e) {
      setIsProcessing(false);
      showQuickStatus('حدث خطأ أثناء الحفظ', 'error');
    }
  };

  return (
    <div className="space-y-4 text-right max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
      <div className="space-y-2">
        <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mr-1">الاسم</label>
        <input
          type="text"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          className="w-full p-4 bg-gray-100 rounded-2xl border-2 border-transparent focus:border-blue-500 font-bold outline-none transition-all"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mr-1">الرقم القومي</label>
          <input
            type="text"
            value={nationalId}
            onChange={(e) => setNationalId(toEnglishDigits(e.target.value))}
            className="w-full p-4 bg-gray-100 rounded-2xl border-2 border-transparent focus:border-blue-500 font-bold outline-none transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mr-1">رقم الهاتف</label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(toEnglishDigits(e.target.value))}
            className="w-full p-4 bg-gray-100 rounded-2xl border-2 border-transparent focus:border-blue-500 font-bold outline-none transition-all"
          />
        </div>
      </div>

      <div className="space-y-2 mt-4">
        <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mr-1">المرفقات الحالية والجديدة</label>
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
          {/* Existing Attachments */}
          {existingAttachments.map((url, idx) => (
            <div key={`existing-${idx}`} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <img src={url} className="w-full h-full object-cover" alt="existing" />
              <button
                type="button"
                onClick={() => handleDeleteExisting(url)}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XCircle size={12} />
              </button>
            </div>
          ))}

          {/* New Images Previews */}
          {newImages.map((img, idx) => (
            <div key={`new-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-blue-200 bg-blue-50">
              <img src={img.preview} className="w-full h-full object-cover" alt="new" />
              <div className="absolute top-0 right-0 bg-blue-500 text-white px-1 text-[8px] font-bold rounded-bl">جديد</div>
            </div>
          ))}

          {/* Add Button */}
          {(existingAttachments.length + newImages.length) < 8 && (
            <button
              type="button"
              onClick={() => setAttachmentModalOpen(true)}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-[#008f8f] hover:text-[#008f8f] transition-colors"
            >
              <span className="text-xl font-bold">+</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-2 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[#01404E]/60 hover:bg-gray-100 hover:text-[#01404E] font-black transition-all"
        >
          تراجع
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex-[1.5] px-6 py-2 bg-gradient-to-r from-[#01404E] to-[#01404E] hover:from-[#00A6A6] hover:to-[#036564] text-white rounded-2xl font-black shadow-lux transition-all"
        >
          حفظ التعديلات
        </button>
      </div>

      <AttachmentModal
        isOpen={isAttachmentModalOpen}
        onClose={() => setAttachmentModalOpen(false)}
        onSave={(images) => {
          setNewImages(images);
          setAttachmentModalOpen(false);
        }}
        initialImages={newImages}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmUrl && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h4 className="text-lg font-black text-gray-900">حذف المرفق؟</h4>
              <p className="text-xs text-gray-500 font-bold mt-1">هل أنت متأكد من حذف هذا المرفق؟ لا يمكن التراجع عن هذا الإجراء.</p>
            </div>
            <div className="w-full aspect-square max-h-32 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                <img src={deleteConfirmUrl} className="w-full h-full object-cover" alt="to delete" />
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setDeleteConfirmUrl(null)}
                className="flex-1 py-3 bg-gray-50 text-gray-600 rounded-xl font-black text-xs hover:bg-gray-100 transition-colors"
              >
                تراجع
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black text-xs hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-sm opacity-60 group-hover:scale-150 transition-transform duration-700"></div>

      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p className="text-[10px] md:text-xs text-white/70 font-black uppercase tracking-[0.2em] mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl md:text-[24px] font-black">{value?.toLocaleString('en-US')}</p>
            <span className="text-[8px] md:text-[10px] font-bold opacity-60">ج.م</span>
          </div>
        </div>
        <div className="p-2 bg-white/10 backdrop-blur-sm rounded-2xl shadow-premium border border-white/10 group-hover:rotate-12 transition-transform">
          {React.cloneElement(icon, { className: "w-5 h-5 text-white" })}
        </div>
      </div>
      <div className="relative z-10 mt-2.5 pt-1.5 border-t border-white/5 text-[8px] text-white/50 font-bold leading-relaxed flex items-center gap-2">
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
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
  const [isRefreshCooldown, setIsRefreshCooldown] = useState(false);
  const [visibleEntriesCount, setVisibleEntriesCount] = useState(50);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);

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
      return matchesBranch && matchesDate;
    });
  }, [allEntries, branchId, normalizedBranch, normalizedDateToday, userRole]);

  const dailyExpenses = useMemo(() => {
    const isHighLevelUser = [ROLES.MANAGER, ROLES.ADMIN, ROLES.ASSISTANT].some(r => normalizeArabic(userRole) === normalizeArabic(r));
    if (!isHighLevelUser && (!branchId || branchId === BRANCHES.ALL)) return [];

    return allExpenses.filter(e => {
      const matchesBranch = branchId === BRANCHES.ALL || !branchId || normalizeArabic(e.branchId) === normalizedBranch;
      const matchesDate = normalizeDate(e.date) === normalizedDateToday;
      return matchesBranch && matchesDate;
    });
  }, [allExpenses, branchId, normalizedBranch, normalizedDateToday, userRole]);

  const stats = useDashboardStats(dailyEntries, dailyExpenses, currentDate);

  const currentBranch = useMemo(() => {
    if (branchId === BRANCHES.ALL) return null;
    return branches.find(b => normalizeArabic(b.id) === normalizedBranch);
  }, [branches, normalizedBranch, branchId]);

  const currentBranchBalance = useMemo(() => {
    const isHighLevelUser = [ROLES.MANAGER, ROLES.ADMIN, ROLES.ASSISTANT].some(r => normalizeArabic(userRole) === normalizeArabic(r));
    if (!isHighLevelUser && (!branchId || branchId === BRANCHES.ALL)) return 0;

    return (branchId === BRANCHES.ALL || !branchId)
      ? branches.reduce((acc, b) => acc + (b.Current_Balance || b.currentBalance || 0), 0)
      : (currentBranch?.Current_Balance ?? currentBranch?.currentBalance ?? 0);
  }, [branchId, userRole, branches, currentBranch]);

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

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsRefreshCooldown(false);
    }, 300);
  }, [lastRefreshTime, onRefresh]);

  const showCustomerDetails = useCallback((entry: ServiceEntry) => {
    showModal({
      title: 'تفاصيل المعاملة',
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
  }, [showModal, setIsProcessing]);

  const handlePrint = useCallback(async (entry: ServiceEntry) => {
    setIsProcessing(true);
    try {
      await generateReceipt(entry);
    } finally {
      setIsProcessing(false);
    }
  }, [setIsProcessing]);

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
            <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mr-1">رقم أمر الشغل</label>
            <input
              type="text"
              defaultValue={workOrderValue}
              onChange={(e) => {
                e.target.value = toEnglishDigits(e.target.value);
                workOrderValue = e.target.value.trim();
              }}
              placeholder="أدخل رقم أمر الشغل"
              className="w-full p-4 bg-gray-100 rounded-2xl border-2 border-transparent focus:border-blue-500 font-black text-lg outline-none transition-all"
              dir="ltr"
            />
            <p className="text-[8px] text-gray-400 font-bold leading-relaxed mr-1 italic">* عند إدخال الرقم سيتم تحويل حالة المعاملة تلقائياً إلى "قيد التنفيذ"</p>
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
            workOrderEnteredBy: username,
            status: STATUS.IN_PROGRESS as ServiceEntry['status'],
            statusUpdateDate: getTodayDate()
          };
          const success = await onUpdateEntry(updatedEntry);
          if (success) {
            showQuickStatus('تم حفظ رقم أمر الشغل وتحديث الحالة بنجاح');
            // onRefresh(); removed to prevent excessive API calls
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
  const handleUpdateServiceStatus = useCallback((entry: ServiceEntry, newStatus: ServiceEntry['status'], label: string, isFinal: boolean = false) => {
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
            statusUpdateDate: getTodayDate(),
            deliveredBy: (newStatus === STATUS.DELIVERED && isFinal) ? username : entry.deliveredBy
          };
          const success = await onUpdateEntry(updatedEntry);
          if (success) {
            showQuickStatus('تم تحديث الحالة بنجاح');
            // onRefresh(); removed to prevent excessive API calls
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
            <p className="text-[10px] text-red-600 font-bold leading-relaxed">أنت الآن تقوم بإلغاء جاري للخدمة: <span className="underline">{entry.serviceType}</span> للعميل <span className="underline">{entry.clientName}</span>.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mr-1">مبلغ المصروفات المحتجز (في حالة الإلغاء الجزئي)</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0 = استرداد كامل"
              onChange={(e) => {
                e.target.value = toEnglishDigits(e.target.value);
                expenseAmount = Number(e.target.value);
              }}
              className="w-full p-4 bg-gray-100 rounded-2xl border-2 border-transparent focus:border-red-600 font-bold text-sm outline-none transition-all"
            />
            <p className="text-[8px] text-gray-400 font-bold leading-relaxed mr-1 italic">* أترك الخانة (0) لاسترداد المبلغ بالكامل للعميل. في حالة كتابة مبلغ، سيتم خصمه كمصاريف وإرجاع الباقي.</p>
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
          // onRefresh(); removed to prevent excessive API calls
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
          costPaidDate: getTodayDate(),
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
          // onRefresh(); removed to prevent excessive API calls
        } else {
          showQuickStatus('فشل السيرفر في التحديث', 'error');
        }
      }
    });
  }, [currentBranchBalance, onUpdateEntry, showModal, showQuickStatus, onAddExpense, onRefresh, currentDate, username]);

  const handleEditData = useCallback((entry: ServiceEntry) => {
    showModal({
      title: 'تعديل بيانات العميل',
      hideFooter: true,
      content: <EditEntryFormModal
        entry={entry}
        showQuickStatus={showQuickStatus}
        setIsProcessing={setIsProcessing}
        onCancel={() => hideModal()}
        onSave={async (updatedEntry: ServiceEntry) => {
          const success = await onUpdateEntry(updatedEntry);
          if (success) {
            showQuickStatus('تم تحديث البيانات بنجاح');
            hideModal();
          } else {
            showQuickStatus('فشل السيرفر في التحديث', 'error');
          }
          setIsProcessing(false);
        }}
      />
    });
  }, [showModal, showQuickStatus, setIsProcessing, onUpdateEntry, hideModal]);

  const handleCollectDebt = useCallback(async (entry: ServiceEntry) => {
    let collectionData = {
      amount: entry.remainingAmount,
      isElectronic: false,
      electronicMethod: 'انستا باي',
      notes: ''
    };

    showModal({
      title: 'تحصيل المتبقي وسداد المديونية',
      compact: true,
      content: (
        <CollectionModalContent
          initialAmount={entry.remainingAmount}
          onDataChange={(data) => {
            collectionData = data;
          }}
        />
      ),
      confirmText: 'تأكيد التحصيل',
      onConfirm: async () => {
        const { amount, isElectronic, electronicMethod, notes } = collectionData;

        if (amount <= 0 || amount > entry.remainingAmount) {
          showQuickStatus('مبلغ غير صالح', 'error');
          return;
        }
        setIsProcessing(true);
        try {
          const success = await onDeliverOrder(
            entry.id,
            amount,
            entry.clientName,
            username,
            branchId,
            isElectronic,
            electronicMethod,
            notes
          );
          if (success) {
            showQuickStatus('تم التحصيل بنجاح');
          } else {
            showQuickStatus('فشل في عملية التحصيل', 'error');
          }
        } finally {
          setIsProcessing(false);
        }
      }
    });
  }, [onDeliverOrder, showModal, showQuickStatus, branchId, username, setIsProcessing]);

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
    // حالة البحث: البحث في كل السجلات بدون قيود الفرع أو التاريخ
    if (debouncedSearchTerm) {
      return allEntries.filter(e => {
        return searchMultipleFields(debouncedSearchTerm, [
          e.clientName,
          e.nationalId,
          e.phoneNumber,
          e.workOrderNumber || ''
        ]);
      });
    }

    // الحالة الافتراضية: عرض عمليات اليوم فقط
    return dailyEntries;
  }, [dailyEntries, allEntries, debouncedSearchTerm]);

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
              <h3 className="text-xl font-black text-[#01404E] tracking-tight whitespace-nowrap">{debouncedSearchTerm ? 'نتائج البحث المتقدم' : 'سجل العمليات اليومي'}</h3>
              <p className="text-[10px] text-[#036564] font-black uppercase tracking-[0.3em] mt-1">{debouncedSearchTerm ? `بناءً على: ${debouncedSearchTerm}` : currentDate}</p>
            </div>
          </div>
          <div className="flex flex-col xl:flex-row items-center gap-3 w-full lg:w-auto">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="ابحث بالاسم، رقم قومي، هاتف، أو أمر شغل..."
              className="w-full xl:w-[350px]"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRefreshClick();
                }}
                disabled={isSyncing || isSubmitting || isRefreshCooldown}
                className={`flex-1 flex items-center justify-center gap-2 h-[50px] md:h-[58px] px-3 md:px-6 rounded-2xl font-black transition-all shadow-md active:scale-95 ${(isSyncing || isSubmitting || isRefreshCooldown) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#01404E] text-white hover:bg-[#01404E]'}`}
              >
                <Clock className={`w-4 h-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="text-[10px] md:text-xs whitespace-nowrap">{isSyncing ? 'جاري...' : 'تحديث البيانات'}</span>
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
                  className="flex-1 flex items-center justify-center gap-2 h-[50px] md:h-[58px] px-3 md:px-6 rounded-2xl font-black bg-[#036564] text-white hover:bg-[#01404E] transition-all shadow-md active:scale-95 group"
                >
                  <DollarSign className="w-4 h-4 shrink-0 group-hover:scale-125 transition-transform" />
                  <span className="text-[10px] md:text-xs whitespace-nowrap">تحويل مالي</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Body Container - Reverting to white background as per user preference */}
        <div className="bg-white/80 backdrop-blur-sm rounded-[2.5rem] shadow-premium overflow-hidden border border-white/20 animate-premium-in">
          <div className="overflow-x-auto relative min-h-[400px] max-h-[600px] overflow-y-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-20">
                <tr className="bg-[#01404E] text-white/60 text-[8px] md:text-[10px] font-black tracking-[0.2em] uppercase border-b border-white/5">
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
                          className="cursor-pointer text-[#01404E] group-hover:text-[#00A6A6] transition-colors font-black text-sm md:text-base flex items-center gap-2"
                        >
                          {entry.clientName}
                          {entry.attachments && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const urls = entry.attachments!.split(',').filter(Boolean);
                                if (urls.length > 0) {
                                  setViewerImages(urls);
                                  setIsViewerOpen(true);
                                }
                              }}
                              className="p-1.5 bg-[#00A6A6]/10 text-[#00A6A6] hover:bg-[#00A6A6] hover:text-white rounded-lg transition-all"
                              title="عرض المرفقات"
                            >
                              <Paperclip className="w-4 h-4" />
                            </button>
                          )}
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
                          {normalizeArabic(entry.serviceType) !== normalizeArabic(SERVICE_TYPES.DEBT_SETTLEMENT) && (
                            <ActionDropdown
                              entry={entry}
                              userRole={userRole}
                              onDeliver={(entry, isFinal) => handleUpdateServiceStatus(entry, STATUS.DELIVERED as ServiceEntry['status'], 'تم التسليم', isFinal)}
                              onCollectDebt={handleCollectDebt}
                              onSetWorkOrder={handleSetWorkOrderNumber}
                              onUpdateStatus={handleUpdateServiceStatus}
                              onCancel={handleCancelService}
                              onSettleThirdParty={handleSettleThirdParty}
                              onShowDetails={showCustomerDetails}
                              onPrint={handlePrint}
                              onEditData={handleEditData}
                              isSubmitting={isSubmitting}
                            />
                          )}
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

      <ImageViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        images={viewerImages}
      />
    </div>
  );
});

export default Dashboard;