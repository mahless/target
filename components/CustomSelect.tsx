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
}

const CustomSelect: React.FC<CustomSelectProps> = ({
    label, options, value, onChange, placeholder = 'اختر...', icon, accentColor = 'blue'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.id === value) || (value === 'الكل' ? { id: 'الكل', name: placeholder } : null);

    const activeClasses = accentColor === 'blue'
        ? 'border-blue-600 ring-4 ring-blue-50'
        : 'border-emerald-500 ring-4 ring-emerald-50';

    const baseBorder = accentColor === 'blue'
        ? 'border-blue-200'
        : 'border-emerald-200';

    const hoverItemClasses = accentColor === 'blue'
        ? 'hover:bg-blue-50 hover:text-blue-700'
        : 'hover:bg-emerald-50 hover:text-emerald-700';

    const selectedItemClasses = accentColor === 'blue'
        ? 'bg-blue-600 text-white'
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
            {label && <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mr-1">{label}</label>}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full p-4 bg-white rounded-2xl border-2 transition-all flex items-center justify-between text-sm font-bold ${isOpen ? activeClasses : `${baseBorder} hover:border-blue-400`}`}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-gray-400">{icon}</span>
                        <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
                            {selectedOption ? selectedOption.name : placeholder}
                        </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute z-[100] mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn max-h-60 overflow-y-auto">
                        <div className="p-2 space-y-1">
                            {/* Option for 'All' */}
                            <button
                                type="button"
                                onClick={() => { onChange('الكل'); setIsOpen(false); }}
                                className={`w-full p-3 rounded-xl text-right text-xs font-black transition-all flex items-center justify-between ${value === 'الكل' ? selectedItemClasses : `text-gray-600 ${hoverItemClasses}`}`}
                            >
                                <span>{placeholder}</span>
                                {value === 'الكل' && <Check className="w-3 h-3" />}
                            </button>

                            {options.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => { onChange(opt.id); setIsOpen(false); }}
                                    className={`w-full p-3 rounded-xl text-right text-xs font-black transition-all flex items-center justify-between ${value === opt.id ? selectedItemClasses : `text-gray-600 ${hoverItemClasses}`}`}
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
