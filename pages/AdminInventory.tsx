import React from 'react';
import { Package, AlertCircle } from 'lucide-react';

interface AdminInventoryProps {
    stock: any[];
    onRefresh: () => void;
    isSyncing: boolean;
    userRole: string;
}

const AdminInventory: React.FC<AdminInventoryProps> = ({ stock = [], onRefresh, isSyncing, userRole }) => {
    return (
        <div className="p-10 text-right">
            <h1 className="text-2xl font-black mb-4 flex items-center gap-2">
                <Package className="w-8 h-8 text-blue-600" />
                اختبار صفحة المخزن
            </h1>

            <div className="bg-yellow-50 border-2 border-yellow-200 p-6 rounded-2xl mb-6">
                <p className="font-bold text-yellow-800">إذا كنت ترى هذه الصفحة، فهذا يعني أن المشكلة كانت في أحد المكونات المعقدة أو الحسابات.</p>
                <button
                    onClick={onRefresh}
                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl font-bold"
                >
                    {isSyncing ? 'جاري التحديث...' : 'تحديث البيانات'}
                </button>
            </div>

            <div className="space-y-4">
                <h2 className="font-black text-lg">إحصائيات أولية:</h2>
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border">
                        <p className="text-xs text-gray-400">إجمالي السجلات</p>
                        <p className="text-2xl font-black">{Array.isArray(stock) ? stock.length : 0}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border">
                        <p className="text-xs text-gray-400">صلاحية المستخدم</p>
                        <p className="text-lg font-black">{userRole}</p>
                    </div>
                </div>
            </div>

            <div className="mt-10">
                <h2 className="font-black text-lg mb-4">أول 5 سجلات (للتأكد من البيانات):</h2>
                <div className="bg-white rounded-xl border overflow-hidden">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-3">الباركود</th>
                                <th className="p-3">الفرع</th>
                                <th className="p-3">الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.isArray(stock) && stock.slice(0, 5).map((s, i) => (
                                <tr key={i} className="border-b">
                                    <td className="p-3 font-mono">{String(s?.barcode || 'N/A')}</td>
                                    <td className="p-3">{String(s?.branch || 'N/A')}</td>
                                    <td className="p-3">{String(s?.status || 'N/A')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-10 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <p className="text-xs font-bold">إذا ظهرت البيانات هنا، سأقوم بإعادة بناء المكون الأصلي خطوة بخطوة حتى نجد السطر المسبب للخلل.</p>
            </div>
        </div>
    );
};

export default AdminInventory;
