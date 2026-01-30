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
    <header className="bg-white h-16 shadow-sm flex items-center justify-between px-4 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 rounded-md hover:bg-gray-100 text-gray-600"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-semibold text-gray-800 hidden sm:block">
          {pageTitle}
        </h2>
      </div>

      <div className="flex items-center gap-4 sm:gap-6 text-sm">
        {branch && (
          <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline font-medium">{branch.name}</span>
          </div>
        )}

        {date && (
          <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
            <Calendar className="w-4 h-4 text-secondary" />
            <span className="font-mono pt-0.5">{date}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-gray-700 font-medium">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <span className="hidden sm:inline">{username}</span>
        </div>
      </div>
    </header>
  );
});

export default Header;