import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    Archive, Search, Calendar, ShieldCheck, Database,
    ArrowRight, CheckCircle2, AlertCircle, Trash2,
    Info, Printer, ExternalLink
} from 'lucide-react';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { useModal } from '../context/ModalContext';
import { ArchiveEntry, User } from '../types';
import { useDebounce, normalizeArabic, searchMultipleFields } from '../utils';
import SearchInput from '../components/SearchInput';
import LoadingOverlay from '../components/LoadingOverlay';
import ServiceEntryDetails from '../components/ServiceEntryDetails';

interface ArchivePageProps {
    user: User | null;
    userRole: string;
}

const ArchivePage: React.FC<ArchivePageProps> = ({ user, userRole }) => {
    const { showModal, setIsProcessing, showQuickStatus } = useModal();

    // Archive Mutator State
    const [archiveStartDate, setArchiveStartDate] = useState('');
    const [archiveEndDate, setArchiveEndDate] = useState('');

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ArchiveEntry[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const debouncedSearchQuery = useDebounce(searchQuery, 500);

    const isAdmin = useMemo(() =>
        normalizeArabic(userRole) === normalizeArabic('مدير') || userRole === 'Admin',
        [userRole]
    );

    // Search Logic (useQuery pattern)
    useEffect(() => {
        const performSearch = async () => {
            if (!debouncedSearchQuery.trim()) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const results = await GoogleSheetsService.searchArchives<ArchiveEntry>(debouncedSearchQuery);
                setSearchResults(results);
            } catch (error) {
                console.error('Search error:', error);
                showQuickStatus('خطأ أثناء البحث في الأرشيف', 'error');
            } finally {
                setIsSearching(false);
            }
        };

        performSearch();
    }, [debouncedSearchQuery, showQuickStatus]);

    // Archive Logic (useMutation pattern)
    const handleStartArchive = useCallback(async () => {
        if (!archiveStartDate || !archiveEndDate) {
            showQuickStatus('يرجى تحديد النطاق الزمني أولاً', 'error');
            return;
        }

        showModal({
            title: 'تأكيد عملية الأرشفة',
            size: 'md',
            content: (
                <div className="space-y-2 text-center">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto text-orange-600">
                        <AlertCircle className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-black text-gray-800">هل أنت متأكد من أرشفة البيانات؟</h3>
                        <p className="text-sm text-gray-500 leading-relaxed font-bold">
                            سيتم نقل جميع العمليات "التي تم تسليمها" في الفترة من
                            <span className="text-orange-600 mx-1">{archiveStartDate}</span>
                            إلى
                            <span className="text-orange-600 mx-1">{archiveEndDate}</span>
                            إلى جداول الأرشيف السنوية وحذفها من السجل الحالي.
                        </p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[10px] text-amber-700 font-black italic">
                        * هذه العملية لا يمكن التراجع عنها بعد التنفيذ.
                    </div>
                </div>
            ),
            confirmText: 'نعم، ابدأ الأرشفة',
            type: 'info',
            cancelText: 'تراجع',
            onConfirm: async () => {
                setIsProcessing(true);
                try {
                    const result = await GoogleSheetsService.archiveData(
                        archiveStartDate,
                        archiveEndDate,
                        userRole
                    );

                    if (result.success) {
                        showModal({
                            title: 'تمت العملية بنجاح',
                            size: 'md',
                            type: 'success',
                            content: (
                                <div className="flex flex-col items-center py-6 gap-4">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-lg animate-bounce">
                                        <CheckCircle2 className="w-10 h-10" />
                                    </div>
                                    <p className="text-gray-800 font-black text-lg">{result.message}</p>
                                </div>
                            ),
                            confirmText: 'حسناً',
                            onConfirm: () => { }
                        });
                        // Reset dates
                        setArchiveStartDate('');
                        setArchiveEndDate('');
                    } else {
                        showQuickStatus(result.message || 'فشلت عملية الأرشفة', 'error');
                    }
                } catch (error) {
                    showQuickStatus('حدث خطأ غير متوقع أثناء الأرشفة', 'error');
                } finally {
                    setIsProcessing(false);
                }
            }
        });
    }, [archiveStartDate, archiveEndDate, userRole, setIsProcessing, showModal, showQuickStatus]);

    const viewDetails = (entry: ArchiveEntry) => {
        showModal({
            title: 'تفاصيل المعاملة (أرشيف)',
            size: 'lg',
            content: <ServiceEntryDetails entry={entry} />,
            cancelText: 'إغلاق'
        });
    };

    return (
        <div className="px-4 py-2 md:px-8 md:py-2 space-y-2 text-right animate-premium-in min-h-screen bg-gray-50/50">
            {/* Header */}
            <div className="bg-[#01404E] p-3 rounded-[2.5rem] shadow-premium border-b border-white/5 text-white flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center text-[#00A6A6] shadow-2xl border border-white/10 ring-4 ring-[#00A6A6]/5">
                        <Archive className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight">مركز الأرشيف السحابي</h2>
                        <p className="text-white/40 text-[10px] font-black tracking-[0.2em] uppercase mt-1">إدارة البيانات التاريخية والبحث الموحد</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white/5 px-3 py-2 rounded-2xl border border-white/10 backdrop-blur-md">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-white/40 font-black uppercase tracking-wider">الصلاحية الحالية</span>
                        <span className="text-sm font-black text-[#00A6A6]">{isAdmin ? 'مسؤول النظام (Admin)' : 'موظف (Employee)'}</span>
                    </div>
                    <div className={`p-2 rounded-xl border ${isAdmin ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Admin Controls */}
            {isAdmin && (
                <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-[5rem] -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>

                    <div className="relative z-10 space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-8 bg-[#D97706] rounded-full"></div>
                            <h3 className="text-lg font-black text-[#01404E]">أدوات الأرشفة والترحيل</h3>
                        </div>

                        <div className="flex flex-col lg:flex-row items-end gap-2">
                            <div className="w-full lg:flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 mr-2 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        تاريخ البداية
                                    </label>
                                    <input
                                        type="date"
                                        value={archiveStartDate}
                                        onChange={(e) => setArchiveStartDate(e.target.value)}
                                        className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-200 font-black text-[#01404E] focus:ring-4 focus:ring-orange-100 focus:border-orange-200 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 mr-2 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        تاريخ النهاية
                                    </label>
                                    <input
                                        type="date"
                                        value={archiveEndDate}
                                        onChange={(e) => setArchiveEndDate(e.target.value)}
                                        className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-200 font-black text-[#01404E] focus:ring-4 focus:ring-orange-100 focus:border-orange-200 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleStartArchive}
                                className="w-full lg:w-auto px-10 py-4 bg-[#D97706] text-white rounded-2xl font-black shadow-lg shadow-orange-200 hover:shadow-orange-300 transform hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 whitespace-nowrap"
                            >
                                <Database className="w-5 h-5" />
                                بدء عملية الأرشفة
                            </button>
                        </div>

                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
                            <Info className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-blue-700 font-bold leading-relaxed">
                                تنبيه: سيتم ترحيل جميع العمليات التي تحمل حالة <span className="underline decoration-blue-300">"تم التسليم"</span> فقط. يتم الاحتفاظ بجميع التفاصيل المالية والموظفين المسجلين للعملية.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Search Section */}
            <div className="space-y-2">
                <div className="flex flex-col md:flex-row justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-[#00A6A6]/10 rounded-2xl flex items-center justify-center text-[#00A6A6]">
                            <Search className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-[#01404E]">البحث الموحد في الأرشيف</h3>
                            <p className="text-[10px] text-gray-400 font-bold">ابحث في جميع السنوات السابقة بكلمة واحدة</p>
                        </div>
                    </div>

                    <div className="w-full md:w-[450px] relative">
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="ابحث بالاسم، هاتف، رقم قومي، باركود، أو أمر شغل..."
                            className="w-full shadow-lg"
                        />
                        {isSearching && (
                            <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                <div className="w-5 h-5 border-2 border-[#00A6A6]/20 border-t-[#00A6A6] rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Results Container */}
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50/80 px-8 py-4 border-b border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-[#01404E] font-black text-xs">
                                {searchResults.length}
                            </span>
                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">نتائج البحث</span>
                        </div>

                        {searchResults.length > 0 && (
                            <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-[#00A6A6]">
                                <CheckCircle2 className="w-3 h-3" />
                                تم استرجاع البيانات من جداول الأرشيف المتعددة
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-right">
                            <thead>
                                <tr className="bg-gray-100/50 text-[10px] md:text-xs font-black uppercase text-gray-400 tracking-widest border-b border-gray-100">
                                    <th className="py-5 px-8">العميل والمعاملة</th>
                                    <th className="py-5 px-6 text-center">التاريخ</th>
                                    <th className="py-5 px-6 text-center">الفرع</th>
                                    <th className="py-5 px-6 text-center">المصدر (الأرشيف)</th>
                                    <th className="py-5 px-6 text-center">الباركود / أمر الشغل</th>
                                    <th className="py-5 px-8 text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {!searchQuery.trim() ? (
                                    <tr>
                                        <td colSpan={6} className="py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 text-gray-300 opacity-50">
                                                <Database className="w-20 h-20 stroke-[1]" />
                                                <div className="space-y-1">
                                                    <p className="text-xl font-black italic">أدخل الكلمة المفتاحية للبحث</p>
                                                    <p className="text-sm font-bold">يمكنك البحث عن أي عملية تم أرشفتها سابقاً</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : isSearching ? (
                                    <tr>
                                        <td colSpan={6} className="py-32 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-12 h-12 border-4 border-[#00A6A6]/10 border-t-[#00A6A6] rounded-full animate-spin"></div>
                                                <p className="text-[#01404E] font-black">جاري سحب البيانات من السحاب...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : searchResults.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 text-gray-300">
                                                <Trash2 className="w-16 h-16 opacity-30" />
                                                <div className="space-y-1">
                                                    <p className="text-lg font-black italic">لا توجد نتائج تطابق بحثك</p>
                                                    <p className="text-sm font-bold">تأكد من صحة البيانات أو جرب كلمة بحث أخرى</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    searchResults.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50/30 transition-all group border-r-4 border-transparent hover:border-[#00A6A6]">
                                            <td className="py-5 px-8">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-black text-[#01404E] text-sm md:text-base">{item.clientName}</span>
                                                    <span className="bg-[#00A6A6]/10 text-[#00A6A6] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase w-fit">{item.serviceType}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-center font-bold text-gray-500 text-xs tracking-tighter">
                                                {item.entryDate}
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-xl text-[10px] font-black">{item.branchId}</span>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-xl text-[10px] font-black">
                                                    {item.archiveSource}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <div className="flex flex-col gap-1 items-center">
                                                    <span className="font-black text-gray-800 text-xs">{item.barcode || '-'}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold italic">{item.workOrderNumber ? `#${item.workOrderNumber}` : ''}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-8 text-center">
                                                <button
                                                    onClick={() => viewDetails(item)}
                                                    className="p-2.5 bg-white border border-gray-100 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white hover:shadow-lg transition-all active:scale-95 group/btn"
                                                >
                                                    <ExternalLink className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ArchivePage;
