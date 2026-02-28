import React, { useState, useEffect, useMemo } from 'react';
import { ID_CARD_SPEEDS, PASSPORT_SPEEDS, ELECTRONIC_METHODS } from '../constants';
import { ServiceEntry, ServiceSpeed, ElectronicMethod, Expense, StockCategory, StockItem } from '../types';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { generateReceipt } from '../services/pdfService';
import { Save, Printer, AlertTriangle, Search, UserCheck, Smartphone, Zap, RefreshCw, Check, Paperclip } from 'lucide-react';
import { toEnglishDigits, normalizeArabic } from '../utils';
import { validateServiceSubmission } from '../validators';
import { useModal } from '../context/ModalContext';
import CustomSelect from '../components/CustomSelect';
import AttachmentModal from '../components/AttachmentModal';

type FormTab = 'none' | 'electronic' | 'thirdParty' | 'sellingForm';

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
  stock: StockItem[];
}

const ServiceForm: React.FC<ServiceFormProps> = ({ onAddEntry, onAddExpense, entries, serviceTypes, branchId, currentDate, username, userRole, isSubmitting = false, stock }) => {
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

  // Consolidated Tab State
  const [activeTab, setActiveTab] = useState<FormTab>('none');

  // Third Party State
  const [thirdPartyName, setThirdPartyName] = useState('');
  const [thirdPartyCost, setThirdPartyCost] = useState<number>(0);

  // Electronic Payment State
  const [electronicAmount, setElectronicAmount] = useState<number>(0);
  const [electronicMethod, setElectronicMethod] = useState<ElectronicMethod | ''>('');

  const [notes, setNotes] = useState('');

  const serviceOptions = useMemo(() => serviceTypes.map(s => ({ id: s, name: s })), [serviceTypes]);
  const methodOptions = useMemo(() => ELECTRONIC_METHODS.map(m => ({ id: m as string, name: m as string })), []);

  // UI State
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lastEntry, setLastEntry] = useState<ServiceEntry | null>(null);
  // Attachments State
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<{ file: File; preview: string }[]>([]);

  const isOtherService = normalizeArabic(serviceType) === normalizeArabic('أخرى');

  const commonInputClass = "w-full py-2 px-3 border border-[#01404E]/10 rounded-xl bg-white/40 text-[#01404E] font-black placeholder-[#01404E]/30 focus:bg-white focus:text-black focus:border-[#00A6A6] focus:ring-4 focus:ring-[#00A6A6]/5 outline-none transition-all shadow-sm text-xs md:text-sm [&:not(:placeholder-shown)]:bg-white [&:not(:placeholder-shown)]:text-black";

  // Search Logic
  const matchingClients = useMemo(() => {
    if (clientSearchTerm.length < 2) return [];

    const rawTerm = toEnglishDigits(clientSearchTerm.toLowerCase());
    const normalizedTerm = normalizeArabic(rawTerm);

    const uniqueClients: Record<string, { name: string, id: string, phone: string }> = {};

    entries.forEach(e => {
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

  // منطق تصفية الباركود المتاح للفرع والنوع المختار
  const availableBarcodes = useMemo(() => {
    if (!branchId || isExternalBarcode || serviceType !== 'بطاقة رقم قومي') return [];

    let category: StockCategory = 'عادي';
    if (speed === 'فوري' || speed === 'سوبر فوري') category = 'فوري';
    else if (speed === 'مستعجل') category = 'مستعجل';

    return stock
      .filter(s =>
        normalizeArabic(s.branch) === normalizeArabic(branchId) &&
        s.category === category &&
        s.status === 'Available'
      )
      .map(s => ({ id: s.barcode, name: s.barcode }));
  }, [stock, branchId, speed, isExternalBarcode, serviceType]);


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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setSuccessMsg(null);

    const isSellingForm = activeTab === 'sellingForm';
    const isElectronic = activeTab === 'electronic';

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

    try {
      const entryId = Date.now().toString();

      let attachmentUrls = '';
      if (selectedImages.length > 0) {
        setIsProcessing(true);
        showQuickStatus('جاري رفع الصور...', 'success');
        const uploadData = await Promise.all(selectedImages.map(async img => {
          const reader = new FileReader();
          return new Promise<{ name: string, type: string, base64: string }>((resolve) => {
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve({ name: `${entryId}_${img.file.name}`, type: img.file.type, base64 });
            };
            reader.readAsDataURL(img.file);
          });
        }));

        const uploadRes = await GoogleSheetsService.uploadFiles(uploadData);
        if (uploadRes.success && uploadRes.urls) {
          attachmentUrls = uploadRes.urls.join(',');
        } else {
          showQuickStatus('فشل رفع الصور', 'error');
          setIsProcessing(false);
          return;
        }
      }

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
        hasThirdParty: activeTab === 'thirdParty',
        thirdPartyName: activeTab === 'thirdParty' ? thirdPartyName : undefined,
        thirdPartyCost: activeTab === 'thirdParty' ? Number(thirdPartyCost) : undefined,
        isCostPaid: false,
        isElectronic,
        electronicAmount: isElectronic ? Number(electronicAmount) : 0,
        electronicMethod: isElectronic ? (electronicMethod as ElectronicMethod) : undefined,
        notes: isSellingForm ? 'بيع استمارة لطرف اخر' : notes,
        branchId,
        entryDate: currentDate,
        timestamp: Date.now(),
        status: 'قيد المراجعة',
        recordedBy: username,
        attachments: attachmentUrls
      };

      const success = await onAddEntry(newEntry);

      if (success) {
        showQuickStatus('تم بنجاح');

        if (serviceType === 'بطاقة رقم قومي' && barcode && !isExternalBarcode) {
          GoogleSheetsService.updateStockStatus(barcode, 'Used', username, userRole, entryId);
        }

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

        setClientName('');
        setNationalId('');
        setPhoneNumber('');
        setBarcode('');
        setServiceCost(0);
        setAmountPaid(0);
        setThirdPartyCost(0);
        setActiveTab('none');
        setElectronicAmount(0);
        setSpeed('');
        setNotes('');
        setIsExternalBarcode(false);
        setSelectedImages([]);
      } else {
        showQuickStatus('خطأ في الاتصال', 'error');
        setError('فشل حفظ البيانات في السيرفر، يرجى المحاولة لاحقاً');
      }
    } catch (err) {
      showQuickStatus('حدث خطأ', 'error');
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-2 md:p-3">
      <div className={`transition-opacity animate-premium-in relative z-30 ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="py-2 md:py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-[#01404E]/10 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-[#00A6A6] rounded-full"></div>
            <h2 className="text-xl font-black tracking-tight whitespace-nowrap">تسجيل معاملة جديدة</h2>
          </div>

          <div className="relative w-full md:max-w-xs group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[#01404E]/30 w-4 h-4 group-focus-within:text-[#00A6A6] transition-colors" />
            <input
              type="text"
              value={clientSearchTerm}
              onChange={(e) => {
                setClientSearchTerm(toEnglishDigits(e.target.value));
                setShowSearchResults(true);
              }}
              placeholder="بحث سريع عن عميل سابق..."
              className="w-full pr-10 pl-4 py-2.5 border border-[#01404E]/10 rounded-xl bg-[#01404E]/5 text-[#01404E] text-xs font-bold placeholder:text-[#01404E]/40 focus:bg-white focus:text-[#01404E] focus:ring-4 focus:ring-[#00A6A6]/10 focus:border-[#00A6A6] outline-none transition-all shadow-sm"
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
                        <p className="font-black text-white text-[10px]">{client.name}</p>
                        <p className="text-[8px] text-white/40 font-bold tracking-widest uppercase">{client.id}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-[#01404E]/40 text-xs font-black bg-[#01404E]/5 px-4 py-2 rounded-2xl border border-[#01404E]/10 whitespace-nowrap">{currentDate}</span>
        </div>

        <div className="p-0 space-y-2">
          <form onSubmit={handleSubmit} className="space-y-1.5">

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-0">
              <div className="md:col-span-2">
                <label className="block text-[10px] md:text-xs font-black text-[#01404E] uppercase tracking-widest mb-1 mr-1">الاسم بالكامل {!isOtherService && <span className="text-red-500">*</span>}</label>
                <input required={!isOtherService} type="text" value={clientName} onChange={e => setClientName(e.target.value)} className={commonInputClass} placeholder="الاسم رباعي" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] md:text-xs font-black text-[#01404E] uppercase tracking-widest mb-1 mr-1">الرقم القومي {(!isOtherService && activeTab !== 'sellingForm') && <span className="text-red-500">*</span>}</label>
                <input required={!isOtherService && activeTab !== 'sellingForm'} type="text" maxLength={14} value={nationalId} onChange={e => setNationalId(toEnglishDigits(e.target.value).replace(/\D/g, ''))} className={`${commonInputClass} font-mono`} placeholder="14 رقم" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] md:text-xs font-black text-[#01404E] uppercase tracking-widest mb-1 mr-1">رقم الهاتف {(!isOtherService && activeTab !== 'sellingForm') && <span className="text-red-500">*</span>}</label>
                <input required={!isOtherService && activeTab !== 'sellingForm'} type="tel" value={phoneNumber} onChange={e => setPhoneNumber(toEnglishDigits(e.target.value).replace(/\D/g, ''))} className={`${commonInputClass} font-mono`} placeholder="01xxxxxxxxx" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-4">
                  <CustomSelect
                    label="نوع الخدمة"
                    options={serviceOptions}
                    value={serviceType}
                    onChange={setServiceType}
                    placeholder="اختر الخدمة..."
                    showAllOption={false}
                  />
                </div>

                <div className="md:col-span-6">
                  {serviceType === 'بطاقة رقم قومي' ? (
                    <div className="animate-slideIn space-y-1">
                      <div className="flex items-center justify-between px-1 mb-1">
                        <label className="block text-[10px] font-black text-[#01404E] uppercase tracking-[0.2em]">الباركود</label>
                        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => {
                          setIsExternalBarcode(!isExternalBarcode);
                          setBarcode('');
                          if (isExternalBarcode) setBarcodeNotFound(false);
                        }}>
                          <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isExternalBarcode ? 'bg-[#00A6A6]' : 'bg-[#01404E]/20'}`}>
                            <div className={`w-3 h-3 bg-white rounded-full transition-transform ${isExternalBarcode ? 'translate-x-4' : 'translate-x-0'}`}></div>
                          </div>
                          <label className="text-[10px] font-black text-[#01404E] cursor-pointer select-none">
                            استمارة خارجية
                          </label>
                        </div>
                      </div>

                      <div className="relative">
                        {isExternalBarcode ? (
                          <input
                            required
                            type="text"
                            value={barcode}
                            onChange={(e) => setBarcode(toEnglishDigits(e.target.value))}
                            className={`${commonInputClass} !py-3 !rounded-2xl border border-[#00A6A6] bg-white ring-4 ring-[#00A6A6]/5 font-mono text-[#01404E] font-black`}
                            placeholder="رقم الباركود..."
                          />
                        ) : (
                          <CustomSelect
                            label=""
                            options={availableBarcodes}
                            value={barcode}
                            onChange={setBarcode}
                            placeholder={availableBarcodes.length > 0 ? "اختر الباركود..." : "لا يوجد باركود متاح"}
                            showAllOption={false}
                            className={`py-2 px-3 rounded-xl border ${availableBarcodes.length > 0 ? 'border-green-500' : 'border-red-500'}`}
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className={`animate-slideIn space-y-1 ${activeTab === 'sellingForm' ? 'hidden' : ''}`}>
                      <label className="block text-[10px] font-black text-[#01404E] uppercase tracking-widest mr-1">الملاحظات</label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className={`${commonInputClass} !py-3 !rounded-2xl`}
                        placeholder="سجل ملاحظة هنا..."
                      />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={() => setIsAttachmentModalOpen(true)}
                    className={`w-full flex items-center justify-center gap-2 font-black py-2.5 rounded-xl border transition-all active:scale-95 group ${selectedImages.length > 0 ? 'bg-[#00A6A6] text-white border-[#00A6A6]' : 'bg-[#01404E]/10 text-[#01404E] border-[#01404E]/10 hover:bg-[#01404E]/20'}`}
                  >
                    <Paperclip className={`w-4 h-4 group-hover:rotate-12 transition-transform ${selectedImages.length > 0 ? 'text-white' : ''}`} />
                    <span className="text-xs">المرفقات {selectedImages.length > 0 && `(${selectedImages.length})`}</span>
                  </button>
                </div>
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 ${(serviceType === 'بطاقة رقم قومي' || serviceType === 'جواز سفر') ? '' : 'hidden'}`}>
                <div className="bg-[#036564]/5 p-2 rounded-xl border border-[#036564]/10">
                  <label className="flex items-center gap-2 text-[10px] font-black text-[#01404E] uppercase tracking-[0.2em] mb-1 mr-1">
                    <Zap className="w-4 h-4 text-[#00A6A6]" />
                    سرعة الخدمة
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(serviceType === 'بطاقة رقم قومي' ? ID_CARD_SPEEDS : PASSPORT_SPEEDS).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSpeed(s as ServiceSpeed)}
                        className={`flex-1 min-w-[60px] py-2 rounded-xl text-xs font-black transition-all border-2 ${speed === s ? 'bg-[#036564] text-white border-[#036564] shadow-md' : 'bg-white text-[#01404E]/60 border-transparent hover:border-[#036564]/20'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {serviceType === 'بطاقة رقم قومي' && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-[#01404E] uppercase tracking-widest mr-1">الملاحظات</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className={`${commonInputClass} !py-[1.125rem] !rounded-2xl`}
                      placeholder="سجل ملاحظة هنا..."
                    />
                  </div>
                )}
              </div>

              <div className="bg-white/30 backdrop-blur-sm rounded-2xl border border-[#01404E]/5 p-1.5 space-y-2">
                <div className="flex gap-1 bg-[#01404E]/5 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveTab(activeTab === 'electronic' ? 'none' : 'electronic')}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'electronic' ? 'bg-white text-[#00A6A6] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    محفظة / انستا باي
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab(activeTab === 'thirdParty' ? 'none' : 'thirdParty')}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'thirdParty' ? 'bg-white text-[#01404E] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    إدراج مكتب
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab(activeTab === 'sellingForm' ? 'none' : 'sellingForm')}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'sellingForm' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    بيع استمارة
                  </button>
                </div>

                <div className="min-h-[60px] px-2 pb-2">
                  {activeTab === 'electronic' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 animate-fadeIn">
                      <CustomSelect
                        label="وسيلة التحصيل"
                        options={methodOptions}
                        value={electronicMethod}
                        onChange={(v) => setElectronicMethod(v as ElectronicMethod)}
                        placeholder="اختر الوسيلة..."
                        showAllOption={false}
                      />
                      <div>
                        <label className="block text-[10px] font-black text-[#01404E] mb-2 mr-1 uppercase">القيمة المحولة</label>
                        <input type="text" inputMode="numeric" pattern="[0-9]*" value={electronicAmount} onChange={e => setElectronicAmount(Number(toEnglishDigits(e.target.value)))} className={`${commonInputClass} text-blue-700`} placeholder="0" />
                      </div>
                    </div>
                  )}

                  {activeTab === 'thirdParty' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 animate-fadeIn">
                      <div>
                        <label className="block text-[10px] font-black text-[#01404E] mb-2 mr-1 uppercase">اسم المكتب</label>
                        <input type="text" value={thirdPartyName} onChange={e => setThirdPartyName(e.target.value)} className={commonInputClass} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-[#01404E] mb-2 mr-1 uppercase">تكلفة المكتب</label>
                        <input type="text" inputMode="numeric" pattern="[0-9]*" value={thirdPartyCost} onChange={e => setThirdPartyCost(Number(toEnglishDigits(e.target.value)))} className={commonInputClass} placeholder="0" />
                      </div>
                    </div>
                  )}

                  {activeTab === 'sellingForm' && (
                    <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-4 rounded-2xl animate-fadeIn">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="text-xs font-black">سيتم تسجيل هذه المعاملة كـ "بيع استمارة" فقط.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border-t pt-2">
                <div>
                  <label className="block text-xs font-black text-[#01404E] mb-1 mr-1">إجمالي سعر الخدمة</label>
                  <input required type="text" inputMode="numeric" pattern="[0-9]*" value={serviceCost} onChange={e => setServiceCost(Number(toEnglishDigits(e.target.value)))} className={`${commonInputClass} text-base`} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#01404E] mb-1 mr-1">المحصل (كاش + إلكتروني)</label>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={amountPaid} onChange={e => setAmountPaid(Number(toEnglishDigits(e.target.value)))} className={`${commonInputClass} text-base text-green-700 border-2 border-green-50`} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#01404E] mb-1 mr-1">المتبقي الآجل</label>
                  <input readOnly type="number" value={remainingAmount} className={`w-full py-2 px-3 border-none rounded-xl font-black text-base outline-none shadow-inner ${remainingAmount > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-300 text-gray-500'}`} />
                </div>
                <div className="col-span-2 md:col-span-1 flex items-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full relative overflow-hidden group bg-gradient-to-r from-[#01404E] to-[#01404E] hover:from-[#00A6A6] hover:to-[#036564] text-white font-black py-2.5 rounded-xl shadow-lux transition-all duration-500 active:scale-[0.98] ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <div className="absolute top-0 left-0 w-full h-full bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                    <div className="relative z-10 flex items-center justify-center gap-2">
                      {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      <span className="text-sm tracking-tight">{isSubmitting ? 'جاري الحفظ...' : 'حفظ المعاملة'}</span>
                    </div>
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 font-black border border-red-100 animate-shake">
                  <AlertTriangle className="w-6 h-6 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="bg-white/40 backdrop-blur-md text-green-700 p-5 rounded-[2rem] flex flex-col sm:flex-row justify-between items-center gap-4 font-black border border-green-100/30 transition-all animate-fadeIn">
                  <span>{successMsg}</span>
                  <button type="button" onClick={async () => {
                    if (lastEntry) {
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
            </div>
          </form>
        </div>
      </div>

      <AttachmentModal
        isOpen={isAttachmentModalOpen}
        onClose={() => setIsAttachmentModalOpen(false)}
        onSave={setSelectedImages}
        initialImages={selectedImages}
      />
    </div>
  );
};

export default ServiceForm;