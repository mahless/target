import { useState, useEffect, useRef, useCallback } from 'react';
import { ServiceEntry, Expense, Branch, StockItem, StockStatus, User } from '../types';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { normalizeArabic, normalizeDate, getTodayDate } from '../utils';
import { useModal } from '../context/ModalContext';
import { SERVICE_TYPES, EXPENSE_CATEGORIES, ROLES, STORAGE_KEYS } from '../constants';

/**
 * Global application state management hook.
 * Acts as the primary Controller connecting the React UI to the Google Sheets backend.
 * 
 * Responsibilities:
 * - Bootstraps local cache (`localStorage`) on initial load.
 * - Manages centralized state for entries, expenses, stock, users, and branches.
 * - Handles optimistic UI updates and background synchronization (`syncAll`).
 * - Exposes mutation wrappers (`addEntry`, `updateStatus`, `deliverOrder`) to components.
 * - Manages global `isProcessing` lock to prevent duplicate submissions.
 * 
 * @returns The global state slice and its associated mutation handlers.
 */
export const useAppState = () => {
  const { setIsProcessing } = useModal();
  const hasAutoAssigned = useRef(false);
  const lastUserId = useRef<string | null>(null);

  // Initialize state from localStorage if available
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TARGET_USER);
    return saved ? JSON.parse(saved) : null;
  });

  const [branch, setBranch] = useState<Branch | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TARGET_BRANCH);
    return saved ? JSON.parse(saved) : null;
  });

  const [currentDate] = useState<string>(() => {
    // دائماً اجعل التاريخ هو اليوم الحقيقي ولا يمكن تغييره لضمان الانضباط المالي
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const setCurrentDate = (_date: string) => {
    // تعطيل تغيير التاريخ برمجياً لضمان الانضباط المالي
  };

  const [entries, setEntries] = useState<ServiceEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TARGET_ENTRIES);
    return saved ? JSON.parse(saved) : [];
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TARGET_EXPENSES);
    return saved ? JSON.parse(saved) : [];
  });

  const [stock, setStock] = useState<StockItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TARGET_STOCK);
    return saved ? JSON.parse(saved) : [];
  });

  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TARGET_BRANCHES);
    return saved ? JSON.parse(saved) : [];
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TARGET_ADMIN_USERS);
    return saved ? JSON.parse(saved) : [];
  });

  const [serviceTypes, setServiceTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TARGET_SERVICE_TYPES);
    return saved ? JSON.parse(saved) : SERVICE_TYPES;
  });

  const [expenseCategories, setExpenseCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TARGET_EXPENSE_CATEGORIES);
    return saved ? JSON.parse(saved) : EXPENSE_CATEGORIES;
  });

  const [isSyncing, setIsSyncing] = useState(false);

  /* 
   * Global Loading State for User Actions (Mutation Guard)
   * This is different from isSyncing (background sync).
   * It blocks user interaction during submission to prevent duplicates.
   * isSubmitting is still used for local component flags if needed, 
   * but isProcessing (global) will show the overlay.
   */
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startSubmitting = useCallback(() => {
    setIsSubmitting(true);
    setIsProcessing(true);
  }, [setIsProcessing]);

  const stopSubmitting = useCallback(() => {
    setIsSubmitting(false);
    setIsProcessing(false);
  }, [setIsProcessing]);

  const isSyncingRef = useRef(false);

  /**
   * دالة المزامنة الشاملة مع دمج البيانات للحفاظ على ما لم يُرفع بعد
   */
  const syncAll = useCallback(async () => {
    if (!navigator.onLine || isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      const [remoteEntries, remoteExpenses, remoteStock, remoteBranches, remoteUsers, remoteSettings] = await Promise.all([
        GoogleSheetsService.getData<any>('Entries', user?.role, user?.name),
        GoogleSheetsService.getData<any>('Expenses', user?.role, user?.name),
        GoogleSheetsService.getData<StockItem>('Stock'),
        GoogleSheetsService.getBranches(),
        (normalizeArabic(user?.role || '') === normalizeArabic(ROLES.MANAGER) || user?.role === ROLES.ADMIN)
          ? GoogleSheetsService.getData<User>('Users')
          : Promise.resolve([]),
        GoogleSheetsService.getData<any>('Service_Expense')
      ]);

      if (remoteEntries && remoteEntries.length > 0) {
        const mappedEntries: ServiceEntry[] = remoteEntries.map((e: any) => {
          let rawDateInput = e.date || e.entryDate || e['تاريخ العملية'] || e['التاريخ'] || '';
          let dateStr = '';
          if (rawDateInput instanceof Date) {
            const y = rawDateInput.getFullYear();
            const m = String(rawDateInput.getMonth() + 1).padStart(2, '0');
            const d = String(rawDateInput.getDate()).padStart(2, '0');
            dateStr = `${y}-${m}-${d}`;
          } else {
            const s = String(rawDateInput).trim();
            if (s.includes('T')) {
              const dObj = new Date(s);
              if (!isNaN(dObj.getTime())) {
                const y = dObj.getFullYear();
                const m = String(dObj.getMonth() + 1).padStart(2, '0');
                const d = dObj.getDate();
                dateStr = `${y}-${m}-${String(d).padStart(2, '0')}`;
              } else {
                dateStr = s.split('T')[0];
              }
            } else {
              dateStr = s;
            }
          }
          const eDate = normalizeDate(dateStr);
          return {
            id: String(e.id || e['معرف'] || Date.now() + Math.random()),
            clientName: String(e.clientName || e['اسم العميل'] || e['العميل'] || '').trim(),
            nationalId: String(e.nationalId || e['الرقم القومي'] || '').trim(),
            phoneNumber: String(e.phoneNumber || e['رقم الهاتف'] || '').trim(),
            serviceType: String(e.serviceType || e['نوع الخدمة'] || '').trim(),
            entryDate: eDate,
            amountPaid: Number(e.amountPaid || e['المحصل'] || e['المبلغ المدفوع'] || 0),
            serviceCost: Number(e.serviceCost || e['التكلفة'] || e['إجمالي التكلفة'] || 0),
            remainingAmount: Number(e.remainingAmount || e['المتبقي'] || 0),
            branchId: normalizeArabic(String(e.branchId || e['الفرع'] || '')),
            status: (e.status || e['الحالة'] || e['الحاله'] || 'active') as ServiceEntry['status'],
            timestamp: Number(e.timestamp || e['التوقيت'] || Date.now()),
            recordedBy: String(e.recordedBy || e['الموظف'] || e['سجل بواسطة'] || '').trim(),
            barcode: e.barcode || e['الباركود'],
            speed: e.speed || e['السرعة'] || undefined,
            hasThirdParty: e.hasThirdParty === true || e.hasThirdParty === 'true' || !!e.thirdPartyName || false,
            thirdPartyName: e.thirdPartyName || e['اسم المورد'] || e['thirdPartyName'],
            thirdPartyCost: Number(e.thirdPartyCost || e['تكلفة المورد'] || e['thirdPartyCost'] || 0),
            isCostPaid: e.isCostPaid === true || e.isCostPaid === 'true' || false,
            costPaidDate: e.costPaidDate || e['تاريخ دفع التكلفة'],
            costPaidBy: e.costPaidBy || e.costSettledBy || e['سجل الدفع بواسطة'],
            isElectronic: e.isElectronic === true || e.isElectronic === 'true' || false,
            electronicAmount: Number(e.electronicAmount || 0),
            electronicMethod: e.electronicMethod,
            deliveredDate: e.deliveredDate || e['تاريخ التسليم'],
            parentEntryId: e.parentEntryId || e['parentEntryId'] || e['المعاملة الأصلية'],
            workOrderNumber: e.workOrderNumber || e['رقم أمر الشغل'] || '',
            workOrderEnteredBy: e.workOrderEnteredBy || e['workOrderEnteredBy'] || e['سجل أمر الشغل بواسطة'] || '',
            statusUpdateDate: e.statusUpdateDate || e['تاريخ تحديث الحالة'] || '',
            notes: e.notes || e['ملاحظات'] || '',
            attachments: e.attachments || e['attachments'] || '',
            deliveredBy: e.deliveredBy || e['deliveredBy'] || e['تم التسليم بواسطة'] || ''
          };
        });
        setEntries(prev => {
          const mergedMap = new Map();
          prev.forEach(item => mergedMap.set(item.id, item));
          mappedEntries.forEach(item => {
            if (item.id && item.id !== 'undefined') mergedMap.set(item.id, item);
          });
          const next = Array.from(mergedMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          if (next.length === prev.length) {
            const isIdentical = next.every((e, i) => e.id === prev[i].id && e.timestamp === prev[i].timestamp && e.status === prev[i].status);
            if (isIdentical) return prev;
          }
          return next;
        });
      }

      if (remoteExpenses && remoteExpenses.length > 0) {
        const mappedExpenses: Expense[] = remoteExpenses.map((ex: any) => {
          let rawExDateInput = ex.date || ex['التاريخ'] || '';
          let exDateStr = '';
          if (rawExDateInput instanceof Date) {
            const y = rawExDateInput.getFullYear();
            const m = String(rawExDateInput.getMonth() + 1).padStart(2, '0');
            const d = String(rawExDateInput.getDate()).padStart(2, '0');
            exDateStr = `${y}-${m}-${d}`;
          } else {
            const s = String(rawExDateInput).trim();
            if (s.includes('T')) {
              const dObj = new Date(s);
              if (!isNaN(dObj.getTime())) exDateStr = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
              else exDateStr = s.split('T')[0];
            } else exDateStr = s;
          }
          return {
            id: String(ex.id || ex['معرف'] || Date.now() + Math.random()),
            category: (ex.category || ex['البند'] || ex['القسم'] || '') as any,
            amount: Number(ex.amount || ex['المبلغ'] || 0),
            date: normalizeDate(exDateStr),
            branchId: normalizeArabic(String(ex.branchId || ex['الفرع'] || '')),
            timestamp: Number(ex.timestamp || ex['التوقيت'] || Date.now()),
            recordedBy: String(ex.recordedBy || ex['الموظف'] || '').trim(),
            notes: ex.notes || ex['ملاحظات'] || ''
          };
        });
        setExpenses(prev => {
          const mergedMap = new Map();
          prev.forEach(item => mergedMap.set(item.id, item));
          mappedExpenses.forEach(item => {
            if (item.id && item.id !== 'undefined') mergedMap.set(item.id, item);
          });
          const next = Array.from(mergedMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          if (next.length === prev.length) {
            const isIdentical = next.every((e, i) => e.id === prev[i].id && e.timestamp === prev[i].timestamp);
            if (isIdentical) return prev;
          }
          return next;
        });
      }

      if (remoteStock && remoteStock.length > 0) {
        const mappedStock: StockItem[] = remoteStock.map((s: any) => ({
          barcode: String(s.Barcode || s.barcode || ''),
          category: (s.Category || s.category || 'عادي') as any,
          branch: normalizeArabic(String(s.Branch || s.branch || '')),
          status: s.Status || s.status || 'Available',
          created_at: Number(s.Created_At || s.created_at || Date.now()),
          used_by: s.Used_By || s.used_by,
          usage_date: s.Usage_Date || s.usage_date,
          order_id: s.Order_ID || s.order_id
        }));
        setStock(prev => {
          if (prev.length === mappedStock.length) {
            const isSame = mappedStock.every((s, i) => s.barcode === prev[i].barcode && s.status === prev[i].status);
            if (isSame) return prev;
          }
          localStorage.setItem(STORAGE_KEYS.TARGET_STOCK, JSON.stringify(mappedStock));
          return mappedStock;
        });
      }

      if (remoteBranches && remoteBranches.length > 0) {
        const mappedBranches: Branch[] = remoteBranches.map((b: any) => {
          const bName = b.Branch_Name || b.name || b.id;
          return {
            id: normalizeArabic(bName),
            name: bName,
            Branch_Name: bName,
            Current_Balance: Number(b.Current_Balance || 0),
            currentBalance: Number(b.Current_Balance || 0),
            Authorized_IP: b.Authorized_IP,
            Service_List: b.Service_List,
            Expense_List: b.Expense_List
          };
        });
        setBranches(prev => {
          if (prev.length === mappedBranches.length) {
            const isSame = mappedBranches.every((b, i) => b.id === prev[i].id && b.Current_Balance === prev[i].Current_Balance);
            if (isSame) return prev;
          }
          localStorage.setItem(STORAGE_KEYS.TARGET_BRANCHES, JSON.stringify(mappedBranches));
          return mappedBranches;
        });
      }

      if (remoteSettings && remoteSettings.length > 0) {
        const settings = remoteSettings[0];
        if (settings.Service_List) {
          const list = settings.Service_List.split(',').map((s: string) => s.trim()).filter(Boolean);
          setServiceTypes(list);
          localStorage.setItem(STORAGE_KEYS.TARGET_SERVICE_TYPES, JSON.stringify(list));
        }
        if (settings.Expense_List) {
          const list = settings.Expense_List.split(',').map((s: string) => s.trim()).filter(Boolean);
          setExpenseCategories(list);
          localStorage.setItem(STORAGE_KEYS.TARGET_EXPENSE_CATEGORIES, JSON.stringify(list));
        }
      }

      if (remoteUsers && remoteUsers.length > 0) {
        setUsers(remoteUsers);
        localStorage.setItem(STORAGE_KEYS.TARGET_ADMIN_USERS, JSON.stringify(remoteUsers));
      }
    } catch (error) {
      console.error("Sync Error:", error);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [user?.role, user?.name]);

  // المزامنة عند فتح التطبيق أو تغيير الفرع/التاريخ
  useEffect(() => {
    if (user) syncAll();
  }, [branch?.id, currentDate, user?.id]);

  // حفظ البيانات محلياً عند تغييرها
  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEYS.TARGET_USER, JSON.stringify(user));
    else localStorage.removeItem('target_user');
  }, [user]);

  useEffect(() => {
    if (branch) localStorage.setItem(STORAGE_KEYS.TARGET_BRANCH, JSON.stringify(branch));
    else localStorage.removeItem('target_branch');
  }, [branch]);

  useEffect(() => {
    if (currentDate) localStorage.setItem(STORAGE_KEYS.TARGET_DATE, JSON.stringify(currentDate));
    else localStorage.removeItem('target_date');
  }, [currentDate]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TARGET_ENTRIES, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TARGET_EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TARGET_STOCK, JSON.stringify(stock));
  }, [stock]);


  // Auto-assign branch and date on startup OR when user changes
  useEffect(() => {
    // Reset auto-assign flag if user changes
    if (user?.id !== lastUserId.current) {
      hasAutoAssigned.current = false;
      lastUserId.current = user?.id || null;
    }

    // Auto-assignment for non-managers
    // Only auto-assign if branch is NOT selected AND we haven't auto-assigned in this session yet
    if (user && user.assignedBranchId && !branch && !hasAutoAssigned.current && branches.length > 0) {
      const assignedBranch = branches.find(b =>
        normalizeArabic(b.id) === normalizeArabic(user.assignedBranchId!)
      );
      if (assignedBranch) {
        setBranch(assignedBranch);
        localStorage.setItem(STORAGE_KEYS.TARGET_BRANCH, JSON.stringify(assignedBranch));
        hasAutoAssigned.current = true;
      }
    }
  }, [user, branch, branches]);


  const handleLogin = useCallback((userData: User) => {
    setUser(userData);
    localStorage.setItem(STORAGE_KEYS.TARGET_USER, JSON.stringify(userData));
    localStorage.setItem(STORAGE_KEYS.TARGET_IS_LOGGED_IN, 'true');
    if (userData.assignedBranchId) {
      const assignedBranch = branches.find(b => b.id === userData.assignedBranchId);
      if (assignedBranch) {
        setBranch(assignedBranch);
        localStorage.setItem(STORAGE_KEYS.TARGET_BRANCH, JSON.stringify(assignedBranch));
        const today = getTodayDate();
        setCurrentDate(today);
        localStorage.setItem(STORAGE_KEYS.TARGET_DATE, JSON.stringify(today));
      }
    }
  }, [branches]);

  const handleLogout = useCallback(() => {
    setUser(null);
    setBranch(null);
    setCurrentDate(null);
    localStorage.removeItem(STORAGE_KEYS.TARGET_USER);
    localStorage.removeItem(STORAGE_KEYS.TARGET_BRANCH);
    localStorage.removeItem(STORAGE_KEYS.TARGET_DATE);
    localStorage.removeItem(STORAGE_KEYS.TARGET_IS_LOGGED_IN);
  }, []);

  const addEntry = useCallback(async (entry: ServiceEntry): Promise<boolean> => {
    if (isSubmitting) return false;
    startSubmitting();
    try {
      const sheetEntry = {
        ...entry,
        date: entry.entryDate,
        recordedBy: user?.name || '',
        'اسم العميل': entry.clientName,
        'الفرع': entry.branchId,
        'التكلفة': entry.serviceCost,
        'المحصل': entry.amountPaid,
        'المتبقي': entry.remainingAmount,
        isCostPaid: entry.isCostPaid || false,
        workOrderNumber: entry.workOrderNumber || '',
        workOrderEnteredBy: entry.workOrderNumber ? (user?.name || '') : '',
        statusUpdateDate: entry.statusUpdateDate || entry.entryDate
      };
      const finalEntry = { ...entry, workOrderEnteredBy: entry.workOrderNumber ? (user?.name || '') : '' };
      setEntries(prev => [finalEntry, ...prev]);
      const result = await GoogleSheetsService.addRow('Entries', sheetEntry, user?.role || ROLES.EMPLOYEE);
      if (!result.success) {
        setEntries(prev => prev.filter(e => e.id !== entry.id));
      } else {
        if (entry.amountPaid > 0) {
          setBranches(prev => prev.map(b =>
            normalizeArabic(b.Branch_Name) === normalizeArabic(entry.branchId)
              ? { ...b, Current_Balance: (Number(b.Current_Balance) || 0) + entry.amountPaid }
              : b
          ));
        }
      }
      return result.success;
    } finally {
      stopSubmitting();
    }
  }, [isSubmitting, startSubmitting, stopSubmitting, user?.name, user?.role]);

  const updateEntry = useCallback(async (updatedEntry: ServiceEntry): Promise<boolean> => {
    if (isSubmitting) return false;
    startSubmitting();
    try {
      setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
      const sheetEntry = {
        ...updatedEntry,
        'الحالة': updatedEntry.status,
        'المحصل': updatedEntry.amountPaid,
        'المتبقي': updatedEntry.remainingAmount,
        'إجمالي التكلفة': updatedEntry.serviceCost,
        'isCostPaid': updatedEntry.isCostPaid,
        'تاريخ دفع التكلفة': updatedEntry.costPaidDate,
        'costPaidBy': updatedEntry.costPaidBy,
        'ملاحظات': updatedEntry.notes || '',
        'workOrderNumber': updatedEntry.workOrderNumber || '',
        'workOrderEnteredBy': updatedEntry.workOrderEnteredBy || '',
        'deliveredBy': updatedEntry.deliveredBy || '',
        'statusUpdateDate': updatedEntry.statusUpdateDate || ''
      };
      const success = await GoogleSheetsService.updateEntry('Entries', sheetEntry, user?.role || ROLES.EMPLOYEE);
      if (success) {
        const oldPaid = Number(entries.find(e => e.id === updatedEntry.id)?.amountPaid || 0);
        const diff = updatedEntry.amountPaid - oldPaid;
        if (diff !== 0) {
          setBranches(prev => prev.map(b =>
            normalizeArabic(b.Branch_Name) === normalizeArabic(updatedEntry.branchId)
              ? { ...b, Current_Balance: (Number(b.Current_Balance) || 0) + diff }
              : b
          ));
        }
        if (updatedEntry.status === 'cancelled' && updatedEntry.barcode) {
          await GoogleSheetsService.updateStockStatus(updatedEntry.barcode, 'Available', '', user?.role || ROLES.EMPLOYEE);
        }
      } else {
        setEntries(prev => prev.map(e => e.id === updatedEntry.id ? entries.find(x => x.id === updatedEntry.id)! : e));
      }
      return success;
    } finally {
      stopSubmitting();
    }
  }, [isSubmitting, startSubmitting, stopSubmitting, user?.role, entries]);

  const addExpense = useCallback(async (expense: Expense): Promise<boolean> => {
    if (isSubmitting) return false;
    startSubmitting();
    try {
      const sheetExpense = { ...expense, 'التاريخ': expense.date, 'البند': expense.category, 'المبلغ': expense.amount, 'الفرع': expense.branchId };
      setExpenses(prev => [{ ...expense, recordedBy: user?.name || '' }, ...prev]);
      const result = await GoogleSheetsService.addRow('Expenses', sheetExpense, user?.role || ROLES.EMPLOYEE);
      if (!result.success) setExpenses(prev => prev.filter(e => e.id !== expense.id));
      else {
        setBranches(prev => prev.map(b => normalizeArabic(b.Branch_Name) === normalizeArabic(expense.branchId) ? { ...b, Current_Balance: (Number(b.Current_Balance) || 0) - expense.amount } : b));
      }
      return result.success;
    } finally {
      stopSubmitting();
    }
  }, [isSubmitting, startSubmitting, stopSubmitting, user?.name, user?.role]);

  const deleteExpense = useCallback(async (id: string, amount: number, branchId: string): Promise<{ success: boolean; message?: string }> => {
    if (isSubmitting) return { success: false, message: 'جاري التنفيذ...' };
    startSubmitting();
    try {
      const res = await GoogleSheetsService.deleteExpense(id);
      if (res.success) {
        setExpenses(prev => prev.filter(e => String(e.id).trim() !== String(id).trim()));
        setBranches(prev => prev.map(b => normalizeArabic(b.Branch_Name) === normalizeArabic(branchId) ? { ...b, Current_Balance: (Number(b.Current_Balance) || 0) + amount } : b));
      }
      return res;
    } finally {
      stopSubmitting();
    }
  }, [isSubmitting, startSubmitting, stopSubmitting]);

  const deliverOrder = useCallback(async (
    orderId: string,
    collectedAmount: number,
    clientName: string,
    collectorName: string,
    targetBranchId: string,
    isElectronic: boolean = false,
    electronicMethod: string = '',
    notes: string = ''
  ): Promise<boolean> => {
    if (isSubmitting) return false;
    const collectionId = Date.now().toString() + "-collect";
    startSubmitting();
    try {
      const success = await GoogleSheetsService.deliverOrder(
        orderId,
        collectedAmount,
        clientName,
        collectorName,
        targetBranchId,
        collectionId,
        isElectronic,
        electronicMethod,
        notes
      );
      if (success) {
        // 1. تحديث المعاملة الأصلية
        setEntries(prev => {
          const updated = prev.map(e => e.id === orderId ? { 
            ...e, 
            remainingAmount: e.remainingAmount - collectedAmount, 
            amountPaid: e.amountPaid + collectedAmount
          } : e);

          // 2. إذا تم تحصيل مبلغ، أضف بنداً جديداً لسداد المديونية (Optimistic UI)
          if (collectedAmount > 0) {
            const settlementEntry: ServiceEntry = {
              id: collectionId,
              clientName: clientName,
              nationalId: '-',
              phoneNumber: '-',
              serviceType: SERVICE_TYPES.DEBT_SETTLEMENT,
              serviceCost: 0,
              amountPaid: collectedAmount,
              remainingAmount: 0,
              hasThirdParty: false,
              isElectronic: isElectronic,
              electronicMethod: isElectronic ? electronicMethod as any : undefined,
              electronicAmount: isElectronic ? collectedAmount : undefined,
              notes: `سداد مديونية لطلب ${orderId}${isElectronic ? ` (${electronicMethod})` : ''}`,
              branchId: targetBranchId,
              entryDate: getTodayDate(),
              timestamp: Date.now(),
              recordedBy: collectorName,
              status: 'active',
              parentEntryId: orderId
            };
            return [settlementEntry, ...updated];
          }
          return updated;
        });

        if (collectedAmount > 0) {
          if (!isElectronic) {
            setBranches(prev => prev.map(b => normalizeArabic(b.Branch_Name) === normalizeArabic(targetBranchId) ? { ...b, Current_Balance: (Number(b.Current_Balance) || 0) + collectedAmount } : b));
          } else {
            // إضافة مصروف (Optimistic UI) للتحصيل الإلكتروني
            const electronicExpense: Expense = {
              id: collectionId + "-exp",
              category: 'تحصيل متبقي إلكتروني' as any,
              amount: collectedAmount,
              date: getTodayDate(),
              branchId: targetBranchId,
              timestamp: Date.now(),
              recordedBy: collectorName,
              notes: `تحصيل إلكتروني (${electronicMethod}) - طلب #${orderId}${notes ? ` - ${notes}` : ''}`
            };
            setExpenses(prev => [electronicExpense, ...prev]);
          }
        }
      }
      return success;
    } finally {
      stopSubmitting();
    }
  }, [isSubmitting, startSubmitting, stopSubmitting]);

  const branchTransfer = useCallback(async (data: { fromBranch: string, toBranch: string, amount: number }): Promise<{ success: boolean; message?: string }> => {
    if (isSubmitting) return { success: false, message: 'جاري التنفيذ...' };
    startSubmitting();
    try {
      const result = await GoogleSheetsService.branchTransfer({ ...data, recordedBy: user?.name || '' }, user?.role || ROLES.EMPLOYEE);

      if (result.success) {
        // 1. Update balances locally
        setBranches(prev => prev.map(b => {
          const bName = normalizeArabic(b.Branch_Name);
          if (bName === normalizeArabic(data.fromBranch)) return { ...b, Current_Balance: (Number(b.Current_Balance) || 0) - data.amount };
          if (bName === normalizeArabic(data.toBranch)) return { ...b, Current_Balance: (Number(b.Current_Balance) || 0) + data.amount };
          return b;
        }));

        // 2. Create "Incoming Transfer" Entry for Receiver Dashboard
        // NOTE: We set amountPaid to 0 to avoid double-counting the balance on the backend,
        // because the 'branchTransfer' API action already updates the branch balance column.
        // We will store the actual value in 'serviceCost' and handle the display in Dashboard.tsx.
        const incomingEntry: ServiceEntry = {
          id: `transfer-${Date.now()}`,
          entryDate: currentDate,
          timestamp: Date.now(),
          clientName: `تحويل من ${data.fromBranch}`,
          nationalId: '-',
          phoneNumber: '-',
          serviceType: 'تحويل وارد',
          serviceCost: data.amount,
          amountPaid: 0, // Critical: 0 to prevents double balance add
          remainingAmount: 0,
          branchId: data.toBranch,
          status: 'تم التسليم',
          recordedBy: user?.name || 'System',
          notes: `تحويل وارد بقيمة ${data.amount} من فرع ${data.fromBranch}`,
          hasThirdParty: false,
          isCostPaid: false,
          isElectronic: false
        };

        // Add to local state
        setEntries(prev => [incomingEntry, ...prev]);

        // Persist to Google Sheets
        GoogleSheetsService.addRow('Entries', {
          ...incomingEntry,
          date: incomingEntry.entryDate,
          'اسم العميل': incomingEntry.clientName,
          'الفرع': incomingEntry.branchId,
          'التكلفة': incomingEntry.serviceCost,
          'المحصل': incomingEntry.amountPaid,
          'المتبقي': 0,
          'الحالة': 'تم التسليم'
        }, user?.role || ROLES.EMPLOYEE).catch(err => console.error("Failed to save incoming transfer entry", err));
      }
      return result;
    } finally {
      stopSubmitting();
    }
  }, [isSubmitting, startSubmitting, stopSubmitting, user?.name, user?.role, currentDate]);

  /*
   * Attendance State
   */
  const [attendanceStatus, setAttendanceStatus] = useState<'checked-in' | 'checked-out'>('checked-out');
  const [attendanceDate, setAttendanceDate] = useState<string | null>(null);

  // Initialize attendance from local storage
  useEffect(() => {
    const savedStatus = localStorage.getItem(STORAGE_KEYS.TARGET_ATTENDANCE_STATUS);
    const savedDate = localStorage.getItem(STORAGE_KEYS.TARGET_ATTENDANCE_DATE);
    const today = getTodayDate();

    if (savedStatus && savedDate === today) {
      setAttendanceStatus(savedStatus as 'checked-in' | 'checked-out');
      setAttendanceDate(savedDate);
    } else {
      // Reset if date changed
      setAttendanceStatus('checked-out');
      setAttendanceDate(null);
      localStorage.removeItem('target_attendance_status');
      localStorage.removeItem('target_attendance_date');
    }
  }, []);

  const checkIn = useCallback(async (username: string, branchId: string): Promise<{ success: boolean; message?: string }> => {
    if (isSubmitting) return { success: false, message: 'جاري التنفيذ...' };
    startSubmitting();
    try {
      const ip = await GoogleSheetsService.fetchClientIP().catch(() => '0.0.0.0') || '0.0.0.0';
      const users_ID = localStorage.getItem('active_employee_id') || user?.id || '';
      const result = await GoogleSheetsService.recordAttendance(users_ID, username, branchId, 'check-in', ip);
      if (result.success) {
        const today = getTodayDate();
        setAttendanceStatus('checked-in');
        setAttendanceDate(today);
        localStorage.setItem(STORAGE_KEYS.TARGET_ATTENDANCE_STATUS, 'checked-in');
        localStorage.setItem(STORAGE_KEYS.TARGET_ATTENDANCE_DATE, today);
        return { success: true };
      }
      return { success: false, message: result.message };
    } catch (e) {
      return { success: false, message: 'حدث خطأ غير متوقع' };
    } finally {
      stopSubmitting();
    }
  }, [isSubmitting, startSubmitting, stopSubmitting, user?.id]);

  const checkOut = useCallback(async (username: string, branchId: string): Promise<{ success: boolean; message?: string }> => {
    if (isSubmitting) return { success: false, message: 'جاري التنفيذ...' };
    startSubmitting();
    try {
      const ip = await GoogleSheetsService.fetchClientIP().catch(() => '0.0.0.0') || '0.0.0.0';
      const users_ID = localStorage.getItem('active_employee_id') || user?.id || '';
      const result = await GoogleSheetsService.recordAttendance(users_ID, username, branchId, 'check-out', ip);
      if (result.success) {
        setAttendanceStatus('checked-out');
        localStorage.setItem(STORAGE_KEYS.TARGET_ATTENDANCE_STATUS, 'checked-out');
        handleLogout();
        return { success: true };
      }
      return { success: false, message: result.message };
    } catch (e) {
      return { success: false, message: 'حدث خطأ غير متوقع' };
    } finally {
      stopSubmitting();
    }
  }, [isSubmitting, startSubmitting, stopSubmitting, user?.id, handleLogout]);

  const deleteStock = useCallback(async (barcode: string, role: string): Promise<boolean> => {
    if (isSubmitting) return false;
    startSubmitting();
    try {
      const success = await GoogleSheetsService.deleteStockItem(barcode, role);
      if (success) setStock(prev => prev.filter(item => item.barcode !== barcode && (item as any).Barcode !== barcode));
      return success;
    } finally {
      stopSubmitting();
    }
  }, [isSubmitting, startSubmitting, stopSubmitting]);

  const addStockBatch = useCallback(async (items: Partial<StockItem>[], role: string): Promise<boolean> => {
    if (isSubmitting) return false;
    startSubmitting();
    try {
      const success = await GoogleSheetsService.addStockBatch(items as any, role);
      if (success) {
        setStock(prev => [...(items as StockItem[]), ...prev]);
      }
      return success;
    } finally {
      stopSubmitting();
    }
  }, [isSubmitting, startSubmitting, stopSubmitting]);

  const updateStockStatus = useCallback(async (barcode: string, newStatus: StockStatus, usedBy: string, role: string): Promise<boolean> => {
    if (isSubmitting) return false;
    startSubmitting();
    try {
      const success = await GoogleSheetsService.updateStockStatus(barcode, newStatus, usedBy, role);
      if (success) {
        setStock(prev => prev.map(item => (item.barcode || (item as any).Barcode) === barcode ? { ...item, status: newStatus, used_by: usedBy } : item));
      }
      return success;
    } finally {
      stopSubmitting();
    }
  }, [isSubmitting, startSubmitting, stopSubmitting]);

  const updateStockItem = useCallback(async (oldBarcode: string, newBarcode: string, newBranchId: string, role: string): Promise<boolean> => {
    if (isSubmitting) return false;
    startSubmitting();
    try {
      const success = await GoogleSheetsService.updateStockItem(oldBarcode, newBarcode, newBranchId, role);
      if (success) {
        setStock(prev => prev.map(item => (item.barcode || (item as any).Barcode) === oldBarcode ? { ...item, barcode: newBarcode, branch: newBranchId } : item));
      }
      return success;
    } finally {
      stopSubmitting();
    }
  }, [isSubmitting, startSubmitting, stopSubmitting]);

  return {
    user,
    userRole: user?.role || ROLES.EMPLOYEE,
    branch,
    currentDate,
    entries,
    expenses,
    stock,
    isSyncing,
    isSubmitting,
    attendanceStatus, // Added
    startSubmitting,
    stopSubmitting,
    syncAll,
    handleLogin,
    handleLogout,
    addEntry,
    updateEntry,
    addExpense,
    deleteExpense,
    deliverOrder,
    branchTransfer,
    deleteStock,
    manageUsers: useCallback(async (data: any) => {
      startSubmitting();
      try {
        const currentRole = user?.role || 'Admin';
        const res = await GoogleSheetsService.manageUsers(data, currentRole);
        if (res.success) {
          if (data.type === 'add' && data.user) setUsers(prev => [...prev, data.user]);
          else if (data.type === 'delete' && data.id) setUsers(prev => prev.filter(u => String(u.id) !== String(data.id)));
          else if (data.type === 'update' && data.user) setUsers(prev => prev.map(u => String(u.id) === String(data.user.id) ? { ...u, ...data.user } : u));
        }
        return res;
      } finally {
        stopSubmitting();
      }
    }, [startSubmitting, stopSubmitting, user?.role]),

    manageBranches: useCallback(async (data: any) => {
      startSubmitting();
      try {
        const currentRole = user?.role || 'Admin';
        const res = await GoogleSheetsService.manageBranches(data, currentRole);
        if (res.success) {
          if (data.type === 'add' && data.branch) setBranches(prev => [...prev, { id: data.branch.name, name: data.branch.name, Current_Balance: 0, currentBalance: 0 }]);
          else if (data.type === 'delete' && data.name) setBranches(prev => prev.filter(b => normalizeArabic(b.name) !== normalizeArabic(data.name)));
        }
        return res;
      } finally {
        stopSubmitting();
      }
    }, [startSubmitting, stopSubmitting, user?.role]),

    updateSettings: useCallback(async (serviceList: string[], expenseList: string[]) => {
      startSubmitting();
      try {
        const res = await GoogleSheetsService.updateSettings({ serviceList: serviceList.join(','), expenseList: expenseList.join(',') }, user?.role || 'Admin');
        if (res.success) {
          setServiceTypes(serviceList);
          setExpenseCategories(expenseList);
          localStorage.setItem(STORAGE_KEYS.TARGET_SERVICE_TYPES, JSON.stringify(serviceList));
          localStorage.setItem(STORAGE_KEYS.TARGET_EXPENSE_CATEGORIES, JSON.stringify(expenseList));
        }
        return res;
      } finally {
        stopSubmitting();
      }
    }, [startSubmitting, stopSubmitting, user?.role]),
    serviceTypes,
    expenseCategories,
    checkIn,
    checkOut,
    setBranch,
    setCurrentDate,
    branches,
    users,
    addStockBatch,
    updateStockStatus,
    updateStockItem
  };
};