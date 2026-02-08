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
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-blue-900">لوحة الإدارة</h1>
                    <p className="text-gray-500 text-sm">إدارة الموظفين والفروع</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
                    <button
                        onClick={() => setActiveTab('employees')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'employees' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        الموظفين
                    </button>
                    <button
                        onClick={() => setActiveTab('branches')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'branches' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Building2 className="w-4 h-4" />
                        الفروع
                    </button>
                    <button
                        onClick={() => setActiveTab('lists')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'lists' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
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
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50 transition-transform hover:scale-110" />

                            <h2 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2 relative">
                                <UserPlus className="w-5 h-5 text-blue-600" />
                                {editingUser ? 'تعديل موظف' : 'إضافة موظف جديد'}
                            </h2>

                            <form onSubmit={editingUser ? handleUpdateUser : handleAddUser} className="space-y-4 relative">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 px-1">ID الموظف</label>
                                    <div className="relative">
                                        <Shield className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            disabled={!!editingUser}
                                            placeholder="رقم المعرف الثابت"
                                            className="w-full pr-10 pl-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-sm disabled:opacity-50"
                                            value={editingUser ? editingUser.id : newUser.id || ''}
                                            onChange={(e) => setNewUser({ ...newUser, id: toEnglishDigits(e.target.value) })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 px-1">الاسم الكامل</label>
                                    <input
                                        type="text"
                                        placeholder="اسم الموظف"
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-sm"
                                        value={editingUser ? editingUser.name : newUser.name || ''}
                                        onChange={(e) => editingUser ? setEditingUser({ ...editingUser, name: e.target.value }) : setNewUser({ ...newUser, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 px-1">كلمة المرور</label>
                                    <div className="relative">
                                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="كلمة المرور"
                                            className="w-full pr-10 pl-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-sm"
                                            value={editingUser ? editingUser.password : newUser.password || ''}
                                            onChange={(e) => editingUser ? setEditingUser({ ...editingUser, password: toEnglishDigits(e.target.value) }) : setNewUser({ ...newUser, password: toEnglishDigits(e.target.value) })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1 px-1">الدور</label>
                                        <select
                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-sm appearance-none"
                                            value={editingUser ? editingUser.role : newUser.role || 'موظف'}
                                            onChange={(e) => editingUser ? setEditingUser({ ...editingUser, role: e.target.value }) : setNewUser({ ...newUser, role: e.target.value })}
                                        >
                                            <option value="Admin">مدير</option>
                                            <option value="مساعد">مساعد</option>
                                            <option value="موظف">موظف</option>
                                            <option value="مشاهد">مشاهد</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1 px-1">الفرع المخصص</label>
                                        <select
                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-sm appearance-none"
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

                                <div className="flex gap-2 pt-2">
                                    <button
                                        disabled={isSubmitting}
                                        type="submit"
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 group"
                                    >
                                        {editingUser ? <Save className="w-5 h-5" /> : <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform" />}
                                        {isSubmitting ? 'جاري التنفيذ...' : (editingUser ? 'حفظ التغييرات' : 'إضافة الموظف')}
                                    </button>
                                    {editingUser && (
                                        <button
                                            type="button"
                                            onClick={() => setEditingUser(null)}
                                            className="px-4 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
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
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-full">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-blue-600" />
                                    قائمة الموظفين
                                    <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full">{users.length}</span>
                                </h2>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">الموظف</th>
                                            <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">الدور / الفرع</th>
                                            <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">كلمة المرور</th>
                                            <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {users.map((u) => (
                                            <tr key={u.id} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div>
                                                            <div className="text-sm font-black text-gray-900">{u.name}</div>
                                                            <div className="text-[10px] text-gray-400 font-bold font-mono">ID: {toEnglishDigits(String(u.id))}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`w-fit px-2 py-1 rounded-lg text-[10px] font-black ${u.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                                                            u.role === 'مساعد' ? 'bg-orange-100 text-orange-700' :
                                                                u.role === 'مشاهد' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-green-100 text-green-700'
                                                            }`}>
                                                            {u.role}
                                                        </span>
                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500 mr-0.5">
                                                            <MapPin className="w-3 h-3 text-gray-400" />
                                                            {u.assignedBranchId || 'غير محدد'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <code className="text-[10px] bg-gray-100 px-2 py-1 rounded border font-mono font-bold">{toEnglishDigits(String(u.password))}</code>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setEditingUser(u)}
                                                            className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(String(u.id), u.name)}
                                                            className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
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
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -mr-16 -mt-16 opacity-50" />

                            <h2 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2 relative">
                                <PlusCircle className="w-5 h-5 text-green-600" />
                                إضافة فرع جديد
                            </h2>

                            <form onSubmit={handleAddBranch} className="space-y-4 relative">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 px-1">اسم الفرع</label>
                                    <div className="relative">
                                        <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="اسم الفرع"
                                            className="w-full pr-10 pl-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-green-500 focus:bg-white outline-none transition-all font-bold text-sm"
                                            value={newBranch.name}
                                            onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 px-1">عنوان الـ IP المسموح (اختياري)</label>
                                    <div className="relative border-b border-gray-100 pb-2">
                                        <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="0.0.0.0"
                                            className="w-full pr-10 pl-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-green-500 focus:bg-white outline-none transition-all font-bold text-sm"
                                            value={newBranch.ip}
                                            onChange={(e) => setNewBranch({ ...newBranch, ip: toEnglishDigits(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <button
                                    disabled={isSubmitting}
                                    type="submit"
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2"
                                >
                                    <Save className="w-5 h-5" />
                                    {isSubmitting ? 'جاري التنفيذ...' : 'إضافة الفرع'}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex items-center bg-gray-50/30">
                                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-green-600" />
                                    قائمة الفروع المسجلة
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                                {branches.map((b) => (
                                    <div key={b.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-green-100 hover:bg-green-50/30 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-black text-gray-900">{b.name}</div>
                                                <div className="text-[10px] text-gray-400 font-bold">الرصيد: {toEnglishDigits(String(b.Current_Balance || b.currentBalance || 0))} ج.م</div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDeleteBranch(b.name)}
                                            className="w-8 h-8 rounded-lg bg-white shadow-sm border border-gray-100 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
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
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50 transition-transform hover:scale-110" />
                        <h2 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2 relative">
                            <Shield className="w-5 h-5 text-blue-600" />
                            إدارة أنواع الخدمات
                        </h2>

                        <div className="space-y-4 relative">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    id="service-input"
                                    placeholder="أضف خدمة جديدة..."
                                    className="flex-1 px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-sm"
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
                                    className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                                >
                                    <PlusCircle className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                                {serviceTypes.map((type, idx) => (
                                    <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 font-bold text-xs group transition-all hover:bg-white hover:shadow-sm">
                                        {type}
                                        <button
                                            onClick={() => handleUpdateLists(serviceTypes.filter(t => t !== type), expenseCategories)}
                                            className="text-blue-300 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Expenses Management */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 opacity-50 transition-transform hover:scale-110" />
                        <h2 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2 relative">
                            <Key className="w-5 h-5 text-orange-600" />
                            إدارة بنود المصروفات
                        </h2>

                        <div className="space-y-4 relative">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    id="expense-input"
                                    placeholder="أضف بند مصروفات..."
                                    className="flex-1 px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-sm"
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
                                    className="p-3 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 transition-colors shadow-lg shadow-orange-100"
                                >
                                    <PlusCircle className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                                {expenseCategories.map((cat, idx) => (
                                    <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 rounded-xl border border-orange-100 font-bold text-xs group transition-all hover:bg-white hover:shadow-sm">
                                        {cat}
                                        <button
                                            onClick={() => handleUpdateLists(serviceTypes, expenseCategories.filter(c => c !== cat))}
                                            className="text-orange-300 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
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
