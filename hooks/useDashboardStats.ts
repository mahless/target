import { useMemo } from 'react';
import { ServiceEntry, Expense } from '../types';

export const useDashboardStats = (entries: ServiceEntry[], expenses: Expense[], currentDate: string) => {
  return useMemo(() => {
    // 1. حساب المحصل الفعلي اليوم (Cash In):
    const dailyEntries = entries.filter(e => e.entryDate === currentDate && e.status === 'active');
    const totalCollectedToday = dailyEntries.reduce((acc, curr) => acc + curr.amountPaid, 0);

    // 2. حساب إجمالي رسوم الإلغاء
    const cancelledToday = entries.filter(e => e.entryDate === currentDate && e.status === 'cancelled');
    const adminFeesToday = cancelledToday.reduce((acc, curr) => acc + (curr.adminFee || 0), 0);

    const totalRevenueToday = totalCollectedToday + adminFeesToday;

    // 3. حساب مبالغ آجلة لخدمات بدأت اليوم
    const newServicesToday = dailyEntries.filter(e => e.serviceType !== 'سداد مديونية');
    const paymentsToday = dailyEntries.filter(e => e.serviceType === 'سداد مديونية');

    const initialRemainingToday = newServicesToday.reduce((acc, curr) => acc + curr.remainingAmount, 0);
    const paymentsAgainstTodayServices = paymentsToday.filter(p =>
      newServicesToday.some(ns => ns.id === p.parentEntryId)
    );
    const settledTodayFromTodayNew = paymentsAgainstTodayServices.reduce((acc, curr) => acc + curr.amountPaid, 0);

    const netRemainingToday = initialRemainingToday - settledTodayFromTodayNew;

    // 4. إجمالي المصروفات اليوم
    const dailyExpenses = expenses.filter(ex => ex.date === currentDate);
    const totalExpensesToday = dailyExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    // 5. منطق تكاليف الطرف الثالث (الموردين)
    // نخصم فقط ما تم دفعه فعلياً للمورد
    const paidThirdPartyCosts = dailyEntries.reduce((acc, curr) => {
      if (curr.hasThirdParty && curr.thirdPartyCost && curr.isCostPaid) {
        return acc + curr.thirdPartyCost;
      }
      return acc;
    }, 0);

    // حساب الالتزامات (ما لم يخرج من الخزنة بعد) لليوم
    const pendingLiabilities = dailyEntries.reduce((acc, curr) => {
      if (curr.hasThirdParty && curr.thirdPartyCost && !curr.isCostPaid) {
        return acc + curr.thirdPartyCost;
      }
      return acc;
    }, 0);

    return {
      revenue: totalRevenueToday,
      remaining: netRemainingToday,
      expenses: totalExpensesToday,
      netCash: totalRevenueToday - totalExpensesToday - paidThirdPartyCosts,
      liabilities: pendingLiabilities
    };
  }, [entries, expenses, currentDate]);
};