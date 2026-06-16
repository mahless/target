import { useState, useEffect, useRef } from 'react';
import { ServiceEntry, Expense, Branch, StockItem, User } from '../types';
import { normalizeArabic } from '../utils';
import { useModal } from '../context/ModalContext';
import { SERVICE_TYPES, EXPENSE_CATEGORIES, ROLES } from '../constants';
import { useAppActions } from './useAppActions';

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
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const setCurrentDate = (_date: string) => {};

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const startSubmitting = () => {
    setIsSubmitting(true);
    setIsProcessing(true);
  };

  const stopSubmitting = () => {
    setIsSubmitting(false);
    setIsProcessing(false);
  };

  const [attendanceStatus, setAttendanceStatus] = useState<'checked-in' | 'checked-out'>('checked-out');
  const [attendanceDate, setAttendanceDate] = useState<string | null>(null);

  useEffect(() => {
    const savedStatus = localStorage.getItem('target_attendance_status');
    const savedDate = localStorage.getItem('target_attendance_date');
    const today = new Date().toISOString().split('T')[0];

    if (savedStatus && savedDate === today) {
      setAttendanceStatus(savedStatus as 'checked-in' | 'checked-out');
      setAttendanceDate(savedDate);
    } else {
      setAttendanceStatus('checked-out');
      setAttendanceDate(null);
      localStorage.removeItem('target_attendance_status');
      localStorage.removeItem('target_attendance_date');
    }
  }, []);

  // Save data locally when changed
  useEffect(() => { if (user) localStorage.setItem('target_user', JSON.stringify(user)); else localStorage.removeItem('target_user'); }, [user]);
  useEffect(() => { if (branch) localStorage.setItem('target_branch', JSON.stringify(branch)); else localStorage.removeItem('target_branch'); }, [branch]);
  useEffect(() => { if (currentDate) localStorage.setItem('target_date', JSON.stringify(currentDate)); else localStorage.removeItem('target_date'); }, [currentDate]);
  useEffect(() => { localStorage.setItem('target_entries', JSON.stringify(entries)); }, [entries]);
  useEffect(() => { localStorage.setItem('target_expenses', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('target_stock', JSON.stringify(stock)); }, [stock]);
  useEffect(() => { localStorage.setItem('target_branches', JSON.stringify(branches)); }, [branches]);
  useEffect(() => { localStorage.setItem('target_admin_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('target_service_types', JSON.stringify(serviceTypes)); }, [serviceTypes]);
  useEffect(() => { localStorage.setItem('target_expense_categories', JSON.stringify(expenseCategories)); }, [expenseCategories]);

  // Auto-assign branch and date
  useEffect(() => {
    if (user?.id !== lastUserId.current) {
      hasAutoAssigned.current = false;
      lastUserId.current = user?.id || null;
    }
    if (user && !hasAutoAssigned.current && branches.length > 0) {
      const isManager = normalizeArabic(user.role || '') === normalizeArabic(ROLES.MANAGER);
      if (isManager && !branch) {
        const allBranch = { id: 'all', name: 'كل الفروع' } as any;
        setBranch(allBranch);
        hasAutoAssigned.current = true;
      } else if (user.assignedBranchId && !branch) {
        const assignedBranch = branches.find(b => normalizeArabic(b.id) === normalizeArabic(user.assignedBranchId!));
        if (assignedBranch) {
          setBranch(assignedBranch);
          hasAutoAssigned.current = true;
        }
      }
    }
  }, [user, branch, branches]);

  const state = { user, branch, currentDate, entries, expenses, stock, branches, users, serviceTypes, expenseCategories, attendanceStatus };
  const setters = { setUser, setBranch, setCurrentDate, setEntries, setExpenses, setStock, setBranches, setUsers, setServiceTypes, setExpenseCategories, setAttendanceStatus };

  const actions = useAppActions(state, setters, isSubmitting, startSubmitting, stopSubmitting, isSyncing, setIsSyncing);

  // Sync on mount or when user/branch changes
  useEffect(() => {
    if (user) actions.syncAll();
  }, [branch?.id, currentDate, user?.id, actions.syncAll]); // Included actions.syncAll

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
    attendanceStatus,
    startSubmitting,
    stopSubmitting,
    serviceTypes,
    expenseCategories,
    setBranch,
    setCurrentDate,
    branches,
    users,
    ...actions
  };
};