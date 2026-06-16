import React from 'react';
import { ServiceEntry } from '../types';
import { toEnglishDigits } from '../utils';
import { STATUS } from '../constants';

interface ServiceEntryDetailsProps {
 entry: ServiceEntry;
}

const ServiceEntryDetails: React.FC<ServiceEntryDetailsProps> = ({ entry }) => {
 return (
 <div className="space-y-2 text-right">
 <div className="grid grid-cols-3 gap-1.5">
 {/* Row 1 */}
 <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100">
 <span className="text-[9px] text-gray-400 font-black block mb-0.5 uppercase">العميل</span>
 <p className="font-black text-gray-800 text-[11px] truncate">{entry.clientName}</p>
 </div>
 <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100">
 <span className="text-[9px] text-gray-400 font-black block mb-0.5 uppercase">الرقم القومي</span>
 <p className="font-black text-gray-800 text-[11px]">{toEnglishDigits(String(entry.nationalId))}</p>
 </div>
 <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100">
 <span className="text-[9px] text-gray-400 font-black block mb-0.5 uppercase">رقم الهاتف</span>
 <p className="font-black text-gray-800 text-[11px]">{toEnglishDigits(String(entry.phoneNumber || '-'))}</p>
 </div>

 {/* Row 2 */}
 <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100">
 <span className="text-[9px] text-gray-400 font-black block mb-0.5 uppercase">نوع الخدمة</span>
 <p className="font-black text-[#01404E] text-[11px] truncate">{entry.serviceType}</p>
 </div>
 <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100">
 <span className="text-[9px] text-gray-400 font-black block mb-0.5 uppercase">السرعة</span>
 <p className="font-black text-gray-800 text-[11px]">{entry.speed || '-'}</p>
 </div>
 <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100">
 <span className="text-[9px] text-gray-400 font-black block mb-0.5 uppercase">الباركود</span>
 <p className="font-black text-gray-800 text-[11px]">
   {entry.barcode || '-'} {entry.Barcode_Source ? `(${entry.Barcode_Source})` : ''}
 </p>
 </div>

 {/* Row 3 */}
 <div className="bg-[#00A6A6]/5 p-1.5 rounded-xl border border-[#00A6A6]/10">
 <span className="text-[9px] text-[#00A6A6] font-black block mb-0.5 uppercase">التكلفة الإجمالية</span>
 <p className="font-black text-[#01404E] text-[11px]">{toEnglishDigits(String(entry.serviceCost))} ج.م</p>
 </div>
 <div className="bg-emerald-50 p-1.5 rounded-xl border border-emerald-100">
 <span className="text-[9px] text-emerald-600 font-black block mb-0.5 uppercase">المدفوع</span>
 <p className="font-black text-emerald-700 text-[11px]">{toEnglishDigits(String(entry.amountPaid))} ج.م</p>
 </div>
 <div className="bg-red-50 p-1.5 rounded-xl border border-red-100">
 <span className="text-[9px] text-red-600 font-black block mb-0.5 uppercase">المتبقي</span>
 <p className={`font-black text-[11px] ${entry.remainingAmount > 0 ? 'text-red-700' : 'text-gray-400'}`}>{toEnglishDigits(String(entry.remainingAmount))} ج.م</p>
 </div>

 {/* Row 4 */}
 <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100">
 <span className="text-[9px] text-gray-400 font-black block mb-0.5 uppercase">الموظف المسؤول</span>
 <p className="font-black text-gray-800 text-[11px] truncate">{entry.recordedBy}</p>
 </div>
 <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100">
 <span className="text-[9px] text-gray-400 font-black block mb-0.5 uppercase">تاريخ العملية</span>
 <p className="font-black text-gray-800 text-[11px]">{entry.entryDate}</p>
 </div>
 <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100">
 <span className="text-[9px] text-gray-400 font-black block mb-0.5 uppercase">الوقت</span>
 <p className="font-black text-gray-800 text-[11px]" dir="ltr">
 {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
 </p>
 </div>

  {/* Row 5 */}
  <div className="col-span-1 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
  <span className="text-[9px] text-gray-400 font-black block mb-0.5 uppercase">رقم أمر الشغل</span>
  <p className="font-black text-blue-800 text-[11px]">{entry.workOrderNumber || 'لم يُحدد'}</p>
  </div>
  <div className="col-span-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
  <span className="text-[9px] text-gray-400 font-black block mb-0.5 uppercase">حالة التتبع</span>
  <p className={`font-black text-[11px] ${entry.status === STATUS.PENDING ? 'text-yellow-600' :
  entry.status === STATUS.IN_PROGRESS ? 'text-blue-600' :
  entry.status === STATUS.READY ? 'text-green-600' :
  entry.status === STATUS.DELIVERED ? 'text-green-700' :
  'text-blue-600'
  }`}>
  {entry.status === STATUS.ACTIVE ? 'قيد المراجعة' : entry.status}
  </p>
  </div>

  {/* Row 6: Notes */}
  <div className="col-span-3 bg-gray-50/50 p-1.5 rounded-xl border border-gray-100 -mt-0.5">
  <span className="text-[9px] text-gray-400 font-black block mb-0.5 uppercase">ملاحظات</span>
  <p className="font-bold text-gray-600 text-[10px] whitespace-pre-wrap leading-tight">{entry.notes || '-'}</p>
  </div>

 {/* Third Party Section */}
 {entry.hasThirdParty && (
 <div className="col-span-3 bg-blue-50/30 p-2 rounded-xl border border-blue-100 grid grid-cols-3 gap-2 mt-0.5">
 <div className="col-span-1">
 <span className="text-[9px] text-blue-400 font-black block">الطرف الثالث</span>
 <p className="font-black text-blue-800 text-[11px] truncate">{entry.thirdPartyName}</p>
 </div>
 <div className="col-span-1 border-r border-blue-100 pr-2">
 <span className="text-[9px] text-blue-400 font-black block">تكلفة المورد</span>
 <p className="font-black text-blue-800 text-[11px]">{entry.thirdPartyCost} ج.م</p>
 </div>
 <div className="col-span-1 border-r border-blue-100 pr-2">
 <span className="text-[9px] text-blue-400 font-black block">الحالة</span>
 <p className={`text-[10px] font-black px-1.5 py-0.5 rounded-full inline-block ${entry.isCostPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
 {entry.isCostPaid ? 'تم التسوية' : 'معلق'}
 </p>
 </div>
 {entry.isCostPaid && (
 <div className="col-span-3 pt-1 border-t border-blue-100/50 text-[9px] text-blue-600/60 font-bold italic">
 تم التسوية بتاريخ {entry.costPaidDate} بواسطة {entry.costPaidBy}
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 );
};

export default ServiceEntryDetails;
