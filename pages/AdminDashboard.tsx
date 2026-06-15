import React, { useState, useEffect, useMemo } from 'react';
import { User, Branch, ServiceEntry, Expense } from '../types';
import {
 Users, Building2, UserPlus, Trash2, Edit3, Shield, MapPin,
 Lock, Key, Save, X, PlusCircle, AlertCircle, List,
 TrendingUp, Activity, ArrowUpRight, ArrowDownRight, BarChart2, PieChart as PieChartIcon, ListChecks
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { normalizeArabic, normalizeDate, toEnglishDigits } from '../utils';
import { useModal } from '../context/ModalContext';
import { ROLES, BRANCHES } from '../constants';

// Memoized components for list items (S8: Performance optimization)
const UserRow = React.memo<{ user: User; onEdit: (user: User) => void; onDelete: (id: string, name: string) => void }>(({ user, onEdit, onDelete }) => (
 <tr className="hover:bg-blue-500/5 transition-all group">
 <td className="py-2 px-4 whitespace-nowrap">
 <div className="flex flex-col gap-0.5">
 <span className="text-xs md:text-sm font-black text-[#01404E]">{user.name}</span>
 <span className="text-[9px] text-gray-400 font-black font-mono flex items-center gap-1 uppercase">
 <Shield className="w-2.5 h-2.5" />
 معرف : {toEnglishDigits(String(user.id))}
 </span>
 </div>
 </td>
 <td className="py-2 px-4 whitespace-nowrap text-center">
 <div className="flex flex-col items-center gap-1">
 <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${user.role === ROLES.ADMIN ? 'bg-purple-100 text-purple-700' :
 user.role === ROLES.ASSISTANT ? 'bg-orange-100 text-orange-700' :
 user.role === ROLES.VIEWER ? 'bg-blue-100 text-blue-700' :
 'bg-[#00A6A6]/10 text-[#00A6A6]'
 }`}>
 {user.role}
 </span>
 <span className="text-[9px] font-black text-gray-400 flex items-center gap-1 opacity-60">
 <MapPin className="w-2.5 h-2.5" />
 {user.assignedBranchId || 'غير محدد'}
 </span>
 </div>
 </td>
 <td className="py-2 px-4 whitespace-nowrap text-center">
 <div className="flex items-center justify-center gap-1.5">
 <Lock className="w-2.5 h-2.5 text-[#01404E]/20" />
 <code className="text-[10px] md:text-xs font-black text-[#01404E]">{toEnglishDigits(String(user.password))}</code>
 </div>
 </td>
 <td className="py-2 px-4 whitespace-nowrap">
 <div className="flex items-center justify-center gap-2">
 <button
 onClick={() => onEdit(user)}
 className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
 >
 <Edit3 className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => onDelete(String(user.id), user.name)}
 className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </td>
 </tr>
));

const BranchCard = React.memo<{ branch: Branch; onDelete: (name: string) => void }>(({ branch, onDelete }) => (
 <div className="relative overflow-hidden group bg-white/50 backdrop-blur-md p-4 rounded-3xl border border-[#01404E]/5 hover:border-green-100 hover:bg-green-50/50 transition-all duration-300">
 <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-125 transition-transform" />
 <div className="flex items-center justify-between relative z-10">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-600 shadow-sm">
 <MapPin className="w-5 h-5" />
 </div>
 <div>
 <div className="text-base md:text-lg font-black text-[#01404E] break-all">{branch.name}</div>
 <div className="text-[11px] text-gray-400 font-bold flex flex-wrap items-center gap-2 mt-1">
 <span className="text-[#01404E]/40">الرصيد :</span>
 <span className="text-green-600 font-black">{toEnglishDigits(String(branch.Current_Balance || branch.currentBalance || 0))} ج.م</span>
 </div>
 </div>
 </div>
 <button
 onClick={() => onDelete(branch.name)}
 className="w-10 h-10 rounded-xl bg-red-500/5 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100 active:scale-95"
 >
 <Trash2 className="w-4.5 h-4.5" />
 </button>
 </div>
 </div>
));

const ServiceTag = React.memo<{ service: string; onDelete: (service: string) => void }>(({ service, onDelete }) => (
 <div className="flex items-center gap-3 px-4 py-2.5 bg-[#00A6A6]/10 text-[#00A6A6] rounded-xl border border-[#00A6A6]/20 font-black text-xs group transition-all hover:bg-white hover:shadow-lux">
 {service}
 <button
 onClick={() => onDelete(service)}
 className="text-gray-400 hover:text-red-500 transition-colors"
 >
 <X className="w-4 h-4" />
 </button>
 </div>
));

const ExpenseTag = React.memo<{ category: string; onDelete: (category: string) => void }>(({ category, onDelete }) => (
 <div className="flex items-center gap-3 px-4 py-2.5 bg-orange-50 text-orange-700 rounded-xl border border-orange-100 font-black text-xs group transition-all hover:bg-white hover:shadow-lux">
 {category}
 <button
 onClick={() => onDelete(category)}
 className="text-orange-300 hover:text-red-500 transition-colors"
 >
 <X className="w-4 h-4" />
 </button>
 </div>
));

interface AdminDashboardProps {
 users: User[];
 branches: Branch[];
 serviceTypes: string[];
 expenseCategories: string[];
 entries: ServiceEntry[];
 expenses: Expense[];
 onManageUsers: (data: any) => Promise<{ success: boolean; message?: string }>;
 onManageBranches: (data: any) => Promise<{ success: boolean; message?: string }>;
 onUpdateSettings: (serviceList: string[], expenseList: string[]) => Promise<{ success: boolean; message?: string }>;
 isSubmitting: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
 users, branches, serviceTypes, expenseCategories, entries, expenses, onManageUsers, onManageBranches, onUpdateSettings, isSubmitting
}) => {
  const [activeTab, setActiveTab] = useState<'employees' | 'branches' | 'lists' | 'performance'>(() => {
  return (sessionStorage.getItem('admin-dashboard-active-tab') as any) || 'employees';
  });

  // Performance tab state
  const today = new Date().toISOString().split('T')[0];
  const [perfStartDate, setPerfStartDate] = useState(today);
  const [perfEndDate, setPerfEndDate] = useState(today);

  const performanceData = useMemo(() => {
  const sDate = normalizeDate(perfStartDate);
  const eDate = normalizeDate(perfEndDate);
  const fEntries = entries.filter(e => {
    const d = normalizeDate(e.entryDate);
    return d >= sDate && d <= eDate;
  });
  const fExpenses = expenses.filter(ex => {
    const d = normalizeDate(ex.date);
    return d >= sDate && d <= eDate;
  });
  return { entries: fEntries, expenses: fExpenses };
  }, [entries, expenses, perfStartDate, perfEndDate]);

 useEffect(() => {
 sessionStorage.setItem('admin-dashboard-active-tab', activeTab);
 }, [activeTab]);
 const { showModal, showQuickStatus } = useModal();

 // States for Forms
 const [newUser, setNewUser] = useState<Partial<User>>({ role: ROLES.EMPLOYEE });
 const [newBranch, setNewBranch] = useState({ name: '', ip: '' });
 const [editingUser, setEditingUser] = useState<User | null>(null);

 const handleAddUser = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newUser.id || !newUser.name || !newUser.password) {
 showQuickStatus('يرجى ملء كافة البيانات الأساسية', 'error');
 return;
 }
 const res = await onManageUsers({ type: 'add', user: newUser });
 if (res.success) {
 showQuickStatus(res.message || 'تمت الإضافة بنجاح');
 setNewUser({ role: ROLES.EMPLOYEE });
 } else {
 showQuickStatus(res.message || 'فشل الإضافة', 'error');
 }
 };

 const handleUpdateUser = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!editingUser) return;
 const res = await onManageUsers({ type: 'update', user: editingUser });
 if (res.success) {
 showQuickStatus('تم التحديث بنجاح');
 setEditingUser(null);
 } else {
 showQuickStatus(res.message || 'فشل التحديث', 'error');
 }
 };

 const handleDeleteUser = async (id: string, name: string) => {
 showModal({
 title: 'تأكيد حذف موظف',
 type: 'danger',
 content: (
 <div className="space-y-4 text-right">
 <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
 <p className="text-sm font-black text-red-700 mb-1">تنبيه:</p>
 <p className="text-[11px] text-red-600 font-bold leading-relaxed">هل أنت متأكد من حذف الموظف: <span className="underline font-black">{name}</span>؟ هذا الإجراء لا يمكن التراجع عنه.</p>
 </div>
 </div>
 ),
 confirmText: 'تأكيد الحذف النهائي',
 onConfirm: async () => {
 const res = await onManageUsers({ type: 'delete', id });
 if (res.success) {
 showQuickStatus('تم الحذف بنجاح');
 } else {
 showQuickStatus(res.message || 'فشل الحذف', 'error');
 }
 }
 });
 };

 const handleAddBranch = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newBranch.name) return;
 const res = await onManageBranches({ type: 'add', branch: newBranch });
 if (res.success) {
 showQuickStatus('تم إضافة الفرع بنجاح');
 setNewBranch({ name: '', ip: '' });
 } else {
 showQuickStatus(res.message || 'فشل الإضافة', 'error');
 }
 };

 const handleDeleteBranch = async (name: string) => {
 showModal({
 title: 'تأكيد حذف فرع',
 type: 'danger',
 content: (
 <div className="space-y-4 text-right">
 <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
 <p className="text-sm font-black text-red-700 mb-1">تنبيه:</p>
 <p className="text-[11px] text-red-600 font-bold leading-relaxed">هل أنت متأكد من حذف فرع: <span className="underline font-black">{name}</span>؟ سيتم حذف كافة الإعدادات المرتبطة به.</p>
 </div>
 </div>
 ),
 confirmText: 'تأكيد حذف الفرع',
 onConfirm: async () => {
 const res = await onManageBranches({ type: 'delete', name });
 if (res.success) {
 showQuickStatus('تم حذف الفرع');
 } else {
 showQuickStatus(res.message || 'فشل الحذف', 'error');
 }
 }
 });
 };

 const handleUpdateLists = async (newServices: string[], newExpenses: string[]) => {
 const res = await onUpdateSettings(newServices, newExpenses);
 if (res.success) {
 showQuickStatus('تم تحديث القوائم بنجاح');
 } else {
 showQuickStatus(res.message || 'فشل تحديث القوائم', 'error');
 }
 };

 return (
 <div className={`px-3 pb-3 pt-1 md:px-5 md:pb-5 md:pt-2 space-y-4 transition-opacity animate-premium-in ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
 {/* Header sitting on background */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-[#01404E]">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 bg-[#00A6A6]/10 rounded-2xl flex items-center justify-center text-[#00A6A6] shadow-sm border border-[#00A6A6]/20">
 <Lock className="w-5 h-5" />
 </div>
 <div>
 <h2 className="text-lg font-black text-[#01404E]">إدارة الموظفين والفروع</h2>
 </div>
 </div>

 <div className="flex bg-white/50 p-1.5 rounded-[1.5rem] border border-white/40 shadow-premium overflow-x-auto max-w-full">
 <button
 onClick={() => setActiveTab('employees')}
 className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs md:text-sm transition-all duration-300 whitespace-nowrap ${activeTab === 'employees' ? 'bg-[#00A6A6] text-white shadow-lux' : 'text-[#01404E]/40 hover:text-[#01404E] hover:bg-white/50'}`}
 >
 <Users className="w-3.5 h-3.5" />
 الموظفين
 </button>
 <button
 onClick={() => setActiveTab('branches')}
 className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs md:text-sm transition-all duration-300 whitespace-nowrap ${activeTab === 'branches' ? 'bg-[#00A6A6] text-white shadow-lux' : 'text-[#01404E]/40 hover:text-[#01404E] hover:bg-white/50'}`}
 >
 <Building2 className="w-3.5 h-3.5" />
 الفروع
 </button>
 <button
 onClick={() => setActiveTab('lists')}
 className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs md:text-sm transition-all duration-300 whitespace-nowrap ${activeTab === 'lists' ? 'bg-[#00A6A6] text-white shadow-lux' : 'text-[#01404E]/40 hover:text-[#01404E] hover:bg-white/50'}`}
 >
 <List className="w-3.5 h-3.5" />
 القوائم
 </button>
 <button
 onClick={() => setActiveTab('performance')}
 className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs md:text-sm transition-all duration-300 whitespace-nowrap ${activeTab === 'performance' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-[#01404E]/40 hover:text-[#01404E] hover:bg-white/50'}`}
 >
 <BarChart2 className={`w-3.5 h-3.5 ${activeTab === 'performance' ? 'animate-pulse' : ''}`} />
 أداء الفروع
 </button>
 </div>
 </div>

 {activeTab === 'employees' ? (
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
 {/* Form Side */}
 <div className="lg:col-span-1 space-y-4">
 <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-premium p-4 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-1000" />

 <h2 className="text-base font-black text-[#01404E] mb-8 flex items-center gap-3 relative">
 <div className="p-2 bg-blue-500/10 rounded-xl">
 <UserPlus className="w-6 h-6 text-blue-600" />
 </div>
 {editingUser ? 'تعديل موظف' : 'إضافة موظف جديد'}
 </h2>

 <form onSubmit={editingUser ? handleUpdateUser : handleAddUser} className="space-y-4 relative">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="block text-[10px] font-black text-[#01404E]/40 uppercase mr-1">ID الموظف</label>
 <div className="relative">
 <Shield className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#01404E]/30" />
 <input
 type="text"
 disabled={!!editingUser}
 placeholder="001"
 className="w-full pr-12 pl-4 py-4 border border-[#01404E]/10 rounded-2xl bg-[#01404E]/5 text-[#01404E] font-black placeholder-[#01404E]/30 focus:bg-white focus:border-[#00A6A6] focus:ring-4 focus:ring-[#00A6A6]/5 outline-none transition-all shadow-sm disabled:opacity-50"
 value={editingUser ? editingUser.id : newUser.id || ''}
 maxLength={3}
 onChange={(e) => {
 const val = toEnglishDigits(e.target.value).slice(0, 3);
 setNewUser({ ...newUser, id: val });
 }}
 required
 />
 </div>
 </div>
 <div className="space-y-2">
 <label className="block text-[10px] font-black text-[#01404E]/40 uppercase mr-1">اسم الموظف</label>
 <input
 type="text"
 className="w-full px-4 py-4 border border-[#01404E]/10 rounded-2xl bg-[#01404E]/5 text-[#01404E] font-black placeholder-[#01404E]/30 focus:bg-white focus:border-[#00A6A6] focus:ring-4 focus:ring-[#00A6A6]/5 outline-none transition-all shadow-sm"
 value={editingUser ? editingUser.name : newUser.name || ''}
 onChange={(e) => editingUser ? setEditingUser({ ...editingUser, name: e.target.value }) : setNewUser({ ...newUser, name: e.target.value })}
 required
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="block text-[10px] font-black text-[#01404E]/40 uppercase mr-1">كلمة المرور</label>
 <div className="relative">
 <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#01404E]/30" />
 <input
 type="text"
 placeholder="••••••"
 className="w-full pr-12 pl-4 py-4 border border-[#01404E]/10 rounded-2xl bg-[#01404E]/5 text-[#01404E] font-black placeholder-[#01404E]/30 focus:bg-white focus:border-[#00A6A6] focus:ring-4 focus:ring-[#00A6A6]/5 outline-none transition-all shadow-sm"
 value={editingUser ? editingUser.password : newUser.password || ''}
 maxLength={4}
 onChange={(e) => {
 const val = toEnglishDigits(e.target.value).slice(0, 4);
 editingUser
 ? setEditingUser({ ...editingUser, password: val })
 : setNewUser({ ...newUser, password: val });
 }}
 required
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="block text-[10px] font-black text-[#01404E]/40 uppercase mr-1">الصلاحية</label>
 <select
 className="w-full px-4 py-4 border border-[#01404E]/10 rounded-2xl bg-[#01404E]/5 text-[#01404E] font-black focus:bg-white focus:border-[#00A6A6] outline-none transition-all shadow-sm appearance-none"
 value={editingUser ? editingUser.role : newUser.role || ROLES.EMPLOYEE}
 onChange={(e) => editingUser ? setEditingUser({ ...editingUser, role: e.target.value as any }) : setNewUser({ ...newUser, role: e.target.value as any })}
 >
 <option value={ROLES.ADMIN}>مدير</option>
 <option value={ROLES.ASSISTANT}>مساعد</option>
 <option value={ROLES.EMPLOYEE}>موظف</option>
 <option value={ROLES.VIEWER}>مشاهد</option>
 </select>
 </div>
 <div className="space-y-2">
 <label className="block text-[10px] font-black text-[#01404E]/40 uppercase mr-1">الفرع المخصص</label>
 <select
 className="w-full px-6 py-4 border border-[#01404E]/10 rounded-2xl bg-[#01404E]/5 text-[#01404E] font-black focus:bg-white focus:border-[#00A6A6] outline-none transition-all shadow-sm appearance-none"
 value={editingUser ? editingUser.assignedBranchId : newUser.assignedBranchId || ''}
 onChange={(e) => editingUser ? setEditingUser({ ...editingUser, assignedBranchId: e.target.value }) : setNewUser({ ...newUser, assignedBranchId: e.target.value })}
 >
 <option value="">اختر فرعاً...</option>
 {branches.map(b => (
 <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 </select>
 </div>
 </div>

 <div className="flex gap-4 pt-4">
 <button
 disabled={isSubmitting}
 type="submit"
 className={`flex-1 relative overflow-hidden group/btn font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all duration-500 shadow-lux active:scale-[0.98] ${isSubmitting ? 'bg-gray-100 text-gray-300' : 'bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:shadow-blue-600/20'}`}
 >
 <div className="absolute top-0 left-0 w-full h-full bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform"></div>
 <div className="relative z-10 flex items-center gap-2">
 {editingUser ? <Save className="w-5 h-5" /> : <PlusCircle className="w-5 h-5 group-hover/btn:rotate-90 transition-transform" />}
 <span>{isSubmitting ? 'جاري التنفيذ...' : (editingUser ? 'حفظ التغيرات' : 'إضافة الموظف')}</span>
 </div>
 </button>
 {editingUser && (
 <button
 type="button"
 onClick={() => setEditingUser(null)}
 className="px-6 bg-white border border-[#01404E]/10 text-gray-400 font-bold rounded-2xl hover:bg-gray-50 transition-colors shadow-sm"
 >
 <X className="w-5 h-5" />
 </button>
 )}
 </div>
 </form>
 </div>

 <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3">
 <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
 <p className="text-xs text-amber-800 font-bold leading-relaxed">
 تنبيه: يتم التعامل مع الـ ID كنص ثابت دائماً. تأكد من إدخال ID فريد لكل موظف لمنع تداخل الجلسات.
 </p>
 </div>
 </div>

 {/* List Side */}
 <div className="lg:col-span-2">
 <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-premium overflow-hidden">
 <div className="p-4 md:p-3 border-b border-[#01404E]/5 flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
 <h2 className="text-base font-black text-[#01404E] flex items-center gap-2">
 قائمة الموظفين
 <span className="bg-blue-500/10 text-blue-600 text-[10px] px-3 py-1 rounded-full font-black uppercase">{users.length}</span>
 </h2>
 </div>
 </div>

 <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
 <table className="w-full border-collapse">
 <thead className="sticky top-0 z-20 bg-[#01404E]">
 <tr className="bg-[#01404E] text-white/50 text-[10px] font-black ] uppercase border-b border-white/5">
 <th className="py-3 px-4 text-right">الموظف والبيانات</th>
 <th className="py-3 px-4 text-center">الصلاحية والفرع</th>
 <th className="py-3 px-4 text-center">كلمة المرور</th>
 <th className="py-3 px-4 text-center">إجراءات</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[#01404E]/5 font-bold text-sm relative">
 {users.map((u) => (
 <UserRow key={u.id} user={u} onEdit={setEditingUser} onDelete={handleDeleteUser} />
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </div>
 ) : activeTab === 'branches' ? (
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 <div className="lg:col-span-1 space-y-6">
 <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-premium p-8 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-1000" />

 <h2 className="text-base font-black text-[#01404E] mb-8 flex items-center gap-3 relative">
 <div className="p-2 bg-green-500/10 rounded-xl">
 <PlusCircle className="w-6 h-6 text-green-600" />
 </div>
 إضافة فرع جديد
 </h2>

 <form onSubmit={handleAddBranch} className="space-y-6 relative">
 <div className="space-y-2">
 <label className="block text-[10px] font-black text-[#01404E]/40 uppercase mr-1">اسم الفرع</label>
 <div className="relative">
 <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#01404E]/30" />
 <input
 type="text"
 placeholder="فرع الجيزة"
 className="w-full pr-12 pl-4 py-4 border-2 border-[#00A6A6]/20 rounded-2xl bg-[#01404E]/5 text-[#01404E] font-black placeholder-[#01404E]/30 focus:bg-white focus:border-[#00A6A6] focus:ring-4 focus:ring-[#00A6A6]/10 outline-none transition-all shadow-sm"
 value={newBranch.name}
 onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
 required
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="block text-[10px] font-black text-[#01404E]/40 uppercase mr-1">عنوان الـ IP المسموح (اختياري)</label>
 <div className="relative">
 <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#01404E]/30" />
 <input
 type="text"
 placeholder="192.168.1.1"
 className="w-full pr-12 pl-4 py-4 border-2 border-[#00A6A6]/20 rounded-2xl bg-[#01404E]/5 text-[#01404E] font-black placeholder-[#01404E]/30 focus:bg-white focus:border-[#00A6A6] focus:ring-4 focus:ring-[#00A6A6]/10 outline-none transition-all shadow-sm"
 value={newBranch.ip}
 onChange={(e) => setNewBranch({ ...newBranch, ip: toEnglishDigits(e.target.value) })}
 />
 </div>
 </div>

 <button
 disabled={isSubmitting}
 type="submit"
 className={`w-full relative overflow-hidden group/btn font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all duration-500 shadow-lux active:scale-[0.98] ${isSubmitting ? 'bg-gray-100 text-gray-300' : 'bg-gradient-to-r from-green-600 to-green-800 text-white hover:shadow-green-600/20'}`}
 >
 <div className="absolute top-0 left-0 w-full h-full bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform"></div>
 <div className="relative z-10 flex items-center gap-2">
 <Save className="w-5 h-5" />
 <span>{isSubmitting ? 'جاري التنفيذ...' : 'إضافة الفرع'}</span>
 </div>
 </button>
 </form>
 </div>
 </div>

 <div className="lg:col-span-2">
 <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-premium overflow-hidden">
 <div className="p-4 md:p-6 border-b border-[#01404E]/5 flex items-center">
 <div className="flex items-center gap-4">
 <div className="w-1.5 h-6 bg-green-600 rounded-full"></div>
 <h2 className="text-base font-black text-[#01404E] flex items-center gap-2">
 قائمة الفروع المسجلة
 <span className="bg-green-500/10 text-green-600 text-[10px] px-3 py-1 rounded-full font-black uppercase">{branches.length}</span>
 </h2>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-6">
 {branches.map((b) => (
 <BranchCard key={b.id} branch={b} onDelete={handleDeleteBranch} />
 ))}
 </div>
 </div>
 </div>
 </div>
 ) : activeTab === 'lists' ? (
 /* Lists Tab */
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Services Management */}
 <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-premium p-5 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-1000" />
 <h2 className="text-base font-black text-[#01404E] mb-8 flex items-center gap-3 relative">
 <div className="p-2 bg-blue-500/10 rounded-xl">
 <Shield className="w-6 h-6 text-blue-600" />
 </div>
 إدارة أنواع الخدمات
 </h2>

 <div className="space-y-4 relative">
 <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
 <input
 type="text"
 id="service-input"
 placeholder="أضف خدمة جديدة..."
 className="flex-1 px-5 py-4 border-2 border-[#00A6A6]/20 rounded-2xl bg-[#01404E]/5 text-[#01404E] font-black placeholder-[#01404E]/30 focus:bg-white focus:border-[#00A6A6] focus:ring-4 focus:ring-[#00A6A6]/10 outline-none transition-all shadow-sm"
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 const val = e.currentTarget.value.trim();
 if (val && !serviceTypes.includes(val)) {
 handleUpdateLists([...serviceTypes, val], expenseCategories);
 e.currentTarget.value = '';
 }
 }
 }}
 />
 <button
 onClick={() => {
 const input = document.getElementById('service-input') as HTMLInputElement;
 const val = input.value.trim();
 if (val && !serviceTypes.includes(val)) {
 handleUpdateLists([...serviceTypes, val], expenseCategories);
 input.value = '';
 }
 }}
 className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lux active:scale-95 w-full sm:w-auto flex justify-center items-center"
 >
 <PlusCircle className="w-6 h-6" />
 </button>
 </div>

 <div className="flex flex-wrap gap-3 pt-2">
 {serviceTypes.map((type, idx) => (
 <ServiceTag key={idx} service={type} onDelete={(t) => handleUpdateLists(serviceTypes.filter(s => s !== t), expenseCategories)} />
 ))}
 </div>
 </div>
 </div>

 {/* Expenses Management */}
 <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-premium p-5 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-1000" />
 <h2 className="text-base font-black text-[#01404E] mb-8 flex items-center gap-3 relative">
 <div className="p-2 bg-orange-500/10 rounded-xl">
 <Key className="w-6 h-6 text-orange-600" />
 </div>
 إدارة بنود المصروفات
 </h2>

 <div className="space-y-4 relative">
 <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
 <input
 type="text"
 id="expense-input"
 placeholder="أضف بند مصروفات..."
 className="flex-1 px-5 py-4 border-2 border-[#00A6A6]/20 rounded-2xl bg-[#01404E]/5 text-[#01404E] font-black placeholder-[#01404E]/30 focus:bg-white focus:border-[#00A6A6] focus:ring-4 focus:ring-[#00A6A6]/10 outline-none transition-all shadow-sm"
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 const val = e.currentTarget.value.trim();
 if (val && !expenseCategories.includes(val)) {
 handleUpdateLists(serviceTypes, [...expenseCategories, val]);
 e.currentTarget.value = '';
 }
 }
 }}
 />
 <button
 onClick={() => {
 const input = document.getElementById('expense-input') as HTMLInputElement;
 const val = input.value.trim();
 if (val && !expenseCategories.includes(val)) {
 handleUpdateLists(serviceTypes, [...expenseCategories, val]);
 input.value = '';
 }
 }}
 className="p-4 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 transition-all shadow-lux active:scale-95 w-full sm:w-auto flex justify-center items-center"
 >
 <PlusCircle className="w-6 h-6" />
 </button>
 </div>

 <div className="flex flex-wrap gap-3 pt-2">
 {expenseCategories.map((cat, idx) => (
 <ExpenseTag key={idx} category={cat} onDelete={(c) => handleUpdateLists(serviceTypes, expenseCategories.filter(exp => exp !== c))} />
 ))}
 </div>
 </div>
 </div>
 </div>
 ) : activeTab === 'performance' ? (
 <div className="space-y-2">
 {/* Performance Header & Internal Filters */}
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/50 p-4 rounded-[2rem] border border-white/40 shadow-premium">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
 <BarChart2 className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-lg font-black text-[#01404E]">تحليلات أداء الفروع</h3>
 <p className="text-[10px] text-blue-600 font-black uppercase mt-0.5">مقارنة الفروع والنمو</p>
 </div>
 </div>

 <div className="flex items-center gap-3 bg-white/60 p-2 rounded-2xl border border-white/40 shadow-inner">
 <div className="flex items-center gap-2">
 <span className="text-[10px] font-black text-[#01404E]/60">من:</span>
 <input
 type="date"
 value={perfStartDate}
 onChange={(e) => setPerfStartDate(toEnglishDigits(e.target.value))}
 className="bg-transparent border-none text-xs font-black text-[#01404E] focus:ring-0 p-0 w-[110px]"
 />
 </div>
 <div className="w-px h-4 bg-[#01404E]/10"></div>
 <div className="flex items-center gap-2">
 <span className="text-[10px] font-black text-[#01404E]/60">إلى:</span>
 <input
 type="date"
 value={perfEndDate}
 onChange={(e) => setPerfEndDate(toEnglishDigits(e.target.value))}
 className="bg-transparent border-none text-xs font-black text-[#01404E] focus:ring-0 p-0 w-[110px]"
 />
 </div>
 </div>
 </div>

 {/* Performance Analytics Content */}
 {(() => {
 const chartData = branches.map(b => {
 const bEntries = performanceData.entries.filter(e => normalizeArabic(e.branchId || '') === normalizeArabic(b.name));
 const bExpenses = performanceData.expenses.filter(ex => normalizeArabic(ex.branchId || '') === normalizeArabic(b.name));

 const revenue = bEntries.reduce((sum, e) => {
 const amount = e.serviceType === 'تحويل وارد' ? (e.serviceCost || 0) : (e.amountPaid || 0);
 return sum + amount;
 }, 0);
 const debt = bEntries.reduce((sum, e) => sum + (e.remainingAmount || 0), 0);
 const expenseValue = bExpenses.reduce((sum, ex) => sum + (ex.amount || 0), 0);

 return {
 name: b.name,
 إيرادات: revenue,
 مصروفات: expenseValue,
 صافي: revenue - expenseValue,
 مديونية: debt,
 عمليات: bEntries.length
 };
 }).filter(d => d.إيرادات > 0 || d.مصروفات > 0 || d.عمليات > 0 || d.مديونية > 0)
 .sort((a, b) => b.إيرادات - a.إيرادات);

 const topBranch = chartData[0] || { name: '-', إيرادات: 0 };
 const mostActive = [...chartData].sort((a, b) => b.عمليات - a.عمليات)[0] || { name: '-', عمليات: 0 };

 return (
 <div className="space-y-2">
 {/* Performance Mini Stats */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="bg-white/80 p-4 rounded-3xl border border-white/40 shadow-premium flex items-center gap-4">
 <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center">
 <TrendingUp className="w-6 h-6" />
 </div>
 <div>
 <p className="text-[10px] text-gray-400 font-black uppercase">أعلى فرع إيراداً</p>
 <p className="text-base font-black text-[#01404E]">{topBranch.name}</p>
 </div>
 </div>
 <div className="bg-white/80 p-4 rounded-3xl border border-white/40 shadow-premium flex items-center gap-4">
 <div className="w-12 h-12 bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center">
 <Activity className="w-6 h-6" />
 </div>
 <div>
 <p className="text-[10px] text-gray-400 font-black uppercase">الأكثر حركية</p>
 <p className="text-base font-black text-[#01404E]">{mostActive.name}</p>
 </div>
 </div>
 <div className="bg-white/80 p-4 rounded-3xl border border-white/40 shadow-premium flex items-center gap-4">
 <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center">
 <ArrowUpRight className="w-6 h-6" />
 </div>
 <div>
 <p className="text-[10px] text-gray-400 font-black uppercase">إجمالي العائد</p>
 <p className="text-base font-black text-[#01404E]">{performanceData.entries.reduce((sum, e) => sum + (e.serviceType === 'تحويل وارد' ? e.serviceCost : e.amountPaid), 0).toLocaleString()} ج.م</p>
 </div>
 </div>
 <div className="bg-white/80 p-4 rounded-3xl border border-white/40 shadow-premium flex items-center gap-4">
 <div className="w-12 h-12 bg-red-500/10 text-red-600 rounded-2xl flex items-center justify-center">
 <ArrowDownRight className="w-6 h-6" />
 </div>
 <div>
 <p className="text-[10px] text-gray-400 font-black uppercase">إجمالي النفقات</p>
 <p className="text-base font-black text-[#01404E]">{performanceData.expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()} ج.م</p>
 </div>
 </div>
 </div>

 {/* Charts Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
 {/* Bar Chart */}
 <div className="bg-white/80 backdrop-blur-xl p-4 rounded-[2.5rem] border border-white/40 shadow-premium">
 <h4 className="text-sm font-black text-[#01404E] mb-2 flex items-center gap-2">
 <BarChart2 className="w-4 h-4 text-blue-600" />
 مقارنة الإيرادات والمصروفات للفروع
 </h4>
 <div className="h-[350px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#01404E' }} />
 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#01404E' }} />
 <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 900 }} itemStyle={{ fontSize: '12px' }} />
 <Legend verticalAlign="top" height={36} wrapperStyle={{ fontWeight: 900, fontSize: '12px' }} />
 <Bar dataKey="إيرادات" fill="#00A6A6" radius={[6, 6, 0, 0]} barSize={20} />
 <Bar dataKey="مصروفات" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={20} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Pie Chart */}
 <div className="bg-white/80 backdrop-blur-xl p-4 rounded-[2.5rem] border border-white/40 shadow-premium">
 <h4 className="text-sm font-black text-[#01404E] mb-2 flex items-center gap-2">
 <PieChartIcon className="w-4 h-4 text-red-600" />
 توزيع المديونيات على الفروع (المتبقي)
 </h4>
 <div className="h-[350px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie data={chartData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="مديونية">
 {chartData.map((_entry, index) => (
 <Cell key={`cell-${index}`} fill={['#ef4444', '#f97316', '#dc2626', '#b91c1c', '#991b1b'][index % 5]} />
 ))}
 </Pie>
 <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 900 }} />
 <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontWeight: 900, fontSize: '12px' }} />
 </PieChart>
 </ResponsiveContainer>
 </div>
 </div>
 </div>

 {/* Performance Leaderboard Table */}
 <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/40 shadow-premium overflow-hidden">
 <div className="p-6 border-b border-[#01404E]/5 flex items-center justify-between">
 <h4 className="text-sm font-black text-[#01404E] flex items-center gap-2">
 <ListChecks className="w-4 h-4 text-blue-600" />
 ترتيب أداء الفروع
 </h4>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-[#01404E]/5">
 <tr className="text-[10px] md:text-xs font-black uppercase text-gray-400 border-b border-[#01404E]/5">
 <th className="py-4 px-6 text-right">الفرع</th>
 <th className="py-4 px-6 text-center">الإيرادات</th>
 <th className="py-4 px-6 text-center">المصروفات</th>
 <th className="py-4 px-6 text-center">المديونية</th>
 <th className="py-4 px-6 text-center">الصافي</th>
 <th className="py-4 px-6 text-center">حجم العمليات</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[#01404E]/5">
 {chartData.map((data, idx) => (
 <tr key={data.name} className="hover:bg-blue-50/50 transition-all">
 <td className="py-4 px-6">
 <div className="flex items-center gap-3">
 <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
 {idx + 1}
 </span>
 <span className="font-black text-[#01404E] text-xs md:text-sm">{data.name}</span>
 </div>
 </td>
 <td className="py-4 px-6 text-center font-black text-emerald-600">+{data.إيرادات.toLocaleString()} ج.م</td>
 <td className="py-4 px-6 text-center font-black text-red-500">-{data.مصروفات.toLocaleString()} ج.م</td>
 <td className="py-4 px-6 text-center font-black text-orange-600">{data.مديونية.toLocaleString()} ج.م</td>
 <td className="py-4 px-6 text-center font-black text-[#01404E] text-xs md:text-sm">{data.صافي.toLocaleString()} ج.م</td>
 <td className="py-4 px-6 text-center font-black text-blue-600">{data.عمليات} عملية</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
 })()}
 </div>
 ) : null}
 </div>
 );
};

export default AdminDashboard;
