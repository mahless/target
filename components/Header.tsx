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
    <header className="bg-red-600 h-16 shadow-lg flex items-center justify-between px-4 sticky top-0 z-10 text-white">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 rounded-md hover:bg-red-700 text-white"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-black text-white hidden sm:block">
          {pageTitle}
        </h2>
      </div>

      <div className="flex items-center gap-4 sm:gap-6 text-sm">
        {branch && (
          <div className="flex items-center gap-2 text-white bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
            <MapPin className="w-4 h-4 text-white" />
            <span className="hidden sm:inline font-bold">{branch.name}</span>
          </div>
        )}

        {date && (
          <div className="flex items-center gap-2 text-white bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
            <Calendar className="w-4 h-4 text-white" />
            <span className="font-mono pt-0.5">{date}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-white font-medium">
          <div className="w-8 h-8 rounded-full bg-white text-red-600 flex items-center justify-center font-black">
            <User className="w-4 h-4" />
          </div>
          <span className="hidden sm:inline font-black">{username}</span>
        </div>
      </div>
    </header>
  );
});

export default Header;