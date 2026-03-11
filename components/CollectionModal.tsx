import React, { useState } from 'react';
import { Wallet, ArrowLeftRight } from 'lucide-react';
import { toEnglishDigits } from '../utils';

interface CollectionModalContentProps {
    initialAmount: number;
    onDataChange: (data: { amount: number, isElectronic: boolean, electronicMethod: string, notes: string }) => void;
}

export const CollectionModalContent: React.FC<CollectionModalContentProps> = ({
    initialAmount,
    onDataChange
}) => {
    const [amount, setAmount] = useState(initialAmount);
    const [isElectronic, setIsElectronic] = useState(false);
    const [electronicMethod, setElectronicMethod] = useState('انستا باي');
    const [notes, setNotes] = useState('');

    // Sync state to parent
    React.useEffect(() => {
        onDataChange({ amount, isElectronic, electronicMethod, notes });
    }, [amount, isElectronic, electronicMethod, notes, onDataChange]);

    return (
        <div className="space-y-2 text-right">
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50/50 p-2 rounded-xl border border-blue-100/50 flex flex-col justify-center items-center shadow-sm">
                    <span className="text-[8px] font-black text-blue-600 uppercase tracking-tighter">المتبقي الحالي</span>
                    <span className="text-sm font-black text-blue-800">{initialAmount.toLocaleString()} ج.م</span>
                </div>

                <div className="space-y-0.5">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-tighter mr-1">المبلغ المحصل الآن</label>
                    <div className="relative group">
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoFocus
                            className="w-full p-2 bg-gray-50 rounded-xl border-2 border-transparent focus:border-blue-500 font-black text-base text-center outline-none transition-all shadow-inner group-hover:bg-white"
                            value={amount}
                            onChange={(e) => {
                                const val = toEnglishDigits(e.target.value);
                                setAmount(Number(val));
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2 pt-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mr-1">طريقة التحصيل</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => setIsElectronic(false)}
                        className={`flex items-center justify-center gap-2 p-2 rounded-xl border-2 transition-all font-bold text-xs ${!isElectronic ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-blue-200'}`}
                    >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>نقدي</span>
                    </button>
                    <button
                        onClick={() => setIsElectronic(true)}
                        className={`flex items-center justify-center gap-2 p-2 rounded-xl border-2 transition-all font-bold text-xs ${isElectronic ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-200' : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-purple-200'}`}
                    >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        <span>إلكتروني</span>
                    </button>
                </div>
            </div>

            {isElectronic && (
                <div className="space-y-1.5 animate-premium-in">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mr-1">وسيلة الدفع الإلكتروني</label>
                    <div className="grid grid-cols-2 gap-2">
                        {['انستا باي', 'محفظة إلكترونية'].map((method) => (
                            <button
                                key={method}
                                onClick={() => setElectronicMethod(method)}
                                className={`p-1.5 rounded-lg border text-[10px] font-bold transition-all ${electronicMethod === method ? 'bg-purple-50 border-purple-300 text-purple-700 ring-2 ring-purple-100' : 'bg-white border-gray-100 text-gray-400 hover:border-purple-200'}`}
                            >
                                {method}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-1 pt-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mr-1">ملاحظات التحصيل (اختياري)</label>
                <textarea
                    className="w-full p-2.5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 font-bold text-xs outline-none transition-all shadow-inner group-hover:bg-white min-h-[50px] max-h-[80px]"
                    placeholder="أدخل أي ملاحظات إضافية هنا..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>
        </div>
    );
};

export default CollectionModalContent;
