import React, { useState, useMemo } from 'react';
import { ServiceEntry } from '../types';
import { SERVICE_TYPES } from '../constants';
import { Search, Wallet, Clock, Printer, ArrowLeftRight, Filter } from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { normalizeArabic, toEnglishDigits } from '../utils';
import { generateReceipt } from '../services/pdfService';
import CustomSelect from '../components/CustomSelect';

interface ReceivablesProps {
  entries: ServiceEntry[];
  onUpdateEntry: (updatedEntry: ServiceEntry) => Promise<boolean>;
  onAddEntry: (entry: ServiceEntry) => Promise<boolean>;
  branchId: string;
  currentDate: string;
  username: string;
  isSyncing: boolean;
  onRefresh: () => void;
}

const Receivables: React.FC<ReceivablesProps> = ({
  entries, onUpdateEntry, onAddEntry, branchId, currentDate, username, isSyncing, onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterService, setFilterService] = useState<string>('الكل');
  const { showModal, showQuickStatus } = useModal();

  const showCustomerDetails = (entry: ServiceEntry) => {
    showModal({
      title: 'تفاصيل المعاملة',
      content: (
        <div className="space-y-4 text-right">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-1">العميل</span>
              <p className="font-black text-gray-800">{entry.clientName}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-1">الرقم القومي</span>
              <p className="font-black text-gray-800">{entry.nationalId}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-1">نوع الخدمة</span>
              <p className="font-black text-blue-600">{entry.serviceType}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 font-mono">
              <span className="text-[10px] text-gray-400 font-black block mb-1">الباركود</span>
              <p className="font-black text-gray-800">{entry.barcode || '-'}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-1">تاريخ العملية</span>
              <p className="font-black text-gray-800">{entry.entryDate}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => generateReceipt(entry)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-600/20 active:scale-95 mt-2 transition-all"
          >
            <Printer className="w-5 h-5" />
            طباعة إيصال العميل
          </button>
        </div>
      ),
      confirmText: 'إغلاق'
    });
  };

  const handleCollect = (entry: ServiceEntry) => {
    let amount = 0;
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
              type="number"
              autoFocus
              className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 font-black text-xl text-center outline-none transition-all"
              placeholder="0.00"
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
          barcode: entry.barcode,
          parentEntryId: entry.id // ربط السداد بالمعاملة الأصلية
        };
        const success = await onAddEntry(settlementEntry);
        if (success) {
          // تحديث المتبقي في المعاملة الأصلية والانتظار لضمان الحفظ
          const updateSuccess = await onUpdateEntry({
            ...entry,
            remainingAmount: entry.remainingAmount - amount
          });

          if (updateSuccess) {
            showQuickStatus('تم التحصيل وتحديث الرصيد بنجاح');
            onRefresh();
          } else {
            showQuickStatus('تم التحصيل ولكن فشل تحديث الرصيد على السيرفر', 'warning');
          }
        }
      }
    });
  };

  const [selectedBranch, setSelectedBranch] = useState<string>(branchId);
  const serviceOptions = useMemo(() => SERVICE_TYPES.map(s => ({ id: s, name: s })), []);

  const filteredEntries = useMemo(() => {
    const normalizedSelectedBranch = normalizeArabic(selectedBranch);
    return entries.filter(e => {
      const matchesBranch = selectedBranch === 'الكل' || normalizeArabic(e.branchId) === normalizedSelectedBranch;
      const matchesService = filterService === 'الكل' || e.serviceType === filterService;
      const isUnpaid = (e.remainingAmount || 0) > 0;
      const isSearchMatch = e.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || e.nationalId.includes(searchTerm);
      return matchesBranch && matchesService && isUnpaid && isSearchMatch && e.status === 'active';
    });
  }, [entries, selectedBranch, filterService, searchTerm]);

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
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث..."
                className="w-full pr-10 pl-4 py-3 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 font-bold text-xs outline-none transition-all"
              />
            </div>
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
            <button onClick={onRefresh} className="w-full p-3 bg-white rounded-2xl border-2 border-emerald-100 text-emerald-600 hover:bg-emerald-50 transition-all active:scale-95 flex items-center justify-center gap-2 font-black text-xs h-[52px]">
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
              <button onClick={() => handleCollect(entry)} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl font-black text-xs shadow-lg shadow-emerald-600/10 transition-all active:scale-95 group-hover:translate-y-[-2px]">
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