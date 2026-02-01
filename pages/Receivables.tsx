import React, { useState, useMemo } from 'react';
import { ServiceEntry } from '../types';
import { SERVICE_TYPES } from '../constants';
import SearchInput from '../components/SearchInput';
import { Wallet, Clock, Printer, ArrowLeftRight, Filter } from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { searchMultipleFields, useDebounce, toEnglishDigits } from '../utils';
import { generateReceipt } from '../services/pdfService';
import CustomSelect from '../components/CustomSelect';

interface ReceivablesProps {
  entries: ServiceEntry[];
  onUpdateEntry: (updatedEntry: ServiceEntry) => void;
  onAddEntry: (entry: ServiceEntry) => Promise<boolean>;
  branchId: string;
  currentDate: string;
  username: string;
  isSyncing: boolean;
  onRefresh: () => void;
  isSubmitting?: boolean;
}

const Receivables: React.FC<ReceivablesProps> = ({
  entries, onUpdateEntry, onAddEntry, branchId, currentDate, username, isSyncing, onRefresh, isSubmitting = false
}) => {
  /* Update destructuring */
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterService, setFilterService] = useState<string>('الكل');
  const { showModal, showQuickStatus, setIsProcessing } = useModal();

  const showCustomerDetails = (entry: ServiceEntry) => {
    showModal({
      title: 'تفاصيل المعاملة',
      content: (
        <div className="space-y-3 text-right">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">العميل</span>
              <p className="font-black text-gray-800 text-xs">{entry.clientName}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">الرقم القومي</span>
              <p className="font-black text-gray-800 text-xs">{entry.nationalId}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">نوع الخدمة</span>
              <p className="font-black text-blue-600 text-xs">{entry.serviceType}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 font-mono">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">الباركود</span>
              <p className="font-black text-gray-800 text-xs">{entry.barcode || '-'}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">تاريخ العملية</span>
              <p className="font-black text-gray-800 text-xs" dir="ltr">
                {entry.entryDate}
                <span className="text-gray-400 mx-1">|</span>
                {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {entry.hasThirdParty && (
              <div className="col-span-2 bg-blue-50 p-3 rounded-xl border border-blue-100 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-blue-400 font-black block mb-0.5">المورد/الطرف الثالث</span>
                  <p className="font-black text-blue-800 text-xs">{entry.thirdPartyName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-blue-400 font-black block mb-0.5">تكلفة المورد</span>
                  <p className="font-black text-blue-800 text-xs">{entry.thirdPartyCost} ج.م</p>
                </div>
                <div className="col-span-2 pt-1 border-t border-blue-100 flex justify-between items-center">
                  <span className="text-[10px] font-black text-blue-500">حالة تسوية المصاريف:</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${entry.isCostPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {entry.isCostPaid ? `تم الدفع (${entry.costPaidDate})` : 'لم يتم الدفع بعد'}
                  </span>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={async () => {
              setIsProcessing(true);
              try {
                await generateReceipt(entry);
              } finally {
                setIsProcessing(false);
              }
            }}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-black shadow-lg shadow-blue-600/20 active:scale-95 mt-1 transition-all text-sm"
          >
            <Printer className="w-4 h-4" />
            طباعة إيصال العميل
          </button>
        </div>
      ),
      confirmText: 'إغلاق'
    });
  };

  const handleCollect = (entry: ServiceEntry) => {
    let amount = entry.remainingAmount;
    showModal({
      title: `تحصيل من: ${entry.clientName}`,
      content: (
        <div className="space-y-4 text-right">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex justify-between items-center">
            <span className="text-xs font-black text-blue-600">المتبقي الحالي:</span>
            <span className="text-xl font-black text-blue-800">{entry.remainingAmount}</span>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">المبلغ المحصل الآن</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 font-black text-xl text-center outline-none transition-all"
              defaultValue={entry.remainingAmount}
              onChange={(e) => amount = Number(toEnglishDigits(e.target.value))}
            />
          </div>
        </div>
      ),
      confirmText: 'تأكيد التحصيل',
      onConfirm: async () => {
        if (amount <= 0 || amount > entry.remainingAmount) {
          showQuickStatus('مبلغ غير صالح', 'error');
          return;
        }
        const settlementEntry: ServiceEntry = {
          ...entry,
          id: `SET-${Date.now()}`,
          clientName: entry.clientName,
          serviceType: 'سداد مديونية',
          amountPaid: amount,
          serviceCost: 0,
          remainingAmount: 0,
          notes: `سداد متبقي من عملية: ${entry.serviceType}`,
          timestamp: Date.now(),
          entryDate: currentDate || '',
          barcode: entry.barcode
        };
        const success = await onAddEntry(settlementEntry);
        if (success) {
          onUpdateEntry({ ...entry, remainingAmount: entry.remainingAmount - amount });
          showQuickStatus('تم التحصيل بنجاح');
        }
      }
    });
  };

  const [selectedBranch, setSelectedBranch] = useState<string>(branchId);
  const serviceOptions = useMemo(() => SERVICE_TYPES.map(s => ({ id: s, name: s })), []);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const matchesService = filterService === 'الكل' || e.serviceType === filterService;
      const isUnpaid = (e.remainingAmount || 0) > 0;
      const isSearchMatch = searchMultipleFields(debouncedSearchTerm, [
        e.clientName,
        e.nationalId,
        e.phoneNumber
      ]);
      return matchesService && isUnpaid && isSearchMatch && e.status === 'active';
    });
  }, [entries, filterService, debouncedSearchTerm]);

  return (
    <div className="p-3 md:p-5 space-y-4 text-right">
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center gap-3 border-b border-gray-50 pb-3 mb-1">
          <div className="w-1.5 h-6 bg-emerald-600 rounded-full"></div>
          <h3 className="text-lg font-black text-gray-800">البحث في المديونيات القائمة</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mr-1">بحث الاسم/الرقم</label>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="ابحث بالاسم، رقم قومي، أو هاتف..."
            />
          </div>

          <CustomSelect
            label="نوع الخدمة"
            options={serviceOptions}
            value={filterService}
            onChange={setFilterService}
            placeholder="كل الخدمات"
            icon={<Filter className="w-3.5 h-3.5" />}
            accentColor="emerald"
          />

          <div className="flex items-end">
            <button
              onClick={onRefresh}
              disabled={isSyncing || isSubmitting}
              className={`w-full p-3 rounded-2xl border-2 font-black text-xs h-[52px] flex items-center justify-center gap-2 transition-all active:scale-95 ${(isSyncing || isSubmitting) ? 'bg-gray-100 text-gray-400 border-transparent cursor-not-allowed' : 'bg-white border-emerald-100 text-emerald-600 hover:bg-emerald-50'}`}
            >
              <Clock className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'جاري التحديث...' : 'تحديث البيانات'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEntries.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-300 font-black">لا توجد مديونيات تطابق بحثك</div>
        ) : (
          filteredEntries.map(entry => (
            <div key={entry.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4 transition-all hover:shadow-md group">
              <div className="flex justify-between items-start">
                <div>
                  <h4 onClick={() => showCustomerDetails(entry)} className="font-black text-lg text-gray-800 cursor-pointer hover:text-blue-600 transition-colors">{entry.clientName}</h4>
                  <p className="text-xs text-blue-600 font-bold">{entry.serviceType}</p>
                </div>
                <div className="bg-red-50 p-2 rounded-xl"><Wallet className="w-5 h-5 text-red-500" /></div>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center group-hover:bg-red-50 transition-colors">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-red-400">المتبقي</span>
                <span className="text-xl font-black text-red-600">{entry.remainingAmount}</span>
              </div>
              <button
                onClick={() => handleCollect(entry)}
                disabled={isSubmitting}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-xs shadow-lg transition-all active:scale-95 ${isSubmitting ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10 group-hover:translate-y-[-2px]'}`}
              >
                <ArrowLeftRight className="w-4 h-4" />
                تحصيل الآن
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Receivables;