import React, { useState, useMemo, useRef } from 'react';
import { ServiceEntry, Branch } from '../types';
import SearchInput from '../components/SearchInput';
import { Wallet, Clock, Printer, ArrowLeftRight, Filter, Calendar, MapPin, TrendingDown, RefreshCw } from 'lucide-react';
import ServiceEntryDetails from '../components/ServiceEntryDetails';
import { useModal } from '../context/ModalContext';
import { searchMultipleFields, useDebounce, toEnglishDigits, normalizeArabic } from '../utils';
import { SERVICE_TYPES, ROLES } from '../constants';
import { generateReceipt } from '../services/pdfService';
import CustomSelect from '../components/CustomSelect';
import { CollectionModalContent } from '../components/CollectionModal';

interface ReceivablesProps {
  entries: ServiceEntry[];
  serviceTypes: string[];
  branches: Branch[];
  onUpdateEntry: (updatedEntry: ServiceEntry) => void;
  onAddEntry: (entry: ServiceEntry) => Promise<boolean>;
  branchId: string;
  currentDate: string;
  username: string;
  isSyncing: boolean;
  onRefresh: () => void;
  isSubmitting?: boolean;
  userRole: string;
  deliverOrder: (orderId: string, amount: number, clientName: string, collectorName: string, branchId: string, isElectronic?: boolean, electronicMethod?: string, notes?: string) => Promise<boolean>;
}

