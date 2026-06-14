import { useMemo } from 'react';
import { ServiceEntry, Expense } from '../types';
import { normalizeDate } from '../utils';

export const useDashboardStats = (entries: ServiceEntry[], expenses: Expense[], currentDate: string) => {
 return useMemo(() => {
 const normDate = normalizeDate(currentDate);

 // 1. حساب المحصل الفعلي اليوم (Cash In):
 // نستخدم الـ entries الممررة مباشرة لأنها مفلترة فعلاً في الـ Dashboard
  const ACTIVE_STATUSES = ['active', 'قيد المراجعة', 'قيد التنفيذ', 'جاهزة للتسليم'];
  const activeToday = entries.filter(e => !e.status || ACTIVE_STATUSES.includes(e.status));
  const totalCollectedToday = activeToday.reduce((acc, curr) => acc + (Number(curr.amountPaid) || 0), 0);

 // 2. حساب إجمالي رسوم الإلغاء (لليوم)
 const cancelledToday = entries.filter(e => e.status === 'cancelled');
 const adminFeesToday = cancelledToday.reduce((acc, curr) => acc + (Number(curr.adminFee) || 0), 0);

 const totalRevenueToday = totalCollectedToday + adminFeesToday;

 // 3. حساب مبالغ آجلة لخدمات بدأت اليوم (Market Debt Today)
 const newServicesToday = activeToday.filter(e => !e.parentEntryId);
 const paymentsToday = activeToday.filter(e => e.parentEntryId);

 // الدفعات التي تمت اليوم لخدمات بدأت أيضاً اليوم (سداد فوري أو جزئي)
 const paymentsAgainstTodayServices = paymentsToday.filter(p =>
 newServicesToday.some(ns => ns.id === p.parentEntryId)
 );

 const initialRemainingToday = newServicesToday.reduce((acc, curr) => acc + (Number(curr.remainingAmount) || 0), 0);
 const settledTodayFromTodayNew = paymentsAgainstTodayServices.reduce((acc, curr) => acc + (Number(curr.amountPaid) || 0), 0);

 const netRemainingToday = initialRemainingToday - settledTodayFromTodayNew;

 // 4. مبالغ الطرف الثالث المعلقة
 const pendingThirdPartyToday = activeToday.reduce((acc, curr) => {
 return acc + (!curr.isCostPaid ? (Number(curr.thirdPartyCost) || 0) : 0);
 }, 0);

 // 5. إجمالي المصروفات اليوم
 const totalExpensesToday = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

 // 6. إجمالي الدفع الإلكتروني اليوم
 // نحسب من العمليات الأصلية فقط (ليس السدادات) وغير الملغية
 const originalActiveToday = activeToday.filter(e => !e.parentEntryId);
 const totalElectronicToday = originalActiveToday.reduce((acc, curr) => acc + (Number(curr.electronicAmount) || 0), 0);

 return {
 revenue: totalRevenueToday,
 remaining: netRemainingToday,
 expenses: totalExpensesToday,
 netCash: totalRevenueToday - totalExpensesToday,
 pendingThirdParty: pendingThirdPartyToday,
 electronic: totalElectronicToday
 };
 }, [entries, expenses, currentDate]);
};