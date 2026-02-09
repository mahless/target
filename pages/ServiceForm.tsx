import React, { useState, useEffect, useMemo } from 'react';
import { ID_CARD_SPEEDS, PASSPORT_SPEEDS, ELECTRONIC_METHODS } from '../constants';
import { ServiceEntry, ServiceSpeed, ElectronicMethod, Expense, StockCategory } from '../types';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { generateReceipt } from '../services/pdfService';
import { Save, Printer, AlertTriangle, Search, UserCheck, Smartphone, Zap, RefreshCw, Check } from 'lucide-react';
import { toEnglishDigits, normalizeArabic } from '../utils';
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
  const [isFetchingBarcode, setIsFetchingBarcode] = useState(false);
  const [barcodeNotFound, setBarcodeNotFound] = useState(false);
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

  const commonInputClass = "w-full p-3.5 border border-[#033649]/10 rounded-2xl bg-[#033649]/5 text-[#033649] font-black placeholder-[#033649]/30 focus:bg-white focus:border-[#00A6A6] focus:ring-4 focus:ring-[#00A6A6]/5 outline-none transition-all shadow-sm";

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

  // منطق جلب الباركود تلقائياً
  const fetchBarcode = async (targetCategory?: StockCategory) => {
    if (!branchId || isFetchingBarcode || isExternalBarcode) return;

    setIsFetchingBarcode(true);
    setBarcodeNotFound(false);
    setError(null);

    // التحويل ليكون مطابقاً لفئات المخزن الذكية
    let category: StockCategory = 'عادي';
    const currentSpeed = targetCategory || (speed as ServiceSpeed);

    if (currentSpeed === 'فوري' || currentSpeed === 'سوبر فوري') category = 'فوري';
    else if (currentSpeed === 'مستعجل') category = 'مستعجل';
    else category = 'عادي';

    const newBarcode = await GoogleSheetsService.getAvailableBarcode(branchId, category);

    if (newBarcode) {
      setBarcode(newBarcode);
      setBarcodeNotFound(false);
    } else {
      setBarcode('');
      setBarcodeNotFound(true);
      setError(`عذراً، مخزن فرعك من النوع (${category}) فارغ، اتصل بالمسؤول.`);
    }
    setIsFetchingBarcode(false);
  };

  const handleSkipBarcode = async () => {
    if (!barcode) return;

    showModal({
      title: 'تأكيد الإبلاغ عن باركود تالف',
      type: 'danger',
      content: (
        <div className="space-y-3 text-right">
          <p className="text-gray-600">هل أنت متأكد أن الباركود <span className="font-mono font-black text-red-600">{barcode}</span> تالف أو غير مطابق؟</p>
          <p className="text-[10px] text-gray-400 font-bold">• سيتم تمييز هذا الكود كنصي بالخطأ في السجلات.</p>
          <p className="text-[10px] text-gray-400 font-bold">• سيقوم النظام بسحب الباركود التالي المتاح فوراً.</p>
        </div>
      ),
      confirmText: 'نعم، الباركود تالف',
      onConfirm: async () => {
        // 1. تمييز الحالي كخطأ
        await GoogleSheetsService.updateStockStatus(barcode, 'Error', username, userRole);
        // 2. سحب كود جديد
        await fetchBarcode();
      }
    });
  };

  // Reset logic when service changes
  useEffect(() => {
    setSpeed('');
    setBarcode('');
    setBarcodeNotFound(false);
    if (isOtherService) {
      setClientName('كاش');
    } else if (clientName === 'كاش') {
      setClientName('');
    }
  }, [serviceType]);

  // Auto-fetch barcode when speed is selected for specific services
  useEffect(() => {
    if (serviceType === 'بطاقة رقم قومي' && speed && !isExternalBarcode) {
      fetchBarcode();
    }
  }, [speed, serviceType, isExternalBarcode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setSuccessMsg(null);

    if (!isOtherService && !isSellingForm && nationalId.length !== 14) {
      setError("الرقم القومي يجب أن يكون 14 رقم");
      return;
    }

    if (!serviceType) {
      setError("يرجى اختيار نوع الخدمة من القائمة");
      return;
    }

    if (!isOtherService && !isSellingForm && !phoneNumber.startsWith('0')) {
      setError(" رقم الهاتف يجب أن يبدأ بصفر (0)");
      return;
    }

    if (isElectronic && (!electronicMethod || electronicMethod === '')) {
      setError("يرجى اختيار وسيلة التحصيل الإلكتروني");
      return;
    }

    if (isElectronic && electronicAmount > amountPaid) {
      setError("خطأ: مبلغ التحصيل الإلكتروني لا يمكن أن يكون أكبر من إجمالي المبلغ المحصل.");
      return;
    }

    // التحقق من سرعة الخدمة (إجباري للبطاقة والجواز)
    if ((serviceType === 'بطاقة رقم قومي' || serviceType === 'جواز سفر') && !speed) {
      setError("يرجى اختيار سرعة تنفيذ الخدمة (عادي/مستعجل/فوري)");
      return;
    }

    if (isExternalBarcode && barcode) {
      const duplicate = entries.find(e => e.barcode === barcode);
      if (duplicate) {
        setError(`هذا الباركود (${barcode}) مسجل مسبقاً للعميل ${duplicate.clientName}`);
        return;
      }
    }

    // التحقق من توافر الباركود للمخزن الداخلي
    if (serviceType === 'بطاقة رقم قومي' && !isExternalBarcode && !barcode) {
      setError("لا يمكن إتمام المعاملة؛ مخزن الباركود فارغ.ل.");
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
        notes: isSellingForm ? 'بيع استمارة لطرف اخر' : notes,
        branchId,
        entryDate: currentDate,
        timestamp: Date.now(),
        status: 'active',
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
      <div className={`bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-premium border border-white/20 transition-opacity animate-premium-in relative z-30 ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="bg-[#033649] p-4 md:p-5 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-[#00A6A6] rounded-full"></div>
            <h2 className="text-2xl font-black tracking-tight whitespace-nowrap">تسجيل معاملة جديدة</h2>
          </div>

          {/* Quick Client Lookup - Moved to Header */}
          <div className="relative w-full md:max-w-xs group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4 group-focus-within:text-[#00A6A6] transition-colors" />
            <input
              type="text"
              value={clientSearchTerm}
              onChange={(e) => {
                setClientSearchTerm(e.target.value);
                setShowSearchResults(true);
              }}
              placeholder="بحث سريع عن عميل سابق..."
              className="w-full pr-10 pl-4 py-2.5 border border-white/30 rounded-xl bg-white/5 text-white text-xs font-bold placeholder:text-white/50 focus:bg-white focus:text-[#033649] focus:ring-4 focus:ring-[#00A6A6]/10 focus:border-[#00A6A6] outline-none transition-all shadow-inner"
            />
            {showSearchResults && matchingClients.length > 0 && (
              <div className="absolute top-full right-0 left-0 mt-2 bg-[#01404E] rounded-xl shadow-lux border border-white/10 z-[60] overflow-hidden backdrop-blur-xl">
                {matchingClients.map(client => (
                  <button key={client.id} type="button" onClick={() => handleSelectClient(client)} className="w-full flex items-center justify-between p-3 hover:bg-white/5 border-b border-white/5 last:border-none text-right group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#00A6A6]/10 flex items-center justify-center text-[#00A6A6] group-hover:bg-[#00A6A6] group-hover:text-white transition-all">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-black text-white text-[11px]">{client.name}</p>
                        <p className="text-[9px] text-white/40 font-bold tracking-widest uppercase">{client.id}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-white/40 text-xs font-black bg-white/5 px-4 py-2 rounded-2xl border border-white/10 whitespace-nowrap">{currentDate}</span>
        </div>

        <div className="p-3 md:p-4 space-y-3">

          <form onSubmit={handleSubmit} className="space-y-3">

            {/* Section: Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-1.5 bg-white/40 rounded-3xl border border-[#033649]/5 shadow-sm">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-[#033649]/60 uppercase tracking-widest mb-1 mr-1">الاسم بالكامل {!isOtherService && <span className="text-red-500">*</span>}</label>
                <input required={!isOtherService} type="text" value={clientName} onChange={e => setClientName(e.target.value)} className={commonInputClass} placeholder="الاسم رباعي" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-black text-[#033649]/60 uppercase tracking-widest mb-1 mr-1">الرقم القومي {(!isOtherService && !isSellingForm) && <span className="text-red-500">*</span>}</label>
                <input required={!isOtherService && !isSellingForm} type="text" maxLength={14} value={nationalId} onChange={e => setNationalId(toEnglishDigits(e.target.value).replace(/\D/g, ''))} className={`${commonInputClass} font-mono`} placeholder="14 رقم" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-black text-[#033649]/60 uppercase tracking-widest mb-1 mr-1">رقم الهاتف {(!isOtherService && !isSellingForm) && <span className="text-red-500">*</span>}</label>
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
                  />
                </div>
                {serviceType === 'بطاقة رقم قومي' ? (
                  <div className="animate-slideIn space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="block text-[10px] font-black text-[#033649]/60 uppercase tracking-[0.2em]">الباركود</label>
                      <div className="flex items-center gap-3 group cursor-pointer" onClick={() => {
                        setIsExternalBarcode(!isExternalBarcode);
                        setBarcode('');
                        if (isExternalBarcode) setBarcodeNotFound(false);
                      }}>
                        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isExternalBarcode ? 'bg-[#00A6A6]' : 'bg-[#033649]/20'}`}>
                          <div className={`w-3 h-3 bg-white rounded-full transition-transform ${isExternalBarcode ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        </div>
                        <label className="text-[10px] font-black text-[#033649]/60 cursor-pointer select-none">
                          استمارة خارجية
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <input
                          readOnly={!isExternalBarcode}
                          required
                          type="text"
                          value={(!isExternalBarcode && barcodeNotFound) ? 'لا يوجد باركود متاح' : barcode}
                          onChange={(e) => isExternalBarcode && setBarcode(toEnglishDigits(e.target.value))}
                          className={`${commonInputClass} !py-4 !rounded-[1.5rem] border ${!isExternalBarcode && isFetchingBarcode ? 'border-amber-200 bg-amber-50/20' :
                            (!isExternalBarcode && barcodeNotFound) ? 'border-red-500 bg-red-50' :
                              (isExternalBarcode ? 'border-[#00A6A6] bg-white ring-4 ring-[#00A6A6]/5' :
                                (barcode ? 'border-[#036564] ring-4 ring-[#036564]/5 bg-[#036564]/5' : 'border-[#033649]/10 bg-[#033649]/5')
                              )
                            } font-mono ${(!isExternalBarcode && barcodeNotFound) ? 'text-red-700' : (barcode && !isExternalBarcode ? 'text-[#036564] font-black' : '')}`}
                          placeholder={
                            isExternalBarcode ? 'اكتب رقم الباركود هنا...' :
                              (isFetchingBarcode ? 'جاري السحب...' : (barcodeNotFound ? 'لا يوجد أكواد' : 'اختر السرعة أولاً'))
                          }
                        />
                        {!isExternalBarcode && isFetchingBarcode && <RefreshCw className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 animate-spin" />}
                        {!isExternalBarcode && barcode && !isFetchingBarcode && <Check className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#036564]" />}
                      </div>

                      {!isExternalBarcode && barcode && !isFetchingBarcode && (
                        <button
                          type="button"
                          onClick={handleSkipBarcode}
                          className="bg-red-50 text-red-600 px-5 rounded-[1.5rem] border border-red-100 hover:bg-red-600 hover:text-white transition-all flex flex-col items-center justify-center text-[9px] font-black leading-tight shadow-sm active:scale-95"
                        >
                          <AlertTriangle className="w-4 h-4 mb-1" />
                          <span>تالف؟</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={`animate-slideIn space-y-1 ${isSellingForm ? 'hidden' : ''}`}>
                    <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mr-1">ملاحظات إضافية</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className={`${commonInputClass} !p-4 !rounded-2xl !border !border-yellow-400`}
                      placeholder="سجل ملاحظة صغيرة هنا..."
                    />
                  </div>
                )}
              </div>

              {/* RE-ADDED: Speed Selection */}
              {(serviceType === 'بطاقة رقم قومي' || serviceType === 'جواز سفر') && (
                <div className="bg-[#036564]/5 p-4 rounded-[2rem] border border-[#036564]/10 animate-fadeIn">
                  <label className="flex items-center gap-2 text-[10px] font-black text-[#036564] uppercase tracking-[0.2em] mb-2 mr-1">
                    <Zap className="w-4 h-4 text-[#00A6A6]" />
                    سرعة تنفيذ الخدمة <span className="text-red-500 mr-1">*</span>
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {(serviceType === 'بطاقة رقم قومي' ? ID_CARD_SPEEDS : PASSPORT_SPEEDS).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSpeed(s as ServiceSpeed)}
                        className={`px-8 py-3 rounded-2xl text-xs font-black transition-all border-2 ${speed === s ? 'bg-[#036564] text-white border-[#036564] shadow-lg shadow-[#036564]/20 scale-105' : 'bg-white text-[#033649]/60 border-transparent hover:border-[#036564]/20'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section: Electronic Payment Card */}
            <div className="bg-gray-50 p-3 rounded-2xl space-y-2 border border-gray-100 shadow-inner">
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
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={electronicAmount === 0 ? '' : electronicAmount} onChange={e => setElectronicAmount(Number(toEnglishDigits(e.target.value)))} className={`${commonInputClass} text-blue-700 text-lg`} placeholder="0" />
                  </div>
                </div>
              )}
            </div>

            {/* Section: Options (Third Party & Selling Form) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100 shadow-inner">
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
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={thirdPartyCost === 0 ? '' : thirdPartyCost} onChange={e => setThirdPartyCost(Number(toEnglishDigits(e.target.value)))} className={commonInputClass} placeholder="0" />
                  </div>
                </div>
              )}
            </div>

            {/* Section: Financials Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t pt-2.5">
              <div>
                <label className="block text-xs font-black text-gray-700 mb-2 mr-1">إجمالي سعر الخدمة</label>
                <input required type="text" inputMode="numeric" pattern="[0-9]*" value={serviceCost === 0 ? '' : serviceCost} onChange={e => setServiceCost(Number(toEnglishDigits(e.target.value)))} className={`${commonInputClass} text-xl`} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-700 mb-2 mr-1 text-green-700">إجمالي المحصل (كاش + إلكتروني)</label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" value={amountPaid === 0 ? '' : amountPaid} onChange={e => setAmountPaid(Number(toEnglishDigits(e.target.value)))} className={`${commonInputClass} text-xl text-green-700 border-2 border-green-50`} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-700 mb-2 mr-1">المتبقي الآجل</label>
                <input readOnly type="number" value={remainingAmount} className={`w-full p-3.5 border-none rounded-xl font-black text-xl outline-none shadow-inner ${remainingAmount > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-300 text-gray-500'}`} />
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
              className={`w-full relative overflow-hidden group bg-gradient-to-r from-[#033649] to-[#01404E] hover:from-[#00A6A6] hover:to-[#036564] text-white font-black py-5 rounded-[1.5rem] shadow-lux transition-all duration-500 active:scale-[0.98] ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <div className="absolute top-0 left-0 w-full h-full bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              <div className="relative z-10 flex items-center justify-center gap-4">
                {isSubmitting ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                <span className="text-xl tracking-tight">{isSubmitting ? 'جاري معالجة البيانات...' : 'حفظ وإتمام المعاملة'}</span>
              </div>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ServiceForm;