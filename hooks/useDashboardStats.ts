import { useMemo } from 'react';
import { ServiceEntry, Expense } from '../types';

export const useDashboardStats = (entries: ServiceEntry[], expenses: Expense[], currentDate: string) => {
  return useMemo(() => {
    // 1. حساب المحصل الفعلي اليوم (Cash In):
    // نجمع كل الـ amountPaid لأي حركة (سواء خدمة جديدة أو سداد قديم) تمت في تاريخ اليوم
    const dailyEntries = entries.filter(e => e.entryDate === currentDate && e.status === 'active');
    const totalCollectedToday = dailyEntries.reduce((acc, curr) => acc + curr.amountPaid, 0);

    // 2. حساب إجمالي رسوم الإلغاء (في حال وجودها اليوم)
    const cancelledToday = entries.filter(e => e.entryDate === currentDate && e.status === 'cancelled');
    const adminFeesToday = cancelledToday.reduce((acc, curr) => acc + (curr.adminFee || 0), 0);

    const totalRevenueToday = totalCollectedToday + adminFeesToday;

    // 3. حساب مبالغ آجلة لخدمات بدأت اليوم (Market Debt Today)
    const newServicesToday = dailyEntries.filter(e => !e.parentEntryId);
    const paymentsToday = dailyEntries.filter(e => e.parentEntryId);

    // الدفعات التي تمت اليوم لخدمات بدأت أيضاً اليوم
    const paymentsAgainstTodayServices = paymentsToday.filter(p =>
      newServicesToday.some(ns => ns.id === p.parentEntryId)
    );

    const initialRemainingToday = newServicesToday.reduce((acc, curr) => acc + curr.remainingAmount, 0);
    const settledTodayFromTodayNew = paymentsAgainstTodayServices.reduce((acc, curr) => acc + curr.amountPaid, 0);

    const netRemainingToday = initialRemainingToday - settledTodayFromTodayNew;

    const pendingThirdPartyToday = dailyEntries.reduce((acc, curr) => {
      return acc + (!curr.isCostPaid ? (curr.thirdPartyCost || 0) : 0);
    }, 0);

    // 5. إجمالي المصروفات اليوم
    const dailyExpenses = expenses.filter(ex => ex.date === currentDate);
    const totalExpensesToday = dailyExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    return {
      revenue: totalRevenueToday,
      remaining: netRemainingToday,
      expenses: totalExpensesToday,
      netCash: totalRevenueToday - totalExpensesToday,
      pendingThirdParty: pendingThirdPartyToday
    };
  }, [entries, expenses, currentDate]);
};