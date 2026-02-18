import React from 'react';
import { Menu, User, Calendar, MapPin } from 'lucide-react';
import { Branch } from '../types';

interface HeaderProps {
  toggleSidebar: () => void;
  branch: Branch | null;
  date: string | null;
  username: string;
  pageTitle: string;
}

const Header: React.FC<HeaderProps> = React.memo(({ toggleSidebar, branch, date, username, pageTitle }) => {
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
        {branch && (
          <div className="flex items-center gap-1 text-white bg-white/5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-white/10 backdrop-blur-md">
            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#00A6A6]" />
            <span className="hidden sm:inline font-black">{branch.name}</span>
          </div>
        )}

        {date && (
          <div className="flex items-center gap-1 text-white bg-white/5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-white/10 backdrop-blur-md">
            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#00A6A6]" />
            <span className="font-mono pt-0.5 font-black">{date}</span>
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