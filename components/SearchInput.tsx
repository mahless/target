import React from 'react';
import { Search, X } from 'lucide-react';
import { toEnglishDigits } from '../utils';

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({
    value,
    onChange,
    placeholder = 'ابحث...',
    className = ''
}) => {
    return (
        <div className={`relative ${className}`}>
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(toEnglishDigits(e.target.value))}
                placeholder={placeholder}
                className="w-full pr-11 pl-10 py-3 text-sm rounded-2xl bg-white shadow-inner border-2 border-[#00A6A6] text-black font-black focus:border-[#00A6A6] focus:ring-4 focus:ring-[#00A6A6]/10 outline-none transition-all"
            />
            {value && (
                <button
                    onClick={() => onChange('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                    type="button"
                >
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
            )}
        </div>
    );
};

export default SearchInput;
