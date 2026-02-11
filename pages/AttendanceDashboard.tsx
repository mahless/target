import React, { useState, useEffect } from 'react';
import { GoogleSheetsService } from '../services/googleSheetsService';
import SearchInput from '../components/SearchInput';
import { HRReportItem } from '../types';
import { STATUS } from '../constants';
import {
    Users,
    Calendar,
    Clock,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    ArrowRight,
    UserCheck,
    UserMinus
} from 'lucide-react';
import { normalizeArabic, useDebounce } from '../utils';

interface UserLog {
    dateTime: string;
    type: string;
    hours: number;
}

const AttendanceDashboard: React.FC = () => {
    const [report, setReport] = useState<HRReportItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [userLogs, setUserLogs] = useState<UserLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    const fetchReport = async () => {
        setLoading(true);
        const data = await GoogleSheetsService.getHRReport(selectedMonth);
        setReport(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchReport();
    }, [selectedMonth]);

    const handleUserClick = async (user: HRReportItem) => {
        if (selectedUser === user.id) {
            setSelectedUser(null);
            return;
        }
        setSelectedUser(user.id);
        setLogsLoading(true);
        const logs = await GoogleSheetsService.getUserLogs(user.id, selectedMonth);
        setUserLogs(logs);
        setLogsLoading(false);
    };

    const filteredReport = report.filter(item => {
        const normalizedName = normalizeArabic(item.name);
        const normalizedSearch = normalizeArabic(debouncedSearchTerm);
        return normalizedName.includes(normalizedSearch);
    });

    return (
        <div className="px-4 pt-2 md:px-8 md:pt-4 pb-8 space-y-4 transition-opacity animate-premium-in" dir="rtl">
            {/* Header */}
            <div className="bg-[#01404E] p-3 md:p-4 rounded-[2.5rem] shadow-premium flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 text-white">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#00A6A6]/20 rounded-2xl flex items-center justify-center text-[#00A6A6] shadow-lg border border-[#00A6A6]/20 backdrop-blur-md">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-black tracking-tight">بيانات الحضور والانصراف</h2>
                        <p className="text-white/40 text-[9px] font-black tracking-[0.2em] uppercase mt-0.5">متابعة الموظفين والساعات الشهرية</p>
                    </div>
                </div>

                <div className="flex bg-white/5 p-1.5 rounded-[1.5rem] backdrop-blur-md border border-white/10 shadow-inner gap-3 items-center">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="p-2 border border-white/10 rounded-xl bg-white/5 text-white font-black text-sm outline-none focus:bg-white/10 transition-all"
                    />
                    <div className="w-48 sm:w-64">
                        <SearchInput
                            value={searchTerm}
                            onChange={setSearchTerm}
                            placeholder="بحث عن موظف..."
                            className="w-full"
                        />
                    </div>
                    <button
                        onClick={fetchReport}
                        className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all shadow-sm active:scale-95"
                        title="تحديث البيانات"
                    >
                        <RefreshCw className={`w-5 h-5 text-[#00A6A6] ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4 bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/20">
                    <div className="w-12 h-12 border-4 border-[#00A6A6] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[#01404E] font-black">جاري تحميل تقرير الحضور...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Main Table Card */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-premium overflow-hidden">
                        <div className="overflow-x-auto overflow-y-auto max-h-[600px] text-right custom-scrollbar">
                            <table className="w-full border-collapse">
                                <thead className="sticky top-0 z-20">
                                    <tr className="bg-[#01404E] text-white/50 text-[10px] font-black tracking-[0.2em] uppercase border-b border-white/5">
                                        <th className="py-4 px-6 text-right first:rounded-tr-[2rem]">الموظف</th>
                                        <th className="py-4 px-6 text-center">حالة اليوم</th>
                                        <th className="py-4 px-6 text-center">وقت الحضور</th>
                                        <th className="py-4 px-6 text-center">وقت الانصراف</th>
                                        <th className="py-4 px-6 text-center bg-blue-50/10">إجمالي اليوم</th>
                                        <th className="py-4 px-6 text-center last:rounded-tl-[2rem]">تفاصيل</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#01404E]/5 font-bold">
                                    {filteredReport.length > 0 ? filteredReport.map((user) => (
                                        <React.Fragment key={user.id}>
                                            <tr
                                                className={`hover:bg-[#036564]/5 cursor-pointer transition-all group ${selectedUser === user.id ? 'bg-[#036564]/10' : ''}`}
                                                onClick={() => handleUserClick(user)}
                                            >
                                                <td className="py-5 px-6 whitespace-nowrap">
                                                    <span className="font-black text-[#01404E] text-lg">{user.name}</span>
                                                </td>
                                                <td className="py-5 px-6 text-center whitespace-nowrap">
                                                    {user.todayStatus !== STATUS.PRESENT ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-red-50 text-red-600 border border-red-100">
                                                            <UserMinus className="w-3.5 h-3.5" />
                                                            {STATUS.ABSENT}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-green-50 text-green-600 border border-green-100">
                                                            <UserCheck className="w-3.5 h-3.5" />
                                                            {STATUS.PRESENT}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-5 px-6 text-center whitespace-nowrap font-mono font-black text-[#01404E]/70">
                                                    {user.checkIn !== '-' ? user.checkIn : '-'}
                                                </td>
                                                <td className="py-5 px-6 text-center whitespace-nowrap font-mono font-black text-[#036564]">
                                                    {user.checkOut !== '-' ? user.checkOut : '-'}
                                                </td>
                                                <td className="py-5 px-6 text-center whitespace-nowrap bg-blue-50/10">
                                                    <span className="font-black text-[#00A6A6] font-mono text-xl">{user.todayTotal}h</span>
                                                </td>
                                                <td className="py-5 px-6 text-center">
                                                    <div className="flex justify-center">
                                                        {selectedUser === user.id ? (
                                                            <ChevronUp className="w-5 h-5 text-[#00A6A6] animate-bounce" />
                                                        ) : (
                                                            <ChevronDown className="w-5 h-5 text-gray-300 group-hover:text-[#00A6A6] transition-colors" />
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expanded Section */}
                                            {selectedUser === user.id && (
                                                <tr>
                                                    <td colSpan={6} className="bg-[#01404E]/5 p-0 overflow-hidden">
                                                        <div className="max-w-4xl mx-auto py-8 px-6 animate-slideIn">
                                                            <div className="flex items-center justify-between mb-6">
                                                                <h3 className="text-sm font-black text-[#01404E] flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-lg bg-[#00A6A6]/20 flex items-center justify-center text-[#00A6A6]">
                                                                        <Clock className="w-4 h-4" />
                                                                    </div>
                                                                    تفاصيل حركات شهر {selectedMonth}
                                                                </h3>
                                                                <div className="text-xs font-black text-[#00A6A6] bg-white px-4 py-2 rounded-xl shadow-sm border border-[#00A6A6]/10">
                                                                    إجمالي الشهر: <span className="text-lg font-mono ml-1">{user.totalMonth.toFixed(2)}h</span>
                                                                </div>
                                                            </div>

                                                            {logsLoading ? (
                                                                <div className="flex justify-center p-12">
                                                                    <div className="w-8 h-8 border-3 border-[#00A6A6] border-t-transparent rounded-full animate-spin"></div>
                                                                </div>
                                                            ) : (
                                                                <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-[#01404E]/5 overflow-hidden shadow-lux">
                                                                    <table className="w-full text-right text-sm border-collapse">
                                                                        <thead>
                                                                            <tr className="bg-[#01404E]/5 text-[#01404E]/60 font-black text-[10px] uppercase tracking-widest">
                                                                                <th className="py-4 px-6 border-b border-[#01404E]/5">التاريخ والوقت</th>
                                                                                <th className="py-4 px-6 border-b border-[#01404E]/5 text-center">النوع</th>
                                                                                <th className="py-4 px-6 border-b border-[#01404E]/5 text-center">الصافي (ساعات)</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-[#01404E]/5 font-bold">
                                                                            {userLogs.length > 0 ? userLogs.map((log, idx) => (
                                                                                <tr key={idx} className="hover:bg-white transition-colors">
                                                                                    <td className="py-3 px-6 font-mono text-[#01404E]">{log.dateTime}</td>
                                                                                    <td className="py-3 px-6 text-center">
                                                                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${log.type === STATUS.CHECK_IN
                                                                                            ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                                                                            : 'bg-orange-50 text-orange-600 border border-orange-100'
                                                                                            }`}>
                                                                                            {log.type === STATUS.CHECK_IN ? 'دخول' : 'انصراف'}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="py-3 px-6 text-center font-black font-mono text-[#01404E] text-base">
                                                                                        {log.type === STATUS.CHECK_OUT ? (
                                                                                            Number(log.hours) > 0 ? `${Number(log.hours).toFixed(2)}h` : '-'
                                                                                        ) : '-'}
                                                                                    </td>
                                                                                </tr>
                                                                            )) : (
                                                                                <tr>
                                                                                    <td colSpan={3} className="py-12 text-center text-gray-300 italic font-black">
                                                                                        لا توجد سجلات لهذا الشهر
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center text-gray-300 font-black italic text-lg">
                                                لم يتم العثور على موظفين مطابقين
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceDashboard;
