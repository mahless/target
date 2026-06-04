import React, { useState, useEffect, useMemo } from 'react';
import { ID_CARD_SPEEDS, PASSPORT_SPEEDS, ELECTRONIC_METHODS } from '../constants';
import { ServiceEntry, ServiceSpeed, ElectronicMethod, Expense, StockCategory } from '../types';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { generateReceipt } from '../services/pdfService';
import { Save, Printer, AlertTriangle, Search, UserCheck, Smartphone, Zap, RefreshCw, Check } from 'lucide-react';
import { toEnglishDigits, normalizeArabic } from '../utils';
import { validateServiceSubmission } from '../validators';
import { useModal } from '../context/ModalContext';
import CustomSelect from '../components/CustomSelect';

interface ServiceFormProps {
  onAddEntry: (entry: ServiceEntry) => Promise<boolean>;
  onAddExpense: (expense: Expense) => Promise<boolean>;
  entries: ServiceEntry[];
  serviceTypes: string[];
  branchId: string;
  currentDate: string;
  username: string;
  userRole: string;
  isSubmitting?: boolean;
}

const ServiceForm: React.FC<ServiceFormProps> = ({ onAddEntry, onAddExpense, entries, serviceTypes, branchId, currentDate, username, userRole, isSubmitting = false }) => {
  const { showModal, showQuickStatus, setIsProcessing } = useModal();
  // Client Lookup State
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Form State
  const [clientName, setClientName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [barcode, setBarcode] = useState('');
  const [speed, setSpeed] = useState<ServiceSpeed | ''>('');
  const [isExternalBarcode, setIsExternalBarcode] = useState(false);

  // Financial State
  const [serviceCost, setServiceCost] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [remainingAmount, setRemainingAmount] = useState<number>(0);

  // Third Party State
  const [hasThirdParty, setHasThirdParty] = useState(false);
  const [thirdPartyName, setThirdPartyName] = useState('');
  const [thirdPartyCost, setThirdPartyCost] = useState<number>(0);
  const [isSellingForm, setIsSellingForm] = useState(false);

  // Electronic Payment State
  const [isElectronic, setIsElectronic] = useState(false);
  const [electronicAmount, setElectronicAmount] = useState<number>(0);
  const [electronicMethod, setElectronicMethod] = useState<ElectronicMethod | ''>('');

  const [notes, setNotes] = useState('');

  const serviceOptions = useMemo(() => serviceTypes.map(s => ({ id: s, name: s })), [serviceTypes]);
  const methodOptions = useMemo(() => ELECTRONIC_METHODS.map(m => ({ id: m as string, name: m as string })), []);

  // UI State
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lastEntry, setLastEntry] = useState<ServiceEntry | null>(null);

  const isOtherService = normalizeArabic(serviceType) === normalizeArabic('أخرى');

  const commonInputClass = "w-full py-2.5 px-3.5 border border-[#01404E]/10 rounded-xl bg-[#01404E]/5 text-[#01404E] font-bold placeholder-[#01404E]/30 focus:bg-white focus:border-[#00A6A6] focus:ring-4 focus:ring-[#00A6A6]/5 outline-none transition-all shadow-sm text-xs";

  // Search Logic
  const matchingClients = useMemo(() => {
    if (clientSearchTerm.length < 2) return [];

    // Normalize the search term:
    // 1. Convert to English digits (for phone/ID search)
    // 2. Normalize Arabic characters (for name search)
    const rawTerm = toEnglishDigits(clientSearchTerm.toLowerCase());
    const normalizedTerm = normalizeArabic(rawTerm);

    const uniqueClients: Record<string, { name: string, id: string, phone: string }> = {};

    entries.forEach(e => {
      // Prepare entry fields for comparison
      const normalizedName = normalizeArabic(e.clientName.toLowerCase());
      const phone = e.phoneNumber || '';
      const nid = e.nationalId || '';

      if (
        normalizedName.includes(normalizedTerm) ||
        nid.includes(rawTerm) ||
        phone.includes(rawTerm)
      ) {
        uniqueClients[e.nationalId] = {
          name: e.clientName,
          id: e.nationalId,
          phone: e.phoneNumber
        };
      }
    });
    return Object.values(uniqueClients).slice(0, 5);
  }, [clientSearchTerm, entries]);

  const handleSelectClient = (client: { name: string, id: string, phone: string }) => {
    setClientName(client.name);
    setNationalId(client.id);
    setPhoneNumber(client.phone);
    setClientSearchTerm('');
    setShowSearchResults(false);
    setError(null);
  };

  // Remaining Calculation
  useEffect(() => {
    setRemainingAmount((Number(serviceCost) || 0) - (Number(amountPaid) || 0));
  }, [serviceCost, amountPaid]);

  // Reset logic when service changes
  useEffect(() => {
    setSpeed('');
    setBarcode('');
    if (isOtherService) {
      setClientName('كاش');
    } else if (clientName === 'كاش') {
      setClientName('');
    }
  }, [serviceType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setSuccessMsg(null);

    const validationError = validateServiceSubmission({
      serviceType,
      isOtherService,
      isSellingForm,
      nationalId,
      phoneNumber,
      isElectronic,
      electronicMethod: electronicMethod as string,
      electronicAmount,
      amountPaid,
      speed: speed || '',
      isExternalBarcode,
      barcode,
      entries
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    // Removed setIsSubmitting(true) as it's handled globally in onAddEntry
    try {
      const entryId = Date.now().toString();

      const newEntry: ServiceEntry = {
        id: entryId,
        clientName: clientName || (isOtherService ? 'كاش' : ''),
        nationalId: nationalId || (isOtherService ? '-' : ''),
        phoneNumber: phoneNumber || (isOtherService ? '-' : ''),
        serviceType,
        barcode: serviceType === 'بطاقة رقم قومي' ? barcode : undefined,
        Barcode_Source: serviceType === 'بطاقة رقم قومي' ? (isExternalBarcode ? 'خارجي' : 'داخلي') : undefined,
        speed: (speed as ServiceSpeed) || undefined,
        serviceCost: Number(serviceCost),
        amountPaid: Number(amountPaid),
        remainingAmount,
        hasThirdParty,
        thirdPartyName: hasThirdParty ? thirdPartyName : undefined,
        thirdPartyCost: hasThirdParty ? Number(thirdPartyCost) : undefined,
        isCostPaid: false,
        isElectronic,
        electronicAmount: isElectronic ? Number(electronicAmount) : 0,
        electronicMethod: isElectronic ? (electronicMethod as ElectronicMethod) : undefined,
        notes: isSellingForm ? (notes ? `بيع استمارة: ${notes}` : 'بيع استمارة لطرف اخر') : notes,
        branchId,
        entryDate: currentDate,
        timestamp: Date.now(),
        status: 'قيد المراجعة',
        recordedBy: username
      };

      const success = await onAddEntry(newEntry);

      if (success) {
        showQuickStatus('تم بنجاح');

        // تسجيل استخدام الباركود في المخزن (فقط إذا كان داخلي)
        if (serviceType === 'بطاقة رقم قومي' && barcode && !isExternalBarcode) {
          GoogleSheetsService.updateStockStatus(barcode, 'Used', username, userRole, entryId);
        }

        // Automation: Record electronic collection as an expense to balance safe cash
        if (isElectronic && electronicAmount > 0) {
          const electronicExpense: Expense = {
            id: `elec-${Date.now()}-${entryId}`,
            category: 'تحصيل إلكتروني',
            amount: Number(electronicAmount),
            notes: `تحصيل ${electronicMethod} | عميل: ${clientName} | ${serviceType}`,
            branchId,
            date: currentDate,
            timestamp: Date.now(),
            recordedBy: username
          };
          await onAddExpense(electronicExpense);
        }

        setLastEntry(newEntry);
        setSuccessMsg("تم حفظ المعاملة بنجاح!");

        // Reset Form
        setClientName('');
        setNationalId('');
        setPhoneNumber('');
        setBarcode('');
        setServiceCost(0);
        setAmountPaid(0);
        setThirdPartyCost(0);
        setIsElectronic(false);
        setElectronicAmount(0);
        setSpeed('');
        setNotes('');
        setIsExternalBarcode(false);
        setIsSellingForm(false);
      } else {
        showQuickStatus('خطأ في الاتصال', 'error');
        setError('فشل حفظ البيانات في السيرفر، يرجى المحاولة لاحقاً');
      }
    } catch (err) {
      showQuickStatus('حدث خطأ', 'error');
      console.error(err);
    }
    // Removed finally { setIsSubmitting(false) }
  };

  return (
    <div className="max-w-4xl mx-auto p-2 md:p-3">
      <div className={`transition-opacity animate-premium-in relative z-30 ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="mb-4 text-[#01404E] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-[#00A6A6] rounded-full"></div>
            <h2 className="text-xl font-black whitespace-nowrap">تسجيل معاملة جديدة</h2>
          </div>

          {/* Quick Client Lookup - Moved to Header */}
          <div className="relative w-full md:max-w-xs group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[#01404E]/30 w-4 h-4 group-focus-within:text-[#00A6A6] transition-colors" />
            <input
              type="text"
              value={clientSearchTerm}
              onChange={(e) => {
                setClientSearchTerm(e.target.value);
                setShowSearchResults(true);
              }}
              placeholder="بحث سريع عن عميل سابق..."
              className="w-full pr-10 pl-4 py-2.5 border border-[#01404E]/10 rounded-xl bg-[#01404E]/5 text-[#01404E] text-xs font-bold placeholder:text-[#01404E]/50 focus:bg-white focus:text-[#01404E] focus:ring-4 focus:ring-[#00A6A6]/10 focus:border-[#00A6A6] outline-none transition-all shadow-sm"
            />
            {showSearchResults && matchingClients.length > 0 && (
              <div className="absolute top-full right-0 left-0 mt-2 bg-white rounded-xl shadow-lg border border-[#01404E]/5 z-[60] overflow-hidden">
                {matchingClients.map(client => (
                  <button key={client.id} type="button" onClick={() => handleSelectClient(client)} className="w-full flex items-center justify-between p-3 hover:bg-[#01404E]/5 border-b border-[#01404E]/5 last:border-none text-right group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#00A6A6]/10 flex items-center justify-center text-[#00A6A6] group-hover:bg-[#00A6A6] group-hover:text-white transition-all">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-black text-[#01404E] text-[11px]">{client.name}</p>
                        <p className="text-[9px] text-[#01404E]/40 font-bold uppercase">{client.id}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-[#01404E]/40 text-xs font-black bg-[#01404E]/5 px-4 py-2 rounded-2xl border border-[#01404E]/10 whitespace-nowrap">{currentDate}</span>
        </div>

        <div className="p-2 md:p-3 space-y-1.5">

          <form onSubmit={handleSubmit} className="space-y-2">

            {/* Section: Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[10px] md:text-xs font-black text-[#01404E]/60 uppercase mb-1 mr-1">الاسم بالكامل {!isOtherService && <span className="text-red-500">*</span>}</label>
                <input required={!isOtherService} type="text" value={clientName} onChange={e => setClientName(e.target.value)} className={commonInputClass} placeholder="الاسم رباعي" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] md:text-xs font-black text-[#01404E]/60 uppercase mb-1 mr-1">الرقم القومي {(!isOtherService && !isSellingForm) && <span className="text-red-500">*</span>}</label>
                <input required={!isOtherService && !isSellingForm} type="text" maxLength={14} value={nationalId} onChange={e => setNationalId(toEnglishDigits(e.target.value).replace(/\D/g, ''))} className={`${commonInputClass} font-mono`} placeholder="14 رقم" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] md:text-xs font-black text-[#01404E]/60 uppercase mb-1 mr-1">رقم الهاتف {(!isOtherService && !isSellingForm) && <span className="text-red-500">*</span>}</label>
                <input required={!isOtherService && !isSellingForm} type="tel" value={phoneNumber} onChange={e => setPhoneNumber(toEnglishDigits(e.target.value).replace(/\D/g, ''))} className={`${commonInputClass} font-mono`} placeholder="01xxxxxxxxx" />
              </div>
            </div>

            {/* Section: Service and Speed */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <CustomSelect
                    label="نوع الخدمة"
                    options={serviceOptions}
                    value={serviceType}
                    onChange={setServiceType}
                    placeholder="اختر الخدمة..."
                    showAllOption={false}
                    className="w-full py-2.5 px-3.5 border border-[#01404E]/10 rounded-xl bg-[#01404E]/5"
                  />
                </div>
                {serviceType === 'بطاقة رقم قومي' && (
                  <div className="animate-slideIn">
                    <div className="flex items-center justify-between px-1 mb-2">
                      <label className="block text-[10px] md:text-xs font-black text-[#01404E]/60 uppercase mr-1">الباركود</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="barcodeType" checked={!isExternalBarcode} onChange={() => setIsExternalBarcode(false)} className="w-4 h-4 text-[#00A6A6] focus:ring-[#00A6A6]" />
                          <span className="text-[10px] font-black text-[#01404E]">داخلي</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="barcodeType" checked={isExternalBarcode} onChange={() => setIsExternalBarcode(true)} className="w-4 h-4 text-[#00A6A6] focus:ring-[#00A6A6]" />
                          <span className="text-[10px] font-black text-[#01404E]">خارجي</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        required
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(toEnglishDigits(e.target.value))}
                        className={`${commonInputClass} font-mono`}
                        placeholder="اكتب رقم الباركود هنا..."
                      />
                    </div>
                  </div>
                )}
              </div>
              {/* Speed + Notes on same row */}
              <div className="flex flex-col md:flex-row gap-4 items-end">
                {(serviceType === 'بطاقة رقم قومي' || serviceType === 'جواز سفر') && (
                  <div className="flex-1 animate-fadeIn">
                    <label className="flex items-center gap-2 text-[10px] font-black text-[#036564] uppercase mb-2 mr-1">
                      <Zap className="w-3.5 h-3.5 text-[#00A6A6]" />
                      سرعة تنفيذ الخدمة <span className="text-red-500 mr-1">*</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-4 py-2.5">
                      {(serviceType === 'بطاقة رقم قومي' ? ID_CARD_SPEEDS : PASSPORT_SPEEDS).map(s => (
                        <label key={s} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="serviceSpeed" checked={speed === s} onChange={() => setSpeed(s as ServiceSpeed)} className="w-4 h-4 text-[#00A6A6] focus:ring-[#00A6A6]" />
                          <span className="text-[10px] md:text-xs font-black text-[#01404E]">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <label className="block text-[10px] font-black text-[#01404E]/60 uppercase mr-1">ملاحظات إضافية</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`${commonInputClass} border-yellow-400 bg-yellow-50/30`}
                    placeholder="سجل ملاحظة هنا..."
                  />
                </div>
              </div>
            </div>

            {/* Section: Electronic Payment Card */}
            <div className="p-2 space-y-2">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="elecCheck" checked={isElectronic} onChange={e => setIsElectronic(e.target.checked)} className="w-5 h-5 text-blue-600 rounded-md focus:ring-blue-500" />
                <label htmlFor="elecCheck" className="text-sm font-black text-gray-800 flex items-center gap-2 cursor-pointer select-none">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  تحصيل عبر محفظة إلكترونية أو انستا باي
                </label>
              </div>
              {isElectronic && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fadeIn">
                  <div>
                    <CustomSelect
                      label="وسيلة التحصيل"
                      options={methodOptions}
                      value={electronicMethod}
                      onChange={(v) => setElectronicMethod(v as ElectronicMethod)}
                      placeholder="اختر الوسيلة..."
                      showAllOption={false}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-600 mb-2 mr-1">القيمة المحولة</label>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={electronicAmount} onChange={e => setElectronicAmount(Number(toEnglishDigits(e.target.value)))} className={`${commonInputClass} text-blue-700 text-base`} placeholder="0" />
                  </div>
                </div>
              )}
            </div>

            {/* Section: Options (Third Party & Selling Form) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="tpCheck"
                  checked={hasThirdParty}
                  onChange={e => {
                    const checked = e.target.checked;
                    setHasThirdParty(checked);
                    if (checked) setIsSellingForm(false);
                  }}
                  className="w-5 h-5 text-blue-600 rounded-md focus:ring-blue-500"
                />
                <label htmlFor="tpCheck" className="text-sm font-black text-gray-800 cursor-pointer select-none line-clamp-1">إدراج مكتب خارجي</label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="sellFormCheck"
                  checked={isSellingForm}
                  onChange={e => {
                    const checked = e.target.checked;
                    setIsSellingForm(checked);
                    if (checked) setHasThirdParty(false);
                  }}
                  className="w-5 h-5 text-blue-600 rounded-md focus:ring-blue-500"
                />
                <label htmlFor="sellFormCheck" className="text-sm font-black text-gray-800 cursor-pointer select-none line-clamp-1">بيع استمارة</label>
              </div>

              {hasThirdParty && (
                <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-black text-gray-600 mb-2 mr-1">اسم المكتب</label>
                    <input required type="text" value={thirdPartyName} onChange={e => setThirdPartyName(e.target.value)} className={commonInputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-600 mb-2 mr-1">تكلفة المكتب</label>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={thirdPartyCost} onChange={e => setThirdPartyCost(Number(toEnglishDigits(e.target.value)))} className={commonInputClass} placeholder="0" />
                  </div>
                </div>
              )}
            </div>

            {/* Section: Financials Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-2 pt-4">
              <div>
                <label className="block text-xs font-black text-gray-700 mb-2 mr-1">إجمالي سعر الخدمة</label>
                <input required type="text" inputMode="numeric" pattern="[0-9]*" value={serviceCost} onChange={e => setServiceCost(Number(toEnglishDigits(e.target.value)))} className={`${commonInputClass} text-lg`} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-700 mb-2 mr-1 text-green-700">إجمالي المحصل (كاش + إلكتروني)</label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" value={amountPaid} onChange={e => setAmountPaid(Number(toEnglishDigits(e.target.value)))} className={`${commonInputClass} text-lg text-green-700 border-2 border-green-50`} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-700 mb-2 mr-1">المتبقي الآجل</label>
                <input readOnly type="number" value={remainingAmount} className={`w-full py-2.5 px-3.5 border-none rounded-xl font-black text-lg outline-none shadow-inner ${remainingAmount > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-300 text-gray-500'}`} />
              </div>
            </div>

            {/* Status Messages */}
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 font-black border border-red-100 animate-shake">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-green-50 text-green-700 p-5 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 font-black border border-green-100">
                <span>{successMsg}</span>
                <button type="button" onClick={async () => {
                  if (lastEntry) {
                    // Assuming setIsProcessing is available from useModal or context
                    // If not, you'd need to define a local state for processing
                    // For this change, we assume setIsProcessing is accessible.
                    // If useModal is not in this file, this part of the instruction
                    // might be out of scope for the provided snippet.
                    // However, following the instruction to the letter:
                    // The instruction implies setIsProcessing is now part of useModal.
                    // If useModal is not in this snippet, this part of the change
                    // would be applied if the full file were available.
                    // For the purpose of this snippet, we'll assume setIsProcessing
                    // is a valid function to call here.
                    setIsProcessing(true);
                    try {
                      await generateReceipt(lastEntry);
                    } finally {
                      setIsProcessing(false);
                    }
                  }
                }} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl text-sm font-black shadow-lg shadow-green-600/20 transition-all active:scale-95">
                  <Printer className="w-4 h-4" />
                  طباعة إيصال
                </button>
              </div>
            )}

            {/* Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full relative overflow-hidden group bg-gradient-to-r from-[#01404E] to-[#01404E] hover:from-[#00A6A6] hover:to-[#036564] text-white font-black py-3.5 rounded-[1.5rem] shadow-lux transition-all duration-500 active:scale-[0.98] ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <div className="absolute top-0 left-0 w-full h-full bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              <div className="relative z-10 flex items-center justify-center gap-4">
                {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                <span className="text-base">{isSubmitting ? 'جاري معالجة البيانات...' : 'حفظ وإتمام المعاملة'}</span>
              </div>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ServiceForm;