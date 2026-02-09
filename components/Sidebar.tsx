import React, { useState, useMemo, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home, PlusCircle, LogOut, FileText, Settings, Wallet, BarChart3,
  Calendar, MapPin, Smartphone, User as UserIcon, Building2,
  ChevronDown, Menu, X, Wifi, WifiOff, AlertTriangle, Clock, Package, Lock, Users
} from 'lucide-react';
import { Branch, User } from '../types';
import CustomSelect from './CustomSelect';
import { useModal } from '../context/ModalContext';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { normalizeArabic } from '../utils';

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
  branches: Branch[];
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
  stopSubmitting,
  branches
}) => {
  const { showModal, showQuickStatus } = useModal();

  const AttendanceModalContent: React.FC<{
    attendanceStatus: 'checked-in' | 'checked-out';
    onCheckIn: (name: string, id: string) => Promise<any>;
    onCheckOut: (name: string, id: string) => Promise<any>;
    user: User;
    currentBranch: Branch;
    userRole: string;
    showHRReport: () => void;
    onClose: () => void;
    showQuickStatus: (message: string, type?: 'success' | 'error') => void;
  }> = ({ attendanceStatus, onCheckIn, onCheckOut, user, currentBranch, userRole, showHRReport, onClose, showQuickStatus }) => {
    const [ip, setIp] = useState('جاري التحميل...');

    useEffect(() => {
      let isMounted = true;
      GoogleSheetsService.fetchClientIP().then(res => {
        if (isMounted) setIp(res || '0.0.0.0');
      });
      return () => { isMounted = false; };
    }, []);

    return (
      <div className="space-y-6 text-center">
        {!currentBranch ? (
          <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-3xl text-amber-700">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3" />
            <h3 className="text-base font-black italic">تنبيه: الفرع غير محدد</h3>
            <p className="text-[10px] font-bold mt-1">قم باختيار الفرع أولا</p>
          </div>
        ) : (
          <div className={`p-4 rounded-3xl border-2 transition-all duration-500 ${attendanceStatus === 'checked-in' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 transition-colors ${attendanceStatus === 'checked-in' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {attendanceStatus === 'checked-in' ? <Wifi className="w-8 h-8 animate-pulse" /> : <WifiOff className="w-8 h-8" />}
            </div>
            <h3 className={`text-lg font-black ${attendanceStatus === 'checked-in' ? 'text-green-700' : 'text-red-700'}`}>
              {attendanceStatus === 'checked-in' ? 'أنت متصل بالعمل' : 'غير مسجل حضور'}
            </h3>
            <p className="text-gray-500 font-bold text-xs mt-1">
              {attendanceStatus === 'checked-in' ? 'نتمنى لك وردية موفقة' : 'برجاء تسجيل الحضور لفتح النظام'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <button
            disabled={attendanceStatus === 'checked-in' || !currentBranch}
            onClick={async () => {
              if (!currentBranch) return;
              const result = await onCheckIn(user.name, currentBranch.id);
              if (result.success) {
                showQuickStatus('تم تسجيل الحضور بنجاح');
                onClose();
              } else {
                showQuickStatus(result.message || 'فشل تسجيل الحضور', 'error');
              }
            }}
            className={`py-3 rounded-2xl font-black text-xs shadow-lg transition-all active:scale-95 ${attendanceStatus === 'checked-in' || !currentBranch
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
              : 'bg-green-600 text-white shadow-green-100 hover:bg-green-700'
              }`}
          >
            تسجيل حضور
          </button>
          <button
            disabled={attendanceStatus === 'checked-out' || !currentBranch}
            onClick={async () => {
              if (!currentBranch) return;
              const result = await onCheckOut(user.name, currentBranch.id);
              if (result.success) {
                showQuickStatus('تم تسجيل الانصراف بنجاح');
                onClose();
              } else {
                showQuickStatus(result.message || 'فشل تسجيل الانصراف', 'error');
              }
            }}
            className={`py-3 rounded-2xl font-black text-xs shadow-lg transition-all active:scale-95 ${attendanceStatus === 'checked-out' || !currentBranch
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
              : 'bg-red-600 text-white shadow-red-100 hover:bg-red-700'
              }`}
          >
            تسجيل انصراف
          </button>
        </div>

        {normalizeArabic(userRole) === normalizeArabic('مدير') && (
          <button
            onClick={showHRReport}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-xs bg-blue-600 text-white shadow-lg shadow-blue-100 mt-1 hover:bg-blue-700 transition-all active:scale-95"
          >
            <FileText className="w-5 h-5" />
            عرض تقرير ساعات عمل الموظفين
          </button>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 mt-4 rounded-xl font-bold text-gray-500 bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-all active:scale-[0.98]"
        >
          إغلاق النافذة
        </button>
      </div>
    );
  };

  const handleAttendanceClick = async () => {
    const showHRReport = async () => {
      startSubmitting();
      try {
        const reportData = await GoogleSheetsService.getHRReport();
        showModal({
          title: 'تقرير ساعات عمل الموظفين (الشهر الحالي)',
          size: 'lg',
          confirmText: 'رجوع',
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
                  <tbody className="divide-y font-bold text-[10px]">
                    {reportData.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-gray-300 italic">لا توجد بيانات لهذا الشهر</td></tr>
                    ) : (
                      reportData.map((u, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="p-3 text-gray-800">{u.name}</td>
                          <td className="p-2 text-center text-gray-500">{u.week1}</td>
                          <td className="p-2 text-center text-gray-500">{u.week2}</td>
                          <td className="p-2 text-center text-gray-500">{u.week3}</td>
                          <td className="p-2 text-center text-gray-500">{u.week4}</td>
                          <td className="p-2 text-center bg-blue-50/50 text-blue-700 font-black">{u.totalMonth}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ),
          onConfirm: () => handleAttendanceClick() // Back to main attendance modal
        });
      } finally {
        stopSubmitting();
      }
    };

    showModal({
      title: 'نظام الحضور والانصراف الذكي',
      size: 'md',
      content: (
        <AttendanceModalContent
          attendanceStatus={attendanceStatus}
          onCheckIn={onCheckIn}
          onCheckOut={onCheckOut}
          user={user!}
          currentBranch={currentBranch!}
          userRole={userRole}
          showHRReport={showHRReport}
          onClose={() => showModal(null as any)}
          showQuickStatus={showQuickStatus}
        />
      ),
      hideFooter: true
    });
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 ${isActive
      ? 'bg-gradient-to-r from-[#00A6A6] to-[#036564] text-white shadow-lg shadow-[#00A6A6]/20 scale-[1.02]'
      : 'text-gray-300 hover:bg-white/5 hover:text-[#00A6A6]'
    }`;

  const controlInputClass = "w-full p-2.5 mt-1 border border-white/10 rounded-xl bg-black/20 text-white font-bold text-xs focus:ring-4 focus:ring-[#00A6A6]/20 focus:border-[#00A6A6] outline-none transition-all";
  const branchOptions = useMemo(() => {
    const options = branches.map(b => ({ id: b.id, name: b.name }));
    if (normalizeArabic(userRole) === normalizeArabic('مدير')) {
      return [{ id: 'all', name: 'كل الفروع' }, ...options];
    }
    return options;
  }, [branches, userRole]);

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
        className={`fixed top-0 right-0 h-full w-64 bg-[#01404E] shadow-2xl z-30 transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:translate-x-0 md:static ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Area - Fixed at top */}
          <div className="sticky top-0 z-20 flex flex-col items-center justify-center border-b border-black/10 bg-white overflow-hidden">
            <div className="w-full flex items-center justify-center drop-shadow-sm">
              <img
                src="/assets/sidebar-logo.jpg"
                alt="Target Logo"
                className="w-full h-auto object-contain"
              />
            </div>
            <h1 className="text-lg font-black text-black tracking-tight uppercase py-2">
              للخدمات الحكومية
            </h1>
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
            {/* Quick Controls Section */}
            <div className="p-4 border-b border-white/5 bg-black/10">
              <div className="space-y-3">
                <div>
                  <CustomSelect
                    label="الفرع الحالي"
                    labelClassName="text-white/60"
                    options={branchOptions}
                    value={currentBranch?.id || ''}
                    onChange={(val) => {
                      if (val === 'all') {
                        onBranchChange({ id: 'all', name: 'كل الفروع' } as any);
                        return;
                      }
                      if (!val) {
                        const isManager = normalizeArabic(userRole) === normalizeArabic('مدير');
                        if (isManager) {
                          onBranchChange({ id: 'all', name: 'كل الفروع' } as any);
                        } else {
                          onBranchChange(null as any);
                        }
                        return;
                      }
                      const selected = branches.find(b => b.id === val);
                      if (selected) onBranchChange(selected);
                    }}
                    icon={<MapPin className="w-3 h-3 text-[#00A6A6]" />}
                    placeholder="اختر فرع"
                    disabled={userRole === 'موظف'}
                    showAllOption={false}
                    dark={true}
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between gap-1 text-[10px] font-black text-white/40 px-1 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      التاريخ
                    </div>
                    <span className="text-[9px] text-[#00A6A6] flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" />
                      مثبت
                    </span>
                  </label>
                  <input
                    type="date"
                    value={currentDate || ''}
                    readOnly
                    className={`${controlInputClass} opacity-50 cursor-not-allowed`}
                  />
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="p-4 space-y-2">
              <NavLink to="/dashboard" className={linkClass} onClick={() => setIsOpen(false)}>
                <Home className="w-5 h-5" />
                <span>الصفحة الرئيسية</span>
              </NavLink>

              {userRole !== 'مشاهد' && (
                <NavLink to="/new-service" className={linkClass} onClick={() => setIsOpen(false)}>
                  <PlusCircle className="w-5 h-5" />
                  <span>تسجيل خدمة جديدة</span>
                </NavLink>
              )}

              {userRole !== 'مشاهد' && (
                <NavLink to="/receivables" className={linkClass} onClick={() => setIsOpen(false)}>
                  <Clock className="w-5 h-5" />
                  <span>المتبقيات</span>
                </NavLink>
              )}

              {userRole !== 'مشاهد' && (
                <NavLink to="/expenses" className={linkClass} onClick={() => setIsOpen(false)}>
                  <Wallet className="w-5 h-5" />
                  <span>المصروفات</span>
                </NavLink>
              )}

              <NavLink to="/reports" className={linkClass} onClick={() => setIsOpen(false)}>
                <BarChart3 className="w-5 h-5" />
                <span>التقارير</span>
              </NavLink>

              {userRole !== 'مشاهد' && (
                <NavLink to="/third-party-settlements" className={linkClass} onClick={() => setIsOpen(false)}>
                  <Users className="w-5 h-5" />
                  <span>تسويات مكتب خارجي</span>
                </NavLink>
              )}

              {/* Stock / Inventory Link */}
              {(normalizeArabic(userRole) === normalizeArabic('مدير') || userRole === 'Admin' || normalizeArabic(userRole) === normalizeArabic('مساعد')) && (
                <NavLink to="/admin/inventory" className={linkClass} onClick={() => setIsOpen(false)}>
                  <Package className="w-5 h-5" />
                  <span>مخزن الباركود</span>
                </NavLink>
              )}

              {(normalizeArabic(userRole) === normalizeArabic('مدير') || userRole === 'Admin') && (
                <NavLink to="/admin/dashboard" className={linkClass} onClick={() => setIsOpen(false)}>
                  <Settings className="w-5 h-5" />
                  <span>الاعدادات</span>
                </NavLink>
              )}

              <div className="border-t border-white/5 my-4 mx-4"></div>

              {/* Attendance Button/Link */}
              {userRole === 'مدير' ? (
                <NavLink
                  to="/admin/attendance"
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 border border-white/10 ${isActive
                      ? 'bg-[#00A6A6] text-white shadow-lg'
                      : 'bg-black/20 text-gray-300 hover:bg-black/30'
                    }`
                  }
                  onClick={() => setIsOpen(false)}
                >
                  <Clock className="w-5 h-5" />
                  <span className="font-black text-sm">الحضور والانصراف</span>
                </NavLink>
              ) : userRole !== 'مشاهد' ? (
                <button
                  onClick={handleAttendanceClick}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 border ${attendanceStatus === 'checked-in'
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-black/20 border-white/5 text-white/40 hover:bg-black/30 hover:text-white'
                    }`}
                >
                  <div className={`w-2 h-2 rounded-full ${attendanceStatus === 'checked-in' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                  <span className="font-black text-sm">الحضور والانصراف</span>
                </button>
              ) : null}
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-white/5">
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-3 px-4 py-3.5 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all font-black"
              >
                <LogOut className="w-5 h-5" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
});

export default Sidebar;