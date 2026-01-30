import React, { useState, useMemo } from 'react';
import { StockItem, Branch, StockCategory, StockStatus } from '../types';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { BRANCHES } from '../constants';
import { PlusCircle, Package, AlertCircle, CheckCircle2, Search, Filter, History, Trash2, Edit, ChevronDown } from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { toEnglishDigits } from '../utils';
import CustomSelect from '../components/CustomSelect';

interface AdminInventoryProps {
    stock: StockItem[];
    onRefresh: () => void;
    isSyncing: boolean;
    userRole: string;
    isSubmitting?: boolean;
    startSubmitting: () => void;
    stopSubmitting: () => void;
}

const AdminInventory: React.FC<AdminInventoryProps> = ({ stock, onRefresh, isSyncing, userRole, isSubmitting = false, startSubmitting, stopSubmitting }) => {
    const { showModal, hideModal, showQuickStatus } = useModal();
    // Removed local isSubmitting state
    const [newBarcodes, setNewBarcodes] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('الملكه');
    const [selectedCategory, setSelectedCategory] = useState<StockCategory>('عادي');

    const isManager = userRole === 'مدير';
    const canAddStock = userRole === 'مدير' || userRole === 'مساعد';

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StockStatus | 'All'>('All');

    const branchOptions = useMemo(() => BRANCHES.map(b => ({ id: b.id, name: b.name })), []);
    const categoryOptions = useMemo(() => [
        { id: 'عادي', name: 'عادي' },
        { id: 'مستعجل', name: 'مستعجل' },
        { id: 'فوري', name: 'فوري / سوبر فوري' }
    ], []);
    const statusOptions = useMemo(() => [
        { id: 'Available', name: 'متاح' },
        { id: 'Used', name: 'مستخدم' },
        { id: 'Error', name: 'خطأ / تالف' }
    ], []);

    const BarcodeEditForm: React.FC<{
        item: StockItem;
        onClose: () => void;
        onRefresh: () => void;
        userRole: string;
        startSubmitting: () => void;
        stopSubmitting: () => void;
    }> = ({ item, onClose, onRefresh, userRole, startSubmitting, stopSubmitting }) => {
        const barcode = item.barcode || (item as any).Barcode;
        const branchId = item.branch || (item as any).Branch;

        const [newBarcode, setNewBarcode] = useState(barcode);
        const [newBranchId, setNewBranchId] = useState(branchId);
        const [isPickingBranch, setIsPickingBranch] = useState(false);

        const currentBranchName = BRANCHES.find(b => b.id === newBranchId)?.name || 'اختر الفرع';

        if (isPickingBranch) {
            return (
                <div className="space-y-3 py-2 animate-fadeIn">
                    <div className="flex items-center justify-between mb-2">
                        <button
                            onClick={() => setIsPickingBranch(false)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1 font-bold text-xs"
                        >
                            <ChevronDown className="w-4 h-4 rotate-90" />
                            رجوع
                        </button>
                        <span className="font-black text-gray-700">اختر الفرع</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto custom-scrollbar p-1">
                        {BRANCHES.map(b => (
                            <button
                                key={b.id}
                                onClick={() => {
                                    setNewBranchId(b.id);
                                    setIsPickingBranch(false);
                                }}
                                className={`w-full p-4 rounded-2xl text-right font-bold transition-all flex items-center justify-between border-2 ${newBranchId === b.id
                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                    : 'border-gray-100 bg-white text-gray-600 hover:border-blue-200'
                                    }`}
                            >
                                <span>{b.name}</span>
                                {newBranchId === b.id && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-4 py-4 animate-fadeIn">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">رقم الباركود</label>
                    <input
                        type="text"
                        value={newBarcode}
                        onChange={(e) => setNewBarcode(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 text-right font-mono font-bold"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">الفرع المخصص</label>
                    <button
                        onClick={() => setIsPickingBranch(true)}
                        className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl flex items-center justify-between hover:bg-gray-100 transition-colors"
                    >
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                        <span className="font-bold text-gray-800">{currentBranchName}</span>
                    </button>
                </div>

                <div className="pt-4 border-t flex flex-col gap-3">
                    <div className="flex gap-2">
                        <button
                            onClick={() => onClose()}
                            className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-black text-sm hover:bg-gray-200 transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={async () => {
                                if (newBarcode === barcode && newBranchId === branchId) return;
                                startSubmitting();
                                try {
                                    const success = await GoogleSheetsService.updateStockItem(barcode, newBarcode, newBranchId, userRole);
                                    if (success) {
                                        onRefresh();
                                        onClose();
                                    } else {
                                        alert('فشل تحديث البيانات');
                                    }
                                } finally {
                                    stopSubmitting();
                                }
                            }}
                            className="flex-1 py-3 bg-blue-700 text-white rounded-xl font-black text-sm hover:bg-blue-800 shadow-lg shadow-blue-700/20 active:scale-95 transition-all"
                        >
                            حفظ التعديلات
                        </button>
                    </div>

                    <button
                        onClick={async () => {
                            if (!window.confirm('هل أنت متأكد من حذف هذا الباركود نهائياً؟')) return;
                            startSubmitting();
                            try {
                                const success = await GoogleSheetsService.deleteStockItem(barcode, userRole);
                                if (success) {
                                    onRefresh();
                                    onClose();
                                } else {
                                    alert('فشل الحذف');
                                }
                            } finally {
                                stopSubmitting();
                            }
                        }}
                        className="w-full py-2 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        حذف الباركود نهائياً
                    </button>
                </div>
            </div>
        );
    };

    const handleEditBarcode = (item: StockItem) => {
        showModal({
            title: 'تعديل بيانات الباركود',
            content: (
                <BarcodeEditForm
                    item={item}
                    onClose={hideModal}
                    onRefresh={onRefresh}
                    userRole={userRole}
                    startSubmitting={startSubmitting}
                    stopSubmitting={stopSubmitting}
                />
            ),
            hideFooter: true
        });
    };

    // إحصائيات المخزن
    const stats = useMemo(() => {
        const summary: Record<string, Record<string, number>> = {};

        BRANCHES.forEach(b => {
            summary[b.id] = {
                'عادي': 0,
                'مستعجل': 0,
                'فوري': 0
            };
        });

        stock.forEach(item => {
            // توحيد الحقول للحماية من اختلاف حالة الأحرف في الشيت
            const branch = item.branch || (item as any).Branch;
            const status = item.status || (item as any).Status;
            const category = item.category || (item as any).Category;

            if (status === 'Available' && summary[branch]) {
                if (summary[branch][category] !== undefined) {
                    summary[branch][category]++;
                }
            }
        });

        return summary;
    }, [stock]);

    const handleAddStock = async () => {
        const list = newBarcodes.split(/[\n, ]+/).filter(b => b.trim().length > 0);
        if (list.length === 0 || isSubmitting) return;

        startSubmitting();
        try {
            const items = list.map(barcode => ({
                barcode: barcode.trim(),
                category: selectedCategory,
                branch: selectedBranch,
                status: 'Available' as StockStatus,
                created_at: Date.now()
            }));

            const success = await GoogleSheetsService.addStockBatch(items, userRole);
            if (success) {
                showQuickStatus('تمت إضافة المخزون');
                setNewBarcodes('');
                onRefresh();
            } else {
                showQuickStatus('فشل التحميل', 'error');
            }
        } catch (err) {
            showQuickStatus('حدث خطأ', 'error');
        } finally {
            stopSubmitting();
        }
    };

    const filteredStock = useMemo(() => {
        return stock.filter(item => {
            const barcode = item.barcode || (item as any).Barcode || '';
            const usedBy = item.used_by || (item as any).Used_By || '';
            const status = item.status || (item as any).Status || '';

            const matchSearch = String(barcode).includes(searchTerm) || String(usedBy).includes(searchTerm);
            const matchStatus = statusFilter === 'All' || status === statusFilter;
            return matchSearch && matchStatus;
        }).sort((a, b) => {
            const timeA = a.created_at || (a as any).Created_At || 0;
            const timeB = b.created_at || (b as any).Created_At || 0;
            return (new Date(timeB).getTime()) - (new Date(timeA).getTime());
        });
    }, [stock, searchTerm, statusFilter]);

    const updateStatus = async (barcode: string, newStatus: StockStatus) => {
        if (isSubmitting) return;
        startSubmitting();
        try {
            const success = await GoogleSheetsService.updateStockStatus(barcode, newStatus, 'Admin Override', userRole);
            if (success) {
                showQuickStatus('تم تحديث الحالة');
                onRefresh();
            } else {
                showQuickStatus('فشل التحديث', 'error');
            }
        } catch (err) {
            showQuickStatus('حدث خطأ', 'error');
        } finally {
            stopSubmitting();
        }
    };

    return (
        <div className={`p-4 md:p-8 space-y-8 animate-fadeIn transition-opacity ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Header */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                        <Package className="text-blue-600 w-8 h-8" />
                        إدارة مخزن الباركودات
                    </h2>
                    <p className="text-sm text-gray-400 font-bold">تحكم في توزيع الأرقام ومراقبة الاستهلاك</p>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={isSyncing}
                    className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50"
                >
                    {isSyncing ? 'جاري التحديث...' : 'تحديث المخزن'}
                </button>
            </div>

            {/* Adding Stock Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-blue-100 shadow-sm space-y-6">
                    <h3 className="font-black text-blue-900 flex items-center gap-2">
                        <PlusCircle className="w-5 h-5" /> إضافة مخزون جديد
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <CustomSelect
                                label="الفرع المخصص"
                                options={branchOptions}
                                value={selectedBranch}
                                onChange={setSelectedBranch}
                            />
                        </div>

                        <div>
                            <CustomSelect
                                label="الفئة"
                                options={categoryOptions}
                                value={selectedCategory}
                                onChange={(v) => setSelectedCategory(v as StockCategory)}
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 block mb-2 mr-1">الباركودات (رقم في كل سطر أو مفصولة بفاصلة)</label>
                            <textarea
                                value={newBarcodes}
                                onChange={e => setNewBarcodes(toEnglishDigits(e.target.value))}
                                rows={5}
                                className="w-full bg-white border-2 border-blue-200 rounded-xl py-3 px-4 font-mono text-xs outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-600 shadow-sm"
                                placeholder="أدخل الأرقام هنا..."
                            />
                        </div>

                        <button
                            onClick={handleAddStock}
                            disabled={!canAddStock}
                            className={`w-full py-4 rounded-2xl font-black text-sm transition-all shadow-lg ${canAddStock ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                        >
                            {canAddStock ? 'تأكيد إضافة المخزون' : 'لا تملك صلاحية الإضافة'}
                        </button>
                    </div>
                </div>

                {/* Inventory Summary Dashboard */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {BRANCHES.map(b => (
                            <div key={b.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                                <p className="text-[10px] font-black text-gray-400 mb-4 border-b pb-2">{b.name}</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="text-center">
                                        <p className="text-[8px] font-bold text-gray-500 mb-1">عادي</p>
                                        <p className="text-xl font-black text-blue-600">{stats[b.id]?.['عادي'] || 0}</p>
                                    </div>
                                    <div className="text-center border-x">
                                        <p className="text-[8px] font-bold text-gray-500 mb-1">مستعجل</p>
                                        <p className="text-xl font-black text-amber-600">{stats[b.id]?.['مستعجل'] || 0}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] font-bold text-gray-500 mb-1">فوري</p>
                                        <p className="text-xl font-black text-red-600">{stats[b.id]?.['فوري'] || 0}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Audit Log Table */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-5 border-b flex justify-between items-center bg-gray-50/50">
                            <h4 className="font-black text-sm text-gray-800 flex items-center gap-2">
                                <History className="w-4 h-4" /> سجل الرقابة
                            </h4>
                            <div className="flex gap-2 items-center">
                                <div className="w-32">
                                    <CustomSelect
                                        options={statusOptions}
                                        value={statusFilter}
                                        onChange={(v) => setStatusFilter(v as any)}
                                        placeholder="الكل"
                                    />
                                </div>
                                <div className="relative">
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="بحث..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(toEnglishDigits(e.target.value))}
                                        className="bg-white border-2 border-blue-200 rounded-2xl pr-9 pl-3 py-2 text-xs font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-[10px]">
                                <thead className="bg-gray-50 text-gray-400 font-black tracking-widest uppercase">
                                    <tr>
                                        <th className="py-4 px-4 text-center">الباركود</th>
                                        <th className="py-4 px-4 text-center">الفئة</th>
                                        <th className="py-4 px-4 text-center">الفرع</th>
                                        <th className="py-4 px-4 text-center">الحالة</th>
                                        <th className="py-4 px-4 text-center">الموظف / الطلب</th>
                                        <th className="py-4 px-4 text-center">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y font-bold relative">
                                    {isSyncing && (
                                        <tr className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 backdrop-blur-[2px]">
                                            <td colSpan={6} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                    <span className="text-blue-600 font-black text-sm">جاري مـزامنة البيانات...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {filteredStock.slice(0, 50).map(item => (
                                        <tr key={item.id || item.barcode || (item as any).Barcode} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-4 text-center font-mono">
                                                <button
                                                    onClick={() => handleEditBarcode(item)}
                                                    className="text-blue-600 hover:underline font-bold"
                                                    title="تعديل الباركود"
                                                >
                                                    {item.barcode || (item as any).Barcode}
                                                </button>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-2 py-1 rounded-md ${(item.category || (item as any).Category) === 'فوري' ? 'bg-red-50 text-red-600' :
                                                    (item.category || (item as any).Category) === 'مستعجل' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                                                    }`}>
                                                    {item.category || (item as any).Category}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">{BRANCHES.find(b => b.id === (item.branch || (item as any).Branch))?.name?.split('-')[0]}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-2 py-1 rounded-md ${(item.status || (item as any).Status) === 'Used' ? 'bg-green-100 text-green-700' :
                                                    (item.status || (item as any).Status) === 'Error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {(item.status || (item as any).Status) === 'Used' ? 'مستخدم' : (item.status || (item as any).Status) === 'Error' ? 'خطأ' : 'متاح'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center text-gray-400">
                                                {item.used_by || (item as any).Used_By || '-'}
                                                {(item.order_id || (item as any).Order_ID) && <span className="block text-[8px] text-blue-500">#{String(item.order_id || (item as any).Order_ID).substring(0, 6)}</span>}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex justify-center gap-1">
                                                    {(item.status || (item as any).Status) === 'Error' && (
                                                        <button
                                                            onClick={() => updateStatus(item.barcode || (item as any).Barcode, 'Available')}
                                                            className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                                                            title="إعادة تفعيل"
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredStock.length === 0 && (
                                <div className="p-10 text-center text-gray-300 italic">لم يتم العثور على نتائج</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminInventory;
