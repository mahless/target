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
    <header className="bg-[#033649] h-16 shadow-[0_4px_20px_rgba(0,0,0,0.2)] flex items-center justify-between px-6 sticky top-0 z-20 text-white border-b border-white/5">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 rounded-xl hover:bg-white/10 text-white transition-all"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-black text-white tracking-tight">
          <span className="text-[#00A6A6] ml-2">|</span>
          {pageTitle}
        </h2>
      </div>

      <div className="flex items-center gap-4 sm:gap-6 text-sm">
        {branch && (
          <div className="flex items-center gap-2 text-white bg-white/5 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-md">
            <MapPin className="w-4 h-4 text-[#00A6A6]" />
            <span className="hidden sm:inline font-black">{branch.name}</span>
          </div>
        )}

        {date && (
          <div className="flex items-center gap-2 text-white bg-white/5 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-md">
            <Calendar className="w-4 h-4 text-[#00A6A6]" />
            <span className="font-mono pt-0.5 font-black">{date}</span>
          </div>
        )}

        <div className="flex items-center gap-3 text-white font-medium group cursor-pointer">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00A6A6] to-[#036564] text-white flex items-center justify-center font-black shadow-lg shadow-[#00A6A6]/20 transition-transform group-hover:scale-110">
            <User className="w-5 h-5" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="hidden sm:inline font-black text-sm leading-none">{username}</span>
          </div>
        </div>
      </div>
    </header>
  );
});

export default Header;