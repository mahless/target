import React, { useState, useMemo } from 'react';
import { StockItem, Branch, StockCategory, StockStatus } from '../types';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { BRANCHES } from '../constants';
import { PlusCircle, Package, AlertCircle, CheckCircle2, Search, Filter, History, Trash2, Edit } from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { toEnglishDigits } from '../utils';
import CustomSelect from '../components/CustomSelect';

interface AdminInventoryProps {
    stock: StockItem[];
    onRefresh: () => void;
    isSyncing: boolean;
    userRole: string;
}

const AdminInventory: React.FC<AdminInventoryProps> = ({ stock, onRefresh, isSyncing, userRole }) => {
    const { showModal, showQuickStatus } = useModal();
    const [isSubmitting, setIsSubmitting] = useState(false);
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

        if (Array.isArray(stock)) {
            stock.filter(s => s && s.status === 'Available').forEach(item => {
                if (summary[item.branch]) {
                    const cat = item.category === 'سوبر فوري' ? 'فوري' : item.category;
                    if (summary[item.branch][cat] !== undefined) {
                        summary[item.branch][cat]++;
                    }
                }
            });
        }

        return summary;
    }, [stock]);

    const handleAddStock = async () => {
        const list = newBarcodes.split(/[\n, ]+/).filter(b => b.trim().length > 0);
        if (list.length === 0 || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const items = list.map(barcode => ({
                barcode: barcode.trim(),
                category: selectedCategory,
                branch: selectedBranch,
                status: 'Available',
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
            setIsSubmitting(false);
        }
    };

    const filteredStock = useMemo(() => {
        return stock.filter(item => {
            const matchSearch = item.barcode.includes(searchTerm) || (item.used_by || '').includes(searchTerm);
            const matchStatus = statusFilter === 'All' || item.status === statusFilter;
            return matchSearch && matchStatus;
        }).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    }, [stock, searchTerm, statusFilter]);

    const updateStatus = async (barcode: string, newStatus: StockStatus) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
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
            setIsSubmitting(false);
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
                                onChange={e => setNewBarcodes(e.target.value)}
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
                                        onChange={e => setSearchTerm(e.target.value)}
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
                                <tbody className="divide-y font-bold">
                                    {filteredStock.slice(0, 50).map(item => (
                                        <tr key={item.barcode} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-4 text-center font-mono">{item.barcode}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-2 py-1 rounded-md ${item.category === 'فوري' ? 'bg-red-50 text-red-600' :
                                                    item.category === 'مستعجل' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                                                    }`}>
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {item.branch ? (BRANCHES.find(b => b.id === item.branch)?.name?.split('-')[0] || item.branch) : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-2 py-1 rounded-md ${item.status === 'Used' ? 'bg-green-100 text-green-700' :
                                                    item.status === 'Error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {item.status === 'Used' ? 'مستخدم' : item.status === 'Error' ? 'خطأ' : 'متاح'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center text-gray-400">
                                                {item.used_by || '-'}
                                                {item.order_id && <span className="block text-[8px] text-blue-500">#{item.order_id.substring(0, 6)}</span>}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex justify-center gap-1">
                                                    {item.status === 'Error' && (
                                                        <button
                                                            onClick={() => updateStatus(item.barcode, 'Available')}
                                                            className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                                                            title="إعادة تفعيل"
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {item.status !== 'Used' && (
                                                        <button
                                                            onClick={() => updateStatus(item.barcode, 'Error')}
                                                            className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                                                            title="تبليغ عن خطأ"
                                                        >
                                                            <AlertCircle className="w-3.5 h-3.5" />
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
