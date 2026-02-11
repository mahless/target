import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    id: string;
    name: string;
}

interface CustomSelectProps {
    label?: string;
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    icon?: React.ReactNode;
    accentColor?: 'blue' | 'emerald';
    showAllOption?: boolean;
    dark?: boolean;
    labelClassName?: string;
    disabled?: boolean;
    className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
    label, options, value, onChange, placeholder = 'اختر...', icon, accentColor = 'blue', disabled = false, showAllOption = true, dark = false, labelClassName = '', className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.id === value) || (value === 'الكل' ? { id: 'الكل', name: placeholder } : null);

    const activeClasses = dark
        ? 'border-[#00A6A6] ring-4 ring-[#00A6A6]/10 shadow-[0_0_20px_rgba(0,166,166,0.1)]'
        : accentColor === 'blue'
            ? 'border-[#036564] ring-4 ring-[#036564]/5 shadow-[0_0_20px_rgba(3,101,100,0.1)]'
            : 'border-emerald-500 ring-4 ring-emerald-50';

    const baseBorder = dark
        ? 'border-white/10'
        : accentColor === 'blue'
            ? 'border-[#01404E]/10'
            : 'border-emerald-200';

    const hoverItemClasses = dark
        ? 'hover:bg-white/5 hover:text-[#00A6A6]'
        : accentColor === 'blue'
            ? 'hover:bg-[#036564]/5 hover:text-[#036564]'
            : 'hover:bg-emerald-50 hover:text-emerald-700';

    const selectedItemClasses = dark
        ? 'bg-[#00A6A6] text-white'
        : accentColor === 'blue'
            ? 'bg-[#036564] text-white'
            : 'bg-emerald-600 text-white';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="space-y-1 w-full text-right" ref={containerRef}>
            {label && <label className={`block text-[10px] font-black uppercase tracking-widest mr-1 ${dark ? 'text-white/40' : 'text-[#01404E]/60'} ${labelClassName}`}>{label}</label>}
            <div className="relative">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full transition-all flex items-center justify-between text-sm font-bold ${className || 'p-4 rounded-2xl border-2'} ${disabled ? (dark ? 'bg-black/20 text-white/20 border-white/5' : 'bg-gray-100 cursor-not-allowed opacity-75 border-gray-200') :
                        isOpen ? activeClasses : `${dark ? 'bg-black/20 text-white' : 'bg-white text-[#01404E]'} ${baseBorder} hover:border-[#00A6A6]`
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <span className={dark ? 'text-white/20' : 'text-gray-400'}>{icon}</span>
                        <span className={selectedOption ? (dark ? 'text-white' : 'text-[#01404E]') : (dark ? 'text-white/30' : 'text-gray-400')}>
                            {selectedOption ? selectedOption.name : placeholder}
                        </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${dark ? 'text-white/30' : 'text-gray-400'} ${isOpen ? 'rotate-180 text-[#00A6A6]' : ''}`} />
                </button>

                {isOpen && (
                    <div className={`absolute z-[500] mt-2 w-full border overflow-hidden animate-scaleIn max-h-60 overflow-y-auto rounded-2xl shadow-2xl ${dark ? 'bg-[#01404E] border-white/10' : 'bg-white border-[#01404E]/5'}`}>
                        <div className="p-2 space-y-1">
                            {/* Option for 'All' */}
                            {showAllOption && (
                                <button
                                    type="button"
                                    onClick={() => { onChange('الكل'); setIsOpen(false); }}
                                    className={`w-full p-3 rounded-xl text-right text-xs font-black transition-all flex items-center justify-between ${value === 'الكل' ? selectedItemClasses : `text-gray-600 ${hoverItemClasses}`}`}
                                >
                                    <span>{placeholder}</span>
                                    {value === 'الكل' && <Check className="w-3 h-3" />}
                                </button>
                            )}

                            {options.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => { onChange(opt.id); setIsOpen(false); }}
                                    className={`w-full p-3 rounded-xl text-right text-xs font-black transition-all flex items-center justify-between ${value === opt.id ? selectedItemClasses : `${dark ? 'text-white/70' : 'text-[#01404E]/80'} ${hoverItemClasses}`}`}
                                >
                                    <span>{opt.name}</span>
                                    {value === opt.id && <Check className="w-3 h-3" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomSelect;
