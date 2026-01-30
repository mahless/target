import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home, PlusCircle, LogOut, FileText, Settings, Wallet, BarChart3,
  MapPin, Calendar, Clock, Package, Wifi, WifiOff
} from 'lucide-react';
import { BRANCHES } from '../constants';
import { Branch, User } from '../types';
import CustomSelect from './CustomSelect';
import { useModal } from '../context/ModalContext'; // Added
import { GoogleSheetsService } from '../services/googleSheetsService'; // Added

interface SidebarProps {
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  currentBranch: Branch | null;
  currentDate: string | null;
  onBranchChange: (branch: Branch) => void;
  onDateChange: (date: string) => void;
  userRole: string;
  // Added props for Attendance
  attendanceStatus: 'checked-in' | 'checked-out';
  onCheckIn: (username: string, branchId: string) => Promise<{ success: boolean; message?: string }>;
  onCheckOut: (username: string, branchId: string) => Promise<{ success: boolean; message?: string }>;
  user: User | null;
  startSubmitting: () => void;
  stopSubmitting: () => void;
}

const Sidebar: React.FC<SidebarProps> = React.memo(({
  onLogout,
  isOpen,
  setIsOpen,
  currentBranch,
  currentDate,
  onBranchChange,
  onDateChange,
  userRole,
  attendanceStatus,
  onCheckIn,
  onCheckOut,
  user,
  startSubmitting,
  stopSubmitting
}) => {
  const { showModal, showQuickStatus } = useModal();
  const [ipAddress, setIpAddress] = useState<string>('جاري التحميل...');

  const handleAttendanceClick = async () => {
    if (userRole === 'مدير') {
      // عرض تقرير HR للمدير
      startSubmitting(); // إظهار الشاشة الزرقاء
      try {
        const reportData = await GoogleSheetsService.getHRReport();
        showModal({
          title: 'تقرير ساعات عمل الموظفين (الشهر الحالي)',
          content: (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50 text-gray-400 font-black">
                    <tr>
                      <th className="p-3">الموظف</th>
                      <th className="p-3 text-center">أ1</th>
                      <th className="p-3 text-center">أ2</th>
                      <th className="p-3 text-center">أ3</th>
                      <th className="p-3 text-center">أ4</th>
                      <th className="p-3 text-center bg-blue-50 text-blue-700">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-bold">
                    {reportData.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-gray-300 italic">لا توجد بيانات لهذا الشهر</td></tr>
                    ) : (
                      reportData.map((u, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="p-3 text-gray-800">{u.name}</td>
                          <td className="p-3 text-center text-gray-500">{u.week1}</td>
                          <td className="p-3 text-center text-gray-500">{u.week2}</td>
                          <td className="p-3 text-center text-gray-500">{u.week3}</td>
                          <td className="p-3 text-center text-gray-500">{u.week4}</td>
                          <td className="p-3 text-center bg-blue-50/50 text-blue-700 font-black">{u.totalMonth}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-gray-400 text-center font-bold">
                * يتم تقسيم الأسابيع بناءً على أيام الشهر (1-7، 8-14، 15-21، 22-31)
              </p>
            </div>
          ),
          confirmText: 'إغلاق',
          hideFooter: false,
          size: 'lg'
        });
      } finally {
        stopSubmitting();
      }
      return;
    }

    // Fetch IP immediately when clicking the button
    GoogleSheetsService.fetchClientIP().then(ip => setIpAddress(ip || 'غير معروف'));

    showModal({
      title: 'نظام الحضور والانصراف الذكي',
      content: (
        <div className="space-y-6 text-center">
          <div className={`p-6 rounded-3xl border-2 transition-all duration-500 ${attendanceStatus === 'checked-in' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 transition-colors ${attendanceStatus === 'checked-in' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {attendanceStatus === 'checked-in' ? <Wifi className="w-8 h-8 animate-pulse" /> : <WifiOff className="w-8 h-8" />}
            </div>
            <h3 className={`text-xl font-black ${attendanceStatus === 'checked-in' ? 'text-green-700' : 'text-red-700'}`}>
              {attendanceStatus === 'checked-in' ? 'أنت متصل بالعمل' : 'غير مسجل حضور'}
            </h3>
            <p className="text-gray-500 font-bold text-sm mt-2">
              {attendanceStatus === 'checked-in' ? 'نتمنى لك وردية موفقة' : 'برجاء تسجيل الحضور لفتح النظام'}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">بيانات الاتصال</p>
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-blue-500" />
                {currentBranch?.name || 'غير محدد'}
              </span>
              <span className="text-[10px] font-mono text-gray-400">IP: {ipAddress}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              disabled={attendanceStatus === 'checked-in'}
              onClick={async () => {
                if (!user || !currentBranch) return;
                const result = await onCheckIn(user.name, currentBranch.id);
                if (result.success) {
                  showQuickStatus('تم تسجيل الحضور بنجاح');
                  showModal(null as any); // Close manually if needed or update content
                } else {
                  showQuickStatus(result.message || 'فشل تسجيل الحضور', 'error');
                }
              }}
              className={`py-4 rounded-2xl font-black text-sm shadow-lg transition-all active:scale-95 ${attendanceStatus === 'checked-in'
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                : 'bg-green-600 text-white shadow-green-100 hover:bg-green-700'
                }`}
            >
              تسجيل حضور
            </button>
            <button
              disabled={attendanceStatus === 'checked-out'}
              onClick={async () => {
                if (!user || !currentBranch) return;
                const result = await onCheckOut(user.name, currentBranch.id);
                if (result.success) {
                  showQuickStatus('تم تسجيل الانصراف بنجاح');
                  showModal(null as any);
                } else {
                  showQuickStatus(result.message || 'فشل تسجيل الانصراف', 'error');
                }
              }}
              className={`py-4 rounded-2xl font-black text-sm shadow-lg transition-all active:scale-95 ${attendanceStatus === 'checked-out'
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                : 'bg-red-600 text-white shadow-red-100 hover:bg-red-700'
                }`}
            >
              تسجيل انصراف
            </button>
          </div>

          <button
            onClick={() => showModal(null as any)}
            className="w-full py-3 rounded-xl font-bold text-gray-500 bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-all active:scale-[0.98]"
          >
            إغلاق النافذة
          </button>
        </div>
      ),
      confirmText: '', // Remove default buttons
      type: 'confirm',
      hideFooter: true // We'll need to support this or just pass null to confirmText
    });
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${isActive
      ? 'bg-blue-800 text-white shadow-md'
      : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
    }`;

  const controlInputClass = "w-full p-2.5 mt-1 border-2 border-blue-200 rounded-lg bg-white text-black font-bold text-xs focus:ring-4 focus:ring-blue-50 focus:border-blue-600 outline-none transition-all shadow-sm";
  const branchOptions = useMemo(() => BRANCHES.map(b => ({ id: b.id, name: b.name })), []);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 right-0 h-full w-64 bg-white shadow-xl z-30 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div className="h-16 flex items-center justify-center border-b border-gray-100">
            <h1 className="text-xl font-bold text-blue-900 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              تارجت للخدمات الحكومية
            </h1>
          </div>

          {/* Quick Controls Section */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 px-1">نطاق العمل الحالي</p>

            <div className="space-y-3">
              <div>
                <CustomSelect
                  label="الفرع"
                  options={branchOptions}
                  value={currentBranch?.id || ''}
                  onChange={(val) => {
                    const b = BRANCHES.find(br => br.id === val);
                    if (b) onBranchChange(b);
                  }}
                  icon={<MapPin className="w-3 h-3 text-blue-600" />}
                  disabled={userRole !== 'مدير'} // Locked for employees, open for Admin
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-gray-600 px-1">
                  <Calendar className="w-3 h-3 text-secondary" />
                  التاريخ
                </label>
                <input
                  type="date"
                  value={currentDate || ''}
                  onChange={(e) => onDateChange(e.target.value)}
                  className={controlInputClass}
                />
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <NavLink to="/dashboard" className={linkClass} onClick={() => setIsOpen(false)}>
              <Home className="w-5 h-5" />
              <span>الرئيسية</span>
            </NavLink>
            <NavLink to="/new-service" className={linkClass} onClick={() => setIsOpen(false)}>
              <PlusCircle className="w-5 h-5" />
              <span>تسجيل خدمة جديدة</span>
            </NavLink>
            <NavLink to="/receivables" className={linkClass} onClick={() => setIsOpen(false)}>
              <Clock className="w-5 h-5" />
              <span>المتبقيات</span>
            </NavLink>
            <NavLink to="/expenses" className={linkClass} onClick={() => setIsOpen(false)}>
              <Wallet className="w-5 h-5" />
              <span>المصروفات</span>
            </NavLink>
            <NavLink to="/reports" className={linkClass} onClick={() => setIsOpen(false)}>
              <BarChart3 className="w-5 h-5" />
              <span>التقارير والأداء</span>
            </NavLink>

            {(userRole === 'مدير' || userRole === 'مساعد') && (
              <NavLink to="/admin/inventory" className={linkClass} onClick={() => setIsOpen(false)}>
                <Package className="w-5 h-5" />
                <span>مخزن الباركودات</span>
              </NavLink>
            )}

            <div className="border-t border-gray-100 my-2"></div>

            {/* Attendance Button */}
            <button
              onClick={handleAttendanceClick}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 border-2 ${attendanceStatus === 'checked-in'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-white border-red-100 text-gray-500 hover:bg-red-50 hover:text-red-600'
                }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${attendanceStatus === 'checked-in' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="font-black text-sm">الحضور والانصراف</span>
            </button>
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
});

export default Sidebar;