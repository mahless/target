import React, { useMemo } from 'react';
import { Menu, User, Calendar, MapPin } from 'lucide-react';
import { Branch } from '../types';
import CustomSelect from './CustomSelect';
import { normalizeArabic } from '../utils';

interface HeaderProps {
  toggleSidebar: () => void;
  branch: Branch | null;
  date: string | null;
  username: string;
  pageTitle: string;
  branches?: Branch[];
  userRole?: string;
  onBranchChange?: (branch: Branch) => void;
}

const Header: React.FC<HeaderProps> = React.memo(({ toggleSidebar, branch, date, username, pageTitle, branches = [], userRole = '', onBranchChange }) => {
  const branchOptions = useMemo(() => {
    const options = branches.map(b => ({ id: b.id, name: b.name }));
    if (normalizeArabic(userRole) === normalizeArabic('مدير')) {
      return [{ id: 'all', name: 'كل الفروع' }, ...options];
    }
    return options;
  }, [branches, userRole]);

  return (
    <header className="bg-[#01404E] h-14 shadow-[0_4px_20px_rgba(0,0,0,0.2)] flex items-center justify-between px-4 sticky top-0 z-20 text-white border-b border-white/5">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-1.5 rounded-xl hover:bg-white/10 text-white transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-[10px] sm:text-sm md:text-lg font-black text-white tracking-tight truncate max-w-[150px] sm:max-w-none">
          <span className="text-[#00A6A6] ml-1.5 md:ml-2">|</span>
          {pageTitle}
        </h2>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-4 text-[9px] sm:text-xs">
        <div className="w-32 sm:w-48">
          <CustomSelect
            options={branchOptions}
            value={branch?.id || ''}
            onChange={(val) => {
              if (!onBranchChange) return;
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
            className="px-2 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border text-[10px] sm:text-xs bg-white/5 backdrop-blur-md"
          />
        </div>

        {date && (
          <div className="flex items-center gap-1 text-white bg-white/5 px-2 sm:px-3 py-1 sm:py-1.5 sm:h-9 rounded-lg sm:rounded-xl border border-white/10 backdrop-blur-md">
            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#00A6A6]" />
            <span className="font-mono pt-0.5 font-black flex-1 text-center">{date}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2 text-white font-medium group cursor-pointer border-r border-white/10 pr-2 sm:pr-0 sm:border-none mr-1 sm:mr-0">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#00A6A6] to-[#036564] text-white flex items-center justify-center font-black shadow-lg shadow-[#00A6A6]/20 transition-transform group-hover:scale-105">
            <User className="w-3 h-3 sm:w-4 sm:h-4" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="hidden sm:inline font-black text-xs leading-none">{username}</span>
          </div>
        </div>
      </div>
    </header>
  );
});

export default Header;