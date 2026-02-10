import { useState, useEffect, useRef } from 'react';
import { ServiceEntry, Expense, Branch, StockItem, User } from '../types';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { normalizeArabic, normalizeDate } from '../utils';
import { useModal } from '../context/ModalContext';
import { SERVICE_TYPES, EXPENSE_CATEGORIES } from '../constants';

export const useAppState = () => {
  const { setIsProcessing } = useModal();
  const hasAutoAssigned = useRef(false);
  const lastUserId = useRef<string | null>(null);

  // Initialize state from localStorage if available
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('target_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [branch, setBranch] = useState<Branch | null>(() => {
    const saved = localStorage.getItem('target_branch');
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
    const saved = localStorage.getItem('target_entries');
    return saved ? JSON.parse(saved) : [];
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('target_expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [stock, setStock] = useState<StockItem[]>(() => {
    const saved = localStorage.getItem('target_stock');
    return saved ? JSON.parse(saved) : [];
  });

  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem('target_branches');
    return saved ? JSON.parse(saved) : [];
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('target_admin_users');
    return saved ? JSON.parse(saved) : [];
  });

  const [serviceTypes, setServiceTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem('target_service_types');
    return saved ? JSON.parse(saved) : SERVICE_TYPES;
  });

  const [expenseCategories, setExpenseCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('target_expense_categories');
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

  const startSubmitting = () => {
    setIsSubmitting(true);
    setIsProcessing(true);
  };
  const stopSubmitting = () => {
    setIsSubmitting(false);
    setIsProcessing(false);
  };

  const isSyncingRef = useRef(false);

  /**
   * دالة المزامنة الشاملة مع دمج البيانات للحفاظ على ما لم يُرفع بعد
   */
  const syncAll = async () => {
    if (!navigator.onLine || isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      // تنفيذ كافة طلبات الجلب في وقت واحد (Promise.all) للتسريع
      const [remoteEntries, remoteExpenses, remoteStock, remoteBranches, remoteUsers, remoteSettings] = await Promise.all([
        GoogleSheetsService.getData<any>('Entries', user?.role, user?.name),
        GoogleSheetsService.getData<any>('Expenses', user?.role, user?.name),
        GoogleSheetsService.getData<StockItem>('Stock'),
        GoogleSheetsService.getBranches(),
        (normalizeArabic(user?.role || '') === normalizeArabic('مدير') || user?.role === 'Admin')
          ? GoogleSheetsService.getData<User>('Users')
          : Promise.resolve([]),
        GoogleSheetsService.getData<any>('Service_Expense')
      ]);

      // 1. معالجة العمليات (Entries)
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
            status: (e.status || e['الحالة'] || e['الحاله'] || 'active') as 'active' | 'cancelled' | 'تم التسليم',
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
            notes: e.notes || e['ملاحظات'] || ''
          };
        });

        setEntries(prev => {
          const mergedMap = new Map();
          prev.forEach(item => mergedMap.set(item.id, item));
          mappedEntries.forEach(item => {
            if (item.id && item.id !== 'undefined') {
              mergedMap.set(item.id, item);
            }
          });
          const next = Array.from(mergedMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          if (next.length === prev.length) {
            const isIdentical = next.every((e, i) => e.id === prev[i].id && e.timestamp === prev[i].timestamp && e.status === prev[i].status);
            if (isIdentical) return prev;
          }
          return next;
        });
      }

      // 2. معالجة المصروفات (Expenses)
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
              if (!isNaN(dObj.getTime())) {
                exDateStr = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
              } else {
                exDateStr = s.split('T')[0];
              }
            } else {
              exDateStr = s;
            }
          }
          const exDate = normalizeDate(exDateStr);

          return {
            id: String(ex.id || ex['معرف'] || Date.now() + Math.random()),
            category: (ex.category || ex['البند'] || ex['القسم'] || '') as any,
            amount: Number(ex.amount || ex['المبلغ'] || 0),
            date: exDate,
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
            if (item.id && item.id !== 'undefined') {
              mergedMap.set(item.id, item);
            }
          });
          const next = Array.from(mergedMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          if (next.length === prev.length) {
            const isIdentical = next.every((e, i) => e.id === prev[i].id && e.timestamp === prev[i].timestamp);
            if (isIdentical) return prev;
          }
          return next;
        });
      }

      // 3. معالجة المخزون (Stock)
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
          localStorage.setItem('target_stock', JSON.stringify(mappedStock));
          return mappedStock;
        });
      }

      // 4. معالجة الفروع (Branches)
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
          localStorage.setItem('target_branches', JSON.stringify(mappedBranches));
          return mappedBranches;
        });
      }

      // 5. معالجة القوائم من شيت Service_Expense (الجديد)
      if (remoteSettings && remoteSettings.length > 0) {
        const settings = remoteSettings[0];
        if (settings.Service_List) {
          const list = settings.Service_List.split(',').map((s: string) => s.trim()).filter(Boolean);
          setServiceTypes(list);
          localStorage.setItem('target_service_types', JSON.stringify(list));
        }
        if (settings.Expense_List) {
          const list = settings.Expense_List.split(',').map((s: string) => s.trim()).filter(Boolean);
          setExpenseCategories(list);
          localStorage.setItem('target_expense_categories', JSON.stringify(list));
        }
      }

      // 5. معالجة الموظفين (Users) - للمدير فقط
      if (remoteUsers && remoteUsers.length > 0) {
        setUsers(remoteUsers);
        localStorage.setItem('target_admin_users', JSON.stringify(remoteUsers));
      }
    } catch (error) {
      console.error("Sync Error:", error);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  };

  // المزامنة عند فتح التطبيق أو تغيير الفرع/التاريخ
  useEffect(() => {
    if (user) syncAll();
  }, [branch?.id, currentDate, user?.id]);

  // حفظ البيانات محلياً عند تغييرها
  useEffect(() => {
    if (user) localStorage.setItem('target_user', JSON.stringify(user));
    else localStorage.removeItem('target_user');
  }, [user]);

  useEffect(() => {
    if (branch) localStorage.setItem('target_branch', JSON.stringify(branch));
    else localStorage.removeItem('target_branch');
  }, [branch]);

  useEffect(() => {
    if (currentDate) localStorage.setItem('target_date', JSON.stringify(currentDate));
    else localStorage.removeItem('target_date');
  }, [currentDate]);

  useEffect(() => {
    localStorage.setItem('target_entries', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('target_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('target_stock', JSON.stringify(stock));
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
        localStorage.setItem('target_branch', JSON.stringify(assignedBranch));
        hasAutoAssigned.current = true;
      }
    }
  }, [user, branch, branches]);


  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('target_user', JSON.stringify(userData));
    localStorage.setItem('target_is_logged_in', 'true');

    // Auto-assign branch if configured
    if (userData.assignedBranchId) {
      const assignedBranch = branches.find(b => b.id === userData.assignedBranchId);
      if (assignedBranch) {
        setBranch(assignedBranch);
        localStorage.setItem('target_branch', JSON.stringify(assignedBranch));

        // Auto-set Date to Today
        const today = new Date().toISOString().split('T')[0];
        setCurrentDate(today);
        localStorage.setItem('target_date', JSON.stringify(today));
      }
    }
  };

  const handleLogout = () => {
    setUser(null);
    setBranch(null);
    setCurrentDate(null);
    localStorage.removeItem('target_user');
    localStorage.removeItem('target_branch');
    localStorage.removeItem('target_date');
    localStorage.removeItem('target_is_logged_in');
  };

  const addEntry = async (entry: ServiceEntry): Promise<boolean> => {
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
        isCostPaid: entry.isCostPaid || false
      };

      // إضافة محلية فورية
      setEntries(prev => [entry, ...prev]);

      const result = await GoogleSheetsService.addRow('Entries', sheetEntry, user?.role || 'موظف');

      if (!result.success) {
        console.error("Failed to sync entry to server:", result.message);
        // إعادة الحالة السابقة عند الفشل
        setEntries(prev => prev.filter(e => e.id !== entry.id));
      } else {
        // تحديث أرصدة الفروع محلياً (Manual State Update) لتجنب إعادة الجلب
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
  };

  const updateEntry = async (updatedEntry: ServiceEntry): Promise<boolean> => {
    if (isSubmitting) return false;
    startSubmitting();
    try {
      // تحديث محلي سريع
      setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));

      // تحضير البيانات للمزامنة (تحويل الأسماء العربية للأعمدة)
      const sheetEntry = {
        ...updatedEntry,
        'الحالة': updatedEntry.status,
        'المحصل': updatedEntry.amountPaid,
        'المتبقي': updatedEntry.remainingAmount,
        'إجمالي التكلفة': updatedEntry.serviceCost,
        'isCostPaid': updatedEntry.isCostPaid,
        'تاريخ دفع التكلفة': updatedEntry.costPaidDate,
        'costPaidBy': updatedEntry.costPaidBy,
        'ملاحظات': updatedEntry.notes || ''
      };

      const success = await GoogleSheetsService.updateEntry('Entries', sheetEntry, user?.role || 'موظف');

      if (success) {
        // تحديث الرصيد محلياً إذا تغير المبلغ المدفوع
        const oldPaid = Number(entries.find(e => e.id === updatedEntry.id)?.amountPaid || 0);
        const diff = updatedEntry.amountPaid - oldPaid;
        if (diff !== 0) {
          setBranches(prev => prev.map(b =>
            normalizeArabic(b.Branch_Name) === normalizeArabic(updatedEntry.branchId)
              ? { ...b, Current_Balance: (Number(b.Current_Balance) || 0) + diff }
              : b
          ));
        }

        // إذا نجح التحديث وكان الإلغاء هو الحالة الجديدة، نقوم بتحرير الباركود إن وجد
        if (updatedEntry.status === 'cancelled' && updatedEntry.barcode) {
          await GoogleSheetsService.updateStockStatus(
            updatedEntry.barcode,
            'Available',
            '',
            user?.role || 'موظف'
          );
        }
      } else {
        console.error("Failed to sync update to server");
        // التراجع عن التحديث المحلي عند الفشل
        setEntries(prev => prev.map(e => e.id === updatedEntry.id ? entries.find(x => x.id === updatedEntry.id)! : e));
      }
      return success;
    } finally {
      stopSubmitting();
    }
  };

  const addExpense = async (expense: Expense): Promise<boolean> => {
    if (isSubmitting) return false;
    startSubmitting();
    try {
      const sheetExpense = {
        ...expense,
        'التاريخ': expense.date,
        'البند': expense.category,
        'المبلغ': expense.amount,
        'الفرع': expense.branchId
      };

      setExpenses(prev => [{ ...expense, recordedBy: user?.name || '' }, ...prev]);
      const result = await GoogleSheetsService.addRow('Expenses', sheetExpense, user?.role || 'موظف');

      if (!result.success) {
        // التراجع عن الإضافة المحلية في حالة الفشل (مثلاً رصيد غير كافٍ)
        setExpenses(prev => prev.filter(e => e.id !== expense.id));
        alert(result.message || 'فشل تسجيل المصروف');
      } else {
        // تحديث الرصيد محلياً (Manual State Update)
        setBranches(prev => prev.map(b =>
          normalizeArabic(b.Branch_Name) === normalizeArabic(expense.branchId)
            ? { ...b, Current_Balance: (Number(b.Current_Balance) || 0) - expense.amount }
            : b
        ));
      }
      return result.success;
    } finally {
      stopSubmitting();
    }
  };

  const deleteExpense = async (id: string, amount: number, branchId: string): Promise<{ success: boolean; message?: string }> => {
    if (isSubmitting) return { success: false, message: 'جاري التنفيذ...' };
    startSubmitting();
    try {
      const res = await GoogleSheetsService.deleteExpense(id);
      if (res.success) {
        // تحديث المصروفات محلياً
        setExpenses(prev => prev.filter(e => String(e.id).trim() !== String(id).trim()));
        // إعادة المبلغ للخزنة محلياً
        setBranches(prev => prev.map(b =>
          normalizeArabic(b.Branch_Name) === normalizeArabic(branchId)
            ? { ...b, Current_Balance: (Number(b.Current_Balance) || 0) + amount }
            : b
        ));
      }
      return res;
    } finally {
      stopSubmitting();
    }
  };

  const deliverOrder = async (orderId: string, collectedAmount: number, clientName: string, collectorName: string, targetBranchId: string): Promise<boolean> => {
    if (isSubmitting) return false;
    startSubmitting();
    try {
      const success = await GoogleSheetsService.deliverOrder(orderId, collectedAmount, clientName, collectorName, targetBranchId);
      if (success) {
        // تحديث محلي للحالات
        setEntries(prev => prev.map(e => e.id === orderId ? { ...e, status: 'تم التسليم', remainingAmount: e.remainingAmount - collectedAmount, amountPaid: e.amountPaid + collectedAmount } : e));

        // تحديث الرصيد محلياً (Manual State Update)
        if (collectedAmount > 0) {
          setBranches(prev => prev.map(b =>
            normalizeArabic(b.Branch_Name) === normalizeArabic(targetBranchId)
              ? { ...b, Current_Balance: (Number(b.Current_Balance) || 0) + collectedAmount }
              : b
          ));
        }
      }
      return success;
    } finally {
      stopSubmitting();
    }
  };

  const branchTransfer = async (data: { fromBranch: string, toBranch: string, amount: number }): Promise<{ success: boolean; message?: string }> => {
    if (isSubmitting) return { success: false, message: 'جاري التنفيذ...' };
    startSubmitting();
    try {
      const result = await GoogleSheetsService.branchTransfer({ ...data, recordedBy: user?.name || '' }, user?.role || 'موظف');
      if (result.success) {
        // تحديث الرصيد محلياً للفرعين (Manual State Update)
        setBranches(prev => prev.map(b => {
          const bName = normalizeArabic(b.Branch_Name);
          if (bName === normalizeArabic(data.fromBranch)) {
            return { ...b, Current_Balance: (Number(b.Current_Balance) || 0) - data.amount };
          }
          if (bName === normalizeArabic(data.toBranch)) {
            return { ...b, Current_Balance: (Number(b.Current_Balance) || 0) + data.amount };
          }
          return b;
        }));
      }
      return result;
    } finally {
      stopSubmitting();
    }
  };

  /*
   * Attendance State
   */
  const [attendanceStatus, setAttendanceStatus] = useState<'checked-in' | 'checked-out'>('checked-out');
  const [attendanceDate, setAttendanceDate] = useState<string | null>(null);

  // Initialize attendance from local storage
  useEffect(() => {
    const savedStatus = localStorage.getItem('target_attendance_status');
    const savedDate = localStorage.getItem('target_attendance_date');
    const today = new Date().toISOString().split('T')[0];

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

  const checkIn = async (username: string, branchId: string): Promise<{ success: boolean; message?: string }> => {
    if (isSubmitting) return { success: false, message: 'جاري التنفيذ...' };
    startSubmitting();
    try {
      const ip = await GoogleSheetsService.fetchClientIP().catch(() => '0.0.0.0') || '0.0.0.0';
      const users_ID = localStorage.getItem('active_employee_id') || user?.id || '';

      const result = await GoogleSheetsService.recordAttendance(users_ID, username, branchId, 'check-in', ip);

      if (result.success) {
        const today = new Date().toISOString().split('T')[0];
        setAttendanceStatus('checked-in');
        setAttendanceDate(today);
        localStorage.setItem('target_attendance_status', 'checked-in');
        localStorage.setItem('target_attendance_date', today);
        return { success: true };
      } else {
        return { success: false, message: result.message };
      }
    } catch (e) {
      return { success: false, message: 'حدث خطأ غير متوقع' };
    } finally {
      stopSubmitting();
    }
  };

  const checkOut = async (username: string, branchId: string): Promise<{ success: boolean; message?: string }> => {
    if (isSubmitting) return { success: false, message: 'جاري التنفيذ...' };
    startSubmitting();
    try {
      const ip = await GoogleSheetsService.fetchClientIP().catch(() => '0.0.0.0') || '0.0.0.0';
      const users_ID = localStorage.getItem('active_employee_id') || user?.id || '';

      const result = await GoogleSheetsService.recordAttendance(users_ID, username, branchId, 'check-out', ip);

      if (result.success) {
        setAttendanceStatus('checked-out');
        localStorage.setItem('target_attendance_status', 'checked-out');

        // مسح الجلسة عند الخروج كما هو مطلوب
        handleLogout();

        return { success: true };
      } else {
        return { success: false, message: result.message };
      }
    } catch (e) {
      return { success: false, message: 'حدث خطأ غير متوقع' };
    } finally {
      stopSubmitting();
    }
  };

  const deleteStock = async (barcode: string, role: string): Promise<boolean> => {
    if (isSubmitting) return false;
    startSubmitting();
    try {
      const success = await GoogleSheetsService.deleteStockItem(barcode, role);
      if (success) {
        setStock(prev => prev.filter(item => item.barcode !== barcode && (item as any).Barcode !== barcode));
      }
      return success;
    } finally {
      stopSubmitting();
    }
  };

  return {
    user,
    userRole: user?.role || 'موظف',
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
    manageUsers: async (data: any) => {
      startSubmitting();
      try {
        const currentRole = user?.role || 'Admin';
        const res = await GoogleSheetsService.manageUsers(data, currentRole);
        if (res.success) {
          if (data.type === 'add' && data.user) {
            setUsers(prev => [...prev, data.user]);
          } else if (data.type === 'delete' && data.id) {
            setUsers(prev => prev.filter(u => String(u.id) !== String(data.id)));
          } else if (data.type === 'update' && data.user) {
            setUsers(prev => prev.map(u => String(u.id) === String(data.user.id) ? { ...u, ...data.user } : u));
          }
        }
        return res;
      } finally {
        stopSubmitting();
      }
    },
    manageBranches: async (data: any) => {
      startSubmitting();
      try {
        const currentRole = user?.role || 'Admin';
        const res = await GoogleSheetsService.manageBranches(data, currentRole);
        if (res.success) {
          if (data.type === 'add' && data.branch) {
            setBranches(prev => [...prev, { id: data.branch.name, name: data.branch.name, Current_Balance: 0, currentBalance: 0 }]);
          } else if (data.type === 'delete' && data.name) {
            setBranches(prev => prev.filter(b => normalizeArabic(b.name) !== normalizeArabic(data.name)));
          }
        }
        return res;
      } finally {
        stopSubmitting();
      }
    },
    updateSettings: async (serviceList: string[], expenseList: string[]) => {
      startSubmitting();
      try {
        const sString = serviceList.join(',');
        const eString = expenseList.join(',');
        const res = await GoogleSheetsService.updateSettings({ serviceList: sString, expenseList: eString }, user?.role || 'Admin');
        if (res.success) {
          setServiceTypes(serviceList);
          setExpenseCategories(expenseList);
          localStorage.setItem('target_service_types', JSON.stringify(serviceList));
          localStorage.setItem('target_expense_categories', JSON.stringify(expenseList));
        }
        return res;
      } finally {
        stopSubmitting();
      }
    },
    serviceTypes,
    expenseCategories,
    checkIn,
    checkOut,
    setBranch,
    setCurrentDate,
    branches,
    users
  };
};