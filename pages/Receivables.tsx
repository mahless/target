import React, { useState, useMemo } from 'react';
import { ServiceEntry } from '../types';
import SearchInput from '../components/SearchInput';
import { Wallet, Clock, Printer, ArrowLeftRight, Filter } from 'lucide-react';
import ServiceEntryDetails from '../components/ServiceEntryDetails';
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
 branches: import('../types').Branch[];
}

const Receivables: React.FC<ReceivablesProps> = ({
 entries, serviceTypes, onUpdateEntry, onAddEntry, branchId, currentDate, username, isSyncing, onRefresh, isSubmitting = false, userRole, branches
}) => {
 /* Update destructuring */
 const [searchTerm, setSearchTerm] = useState('');
 const debouncedSearchTerm = useDebounce(searchTerm, 300);
 const [filterService, setFilterService] = useState<string>('الكل');
 const { showModal, showQuickStatus, setIsProcessing } = useModal();

 const showCustomerDetails = (entry: ServiceEntry) => {
 showModal({
 title: 'تفاصيل المعاملة',
 size: 'lg',
 content: <ServiceEntryDetails entry={entry} />,
 confirmText: 'طباعة إيصال',
 confirmIcon: <Printer className="w-4 h-4" />,
 confirmClose: false,
 onConfirm: async () => {
 setIsProcessing(true);
 try {
 await generateReceipt(entry, username);
 } finally {
 setIsProcessing(false);
 }
 },
 cancelText: 'تراجع'
 });
 };

 const handleCollect = (entry: ServiceEntry) => {
 let amount = entry.remainingAmount;
 let isElectronic = false;
 showModal({
 title: 'تحصيل من',
 content: (
 <div className="space-y-4 text-right">
 <div className="flex justify-between items-center bg-[#01404E]/5 px-4 py-3 rounded-2xl border border-[#01404E]/10 mb-2">
 <h3 className="text-sm md:text-base font-black text-[#01404E] truncate max-w-[65%]">{entry.clientName}</h3>
 <div className="flex items-center gap-2">
 <span className="text-[10px] font-black text-[#01404E]/60">المتبقي الحالي:</span>
 <span className="text-lg font-black text-red-600">{entry.remainingAmount}</span>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3 items-end">
 <div className="space-y-2">
 <label className="block text-[10px] font-black text-gray-400 uppercase mr-1">طريقة الدفع</label>
 <div className="flex gap-4 h-[52px] items-center justify-center bg-gray-50 rounded-2xl px-2 md:px-4 border-2 border-transparent">
 <label className="flex items-center gap-2 cursor-pointer">
 <input type="radio" name="paymentMethod" defaultChecked value="cash" onChange={() => isElectronic = false} className="w-4 h-4 text-[#01404E] focus:ring-[#01404E]" />
 <span className="text-sm font-black text-[#01404E]">كاش</span>
 </label>
 <label className="flex items-center gap-2 cursor-pointer">
 <input type="radio" name="paymentMethod" value="electronic" onChange={() => isElectronic = true} className="w-4 h-4 text-blue-600 focus:ring-blue-600" />
 <span className="text-sm font-black text-blue-600">إلكتروني</span>
 </label>
 </div>
 </div>
 <div className="space-y-2">
 <label className="block text-[10px] font-black text-gray-400 uppercase mr-1">المبلغ المحصل الآن</label>
 <input
 type="text"
 inputMode="numeric"
 pattern="[0-9]*"
 autoFocus
 className="w-full h-[52px] px-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 font-black text-xl text-center outline-none transition-all"
 defaultValue={entry.remainingAmount}
 onChange={(e) => amount = Number(toEnglishDigits(e.target.value))}
 />
 </div>
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
 isElectronic: isElectronic,
 electronicAmount: isElectronic ? amount : 0,
 electronicMethod: isElectronic ? 'انستا باي' : undefined,
 parentEntryId: entry.id,
 notes: `سداد متبقي من عملية: ${entry.serviceType}`,
 timestamp: Date.now(),
 entryDate: currentDate || '',
 barcode: entry.barcode,
 recordedBy: username
 };
 const success = await onAddEntry(settlementEntry);
 if (success) {
 onUpdateEntry({ ...entry, remainingAmount: entry.remainingAmount - amount });
 showQuickStatus('تم التحصيل بنجاح');
 }
 }
 });
 };

 const [selectedBranch, setSelectedBranch] = useState<string>('الكل');
 const serviceOptions = useMemo(() => serviceTypes.map(s => ({ id: s, name: s })), [serviceTypes]);
 const branchOptions = useMemo(() => [{ id: 'الكل', name: 'كل الفروع' }, ...branches.map(b => ({ id: b.id, name: b.name }))], [branches]);

 const [visibleCount, setVisibleCount] = useState(50);

 const filteredEntries = useMemo(() => {
 return entries.filter(e => {
 const matchesBranch = selectedBranch === 'الكل' || e.branchId === selectedBranch;
 const matchesService = filterService === 'الكل' || e.serviceType === filterService;
 const isUnpaid = (e.remainingAmount || 0) > 0;
 const isSearchMatch = searchMultipleFields(debouncedSearchTerm, [
 e.clientName,
 e.nationalId,
 e.phoneNumber,
 e.workOrderNumber || ''
 ]);
 return matchesBranch && matchesService && isUnpaid && isSearchMatch;
 });
 }, [entries, filterService, debouncedSearchTerm, selectedBranch]);

 return (
 <div className={`p-3 md:p-6 space-y-1.5 transition-opacity animate-premium-in ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>

  <div className="px-1 flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-30">
  <div className="flex items-center gap-3">
  <div className={`w-2 h-8 rounded-full shadow-lg ${debouncedSearchTerm ? 'bg-[#00A6A6] shadow-[#00A6A6]/20' : 'bg-[#036564] shadow-[#036564]/20'}`}></div>
  <div>
  <h3 className="text-lg font-black text-[#01404E] whitespace-nowrap">{debouncedSearchTerm ? 'نتائج البحث في المديونيات' : 'البحث في المديونيات'}</h3>
  <p className="text-[9px] text-[#036564] font-black uppercase mt-0.5">{debouncedSearchTerm ? `بناءً على: ${debouncedSearchTerm}` : currentDate}</p>
  </div>
  </div>

  <div className="flex flex-col md:flex-row items-center gap-2 w-full lg:w-auto">
  <SearchInput
  value={searchTerm}
  onChange={setSearchTerm}
  placeholder="ابحث بالاسم، هاتف، رقم قومي..."
  className="w-full lg:w-[220px]"
  />
  
  <div className="w-full md:w-[120px]">
  <CustomSelect
  options={branchOptions}
  value={selectedBranch}
  onChange={setSelectedBranch}
  placeholder="كل الفروع"
  showAllOption={false}
  className="px-2 h-[42px] rounded-xl border-2 text-xs"
  />
  </div>

  <div className="w-full md:w-[130px]">
  <CustomSelect
  options={serviceOptions}
  value={filterService}
  onChange={setFilterService}
  placeholder="كل الخدمات"
  showAllOption={true}
  className="px-2 h-[42px] rounded-xl border-2 text-xs"
  />
  </div>

  <div className="flex items-center gap-2 w-full sm:w-auto">
  <button
  type="button"
  onClick={(e) => {
  e.preventDefault();
  e.stopPropagation();
  onRefresh();
  }}
  disabled={isSyncing || isSubmitting}
  className={`flex-1 flex items-center justify-center gap-2 h-[42px] px-4 rounded-xl text-[10px] font-black transition-all shadow-md active:scale-95 ${(isSyncing || isSubmitting) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#01404E] text-white hover:bg-[#01404E]'}`}
  >
  <Clock className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
  <span className="whitespace-nowrap">{isSyncing ? 'جاري السحب...' : 'تحديث البيانات'}</span>
  </button>
  </div>
  </div>
  </div>

 <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-premium overflow-hidden">
 <div className="min-h-[400px] max-h-[600px] overflow-y-auto custom-scrollbar text-right">
 <table className="w-full border-collapse">
 <thead className="sticky top-0 z-20">
 <tr className="bg-[#01404E] text-white/50 text-[10px] md:text-xs font-black uppercase border-b border-white/5">
 <th className="py-2.5 px-8 text-right first:rounded-tr-[2rem]">بيان مديونية العميل</th>
 <th className="py-2.5 px-6 text-center">الموظف</th>
 <th className="py-2.5 px-6 text-center">المبلغ المتبقي</th>
 <th className="py-2.5 px-8 text-center last:rounded-tl-[2rem]">الإجراءات</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[#01404E]/5 font-bold relative text-xs md:text-sm">
 {filteredEntries.length === 0 ? (
 <tr>
 <td colSpan={4} className="py-20 text-center">
 <div className="flex flex-col items-center gap-4">
 <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-200">
 <Wallet className="w-8 h-8" />
 </div>
 <span className="text-gray-300 font-black italic">لا توجد مديونيات تطابق بحثك</span>
 </div>
 </td>
 </tr>
 ) : (
 filteredEntries.slice(0, visibleCount).map((entry) => (
 <tr key={entry.id} className="hover:bg-[#036564]/5 transition-all group">
 <td className="py-2.5 px-8">
 <div className="flex flex-col gap-0.5">
 <span
 onClick={(e) => {
 e.preventDefault();
 e.stopPropagation();
 showCustomerDetails(entry);
 }}
 className="font-black text-[#01404E] text-sm md:text-base cursor-pointer hover:text-[#00A6A6] transition-colors"
 >
 {entry.clientName}
 </span>
 <div className="flex items-center gap-2">
 <span className="bg-[#00A6A6]/10 text-[#00A6A6] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase">{entry.serviceType}</span>
 <span className="text-[10px] text-gray-400 font-bold">{entry.entryDate}</span>
 </div>
 </div>
 </td>
 <td className="py-2.5 px-6 text-center">
 <div className="flex flex-col items-center gap-0.5 group-hover:scale-110 transition-transform">
 <span className="bg-gray-100 text-[#01404E] px-2 py-1 rounded-lg text-[10px] font-black">{entry.recordedBy || 'غير مسجل'}</span>
 </div>
 </td>
 <td className="py-2.5 px-6 text-center">
 <div className="flex flex-col items-center gap-0.5 group-hover:scale-110 transition-transform">
 <span className="text-sm md:text-base font-black text-red-600">{entry.remainingAmount.toLocaleString()}<span className="text-[9px] md:text-[10px] mr-1 opacity-50 uppercase">ج.م</span></span>
 <span className="text-[9px] text-[#01404E]/40 font-black uppercase">من أصل {entry.serviceCost}</span>
 </div>
 </td>
 <td className="py-2.5 px-8 text-center">
 {userRole !== 'مشاهد' && !entry.parentEntryId && normalizeArabic(entry.serviceType) !== normalizeArabic('سداد مديونية') && (
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
 <div className="p-6 text-center border-t border-[#01404E]/5">
 <button
 type="button"
 onClick={(e) => {
 e.preventDefault();
 e.stopPropagation();
 setVisibleCount(prev => prev + 50);
 }}
 className="px-6 py-3 bg-[#00A6A6] text-white font-black rounded-2xl hover:bg-[#036564] transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
 >
 تحميل المزيد ({filteredEntries.length - visibleCount} متبقي)
 </button>
 </div>
 )}
 </div>
 </div>
 </div>
 );
};

export default Receivables;