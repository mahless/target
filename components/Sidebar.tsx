import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, PlusCircle, LogOut, FileText, Settings, Wallet, BarChart3, MapPin, Calendar, Clock, Package } from 'lucide-react';
import { BRANCHES } from '../constants';
import { Branch } from '../types';
import CustomSelect from './CustomSelect';

interface SidebarProps {
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  currentBranch: Branch | null;
  currentDate: string | null;
  onBranchChange: (branch: Branch) => void;
  onDateChange: (date: string) => void;
  userRole: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  onLogout,
  isOpen,
  setIsOpen,
  currentBranch,
  currentDate,
  onBranchChange,
  onDateChange,
  userRole
}) => {
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
            <button className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-gray-400 cursor-not-allowed">
              <Settings className="w-5 h-5" />
              <span>الإعدادات (قريباً)</span>
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
};

export default Sidebar;