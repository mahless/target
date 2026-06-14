import { useCallback, useRef } from 'react';
import { ServiceEntry, Expense, Branch, StockItem, User } from '../types';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { normalizeArabic, normalizeDate } from '../utils';
import { ROLES } from '../constants';

export const useAppActions = (
  state: any,
  setters: any,
  isSubmitting: boolean,
  startSubmitting: () => void,
  stopSubmitting: () => void,
  isSyncing: boolean,
  setIsSyncing: (val: boolean) => void
) => {
  const { user, branch, currentDate, entries, expenses, stock, branches, users, serviceTypes, expenseCategories, attendanceStatus } = state;
  const { setUser, setBranch, setCurrentDate, setEntries, setExpenses, setStock, setBranches, setUsers, setServiceTypes, setExpenseCategories, setAttendanceStatus } = setters;

  const isSyncingRef = useRef(false);

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
            workOrderNumber: e.workOrderNumber || e['رقم أمر الشغل'] || '',
            statusUpdateDate: e.statusUpdateDate || e['تاريخ تحديث الحالة'] || '',
            notes: e.notes || e['ملاحظات'] || ''
          };
        });
        const next = mappedEntries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setEntries(next);
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
        const next = mappedExpenses.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setExpenses(next);
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
        setStock(mappedStock);
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
        setBranches(mappedBranches);
      }

      if (remoteSettings && remoteSettings.length > 0) {
        const settings = remoteSettings[0];
        if (settings.Service_List) {
          const list = settings.Service_List.split(',').map((s: string) => s.trim()).filter(Boolean);
          setServiceTypes(list);
        }
        if (settings.Expense_List) {
          const list = settings.Expense_List.split(',').map((s: string) => s.trim()).filter(Boolean);
          setExpenseCategories(list);
        }
      }

      if (remoteUsers && remoteUsers.length > 0) {
        setUsers(remoteUsers);
      }
    } catch (error) {
      console.error("Sync Error:", error);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [user?.role, user?.name, setEntries, setExpenses, setStock, setBranches, setServiceTypes, setExpenseCategories, setUsers, setIsSyncing]);

  const handleLogin = useCallback(async (userData: User) => {
    setUser(userData);
    localStorage.setItem('target_is_logged_in', 'true');

    let currentBranches = branches;

    if (currentBranches.length === 0) {
      try {
        const remoteBranches = await GoogleSheetsService.getBranches();
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
          setBranches(mappedBranches);
          currentBranches = mappedBranches;
        }
      } catch (err) {
        console.error('[Login] Failed to fetch branches:', err);
      }
    }

    const isManager = normalizeArabic(userData.role || '') === normalizeArabic(ROLES.MANAGER);

    if (isManager) {
      const allBranch = { id: 'all', name: 'كل الفروع' } as any;
      setBranch(allBranch);
    } else if (userData.assignedBranchId && currentBranches.length > 0) {
      const assignedBranch = currentBranches.find(b =>
        normalizeArabic(b.id) === normalizeArabic(userData.assignedBranchId!)
      );
      if (assignedBranch) {
        setBranch(assignedBranch);
      }
    }
  }, [branches, setUser, setBranches, setBranch]);

  const handleLogout = useCallback(() => {
    setUser(null);
    setBranch(null);
    setCurrentDate(null);
    localStorage.removeItem('target_user');
    localStorage.removeItem('target_branch');
    localStorage.removeItem('target_date');
    localStorage.removeItem('target_is_logged_in');
  }, [setUser, setBranch, setCurrentDate]);

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
        statusUpdateDate: entry.statusUpdateDate || entry.entryDate
      };
      setEntries((prev: ServiceEntry[]) => [entry, ...prev]);
      const result = await GoogleSheetsService.addRow('Entries', sheetEntry, user?.role || 'موظف');
      if (!result.success) {
        setEntries((prev: ServiceEntry[]) => prev.filter(e => e.id !== entry.id));
      } else {
        const physicalCash = entry.amountPaid - (entry.electronicAmount || 0);
        if (physicalCash !== 0) {
          setBranches((prev: Branch[]) => prev.map(b =>
            normalizeArabic(b.Branch_Name) === normalizeArabic(entry.branchId)
              ? { ...b, Current_Balance: (Number(b.Current_Balance) || 0) + physicalCash }
              : b
          ));
        }
        syncAll();
      }
      return result.success;
    } finally {
      stopSubmitting();
    }
  }, [isSubmitting, startSubmitting, stopSubmitting, user?.name, user?.role, syncAll, setEntries, setBranches]);

  const updateEntry = useCallback(async (updatedEntry: ServiceEntry): Promise<boolean> => {
    if (isSubmitting) return false;
    startSubmitting();
    try {
      setEntries((prev: ServiceEntry[]) => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
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
        'statusUpdateDate': updatedEntry.statusUpdateDate || ''
      };
      const success = await GoogleSheetsService.updateEntry('Entries', sheetEntry, user?.role || 'موظف');
      if (success) {
        const oldEntry = entries.find((e: ServiceEntry) => e.id === updatedEntry.id);
        const oldPhysicalCash = (Number(oldEntry?.amountPaid) || 0) - (Number(oldEntry?.electronicAmount) || 0);
        const newPhysicalCash = (Number(updatedEntry.amountPaid) || 0) - (Number(updatedEntry.electronicAmount) || 0);
        const diff = newPhysicalCash - oldPhysicalCash;
        if (diff !== 0) {
          setBranches((prev: Branch[]) => prev.map(b =>
            normalizeArabic(b.Branch_Name) === normalizeArabic(updatedEntry.branchId)
              ? { ...b, Current_Balance: (Number(b.Current_Balance) || 0) + diff }
              : b
          ));
        }
        if (updatedEntry.status === 'cancelled' && updatedEntry.barcode) {
          await GoogleSheetsService.updateStockStatus(updatedEntry.barcode, 'Available', '', user?.role || 'موظف');
        }
        syncAll();
      } else {
        setEntries((prev: ServiceEntry[]) => prev.map(e => e.id === updatedEntry.id ? entries.find((x: ServiceEntry) => x.id === updatedEntry.id)! : e));
      }
      return success;
    } finally {
      stopSubmitting();
    }
  }, [isSubmitting, startSubmitting, stopSubmitting, user?.role, entries, syncAll, setEntries, setBranches]);

  const addExpense = useCallback(async (expense: Expense): Promise<boolean> => {
    if (isSubmitting) return false;
    startSubmitting();
    try {
      const sheetExpense = { ...expense, 'التاريخ': expense.date, 'البند': expense.category, 'المبلغ': expense.amount, 'الفرع': expense.branchId };
      setExpenses((prev: Expense[]) => [{ ...expense, recordedBy: user?.name || '' }, ...prev]);
      const result = await GoogleSheetsService.addRow('Expenses', sheetExpense, user?.role || 'موظف');
      if (!result.success) setExpenses((prev: Expense[]) => prev.filter(e => e.id !== expense.id));
      else {
        setBranches((prev: Branch[]) => prev.map(b => normalizeArabic(b.Branch_Name) === normalizeArabic(expense.branchId) ? { ...b, Current_Balance: (Number(b.Current_Balance) || 0) - expense.amount } : b));
        syncAll();
      }
      return result.success;
    } finally {
      stopSubmitting();
    }
  }, [isSubmitting, startSubmitting, stopSubmitting, user?.name, user?.role, syncAll, setExpenses, setBranches]);

  const deleteExpense = useCallback(async (id: string, amount: number, branchId: string): Promise<{ success: boolean; message?: string }> => {
    if (isSubmitting) return { success: false, message: 'جاري التنفيذ...' };
    startSubmitting();
    try {
      const res = await GoogleSheetsService.deleteExpense(id);
      if (res.success) {
        setExpenses((prev: Expense[]) => prev.filter(e => String(e.id).trim() !== String(id).trim()));
        setBranches((prev: Branch[]) => prev.map(b => normalizeArabic(b.Branch_Name) === normalizeArabic(branchId) ? { ...b, Current_Balance: (Number(b.Current_Balance) || 0) + amount } : b));
        syncAll();
      }
      return res;
    } finally {
      stopSubmitting();
    }
  }, [isSubmitting, startSubmitting, stopSubmitting, syncAll, setExpenses, setBranches]);

  const deliverOrder = useCallback(async (orderId: string, collectedAmount: number, clientName: string, collectorName: string, targetBranchId: string): Promise<boolean> => {
    if (isSubmitting) return false;
    startSubmitting();
    try {
      const success = await GoogleSheetsService.deliverOrder(orderId, collectedAmount, clientName, collectorName, targetBranchId);
      if (success) {
        setEntries((prev: ServiceEntry[]) => prev.map(e => e.id === orderId ? { ...e, status: 'تم التسليم', remainingAmount: e.remainingAmount - collectedAmount, amountPaid: e.amountPaid + collectedAmount } : e));
        if (collectedAmount > 0) {
          setBranches((prev: Branch[]) => prev.map(b => normalizeArabic(b.Branch_Name) === normalizeArabic(targetBranchId) ? { ...b, Current_Balance: (Number(b.Current_Balance) || 0) + collectedAmount } : b));
        }
        // Delay sync to let the backend commit the balance update before we fetch
        setTimeout(() => syncAll(), 1500);
      }
      return success;
    } finally {
      stopSubmitting();
    }
  }, [isSubmitting, startSubmitting, stopSubmitting, syncAll, setEntries, setBranches]);

  const branchTransfer = useCallback(async (data: { fromBranch: string, toBranch: string, amount: number }): Promise<{ success: boolean; message?: string }> => {
    if (isSubmitting) return { success: false, message: 'جاري التنفيذ...' };
    startSubmitting();
    try {
      const result = await GoogleSheetsService.branchTransfer({ ...data, recordedBy: user?.name || '' }, user?.role || 'موظف');

      if (result.success) {
        setBranches((prev: Branch[]) => prev.map(b => {
          const bName = normalizeArabic(b.Branch_Name);
          if (bName === normalizeArabic(data.fromBranch)) return { ...b, Current_Balance: (Number(b.Current_Balance) || 0) - data.amount };
          if (bName === normalizeArabic(data.toBranch)) return { ...b, Current_Balance: (Number(b.Current_Balance) || 0) + data.amount };
          return b;
        }));

        const incomingEntry: ServiceEntry = {
          id: `transfer-${Date.now()}`,
          entryDate: currentDate,
          timestamp: Date.now(),
          clientName: `تحويل من ${data.fromBranch}`,
          nationalId: '-',
          phoneNumber: '-',
          serviceType: 'تحويل وارد',
          serviceCost: data.amount,
          amountPaid: 0,
          remainingAmount: 0,
          branchId: data.toBranch,
          status: 'تم التسليم',
          recordedBy: user?.name || 'System',
          notes: `تحويل وارد بقيمة ${data.amount} من فرع ${data.fromBranch}`,
          hasThirdParty: false,
          isCostPaid: false,
          isElectronic: false
        };

        setEntries((prev: ServiceEntry[]) => [incomingEntry, ...prev]);

        GoogleSheetsService.addRow('Entries', {
          ...incomingEntry,
          date: incomingEntry.entryDate,
          'اسم العميل': incomingEntry.clientName,
          'الفرع': incomingEntry.branchId,
          'التكلفة': incomingEntry.serviceCost,
          'المحصل': incomingEntry.amountPaid,
          'المتبقي': 0,
          'الحالة': 'تم التسليم'
        }, user?.role || 'موظف').catch(err => console.error("Failed to save incoming transfer entry", err));
        
        syncAll();
      }
      return result;
    } finally {
      stopSubmitting();
    }
  }, [isSubmitting, startSubmitting, stopSubmitting, user?.name, user?.role, currentDate, syncAll, setBranches, setEntries]);

  const checkIn = useCallback(async (username: string, branchId: string): Promise<{ success: boolean; message?: string }> => {
    if (isSubmitting) return { success: false, message: 'جاري التنفيذ...' };
    startSubmitting();
    try {
      const ip = await GoogleSheetsService.fetchClientIP().catch(() => '0.0.0.0') || '0.0.0.0';
      const users_ID = localStorage.getItem('active_employee_id') || user?.id || '';
      const result = await GoogleSheetsService.recordAttendance(users_ID, username, branchId, 'check-in', ip);
      if (result.success) {
        const today = new Date().toISOString().split('T')[0];
        setAttendanceStatus('checked-in');
        localStorage.setItem('target_attendance_status', 'checked-in');
        localStorage.setItem('target_attendance_date', today);
        return { success: true };
      }
      return { success: false, message: result.message };
    } catch (e) {
      return { success: false, message: 'حدث خطأ غير متوقع' };
    } finally {
      stopSubmitting();
    }
  }, [isSubmitting, startSubmitting, stopSubmitting, user?.id, setAttendanceStatus]);

  const checkOut = useCallback(async (username: string, branchId: string): Promise<{ success: boolean; message?: string }> => {
    if (isSubmitting) return { success: false, message: 'جاري التنفيذ...' };
    startSubmitting();
    try {
      const ip = await GoogleSheetsService.fetchClientIP().catch(() => '0.0.0.0') || '0.0.0.0';
      const users_ID = localStorage.getItem('active_employee_id') || user?.id || '';
      const result = await GoogleSheetsService.recordAttendance(users_ID, username, branchId, 'check-out', ip);
      if (result.success) {
        setAttendanceStatus('checked-out');
        localStorage.setItem('target_attendance_status', 'checked-out');
        handleLogout();
        return { success: true };
      }
      return { success: false, message: result.message };
    } catch (e) {
      return { success: false, message: 'حدث خطأ غير متوقع' };
    } finally {
      stopSubmitting();
    }
  }, [isSubmitting, startSubmitting, stopSubmitting, user?.id, handleLogout, setAttendanceStatus]);

  const deleteStock = useCallback(async (barcode: string, role: string): Promise<boolean> => {
    if (isSubmitting) return false;
    startSubmitting();
    try {
      const success = await GoogleSheetsService.deleteStockItem(barcode, role);
      if (success) setStock((prev: StockItem[]) => prev.filter(item => item.barcode !== barcode && (item as any).Barcode !== barcode));
      return success;
    } finally {
      stopSubmitting();
    }
  }, [isSubmitting, startSubmitting, stopSubmitting, setStock]);

  const manageUsers = useCallback(async (data: any) => {
    startSubmitting();
    try {
      const currentRole = user?.role || 'Admin';
      const res = await GoogleSheetsService.manageUsers(data, currentRole);
      if (res.success) {
        if (data.type === 'add' && data.user) setUsers((prev: User[]) => [...prev, data.user]);
        else if (data.type === 'delete' && data.id) setUsers((prev: User[]) => prev.filter(u => String(u.id) !== String(data.id)));
        else if (data.type === 'update' && data.user) setUsers((prev: User[]) => prev.map(u => String(u.id) === String(data.user.id) ? { ...u, ...data.user } : u));
      }
      return res;
    } finally {
      stopSubmitting();
    }
  }, [startSubmitting, stopSubmitting, user?.role, setUsers]);

  const manageBranches = useCallback(async (data: any) => {
    startSubmitting();
    try {
      const currentRole = user?.role || 'Admin';
      const res = await GoogleSheetsService.manageBranches(data, currentRole);
      if (res.success) {
        if (data.type === 'add' && data.branch) setBranches((prev: Branch[]) => [...prev, { id: data.branch.name, name: data.branch.name, Current_Balance: 0, currentBalance: 0 }]);
        else if (data.type === 'delete' && data.name) setBranches((prev: Branch[]) => prev.filter(b => normalizeArabic(b.name) !== normalizeArabic(data.name)));
      }
      return res;
    } finally {
      stopSubmitting();
    }
  }, [startSubmitting, stopSubmitting, user?.role, setBranches]);

  const updateSettings = useCallback(async (serviceList: string[], expenseList: string[]) => {
    startSubmitting();
    try {
      const res = await GoogleSheetsService.updateSettings({ serviceList: serviceList.join(','), expenseList: expenseList.join(',') }, user?.role || 'Admin');
      if (res.success) {
        setServiceTypes(serviceList);
        setExpenseCategories(expenseList);
      }
      return res;
    } finally {
      stopSubmitting();
    }
  }, [startSubmitting, stopSubmitting, user?.role, setServiceTypes, setExpenseCategories]);

  return {
    syncAll,
    handleLogin,
    handleLogout,
    addEntry,
    updateEntry,
    addExpense,
    deleteExpense,
    deliverOrder,
    branchTransfer,
    checkIn,
    checkOut,
    deleteStock,
    manageUsers,
    manageBranches,
    updateSettings
  };
};
