import React, { useState } from 'react';
import { Branch } from '../types';
import { toEnglishDigits } from '../utils';
import { ChevronDown, CheckCircle2, DollarSign } from 'lucide-react';

interface TransferFormProps {
    branches: Branch[];
    currentBalance: number;
    fromBranchId: string;
    onTransfer: (data: { fromBranch: string, toBranch: string, amount: number }) => Promise<{ success: boolean; message?: string }>;
    onClose: () => void;
    onSuccess: () => void;
    showQuickStatus: (message: string, type?: 'success' | 'error') => void;
}

const TransferForm: React.FC<TransferFormProps> = ({
    branches,
    currentBalance,
    fromBranchId,
    onTransfer,
    onClose,
    onSuccess,
    showQuickStatus
}) => {
    const [amount, setAmount] = useState<number>(0);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');
    const [isPickingBranch, setIsPickingBranch] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const availableBranches = branches.filter(b => b.id !== fromBranchId);
    const selectedBranchName = branches.find(b => b.id === selectedBranchId)?.name || 'اختر الفرع...';

    // View 1: Branch Picker
    if (isPickingBranch) {
        return (
            <div className="space-y-3 py-2 animate-fadeIn h-full flex flex-col">
                <div className="flex items-center justify-between mb-2">
                    <button
                        onClick={() => setIsPickingBranch(false)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1 font-bold text-xs transition-colors"
                    >
                        <ChevronDown className="w-4 h-4 rotate-90" />
                        رجوع
                    </button>
                    <span className="font-black text-gray-700">اختر الفرع المستلم</span>
                </div>
                <div className="grid grid-cols-1 gap-2 overflow-y-auto custom-scrollbar p-1 flex-1 max-h-[50vh]">
                    {availableBranches.map(b => (
                        <button
                            key={b.id}
                            onClick={() => {
                                setSelectedBranchId(b.id);
                                setIsPickingBranch(false);
                            }}
                            className={`w-full p-4 rounded-2xl text-right font-bold transition-all flex items-center justify-between border-2 ${selectedBranchId === b.id
                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                    : 'border-gray-100 bg-white text-gray-600 hover:border-blue-200'
                                }`}
                        >
                            <span>{b.name}</span>
                            {selectedBranchId === b.id && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // View 2: Transfer Form
    return (
        <div className="space-y-4 text-right animate-fadeIn">
            {/* Balance Card */}
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                <div>
                    <p className="text-[10px] text-blue-700 font-black uppercase mb-1">كاش الخزنة الحالي</p>
                    <p className="text-2xl font-black text-blue-600">{currentBalance.toLocaleString()} ج.م</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-300 opacity-50" />
            </div>

            {/* Branch Selection Button */}
            <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-900 uppercase pr-1">الفرع المستلم</label>
                <button
                    onClick={() => setIsPickingBranch(true)}
                    className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${selectedBranchId
                            ? 'bg-white border-blue-600 text-blue-800'
                            : 'bg-gray-100 border-transparent text-gray-400'
                        }`}
                >
                    <span className={`font-bold text-sm ${selectedBranchId ? '' : 'text-gray-500'}`}>
                        {selectedBranchName}
                    </span>
                    <ChevronDown className={`w-5 h-5 ${selectedBranchId ? 'text-blue-600' : 'text-gray-400'}`} />
                </button>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-900 uppercase pr-1">مبلغ التحويل</label>
                <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0.00"
                    onChange={(e) => setAmount(Number(toEnglishDigits(e.target.value)))}
                    className="w-full p-4 bg-gray-100 rounded-2xl border-2 border-transparent focus:border-blue-600 font-black text-lg outline-none transition-all"
                />
            </div>

            {/* Actions */}
            <div className="pt-4 flex gap-3">
                <button
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-black text-sm hover:bg-gray-200 transition-colors"
                >
                    إلغاء
                </button>
                <button
                    onClick={async () => {
                        if (amount <= 0) {
                            showQuickStatus('يرجى إدخال مبلغ صحيح', 'error');
                            return;
                        }
                        if (!selectedBranchId) {
                            showQuickStatus('يرجى اختيار الفرع المستلم', 'error');
                            return;
                        }
                        if (amount > currentBalance) {
                            showQuickStatus('رصيد الفرع لا يكفي', 'error');
                            return;
                        }

                        setIsSubmitting(true);
                        try {
                            const res = await onTransfer({
                                fromBranch: fromBranchId,
                                toBranch: selectedBranchId,
                                amount: amount
                            });

                            if (res.success) {
                                showQuickStatus('تم التحويل بنجاح');
                                onSuccess();
                                onClose();
                            } else {
                                showQuickStatus(res.message || 'فشل التحويل', 'error');
                            }
                        } catch (error) {
                            showQuickStatus('حدث خطأ أثناء التحويل', 'error');
                        } finally {
                            setIsSubmitting(false);
                        }
                    }}
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-blue-700 text-white rounded-xl font-black text-sm hover:bg-blue-800 shadow-lg shadow-blue-700/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? 'جاري التحويل...' : 'تأكيد التحويل'}
                </button>
            </div>
        </div>
    );
};

export default TransferForm;
