import React, { useState, useEffect, useMemo } from 'react';
import { SERVICE_TYPES, ID_CARD_SPEEDS, PASSPORT_SPEEDS, ELECTRONIC_METHODS } from '../constants';
import { ServiceEntry, ServiceSpeed, ElectronicMethod, Expense, StockCategory } from '../types';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { generateReceipt } from '../services/pdfService';
import { Save, Printer, AlertTriangle, Search, UserCheck, Smartphone, Zap, RefreshCw } from 'lucide-react';
import { toEnglishDigits } from '../utils';
import { useModal } from '../context/ModalContext';
import CustomSelect from '../components/CustomSelect';

interface ServiceFormProps {
  onAddEntry: (entry: ServiceEntry) => Promise<boolean>;
  onAddExpense: (expense: Expense) => Promise<boolean>;
  entries: ServiceEntry[];
  branchId: string;
  currentDate: string;
  username: string;
  userRole: string;
}

const ServiceForm: React.FC<ServiceFormProps> = ({ onAddEntry, onAddExpense, entries, branchId, currentDate, username, userRole }) => {
  const { showModal, showQuickStatus } = useModal();
  // Client Lookup State
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientName, setClientName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);
  const [barcode, setBarcode] = useState('');
  const [speed, setSpeed] = useState<ServiceSpeed | ''>('');
  const [isFetchingBarcode, setIsFetchingBarcode] = useState(false);

  // Financial State
  const [serviceCost, setServiceCost] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [remainingAmount, setRemainingAmount] = useState<number>(0);

  // Third Party State
  const [hasThirdParty, setHasThirdParty] = useState(false);
  const [thirdPartyName, setThirdPartyName] = useState('');
  const [thirdPartyCost, setThirdPartyCost] = useState<number>(0);

  // Electronic Payment State
  const [isElectronic, setIsElectronic] = useState(false);
  const [electronicAmount, setElectronicAmount] = useState<number>(0);
  const [electronicMethod, setElectronicMethod] = useState<ElectronicMethod>('انستا باي');

  const [notes, setNotes] = useState('');

  const serviceOptions = useMemo(() => SERVICE_TYPES.map(s => ({ id: s, name: s })), []);
  const methodOptions = useMemo(() => ELECTRONIC_METHODS.map(m => ({ id: m as string, name: m as string })), []);

  // UI State
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lastEntry, setLastEntry] = useState<ServiceEntry | null>(null);

  const commonInputClass = "w-full p-3.5 border-2 border-blue-200 rounded-xl bg-white text-black font-black placeholder-gray-400 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm";

  // Search Logic
  const matchingClients = useMemo(() => {
    if (clientSearchTerm.length < 2) return [];
    const term = clientSearchTerm.toLowerCase();
    const uniqueClients: Record<string, { name: string, id: string, phone: string }> = {};

    entries.forEach(e => {
      if (
        e.clientName.toLowerCase().includes(term) ||
        e.nationalId.includes(term) ||
        e.phoneNumber.includes(term)
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
    if (!branchId || isFetchingBarcode) return;

    setIsFetchingBarcode(true);
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
    } else {
      setBarcode('');
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
  }, [serviceType]);

  // Auto-fetch barcode when speed is selected for specific services
  useEffect(() => {
    if (serviceType === 'بطاقة رقم قومي' && speed) {
      fetchBarcode();
    }
  }, [speed, serviceType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setSuccessMsg(null);

    if (nationalId.length !== 14) {
      setError("الرقم القومي يجب أن يكون 14 رقم");
      return;
    }

    if (!phoneNumber.startsWith('0')) {
      setError(" رقم الهاتف يجب أن يبدأ بصفر (0)");
      return;
    }

    if (isElectronic && electronicAmount > amountPaid) {
      setError("خطأ: مبلغ التحصيل الإلكتروني لا يمكن أن يكون أكبر من إجمالي المبلغ المحصل.");
      return;
    }

    setIsSubmitting(true);
    try {
      const entryId = Date.now().toString();

      const newEntry: ServiceEntry = {
        id: entryId,
        clientName,
        nationalId,
        phoneNumber,
        serviceType,
        barcode: serviceType === 'بطاقة رقم قومي' ? barcode : undefined,
        speed: (speed as ServiceSpeed) || undefined,
        serviceCost: Number(serviceCost),
        amountPaid: Number(amountPaid),
        remainingAmount,
        hasThirdParty,
        thirdPartyName: hasThirdParty ? thirdPartyName : undefined,
        thirdPartyCost: hasThirdParty ? Number(thirdPartyCost) : undefined,
        isThirdPartySettled: false,
        isElectronic,
        electronicAmount: isElectronic ? Number(electronicAmount) : 0,
        electronicMethod: isElectronic ? electronicMethod : undefined,
        notes,
        branchId,
        entryDate: currentDate,
        timestamp: Date.now(),
        status: 'active',
        recordedBy: username
      };

      const success = await onAddEntry(newEntry);

      if (success) {
        showQuickStatus('تم بنجاح');

        // تسجيل استخدام الباركود في المخزن
        if (serviceType === 'بطاقة رقم قومي' && barcode) {
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
            recordedBy: username,
            relatedEntryId: entryId
          };
          await onAddExpense(electronicExpense);
        }

        // Automation: Record third-party cost as an expense
        if (hasThirdParty && thirdPartyCost > 0) {
          const tpExpense: Expense = {
            id: `tp-${Date.now()}-${entryId}`,
            category: 'طرف ثالث',
            amount: Number(thirdPartyCost),
            notes: `تكلفة مورد: ${thirdPartyName} | عميل: ${clientName} | ${serviceType}`,
            branchId,
            date: currentDate,
            timestamp: Date.now(),
            recordedBy: username,
            relatedEntryId: entryId
          };
          await onAddExpense(tpExpense);
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
      } else {
        showQuickStatus('خطأ في الاتصال', 'error');
        setError('فشل حفظ البيانات في السيرفر، يرجى المحاولة لاحقاً');
      }
    } catch (err) {
      showQuickStatus('حدث خطأ', 'error');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-opacity ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="bg-blue-800 p-6 text-white flex justify-between items-center shadow-lg">
          <h2 className="text-xl font-black">تسجيل معاملة جديدة</h2>
          <span className="text-blue-200 text-sm font-black bg-white/10 px-3 py-1 rounded-full">{currentDate}</span>
        </div>

        <div className="p-6 md:p-8 space-y-8">

          {/* Section: Client Lookup */}
          <div className="relative">
            <label className="block text-sm font-black text-blue-800 mb-2 mr-1">بحث سريع عن عميل سابق</label>
            <div className="relative group">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                value={clientSearchTerm}
                onChange={(e) => {
                  setClientSearchTerm(e.target.value);
                  setShowSearchResults(true);
                }}
                placeholder="ابحث هنا لاسترجاع البيانات تلقائياً..."
                className="w-full pr-12 pl-4 py-4 border-2 border-blue-50 rounded-2xl bg-gray-50 text-black font-black placeholder-gray-400 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all"
              />
              {showSearchResults && matchingClients.length > 0 && (
                <div className="absolute top-full right-0 left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  {matchingClients.map(client => (
                    <button key={client.id} type="button" onClick={() => handleSelectClient(client)} className="w-full flex items-center justify-between p-4 hover:bg-blue-50 border-b last:border-none text-right group">
                      <div className="flex items-center gap-3">
                        <UserCheck className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                        <div>
                          <p className="font-black text-gray-900">{client.name}</p>
                          <p className="text-xs text-gray-500 font-bold">{client.id}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Section: Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <label className="block text-xs font-black text-gray-700 mb-2 mr-1">الاسم بالكامل</label>
                <input required type="text" value={clientName} onChange={e => setClientName(e.target.value)} className={commonInputClass} placeholder="الاسم رباعي" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-700 mb-2 mr-1">الرقم القومي</label>
                <input required type="text" maxLength={14} value={nationalId} onChange={e => setNationalId(toEnglishDigits(e.target.value).replace(/\D/g, ''))} className={`${commonInputClass} font-mono`} placeholder="14 رقم" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-700 mb-2 mr-1">رقم الهاتف</label>
                <input required type="tel" value={phoneNumber} onChange={e => setPhoneNumber(toEnglishDigits(e.target.value).replace(/\D/g, ''))} className={`${commonInputClass} font-mono`} placeholder="01xxxxxxxxx" />
              </div>
            </div>

            {/* Section: Service and Speed */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <CustomSelect
                    label="نوع الخدمة"
                    options={serviceOptions}
                    value={serviceType}
                    onChange={setServiceType}
                    placeholder="اختر الخدمة..."
                  />
                </div>
                {serviceType === 'بطاقة رقم قومي' && (
                  <div className="animate-slideIn">
                    <label className="block text-xs font-black text-blue-700 mb-2 mr-1">الباركود (يتم تخصيصه تلقائياً)</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          readOnly
                          required
                          type="text"
                          value={barcode}
                          className={`${commonInputClass} border-2 ${isFetchingBarcode ? 'border-amber-200' : 'border-blue-100'} font-mono bg-gray-100 cursor-not-allowed`}
                          placeholder={isFetchingBarcode ? 'جاري السحب...' : 'اختر السرعة أولاً'}
                        />
                        {isFetchingBarcode && <RefreshCw className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 animate-spin" />}
                      </div>
                      {barcode && !isFetchingBarcode && (
                        <button
                          type="button"
                          onClick={handleSkipBarcode}
                          className="bg-red-50 text-red-600 px-4 rounded-xl border border-red-100 hover:bg-red-100 transition-colors flex flex-col items-center justify-center text-[8px] font-black leading-tight"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 mb-0.5" />
                          <span>باركود تالف؟</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* RE-ADDED: Speed Selection */}
              {(serviceType === 'بطاقة رقم قومي' || serviceType === 'جواز سفر') && (
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 animate-fadeIn">
                  <label className="flex items-center gap-2 text-xs font-black text-blue-800 mb-3 mr-1">
                    <Zap className="w-4 h-4" />
                    سرعة تنفيذ الخدمة
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(serviceType === 'بطاقة رقم قومي' ? ID_CARD_SPEEDS : PASSPORT_SPEEDS).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSpeed(s as ServiceSpeed)}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all border-2 ${speed === s ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' : 'bg-white text-gray-600 border-gray-100 hover:border-blue-200'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section: Electronic Payment Card */}
            <div className="bg-gray-50 p-6 rounded-2xl space-y-4 border border-gray-100 shadow-inner">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="elecCheck" checked={isElectronic} onChange={e => setIsElectronic(e.target.checked)} className="w-5 h-5 text-blue-600 rounded-md focus:ring-blue-500" />
                <label htmlFor="elecCheck" className="text-sm font-black text-gray-800 flex items-center gap-2 cursor-pointer select-none">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  تحصيل عبر محفظة إلكترونية أو انستا باي
                </label>
              </div>
              {isElectronic && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                  <div>
                    <CustomSelect
                      label="وسيلة التحصيل"
                      options={methodOptions}
                      value={electronicMethod}
                      onChange={(v) => setElectronicMethod(v as ElectronicMethod)}
                      placeholder="اختر الوسيلة..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-600 mb-2 mr-1">القيمة المحولة</label>
                    <input required type="number" min="1" value={electronicAmount === 0 ? '' : electronicAmount} onChange={e => setElectronicAmount(Number(toEnglishDigits(e.target.value)))} className={`${commonInputClass} text-blue-700 text-lg`} placeholder="0" />
                  </div>
                </div>
              )}
            </div>

            {/* Section: Third Party Card */}
            <div className="bg-gray-50 p-6 rounded-2xl space-y-4 border border-gray-100 shadow-inner">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="tpCheck" checked={hasThirdParty} onChange={e => setHasThirdParty(e.target.checked)} className="w-5 h-5 text-blue-600 rounded-md focus:ring-blue-500" />
                <label htmlFor="tpCheck" className="text-sm font-black text-gray-800 cursor-pointer select-none">إدراج طرف ثالث في المعاملة</label>
              </div>
              {hasThirdParty && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-black text-gray-600 mb-2 mr-1">جهة التوريد (المكتب الخارجي)</label>
                    <input required type="text" value={thirdPartyName} onChange={e => setThirdPartyName(e.target.value)} className={commonInputClass} placeholder="اسم المكتب أو المورد" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-600 mb-2 mr-1">تكلفة التوريد</label>
                    <input required type="number" value={thirdPartyCost === 0 ? '' : thirdPartyCost} onChange={e => setThirdPartyCost(Number(toEnglishDigits(e.target.value)))} className={commonInputClass} placeholder="0" />
                  </div>
                </div>
              )}
            </div>

            {/* Section: Financials Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t pt-8">
              <div>
                <label className="block text-xs font-black text-gray-700 mb-2 mr-1">سعر الخدمة (تارجت)</label>
                <input required type="number" value={serviceCost === 0 ? '' : serviceCost} onChange={e => setServiceCost(Number(toEnglishDigits(e.target.value)))} className={`${commonInputClass} text-xl`} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-700 mb-2 mr-1 text-green-700">إجمالي المحصل (كاش + إلكتروني)</label>
                <input required type="number" value={amountPaid === 0 ? '' : amountPaid} onChange={e => setAmountPaid(Number(toEnglishDigits(e.target.value)))} className={`${commonInputClass} text-xl text-green-700 border-2 border-green-50`} placeholder="0" />
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
                <button type="button" onClick={() => lastEntry && generateReceipt(lastEntry)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl text-sm font-black shadow-lg shadow-green-600/20 transition-all active:scale-95">
                  <Printer className="w-4 h-4" />
                  طباعة إيصال العميل
                </button>
              </div>
            )}

            {/* Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-blue-800 hover:bg-blue-900 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              <span className="text-lg">{isSubmitting ? 'جاري الحفظ...' : 'حفظ وإتمام المعاملة'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ServiceForm;