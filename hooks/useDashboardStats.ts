import { useMemo } from 'react';
import { ServiceEntry, Expense } from '../types';
import { normalizeDate } from '../utils';

export const useDashboardStats = (entries: ServiceEntry[], expenses: Expense[], currentDate: string) => {
  return useMemo(() => {
    const normDate = normalizeDate(currentDate);

    // 1. حساب المحصل الفعلي اليوم (Cash In):
    // نستخدم الـ entries الممررة مباشرة لأنها مفلترة فعلاً في الـ Dashboard
    // نشمل جميع الحالات باستثناء "الملغي" لضمان دقة الإحصائيات أثناء المعالجة
    const nonCancelledToday = entries.filter(e => e.status !== 'cancelled');
    const totalCollectedToday = nonCancelledToday.reduce((acc, curr) => acc + (Number(curr.amountPaid) || 0), 0);

    // 2. حساب إجمالي رسوم الإلغاء (لليوم)
    const cancelledToday = entries.filter(e => e.status === 'cancelled');
    const adminFeesToday = cancelledToday.reduce((acc, curr) => acc + (Number(curr.adminFee) || 0), 0);

    const totalRevenueToday = totalCollectedToday + adminFeesToday;

    // 3. حساب مبالغ آجلة لخدمات بدأت اليوم (Market Debt Today)
    // ملاحظة: الحقل remainingAmount محدث بالفعل ليشمل أي تحصيلات تمت اليوم، 
    // لذا لا داعي لطرح settledTodayFromTodayNew مرة أخرى لضمان عدم الحساب بالسالب.
    const newServicesToday = nonCancelledToday.filter(e => !e.parentEntryId);
    const netRemainingToday = newServicesToday.reduce((acc, curr) => acc + (Number(curr.remainingAmount) || 0), 0);

    // 4. مبالغ الطرف الثالث المعلقة
    const pendingThirdPartyToday = nonCancelledToday.reduce((acc, curr) => {
      return acc + (!curr.isCostPaid ? (Number(curr.thirdPartyCost) || 0) : 0);
    }, 0);

    // 5. إجمالي المصروفات اليوم
    const totalExpensesToday = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    return {
      revenue: totalRevenueToday,
      remaining: netRemainingToday,
      expenses: totalExpensesToday,
      netCash: totalRevenueToday - totalExpensesToday,
      pendingThirdParty: pendingThirdPartyToday
    };
  }, [entries, expenses, currentDate]);
};