const Receivables: React.FC<ReceivablesProps> = ({
  entries, serviceTypes, branches, onUpdateEntry, onAddEntry, branchId, currentDate, username, isSyncing, onRefresh, isSubmitting = false, userRole, deliverOrder
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterService, setFilterService] = useState<string>('الكل');
  const [selectedBranch, setSelectedBranch] = useState<string>('الكل');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  const { showModal, showQuickStatus, setIsProcessing } = useModal();

  const showCustomerDetails = (entry: ServiceEntry) => {
    showModal({
      title: 'تفاصيل المعاملة',
      size: 'lg',
      content: <ServiceEntryDetails entry={entry} userRole={userRole} />,
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
    let collectionData = {
      amount: entry.remainingAmount,
      isElectronic: false,
      electronicMethod: 'انستا باي',
      notes: ''
    };

    showModal({
      title: `تحصيل من: ${entry.clientName}`,
      content: (
        <CollectionModalContent
          initialAmount={entry.remainingAmount}
          onDataChange={(data) => {
            collectionData = data;
          }}
        />
      ),
      confirmText: 'تأكيد التحصيل',
      onConfirm: async () => {
        const { amount, isElectronic, electronicMethod, notes } = collectionData;

        if (amount <= 0 || amount > entry.remainingAmount) {
          showQuickStatus('مبلغ غير صالح', 'error');
          return;
        }

        setIsProcessing(true);
        try {
          const branch = branches.find(b => b.id === entry.branchId);
          const success = await deliverOrder(
            entry.id,
            amount,
            entry.clientName,
            username,
            branch?.id || '',
            isElectronic,
            electronicMethod,
            notes
          );

          if (success) {
            showQuickStatus('تم التحصيل بنجاح');
          } else {
            showQuickStatus('فشل في عملية التحصيل', 'error');
          }
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const branchOptions = useMemo(() => [
    { id: 'الكل', name: 'الكل' },
    ...branches.map(b => ({ id: b.id, name: b.name }))
  ], [branches]);

  const serviceOptions = useMemo(() => {
    return [
      { id: 'الكل', name: 'الكل' },
      ...serviceTypes.map(s => ({ id: s, name: s }))
    ];
  }, [serviceTypes]);

  const [visibleCount, setVisibleCount] = useState(50);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const isUnpaid = (e.remainingAmount || 0) > 0;
      if (!isUnpaid) return false;

      const matchesService = filterService === 'الكل' || e.serviceType === filterService;
      const matchesBranch = selectedBranch === 'الكل' || normalizeArabic(e.branchId) === normalizeArabic(selectedBranch);

      let matchesDate = true;
      if (startDate) matchesDate = matchesDate && e.entryDate >= startDate;
      if (endDate) matchesDate = matchesDate && e.entryDate <= endDate;

      const isSearchMatch = searchMultipleFields(debouncedSearchTerm, [
        e.clientName,
        e.nationalId,
        e.phoneNumber,
        e.workOrderNumber || ''
      ]);

      return matchesService && matchesBranch && matchesDate && isSearchMatch;
    });
  }, [entries, filterService, selectedBranch, startDate, endDate, debouncedSearchTerm]);

  const totalDebts = useMemo(() => {
    return filteredEntries.reduce((sum, e) => sum + (e.remainingAmount || 0), 0);
  }, [filteredEntries]);

  return (
    <div className={`p-3 md:p-6 space-y-4 transition-opacity animate-premium-in ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>

      {/* Header Area */}
      <div className="flex flex-col gap-3 px-1 relative z-30">
        {/* Row 1: Title, Total, Refresh, Date Filters */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-3 h-[42px]">
            <div className="w-1 h-8 bg-[#00A6A6] rounded-full shadow-lg shadow-[#00A6A6]/20"></div>
            <div className="flex flex-col justify-center">
              <h3 className="text-sm md:text-base font-black text-[#01404E] tracking-tight whitespace-nowrap leading-tight">البحث في المديونيات</h3>
              <p className="text-[8px] text-[#036564] font-black uppercase tracking-[0.2em]">{currentDate}</p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/40 shadow-premium-sm flex items-center gap-2 group hover:scale-[1.02] transition-all h-[42px]">
            <div className="p-1 bg-red-50 rounded-lg text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <div className="text-right flex items-baseline gap-2">
              <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-none">الإجمالي:</p>
              <p className="text-base font-black text-red-600 tracking-tighter tabular-nums leading-none">
                {totalDebts.toLocaleString()}
                <span className="text-[9px] mr-1 opacity-60">ج.م</span>
              </p>
            </div>

            <button
              onClick={(e) => {
                e.preventDefault();
                onRefresh();
              }}
              disabled={isSyncing || isSubmitting}
              className={`mr-1 p-1.5 rounded-lg transition-all active:scale-90 ${isSyncing ? 'bg-blue-50 text-blue-500' : 'bg-gray-50 text-gray-500 hover:bg-[#01404E] hover:text-white'}`}
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative group w-[130px] md:w-[150px]">
              <button
                type="button"
                onClick={() => (startDateRef.current as any)?.showPicker?.() || startDateRef.current?.click()}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-1 hover:bg-gray-100 rounded-full transition-all focus:outline-none"
              >
                <Calendar className="w-5 h-5 text-[#00A6A6] group-focus-within:scale-110 transition-transform" />
              </button>
              <input
                ref={startDateRef}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-[42px] bg-white rounded-xl border-2 border-transparent focus:border-[#00A6A6] outline-none px-7 pr-10 text-[10px] font-black text-[#01404E] transition-all shadow-premium-sm relative"
              />
              {!startDate && <span className="absolute right-10 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-400 pointer-events-none whitespace-nowrap">من تاريخ</span>}
            </div>

            <div className="relative group w-[130px] md:w-[150px]">
              <button
                type="button"
                onClick={() => (endDateRef.current as any)?.showPicker?.() || endDateRef.current?.click()}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-1 hover:bg-gray-100 rounded-full transition-all focus:outline-none"
              >
                <Calendar className="w-5 h-5 text-[#00A6A6] group-focus-within:scale-110 transition-transform" />
              </button>
              <input
                ref={endDateRef}
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-[42px] bg-white rounded-xl border-2 border-transparent focus:border-[#00A6A6] outline-none px-7 pr-10 text-[10px] font-black text-[#01404E] transition-all shadow-premium-sm relative"
              />
              {!endDate && <span className="absolute right-10 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-400 pointer-events-none whitespace-nowrap">إلى تاريخ</span>}
            </div>
          </div>
        </div>

        {/* Row 2: Search, Branch Filter, Service Filter - Always on second line */}
        <div className="flex flex-col md:flex-row items-center gap-2 w-full bg-white/50 p-1 rounded-2xl border border-white/40 shadow-premium">
          <div className="w-full md:flex-1 min-w-0">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="ابحث بالاسم، هاتف، رقم قومي..."
              className="w-full"
              compact={true}
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <div className="flex-1 md:w-[150px]">
              <CustomSelect
                options={branchOptions}
                value={selectedBranch}
                onChange={setSelectedBranch}
                placeholder="الكل"
                showAllOption={false}
                icon={<MapPin className="w-3.5 h-3.5" />}
                className="py-1.5 px-2 rounded-xl border text-[10px]"
              />
            </div>

            <div className="flex-1 md:w-[150px]">
              <CustomSelect
                options={serviceOptions}
                value={filterService}
                onChange={setFilterService}
                placeholder="الكل"
                showAllOption={false}
                icon={<Filter className="w-3.5 h-3.5" />}
                className="py-1.5 px-2 rounded-xl border text-[10px]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-premium overflow-hidden">
        <div className="min-h-[400px] max-h-[600px] overflow-y-auto custom-scrollbar text-right">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="bg-[#01404E] text-white/50 text-[10px] md:text-xs font-black tracking-[0.2em] uppercase border-b border-white/5">
                <th className="py-4 px-8 text-right first:rounded-tr-[2rem]">بيان مديونية العميل</th>
                <th className="py-4 px-6 text-center">الموظف / الفرع</th>
                <th className="py-4 px-6 text-center">المبلغ المتبقي</th>
                <th className="py-4 px-8 text-center last:rounded-tl-[2rem]">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#01404E]/5 font-bold relative text-xs md:text-sm">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                        <Wallet className="w-10 h-10" />
                      </div>
                      <span className="text-gray-300 font-black italic">لا توجد مديونيات تطابق خيارات الفلترة</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.slice(0, visibleCount).map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#036564]/5 transition-all group">
                    <td className="py-4 px-8">
                      <div className="flex flex-col gap-1">
                        <span
                          onClick={() => showCustomerDetails(entry)}
                          className="font-black text-[#01404E] text-sm md:text-base cursor-pointer hover:text-[#00A6A6] transition-colors"
                        >
                          {entry.clientName}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-[#00A6A6]/10 text-[#00A6A6] px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest">{entry.serviceType}</span>
                          <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {entry.entryDate}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="bg-gray-100 text-[#01404E] px-2 py-1 rounded-lg text-[10px] font-black">{entry.recordedBy || 'غير مسجل'}</span>
                        <span className="flex items-center gap-1 text-[8px] text-[#036564] font-black uppercase">
                          <MapPin className="w-2.5 h-2.5" />
                          {entry.branchId}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center gap-0.5 group-hover:scale-110 transition-transform">
                        <span className="text-base md:text-lg font-black text-red-600 tracking-tighter tabular-nums">{entry.remainingAmount.toLocaleString()}<span className="text-[10px] mr-1 opacity-50 uppercase">ج.م</span></span>
                        <span className="text-[8px] text-[#01404E]/40 font-black uppercase tracking-widest italic">من أصل {entry.serviceCost}</span>
                      </div>
                    </td>
                    <td className="py-4 px-8 text-center">
                      {userRole !== ROLES.VIEWER && !entry.parentEntryId && normalizeArabic(entry.serviceType) !== normalizeArabic(SERVICE_TYPES.DEBT_SETTLEMENT) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCollect(entry);
                          }}
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
          {visibleCount < filteredEntries.length && (
            <div className="p-8 text-center border-t border-[#01404E]/5">
              <button
                type="button"
                onClick={() => setVisibleCount(prev => prev + 50)}
                className="px-8 py-3.5 bg-[#00A6A6] text-white font-black rounded-2xl hover:bg-[#036564] transition-all shadow-lg hover:shadow-xl transform hover:scale-105 inline-flex items-center gap-3"
              >
                تحميل المزيد
                <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs">{filteredEntries.length - visibleCount} متبقي</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Receivables;