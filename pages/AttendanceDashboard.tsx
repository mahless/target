import React, { useState, useEffect } from 'react';
import { GoogleSheetsService } from '../services/googleSheetsService';
import SearchInput from '../components/SearchInput';
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

interface AttendanceReport {
    id: string;
    name: string;
    week1: number;
    week2: number;
    week3: number;
    week4: number;
    totalMonth: number;
    todayTotal: number;
    checkIn: string;
    checkOut: string;
    todayStatus: string;
}

interface UserLog {
    dateTime: string;
    type: string;
    hours: number;
}

const AttendanceDashboard: React.FC = () => {
    const [report, setReport] = useState<AttendanceReport[]>([]);
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

    const handleUserClick = async (user: AttendanceReport) => {
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
        <div className="min-h-screen bg-gray-50 p-4 lg:p-8" dir="rtl">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <Users className="w-8 h-8 text-blue-600" />
                        بيانات الحضور والانصراف
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium">متابعة الموظفين والساعات الشهرية</p>
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <SearchInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="بحث عن موظف..."
                    />
                    <button
                        onClick={fetchReport}
                        className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                        title="تحديث البيانات"
                    >
                        <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'anime-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-bold">جاري تحميل تقرير الحضور...</p>
                </div>
            ) : (
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Main Table Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right">الموظف</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-center">حالة اليوم</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-center">وقت الحضور</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-center">وقت الانصراف</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-center bg-blue-50/50">إجمالي اليوم</th>
                                        <th className="px-6 py-4 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredReport.length > 0 ? filteredReport.map((user) => (
                                        <React.Fragment key={user.id}>
                                            <tr
                                                className={`hover:bg-blue-50/100 cursor-pointer transition-colors ${selectedUser === user.id ? 'bg-blue-50/100' : ''}`}
                                                onClick={() => handleUserClick(user)}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-black text-gray-900">{user.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    {user.todayStatus !== 'حاضر' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                                            <UserMinus className="w-3 h-3" />
                                                            غائب
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                            <UserCheck className="w-3 h-3" />
                                                            حاضر
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center font-mono font-bold text-blue-600">
                                                    {user.checkIn !== '-' ? user.checkIn : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center font-mono font-bold text-orange-600">
                                                    {user.checkOut !== '-' ? user.checkOut : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center bg-blue-50/50">
                                                    <span className="font-black text-blue-700 font-mono text-lg">{user.todayTotal}h</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-left">
                                                    {selectedUser === user.name ? (
                                                        <ChevronUp className="w-5 h-5 text-gray-400" />
                                                    ) : (
                                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </td>
                                            </tr>

                                            {/* Expanded Section */}
                                            {selectedUser === user.id && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-4 bg-gray-50/80 border-t border-gray-100">
                                                        <div className="max-w-4xl mx-auto py-4">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                                                                    <Clock className="w-4 h-4 text-blue-600" />
                                                                    تفاصيل حركات شهر {selectedMonth}
                                                                </h3>
                                                                <div className="text-sm font-bold text-gray-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                                                                    إجمالي الشهر: <span className="text-blue-700 font-black">{user.totalMonth.toFixed(2)}h</span>
                                                                </div>
                                                            </div>

                                                            {logsLoading ? (
                                                                <div className="flex justify-center p-8">
                                                                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                                </div>
                                                            ) : (
                                                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                                                    <table className="w-full text-right text-sm">
                                                                        <thead className="bg-gray-100 text-gray-600 font-black">
                                                                            <tr>
                                                                                <th className="px-4 py-2 border-b border-gray-200">التاريخ والوقت</th>
                                                                                <th className="px-4 py-2 border-b border-gray-200">النوع</th>
                                                                                <th className="px-4 py-2 border-b border-gray-200">الصافي (ساعات)</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-100">
                                                                            {userLogs.length > 0 ? userLogs.map((log, idx) => (
                                                                                <tr key={idx} className="hover:bg-gray-50">
                                                                                    <td className="px-4 py-2 font-mono">{log.dateTime}</td>
                                                                                    <td className="px-4 py-2">
                                                                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${log.type === 'check-in'
                                                                                            ? 'bg-blue-100 text-blue-700'
                                                                                            : 'bg-orange-100 text-orange-700'
                                                                                            }`}>
                                                                                            {log.type === 'check-in' ? 'دخول' : 'انصراف'}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-center font-bold font-mono text-gray-700">
                                                                                        {log.type === 'check-out' ? (
                                                                                            Number(log.hours) > 0 ? `${Number(log.hours).toFixed(2)}h` : '-'
                                                                                        ) : '-'}
                                                                                    </td>
                                                                                </tr>
                                                                            )) : (
                                                                                <tr>
                                                                                    <td colSpan={3} className="px-4 py-8 text-center text-gray-400 font-medium">
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
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-bold">
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
