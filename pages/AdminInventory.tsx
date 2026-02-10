import React, { useState, useMemo } from 'react';
import { StockItem, Branch, StockCategory, StockStatus } from '../types';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { PlusCircle, Package, AlertCircle, CheckCircle2, Filter, History, Trash2, Edit, ChevronDown, RefreshCw } from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { toEnglishDigits } from '../utils';
import CustomSelect from '../components/CustomSelect';
import SearchInput from '../components/SearchInput';

interface AdminInventoryProps {
    stock: StockItem[];
    onRefresh: () => void;
    onDeleteStock: (barcode: string, role: string) => Promise<boolean>;
    isSyncing: boolean;
    userRole: string;
    username: string;
    isSubmitting?: boolean;
    startSubmitting: () => void;
    stopSubmitting: () => void;
    branches: Branch[];
}

const AdminInventory: React.FC<AdminInventoryProps> = ({ stock, onRefresh, onDeleteStock, isSyncing, userRole, username, isSubmitting = false, startSubmitting, stopSubmitting, branches }) => {
    const { showModal, hideModal, showQuickStatus } = useModal();
    const [newBarcodes, setNewBarcodes] = useState('');
    const [selectedBranch, setSelectedBranch] = useState(branches.length > 0 ? branches[0].id : '');
    const [selectedCategory, setSelectedCategory] = useState<StockCategory>('عادي');

    const canAddStock = userRole === 'مدير' || userRole === 'مساعد';

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StockStatus | 'All'>('All');

    const branchOptions = useMemo(() => branches.map(b => ({ id: b.id, name: b.name })), [branches]);
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
        onDeleteStock: (barcode: string, role: string) => Promise<boolean>;
        userRole: string;
        startSubmitting: () => void;
        stopSubmitting: () => void;
        branches: Branch[];
    }> = ({ item, onClose, onRefresh, onDeleteStock, userRole, startSubmitting, stopSubmitting, branches }) => {
        const barcode = item.barcode || (item as any).Barcode;
        const branchId = item.branch || (item as any).Branch;

        const [newBarcode, setNewBarcode] = useState(barcode);
        const [newBranchId, setNewBranchId] = useState(branchId);
        const [isPickingBranch, setIsPickingBranch] = useState(false);
        const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);

        const currentBranchName = branches.find(b => b.id === newBranchId)?.name || 'اختر الفرع';

        if (isPickingBranch) {
            // ... (keep existing branch picker logic) ...
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
                        {branches.map(b => (
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
                {!isDeleteConfirm ? (
                    <>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">رقم الباركود</label>
                            <input
                                type="text"
                                value={newBarcode}
                                onChange={(e) => setNewBarcode(toEnglishDigits(e.target.value))}
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
                                onClick={() => setIsDeleteConfirm(true)}
                                className="w-full py-2 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                حذف الباركود نهائياً
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="bg-red-50 p-6 rounded-2xl border-2 border-red-100 text-center animate-fadeIn">
                        <Trash2 className="w-12 h-12 text-red-600 mx-auto mb-3" />
                        <h4 className="text-lg font-black text-red-700 mb-1">هل أنت متأكد؟</h4>
                        <p className="text-xs font-bold text-red-500 mb-6">سيتم حذف هذا الباركود نهائياً من النظام. هذا الإجراء لا يمكن التراجع عنه.</p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsDeleteConfirm(false)}
                                className="flex-1 py-3 bg-white border border-red-200 text-red-600 rounded-xl font-black text-sm hover:bg-red-50 transition-colors"
                            >
                                تراجع
                            </button>
                            <button
                                onClick={async () => {
                                    startSubmitting();
                                    try {
                                        const success = await onDeleteStock(barcode, userRole);
                                        if (success) {
                                            showQuickStatus('تم الحذف بنجاح');
                                            onRefresh();
                                            onClose();
                                        } else {
                                            showQuickStatus('فشل الحذف', 'error');
                                        }
                                    } finally {
                                        stopSubmitting();
                                    }
                                }}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-sm hover:bg-red-700 shadow-lg shadow-red-200 transition-all"
                            >
                                نعم، حذف
                            </button>
                        </div>
                    </div>
                )}
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
                    onDeleteStock={onDeleteStock}
                    userRole={userRole}
                    startSubmitting={startSubmitting}
                    stopSubmitting={stopSubmitting}
                    branches={branches}
                />
            ),
            hideFooter: true
        });
    };

    const stats = useMemo(() => {
        const summary: Record<string, Record<string, number>> = {};

        branches.forEach(b => {
            summary[b.id] = {
                'عادي': 0,
                'مستعجل': 0,
                'فوري': 0
            };
        });

        stock.forEach(item => {
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
    }, [stock, branches]);

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
        const normalizedUsername = username ? username.toLowerCase().trim() : '';

        return stock.filter(item => {
            const barcode = item.barcode || (item as any).Barcode || '';
            const usedBy = item.used_by || (item as any).Used_By || '';
            const status = item.status || (item as any).Status || '';

            const matchSearch = String(barcode).includes(searchTerm) || String(usedBy).includes(searchTerm);
            const matchStatus = statusFilter === 'All' || status === statusFilter;

            // إذا كان المستخدم "مشاهد"، نعرض فقط الباركودات التي استخدمها هو
            if (userRole === 'مشاهد') {
                return matchSearch && matchStatus && usedBy.toLowerCase().trim() === normalizedUsername;
            }

            return matchSearch && matchStatus;
        }).sort((a, b) => {
            const timeA = a.created_at || (a as any).Created_At || 0;
            const timeB = b.created_at || (b as any).Created_At || 0;
            return (new Date(timeB).getTime()) - (new Date(timeA).getTime());
        });
    }, [stock, searchTerm, statusFilter, userRole, username]);

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
        <div className={`p-3 md:p-6 space-y-4 transition-opacity animate-premium-in ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Expense Form */}
                <div className="lg:col-span-1 bg-white/80 backdrop-blur-xl p-5 rounded-[2.5rem] border border-white/20 shadow-premium space-y-5 relative z-30 animate-slideIn">
                    <h3 className="font-black text-blue-900 flex items-center gap-2">
                        <PlusCircle className="w-5 h-5" /> إضافة باركود جديد
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
                            <label className="text-[10px] font-black text-[#033649]/40 block mb-3 mr-1 uppercase tracking-widest">الباركودات (رقم في كل سطر)</label>
                            <textarea
                                value={newBarcodes}
                                onChange={e => setNewBarcodes(toEnglishDigits(e.target.value))}
                                rows={6}
                                className="w-full bg-[#033649]/5 border-2 border-[#00A6A6]/10 rounded-2xl py-4 px-5 font-mono text-xs outline-none focus:bg-white focus:ring-4 focus:ring-[#00A6A6]/10 focus:border-[#00A6A6] shadow-inner transition-all"
                                placeholder="أدخل الأرقام هنا..."
                            />
                        </div>

                        <button
                            onClick={handleAddStock}
                            disabled={!canAddStock}
                            className={`w-full py-5 rounded-2xl font-black text-sm transition-all shadow-lux active:scale-[0.98] ${canAddStock ? 'bg-gradient-to-r from-[#033649] to-[#01404E] text-white hover:from-[#00A6A6] hover:to-[#036564]' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                        >
                            {canAddStock ? 'تأكيد إضافة المخزون' : 'لا تملك صلاحية الإضافة'}
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <div className="max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {branches.map(b => (
                                <div key={b.id} className="relative overflow-hidden bg-white/60 p-4 rounded-[2rem] border border-white flex flex-col gap-3 shadow-premium group">
                                    <div className="absolute top-0 right-0 w-1 h-full bg-[#036564]"></div>
                                    <p className="text-[10px] font-black text-[#033649]/40 mb-2 border-b border-[#033649]/5 pb-3 uppercase tracking-[0.2em]">{b.name}</p>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center group-hover:scale-110 transition-transform">
                                            <p className="text-[8px] font-black text-[#033649]/40 mb-1">عادي</p>
                                            <p className="text-2xl font-black text-[#033649]">{stats[b.id]?.['عادي'] || 0}</p>
                                        </div>
                                        <div className="text-center border-x border-[#033649]/5 group-hover:scale-110 transition-transform">
                                            <p className="text-[8px] font-black text-[#036564]/60 mb-1">مستعجل</p>
                                            <p className="text-2xl font-black text-[#036564]">{stats[b.id]?.['مستعجل'] || 0}</p>
                                        </div>
                                        <div className="text-center group-hover:scale-110 transition-transform">
                                            <p className="text-[8px] font-black text-[#00A6A6]/60 mb-1">فوري</p>
                                            <p className="text-2xl font-black text-[#00A6A6]">{stats[b.id]?.['فوري'] || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-premium overflow-hidden">
                        <div className="p-2 md:p-3 border-b border-[#033649]/5 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-gradient-to-l from-[#033649]/5 to-transparent">
                            <h4 className="font-black text-xl text-[#033649] flex items-center gap-3 shrink-0">
                                <History className="w-6 h-6 text-[#00A6A6]" />  سجل الأستمارات
                            </h4>
                            <div className="flex flex-row gap-3 items-center justify-end flex-1 max-w-2xl">
                                <div className="w-32 sm:w-36">
                                    <CustomSelect
                                        options={statusOptions}
                                        value={statusFilter}
                                        onChange={(v) => setStatusFilter(v as any)}
                                        placeholder="كل الحالات"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <SearchInput
                                        value={searchTerm}
                                        onChange={setSearchTerm}
                                        placeholder="بحث بالباركود..."
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto overflow-y-auto max-h-[440px] text-right custom-scrollbar">
                            <table className="w-full border-collapse">
                                <thead className="sticky top-0 z-20">
                                    <tr className="bg-[#033649] text-white/50 text-[10px] font-black tracking-[0.2em] uppercase border-b border-white/5">
                                        <th className="py-3 px-4 text-center first:rounded-tr-[2rem]">الباركود</th>
                                        <th className="py-3 px-4 text-center">الفئة</th>
                                        <th className="py-3 px-4 text-center">الفرع</th>
                                        <th className="py-3 px-4 text-center">الحالة</th>
                                        <th className="py-3 px-4 text-center">الموظف</th>
                                        {userRole !== 'مشاهد' && <th className="py-3 px-4 text-center last:rounded-tl-[2rem]">إجراءات</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#033649]/5 font-bold relative">
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
                                        <tr key={item.id || item.barcode || (item as any).Barcode} className="hover:bg-[#036564]/5 transition-all group">
                                            <td className="py-5 px-6 text-center font-mono">
                                                {userRole === 'مشاهد' ? (
                                                    <span className="font-black text-[#033649]">
                                                        {item.barcode || (item as any).Barcode}
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleEditBarcode(item)}
                                                        className="text-[#00A6A6] hover:underline font-black group-hover:scale-110 transition-transform inline-block"
                                                        title="تعديل الباركود"
                                                    >
                                                        {item.barcode || (item as any).Barcode}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${(item.category || (item as any).Category) === 'فوري' ? 'bg-red-50 text-red-600' :
                                                    (item.category || (item as any).Category) === 'مستعجل' ? 'bg-[#036564]/10 text-[#036564]' : 'bg-[#00A6A6]/10 text-[#00A6A6]'
                                                    }`}>
                                                    {item.category || (item as any).Category}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6 text-center text-[#033649] font-black">{branches.find(b => b.id === (item.branch || (item as any).Branch))?.name?.split('-')[0]}</td>
                                            <td className="py-5 px-6 text-center">
                                                <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${(item.status || (item as any).Status) === 'Used' ? 'bg-green-50 text-green-600' :
                                                    (item.status || (item as any).Status) === 'Error' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {(item.status || (item as any).Status) === 'Used' ? 'مستخدم' : (item.status || (item as any).Status) === 'Error' ? 'خطأ' : 'متاح'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center text-gray-400">
                                                {item.used_by || (item as any).Used_By || '-'}
                                                {(item.order_id || (item as any).Order_ID) && <span className="block text-[8px] text-blue-500">#{String(item.order_id || (item as any).Order_ID).substring(0, 6)}</span>}
                                            </td>
                                            {userRole !== 'مشاهد' && (
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
                                            )}
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
