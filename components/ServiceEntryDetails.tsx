import React from 'react';
import { ServiceEntry } from '../types';
import { STATUS, ROLES } from '../constants';
import { normalizeArabic, toEnglishDigits } from '../utils';
import { Hash, Activity } from 'lucide-react';

interface ServiceEntryDetailsProps {
    entry: ServiceEntry;
    userRole?: string;
}

const ServiceEntryDetails: React.FC<ServiceEntryDetailsProps> = ({ entry, userRole }) => {
    const isManager = normalizeArabic(userRole || '') === normalizeArabic(ROLES.MANAGER) || userRole === ROLES.ADMIN;
    return (
        <div className="space-y-2 text-right">
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-1.5">
                {/* Row 1 */}
                <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100 col-span-1 lg:col-span-2">
                    <span className="text-[8px] text-gray-400 font-black block mb-0.5 uppercase tracking-tighter">العميل</span>
                    <p className="font-black text-gray-800 text-[10px] truncate">{entry.clientName}</p>
                </div>
                <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100 col-span-1 lg:col-span-2">
                    <span className="text-[8px] text-gray-400 font-black block mb-0.5 uppercase tracking-tighter">الرقم القومي</span>
                    <p className="font-black text-gray-800 text-[10px]">{toEnglishDigits(String(entry.nationalId))}</p>
                </div>
                <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100 col-span-1 lg:col-span-2">
                    <span className="text-[8px] text-gray-400 font-black block mb-0.5 uppercase tracking-tighter">رقم الهاتف</span>
                    <p className="font-black text-gray-800 text-[10px]">{toEnglishDigits(String(entry.phoneNumber || '-'))}</p>
                </div>

                {/* Row 2 */}
                <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100 col-span-1 lg:col-span-2">
                    <span className="text-[8px] text-gray-400 font-black block mb-0.5 uppercase tracking-tighter">نوع الخدمة</span>
                    <p className="font-black text-[#01404E] text-[10px] truncate">{entry.serviceType}</p>
                </div>
                <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100 col-span-1 lg:col-span-2">
                    <span className="text-[8px] text-gray-400 font-black block mb-0.5 uppercase tracking-tighter">السرعة</span>
                    <p className="font-black text-gray-800 text-[10px]">{entry.speed || '-'}</p>
                </div>
                <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100 col-span-1 lg:col-span-2">
                    <span className="text-[8px] text-gray-400 font-black block mb-0.5 uppercase tracking-tighter">رقم الباركود</span>
                    <p className="font-black text-gray-800 text-[10px]">{entry.barcode || entry.Barcode_Source || '-'}</p>
                </div>

                {/* Row 3 */}
                <div className="bg-[#00A6A6]/5 p-1.5 rounded-xl border border-[#00A6A6]/10 col-span-1 lg:col-span-2">
                    <span className="text-[8px] text-[#00A6A6] font-black block mb-0.5 uppercase tracking-tighter">التكلفة الإجمالية</span>
                    <p className="font-black text-[#01404E] text-[10px]">{toEnglishDigits(String(entry.serviceCost))} ج.م</p>
                </div>
                <div className="bg-emerald-50 p-1.5 rounded-xl border border-emerald-100 col-span-1 lg:col-span-2">
                    <span className="text-[8px] text-emerald-600 font-black block mb-0.5 uppercase tracking-tighter">المدفوع</span>
                    <p className="font-black text-emerald-700 text-[10px]">{toEnglishDigits(String(entry.amountPaid))} ج.م</p>
                </div>
                <div className="bg-red-50 p-1.5 rounded-xl border border-red-100 col-span-1 lg:col-span-2">
                    <span className="text-[8px] text-red-600 font-black block mb-0.5 uppercase tracking-tighter">المتبقي</span>
                    <p className={`font-black text-[10px] ${entry.remainingAmount > 0 ? 'text-red-700' : 'text-gray-400'}`}>{toEnglishDigits(String(entry.remainingAmount))} ج.م</p>
                </div>

                {/* Row 4 */}
                <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100 col-span-1 lg:col-span-2">
                    <span className="text-[8px] text-gray-400 font-black block mb-0.5 uppercase tracking-tighter">الموظف المسؤول</span>
                    <p className="font-black text-gray-800 text-[10px] truncate">{entry.recordedBy}</p>
                </div>
                <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100 col-span-1 lg:col-span-2">
                    <span className="text-[8px] text-gray-400 font-black block mb-0.5 uppercase tracking-tighter">تاريخ العملية</span>
                    <p className="font-black text-gray-800 text-[10px] tracking-tighter">{entry.entryDate}</p>
                </div>
                <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100 col-span-1 lg:col-span-2">
                    <span className="text-[8px] text-gray-400 font-black block mb-0.5 uppercase tracking-tighter">الوقت</span>
                    <p className="font-black text-gray-800 text-[10px]" dir="ltr">
                        {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                </div>

                <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100 col-span-1 lg:col-span-1">
                    <span className="text-[8px] text-gray-400 font-black block mb-0.5 uppercase tracking-tighter">أمر الشغل</span>
                    <div className="space-y-0.5">
                        <p className="font-black text-[#01404E] text-[10px] leading-none">{entry.workOrderNumber || 'لم يُحدد'}</p>
                        {isManager && entry.workOrderEnteredBy && (
                            <p className="text-[7px] text-black font-black leading-none italic">بواسطة: {entry.workOrderEnteredBy}</p>
                        )}
                    </div>
                </div>

                <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100 col-span-1 lg:col-span-1">
                    <span className="text-[8px] text-gray-400 font-black block mb-0.5 uppercase tracking-tighter">حالة الخدمة</span>
                    <div className="space-y-0.5">
                        <p className={`font-black text-[10px] leading-none ${entry.status === STATUS.DELIVERED ? 'text-green-700' :
                            entry.status === STATUS.CANCELLED ? 'text-red-700' :
                                entry.status === STATUS.READY ? 'text-[#036564]' :
                                    entry.status === STATUS.PENDING ? 'text-amber-700' :
                                        'text-blue-700'
                            }`}>
                            {entry.status === STATUS.DELIVERED ? 'تم التسليم' :
                                entry.status === STATUS.CANCELLED ? 'ملغاة' :
                                    entry.status === STATUS.READY ? 'جاهزة للتسليم' :
                                        entry.status === STATUS.PENDING ? 'قيد المراجعة' :
                                            entry.status === STATUS.IN_PROGRESS ? 'قيد التنفيذ' :
                                                entry.status || 'نشط'}
                        </p>
                        {isManager && entry.deliveredBy && (
                            <p className="text-[7px] text-black font-black leading-none italic">سلمه: {entry.deliveredBy}</p>
                        )}
                    </div>
                </div>

                <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100 col-span-2 lg:col-span-4">
                    <span className="text-[8px] text-gray-400 font-black block mb-0.5 uppercase tracking-tighter">الملاحظات</span>
                    <p className="font-bold text-gray-600 text-[10px] leading-tight break-words">{entry.notes || '-'}</p>
                </div>

                {/* Third Party Section */}
                {entry.hasThirdParty && (
                    <div className="col-span-3 bg-blue-50/30 p-2 rounded-xl border border-blue-100 grid grid-cols-3 gap-2 mt-0.5">
                        <div className="col-span-1">
                            <span className="text-[8px] text-blue-400 font-black block">الطرف الثالث</span>
                            <p className="font-black text-blue-800 text-[10px] truncate">{entry.thirdPartyName}</p>
                        </div>
                        <div className="col-span-1 border-r border-blue-100 pr-2">
                            <span className="text-[8px] text-blue-400 font-black block">تكلفة المورد</span>
                            <p className="font-black text-blue-800 text-[10px]">{entry.thirdPartyCost} ج.م</p>
                        </div>
                        <div className="col-span-1 border-r border-blue-100 pr-2">
                            <span className="text-[8px] text-blue-400 font-black block">الحالة</span>
                            <p className={`text-[10px] font-black px-1.5 py-0.5 rounded-full inline-block ${entry.isCostPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {entry.isCostPaid ? 'تم التسوية' : 'معلق'}
                            </p>
                        </div>
                        {entry.isCostPaid && (
                            <div className="col-span-3 pt-1 border-t border-blue-100/50 text-[8px] text-blue-600/60 font-bold italic">
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
