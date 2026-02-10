import React, { useState, useMemo } from 'react';
import { ServiceEntry } from '../types';
import SearchInput from '../components/SearchInput';
import { Wallet, Clock, Printer, ArrowLeftRight, Filter } from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { searchMultipleFields, useDebounce, toEnglishDigits, normalizeArabic } from '../utils';
import { generateReceipt } from '../services/pdfService';
import CustomSelect from '../components/CustomSelect';

interface ReceivablesProps {
  entries: ServiceEntry[];
  serviceTypes: string[];
  onUpdateEntry: (updatedEntry: ServiceEntry) => void;
  onAddEntry: (entry: ServiceEntry) => Promise<boolean>;
  branchId: string;
  currentDate: string;
  username: string;
  isSyncing: boolean;
  onRefresh: () => void;
  isSubmitting?: boolean;
  userRole: string;
}

const Receivables: React.FC<ReceivablesProps> = ({
  entries, serviceTypes, onUpdateEntry, onAddEntry, branchId, currentDate, username, isSyncing, onRefresh, isSubmitting = false, userRole
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
            <div className="col-span-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-black block mb-0.5">ملاحظات</span>
              <p className="font-bold text-gray-600 text-[10px] whitespace-pre-wrap leading-tight">{entry.notes || 'لا توجد ملاحظات'}</p>
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
        </div>
      ),
      confirmText: 'طباعة إيصال',
      confirmIcon: <Printer className="w-4 h-4" />,
      confirmClose: false,
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await generateReceipt(entry);
        } finally {
          setIsProcessing(false);
        }
      },
      cancelText: 'تراجع'
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
          hasThirdParty: false,
          thirdPartyCost: 0,
          isCostPaid: false,
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
  const serviceOptions = useMemo(() => serviceTypes.map(s => ({ id: s, name: s })), [serviceTypes]);

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
    <div className={`p-3 md:p-6 space-y-3 transition-opacity animate-premium-in ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>

      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-premium border border-white/20 space-y-3 relative z-30">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-[#00A6A6] rounded-full"></div>
          <h3 className="font-black text-[#033649] text-xl">البحث في المديونيات</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-[#033649]/40 uppercase tracking-widest mr-1">بحث الاسم/الرقم</label>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="ابحث بالاسم، رقم قومي، أو هاتف..."
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <CustomSelect
              label="نوع الخدمة"
              options={serviceOptions}
              value={filterService}
              onChange={setFilterService}
              placeholder="كل الخدمات"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={onRefresh}
              disabled={isSyncing || isSubmitting}
              className={`w-full relative overflow-hidden group font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all duration-500 shadow-lux active:scale-[0.98] ${(isSyncing || isSubmitting) ? 'bg-gray-100 text-gray-300' : 'bg-gradient-to-r from-[#033649] to-[#01404E] text-white hover:from-[#00A6A6] hover:to-[#036564]'}`}
            >
              <div className="absolute top-0 left-0 w-full h-full bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              <div className="relative z-10 flex items-center gap-3">
                <Clock className={`w-5 h-5 ${isSyncing ? 'animate-spin text-[#00A6A6]' : 'text-white/60 group-hover:rotate-180 transition-transform duration-700'}`} />
                <span className="text-sm font-black tracking-tight">{isSyncing ? 'جاري التحديث...' : 'تحديث البيانات'}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-premium overflow-hidden">
        <div className="overflow-x-auto text-right">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#033649] text-white/50 text-[10px] font-black tracking-[0.2em] uppercase border-b border-white/5">
                <th className="py-5 px-8 text-right first:rounded-tr-[2rem]">بيان مديونية العميل</th>
                <th className="py-5 px-6 text-center">المبلغ المتبقي</th>
                <th className="py-5 px-8 text-center last:rounded-tl-[2rem]">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#033649]/5 font-bold relative">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-200">
                        <Wallet className="w-8 h-8" />
                      </div>
                      <span className="text-gray-300 font-black italic">لا توجد مديونيات تطابق بحثك</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#036564]/5 transition-all group">
                    <td className="py-5 px-8">
                      <div className="flex flex-col gap-1">
                        <span
                          onClick={() => showCustomerDetails(entry)}
                          className="font-black text-[#033649] text-lg cursor-pointer hover:text-[#00A6A6] transition-colors"
                        >
                          {entry.clientName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="bg-[#00A6A6]/10 text-[#00A6A6] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">{entry.serviceType}</span>
                          <span className="text-[10px] text-gray-400 font-bold">{entry.entryDate}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-center">
                      <div className="flex flex-col items-center gap-1 group-hover:scale-110 transition-transform">
                        <span className="text-2xl font-black text-red-600 tracking-tighter">{entry.remainingAmount.toLocaleString()}<span className="text-[10px] mr-1 opacity-50 uppercase">ج.م</span></span>
                        <span className="text-[9px] text-[#033649]/40 font-black uppercase tracking-widest">من أصل {entry.serviceCost}</span>
                      </div>
                    </td>
                    <td className="py-5 px-8 text-center">
                      {userRole !== 'مشاهد' && !entry.parentEntryId && normalizeArabic(entry.serviceType) !== normalizeArabic('سداد مديونية') && (
                        <button
                          onClick={() => handleCollect(entry)}
                          disabled={isSubmitting}
                          className={`relative overflow-hidden group/btn px-6 py-3 rounded-2xl font-black text-xs transition-all duration-300 shadow-lux active:scale-95 mx-auto ${isSubmitting ? 'bg-gray-100 text-gray-300' : 'bg-gradient-to-r from-[#036564] to-[#01404E] text-white hover:shadow-[#036564]/20'}`}
                        >
                          <div className="absolute top-0 left-0 w-full h-full bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform"></div>
                          <div className="relative z-10 flex items-center justify-center gap-3">
                            <ArrowLeftRight className="w-4 h-4 text-[#00A6A6]" />
                            <span>تحصيل المبلغ</span>
                          </div>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Receivables;