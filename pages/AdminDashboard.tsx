import React, { useState } from 'react';
import { User, Branch } from '../types';
import {
    Users, Building2, UserPlus, Trash2, Edit3, Shield, MapPin,
    Lock, Key, Save, X, PlusCircle, AlertCircle, List
} from 'lucide-react';
import { normalizeArabic, toEnglishDigits } from '../utils';
import { useModal } from '../context/ModalContext';

interface AdminDashboardProps {
    users: User[];
    branches: Branch[];
    serviceTypes: string[];
    expenseCategories: string[];
    onManageUsers: (data: any) => Promise<{ success: boolean; message?: string }>;
    onManageBranches: (data: any) => Promise<{ success: boolean; message?: string }>;
    onUpdateSettings: (serviceList: string[], expenseList: string[]) => Promise<{ success: boolean; message?: string }>;
    isSubmitting: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
    users, branches, serviceTypes, expenseCategories, onManageUsers, onManageBranches, onUpdateSettings, isSubmitting
}) => {
    const [activeTab, setActiveTab] = useState<'employees' | 'branches' | 'lists'>('employees');
    const { showModal, showQuickStatus } = useModal();

    // States for Forms
    const [newUser, setNewUser] = useState<Partial<User>>({ role: 'موظف' });
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
            setNewUser({ role: 'موظف' });
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
        <div className={`p-4 md:p-8 space-y-8 transition-opacity animate-premium-in ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Header */}
            <div className="bg-[#033649] p-4 md:p-6 rounded-[2.5rem] shadow-premium flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 text-white">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#00A6A6]/20 rounded-2xl flex items-center justify-center text-[#00A6A6] shadow-lg border border-[#00A6A6]/20 backdrop-blur-md">
                        <Lock className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight">إدارة النظام</h2>
                        <p className="text-white/40 text-[10px] font-black tracking-[0.2em] uppercase mt-0.5">تحكم كامل في الموظفين والفروع</p>
                    </div>
                </div>

                <div className="flex bg-white/5 p-1.5 rounded-[1.5rem] backdrop-blur-md border border-white/10 shadow-inner">
                    <button
                        onClick={() => setActiveTab('employees')}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl font-black text-sm transition-all duration-300 ${activeTab === 'employees' ? 'bg-[#00A6A6] text-white shadow-lux' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Users className="w-4 h-4" />
                        الموظفين
                    </button>
                    <button
                        onClick={() => setActiveTab('branches')}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl font-black text-sm transition-all duration-300 ${activeTab === 'branches' ? 'bg-[#00A6A6] text-white shadow-lux' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Building2 className="w-4 h-4" />
                        الفروع
                    </button>
                    <button
                        onClick={() => setActiveTab('lists')}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl font-black text-sm transition-all duration-300 ${activeTab === 'lists' ? 'bg-[#00A6A6] text-white shadow-lux' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <List className="w-4 h-4" />
                        القوائم
                    </button>
                </div>
            </div>

            {activeTab === 'employees' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form Side */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-premium p-8 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-1000" />

                            <h2 className="text-xl font-black text-[#033649] mb-8 flex items-center gap-3 relative">
                                <div className="p-2 bg-blue-500/10 rounded-xl">
                                    <UserPlus className="w-6 h-6 text-blue-600" />
                                </div>
                                {editingUser ? 'تعديل موظف' : 'إضافة موظف جديد'}
                            </h2>

                            <form onSubmit={editingUser ? handleUpdateUser : handleAddUser} className="space-y-6 relative">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-[#033649]/40 uppercase tracking-widest mr-1">ID الموظف</label>
                                        <div className="relative">
                                            <Shield className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#033649]/30" />
                                            <input
                                                type="text"
                                                disabled={!!editingUser}
                                                placeholder="001"
                                                className="w-full pr-12 pl-4 py-4 border border-[#033649]/10 rounded-2xl bg-[#033649]/5 text-[#033649] font-black placeholder-[#033649]/30 focus:bg-white focus:border-[#00A6A6] focus:ring-4 focus:ring-[#00A6A6]/5 outline-none transition-all shadow-sm disabled:opacity-50"
                                                value={editingUser ? editingUser.id : newUser.id || ''}
                                                onChange={(e) => setNewUser({ ...newUser, id: toEnglishDigits(e.target.value) })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-[#033649]/40 uppercase tracking-widest mr-1">الاسم الكامل</label>
                                        <input
                                            type="text"
                                            placeholder="احمد محمد"
                                            className="w-full px-4 py-4 border border-[#033649]/10 rounded-2xl bg-[#033649]/5 text-[#033649] font-black placeholder-[#033649]/30 focus:bg-white focus:border-[#00A6A6] focus:ring-4 focus:ring-[#00A6A6]/5 outline-none transition-all shadow-sm"
                                            value={editingUser ? editingUser.name : newUser.name || ''}
                                            onChange={(e) => editingUser ? setEditingUser({ ...editingUser, name: e.target.value }) : setNewUser({ ...newUser, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-[#033649]/40 uppercase tracking-widest mr-1">كلمة المرور</label>
                                    <div className="relative">
                                        <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#033649]/30" />
                                        <input
                                            type="text"
                                            placeholder="••••••"
                                            className="w-full pr-12 pl-4 py-4 border border-[#033649]/10 rounded-2xl bg-[#033649]/5 text-[#033649] font-black placeholder-[#033649]/30 focus:bg-white focus:border-[#00A6A6] focus:ring-4 focus:ring-[#00A6A6]/5 outline-none transition-all shadow-sm"
                                            value={editingUser ? editingUser.password : newUser.password || ''}
                                            onChange={(e) => editingUser ? setEditingUser({ ...editingUser, password: toEnglishDigits(e.target.value) }) : setNewUser({ ...newUser, password: toEnglishDigits(e.target.value) })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-[#033649]/40 uppercase tracking-widest mr-1">الصلاحية</label>
                                        <select
                                            className="w-full px-4 py-4 border border-[#033649]/10 rounded-2xl bg-[#033649]/5 text-[#033649] font-black focus:bg-white focus:border-[#00A6A6] outline-none transition-all shadow-sm appearance-none"
                                            value={editingUser ? editingUser.role : newUser.role || 'موظف'}
                                            onChange={(e) => editingUser ? setEditingUser({ ...editingUser, role: e.target.value }) : setNewUser({ ...newUser, role: e.target.value })}
                                        >
                                            <option value="Admin">مدير</option>
                                            <option value="مساعد">مساعد</option>
                                            <option value="موظف">موظف</option>
                                            <option value="مشاهد">مشاهد</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-[#033649]/40 uppercase tracking-widest mr-1">الفرع المخصص</label>
                                        <select
                                            className="w-full px-4 py-4 border border-[#033649]/10 rounded-2xl bg-[#033649]/5 text-[#033649] font-black focus:bg-white focus:border-[#00A6A6] outline-none transition-all shadow-sm appearance-none"
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
                                            className="px-6 bg-white border border-[#033649]/10 text-gray-400 font-bold rounded-2xl hover:bg-gray-50 transition-colors shadow-sm"
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
                            <div className="p-8 border-b border-[#033649]/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                                    <h2 className="text-xl font-black text-[#033649] flex items-center gap-2">
                                        قائمة الموظفين
                                        <span className="bg-blue-500/10 text-blue-600 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest">{users.length}</span>
                                    </h2>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-[#033649] text-white/50 text-[10px] font-black tracking-[0.2em] uppercase border-b border-white/5">
                                            <th className="py-5 px-8 text-right">الموظف والبيانات</th>
                                            <th className="py-5 px-6 text-center">الصلاحية والفرع</th>
                                            <th className="py-5 px-6 text-center">كلمة المرور</th>
                                            <th className="py-5 px-8 text-center">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#033649]/5 font-bold relative">
                                        {users.map((u) => (
                                            <tr key={u.id} className="hover:bg-blue-500/5 transition-all group">
                                                <td className="py-5 px-8 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-lg font-black text-[#033649]">{u.name}</span>
                                                        <span className="text-[10px] text-gray-400 font-black font-mono tracking-widest flex items-center gap-1.5 uppercase">
                                                            <Shield className="w-3 h-3" />
                                                            معرف : {toEnglishDigits(String(u.id))}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-6 whitespace-nowrap text-center">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${u.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                                                            u.role === 'مساعد' ? 'bg-orange-100 text-orange-700' :
                                                                u.role === 'مشاهد' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-[#00A6A6]/10 text-[#00A6A6]'
                                                            }`}>
                                                            {u.role}
                                                        </span>
                                                        <span className="text-[10px] font-black text-gray-400 flex items-center gap-1.5 opacity-60">
                                                            <MapPin className="w-3 h-3" />
                                                            {u.assignedBranchId || 'غير محدد'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-6 whitespace-nowrap text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Lock className="w-3 h-3 text-[#033649]/20" />
                                                        <code className="text-sm font-black text-[#033649] tracking-tighter">{toEnglishDigits(String(u.password))}</code>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-8 whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <button
                                                            onClick={() => setEditingUser(u)}
                                                            className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
                                                        >
                                                            <Edit3 className="w-4.5 h-4.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(String(u.id), u.name)}
                                                            className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95"
                                                        >
                                                            <Trash2 className="w-4.5 h-4.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
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

                            <h2 className="text-xl font-black text-[#033649] mb-8 flex items-center gap-3 relative">
                                <div className="p-2 bg-green-500/10 rounded-xl">
                                    <PlusCircle className="w-6 h-6 text-green-600" />
                                </div>
                                إضافة فرع جديد
                            </h2>

                            <form onSubmit={handleAddBranch} className="space-y-6 relative">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-[#033649]/40 uppercase tracking-widest mr-1">اسم الفرع</label>
                                    <div className="relative">
                                        <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#033649]/30" />
                                        <input
                                            type="text"
                                            placeholder="فرع الجيزة"
                                            className="w-full pr-12 pl-4 py-4 border-2 border-[#00A6A6]/20 rounded-2xl bg-[#033649]/5 text-[#033649] font-black placeholder-[#033649]/30 focus:bg-white focus:border-[#00A6A6] focus:ring-4 focus:ring-[#00A6A6]/10 outline-none transition-all shadow-sm"
                                            value={newBranch.name}
                                            onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-[#033649]/40 uppercase tracking-widest mr-1">عنوان الـ IP المسموح (اختياري)</label>
                                    <div className="relative">
                                        <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#033649]/30" />
                                        <input
                                            type="text"
                                            placeholder="192.168.1.1"
                                            className="w-full pr-12 pl-4 py-4 border-2 border-[#00A6A6]/20 rounded-2xl bg-[#033649]/5 text-[#033649] font-black placeholder-[#033649]/30 focus:bg-white focus:border-[#00A6A6] focus:ring-4 focus:ring-[#00A6A6]/10 outline-none transition-all shadow-sm"
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
                            <div className="p-8 border-b border-[#033649]/5 flex items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-6 bg-green-600 rounded-full"></div>
                                    <h2 className="text-xl font-black text-[#033649] flex items-center gap-2">
                                        قائمة الفروع المسجلة
                                        <span className="bg-green-500/10 text-green-600 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest">{branches.length}</span>
                                    </h2>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8">
                                {branches.map((b) => (
                                    <div key={b.id} className="relative overflow-hidden group bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-[#033649]/5 hover:border-green-100 hover:bg-green-50/50 transition-all duration-300">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-125 transition-transform" />
                                        <div className="flex items-center justify-between relative z-10">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-600 shadow-sm">
                                                    <MapPin className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <div className="text-lg font-black text-[#033649]">{b.name}</div>
                                                    <div className="text-[11px] text-gray-400 font-bold flex items-center gap-2 mt-1">
                                                        <span className="text-[#033649]/40">الرصيد :</span>
                                                        <span className="text-green-600 font-black">{toEnglishDigits(String(b.Current_Balance || b.currentBalance || 0))} ج.م</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleDeleteBranch(b.name)}
                                                className="w-10 h-10 rounded-xl bg-red-500/5 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100 active:scale-95"
                                            >
                                                <Trash2 className="w-4.5 h-4.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Lists Tab */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Services Management */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-premium p-8 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-1000" />
                        <h2 className="text-xl font-black text-[#033649] mb-8 flex items-center gap-3 relative">
                            <div className="p-2 bg-blue-500/10 rounded-xl">
                                <Shield className="w-6 h-6 text-blue-600" />
                            </div>
                            إدارة أنواع الخدمات
                        </h2>

                        <div className="space-y-6 relative">
                            <div className="flex gap-4">
                                <input
                                    type="text"
                                    id="service-input"
                                    placeholder="أضف خدمة جديدة..."
                                    className="flex-1 px-5 py-4 border-2 border-[#00A6A6]/20 rounded-2xl bg-[#033649]/5 text-[#033649] font-black placeholder-[#033649]/30 focus:bg-white focus:border-[#00A6A6] focus:ring-4 focus:ring-[#00A6A6]/10 outline-none transition-all shadow-sm"
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
                                    className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lux active:scale-95"
                                >
                                    <PlusCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-3 pt-2">
                                {serviceTypes.map((type, idx) => (
                                    <div key={idx} className="flex items-center gap-3 px-4 py-2.5 bg-[#00A6A6]/10 text-[#00A6A6] rounded-xl border border-[#00A6A6]/20 font-black text-xs group transition-all hover:bg-white hover:shadow-lux">
                                        {type}
                                        <button
                                            onClick={() => handleUpdateLists(serviceTypes.filter(t => t !== type), expenseCategories)}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Expenses Management */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-premium p-8 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-1000" />
                        <h2 className="text-xl font-black text-[#033649] mb-8 flex items-center gap-3 relative">
                            <div className="p-2 bg-orange-500/10 rounded-xl">
                                <Key className="w-6 h-6 text-orange-600" />
                            </div>
                            إدارة بنود المصروفات
                        </h2>

                        <div className="space-y-6 relative">
                            <div className="flex gap-4">
                                <input
                                    type="text"
                                    id="expense-input"
                                    placeholder="أضف بند مصروفات..."
                                    className="flex-1 px-5 py-4 border-2 border-[#00A6A6]/20 rounded-2xl bg-[#033649]/5 text-[#033649] font-black placeholder-[#033649]/30 focus:bg-white focus:border-[#00A6A6] focus:ring-4 focus:ring-[#00A6A6]/10 outline-none transition-all shadow-sm"
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
                                    className="p-4 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 transition-all shadow-lux active:scale-95"
                                >
                                    <PlusCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-3 pt-2">
                                {expenseCategories.map((cat, idx) => (
                                    <div key={idx} className="flex items-center gap-3 px-4 py-2.5 bg-orange-50 text-orange-700 rounded-xl border border-orange-100 font-black text-xs group transition-all hover:bg-white hover:shadow-lux">
                                        {cat}
                                        <button
                                            onClick={() => handleUpdateLists(serviceTypes, expenseCategories.filter(c => c !== cat))}
                                            className="text-orange-300 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
