import { useState, useEffect } from 'react';
import { ServiceEntry, Expense, Branch, StockItem, User } from '../types';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { normalizeArabic, normalizeDate } from '../utils';

export const useAppState = () => {
  // Initialize state from localStorage if available
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('target_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [branch, setBranch] = useState<Branch | null>(() => {
    try {
      const saved = localStorage.getItem('target_branch');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [currentDate, setCurrentDate] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('target_date');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [entries, setEntries] = useState<ServiceEntry[]>(() => {
    try {
      const saved = localStorage.getItem('target_entries');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem('target_expenses');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const [stock, setStock] = useState<StockItem[]>(() => {
    try {
      const saved = localStorage.getItem('target_stock');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const [isSyncing, setIsSyncing] = useState(false);

  /**
   * دالة المزامنة الشاملة مع دمج البيانات للحفاظ على ما لم يُرفع بعد
   */
  const syncAll = async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      // 1. مزامنة العمليات
      const remoteEntries = await GoogleSheetsService.getData<any>('Entries');
      if (Array.isArray(remoteEntries)) {
        const mappedEntries: ServiceEntry[] = remoteEntries
          .filter(Boolean)
          .map((e: any) => {
            // التعامل مع كائنات التاريخ أو النصوص بطريقة آمنة للمناطق الزمنية
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
                  dateStr = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
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
              status: (e.status || e['الحالة'] || 'active') as 'active' | 'cancelled',
              timestamp: Number(e.timestamp || e['التوقيت'] || Date.now()),
              recordedBy: String(e.recordedBy || e['الموظف'] || e['سجل بواسطة'] || '').trim(),
              barcode: e.barcode || e['الباركود'],
              speed: e.speed || e['السرعة'] || undefined,
              hasThirdParty: e.hasThirdParty === true || e.hasThirdParty === 'true' || !!e.thirdPartyName || false,
              thirdPartyName: e.thirdPartyName || e['اسم المورد'],
              thirdPartyCost: Number(e.thirdPartyCost || e['تكلفة المورد'] || 0),
              isElectronic: e.isElectronic === true || e.isElectronic === 'true' || false,
              electronicAmount: Number(e.electronicAmount || 0),
              electronicMethod: e.electronicMethod,
              parentEntryId: e.parentEntryId || e['المعاملة الأم']
            };
          });

        setEntries(prev => {
          const mergedMap = new Map();
          (Array.isArray(prev) ? prev : []).forEach(item => { if (item && item.id) mergedMap.set(item.id, item); });
          mappedEntries.forEach(item => {
            if (item && item.id && item.id !== 'undefined') {
              mergedMap.set(item.id, item);
            }
          });
          return Array.from(mergedMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        });
      }

      // 2. مزامنة المصروفات
      const remoteExpenses = await GoogleSheetsService.getData<any>('Expenses');
      if (Array.isArray(remoteExpenses)) {
        const mappedExpenses: Expense[] = remoteExpenses
          .filter(Boolean)
          .map((ex: any) => {
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
              relatedEntryId: ex.relatedEntryId || ex['رقم المعاملة'] || ex['Order_ID']
            };
          });

        setExpenses(prev => {
          const mergedMap = new Map();
          (Array.isArray(prev) ? prev : []).forEach(item => { if (item && item.id) mergedMap.set(item.id, item); });
          mappedExpenses.forEach(item => {
            if (item && item.id && item.id !== 'undefined') {
              mergedMap.set(item.id, item);
            }
          });
          return Array.from(mergedMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        });
      }

      // 3. مزامنة المخزون (Stock)
      const remoteStock = await GoogleSheetsService.getData<any>('Stock');
      if (Array.isArray(remoteStock)) {
        const mappedStock: StockItem[] = remoteStock
          .filter(Boolean)
          .map((s: any) => ({
            barcode: String(s.barcode || s.Barcode || s['الباركود'] || ''),
            category: (s.category || s.Category || s['الفئة'] || 'عادي') as any,
            branch: String(s.branch || s.Branch || s['الفرع'] || ''),
            status: (s.status || s.Status || s['الحالة'] || 'Available') as any,
            created_at: Number(s.created_at || s.Created_At || s.timestamp || Date.now()),
            used_by: s.used_by || s.Used_By || s['الموظف'] || '',
            order_id: s.order_id || s.Order_ID || s['رقم الطلب'] || ''
          }));
        setStock(mappedStock);
        localStorage.setItem('target_stock', JSON.stringify(mappedStock));
      }
    } catch (error) {
      console.error("Sync Error:", error);
    } finally {
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

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('target_user', JSON.stringify(userData));
    localStorage.setItem('target_is_logged_in', 'true');
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

  const handleSessionSetup = (selectedBranch: Branch, date: string) => {
    setBranch(selectedBranch);
    setCurrentDate(date);
  };

  const addEntry = async (entry: ServiceEntry): Promise<boolean> => {
    const sheetEntry = {
      ...entry,
      date: entry.entryDate,
      recordedBy: user?.name || '',
      'اسم العميل': entry.clientName,
      'الفرع': entry.branchId,
      'التكلفة': entry.serviceCost,
      'المحصل': entry.amountPaid,
      'المتبقي': entry.remainingAmount
    };

    // إضافة محلية فورية
    setEntries(prev => [entry, ...prev]);

    const success = await GoogleSheetsService.addRow('Entries', sheetEntry, user?.role || 'موظف');
    if (!success) {
      console.error("Failed to sync entry to server");
    }
    return success;
  };

  const updateEntry = async (updatedEntry: ServiceEntry): Promise<boolean> => {
    // تحديث محلي سريع
    setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));

    // تحضير البيانات للمزامنة (تحويل الأسماء العربية للأعمدة لضمان المطابقة في الشيت)
    const sheetEntry = {
      ...updatedEntry,
      'معرف': updatedEntry.id,
      'التاريخ': updatedEntry.entryDate,
      'اسم العميل': updatedEntry.clientName,
      'الفرع': updatedEntry.branchId,
      'التكلفة': updatedEntry.serviceCost,
      'المحصل': updatedEntry.amountPaid,
      'المتبقي': updatedEntry.remainingAmount,
      'الحالة': updatedEntry.status,
      'ملاحظات': updatedEntry.notes || ''
    };

    const success = await GoogleSheetsService.updateEntry('Entries', sheetEntry, user?.role || 'موظف');
    if (!success) {
      console.error("Failed to sync update to server");
    }
    return success;
  };

  const addExpense = async (expense: Expense): Promise<boolean> => {
    const sheetExpense = {
      ...expense,
      'التاريخ': expense.date,
      'البند': expense.category,
      'المبلغ': expense.amount,
      'الفرع': expense.branchId,
      'رقم المعاملة': expense.relatedEntryId
    };

    setExpenses(prev => [{ ...expense, recordedBy: user?.name || '' }, ...prev]);
    return await GoogleSheetsService.addRow('Expenses', sheetExpense, user?.role || 'موظف');
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
    syncAll,
    handleLogin,
    handleLogout,
    handleSessionSetup,
    addEntry,
    updateEntry,
    addExpense,
    setBranch,
    setCurrentDate
  };
};