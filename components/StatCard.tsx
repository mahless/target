import React from 'react';

export interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactElement<any>;
  color?: 'blue' | 'red' | 'emerald' | string;
  footer: string;
  gradient?: 'teal' | 'accent' | 'dark' | 'luxury';
}

const StatCard = React.memo(({ title, value, icon, color, footer, gradient }: StatCardProps) => {
  // Support for Dashboard styles
  const gradientClasses: Record<string, string> = {
    teal: 'from-[#036564] to-[#01404E] text-white shadow-[#036564]/20',
    accent: 'from-[#00A6A6] to-[#036564] text-white shadow-[#00A6A6]/20',
    dark: 'from-[#01404E] to-[#01404E] text-white shadow-[#01404E]/20',
    luxury: 'from-[#01404E] to-[#01404E] text-white shadow-[#01404E]/20'
  };

  // Support for Reports styles
  const colorMap: Record<string, { bg: string; icon: string; shadow: string }> = {
    blue: { bg: 'from-blue-600 to-blue-900', icon: 'text-blue-500', shadow: 'shadow-blue-900/20' },
    red: { bg: 'from-red-600 to-red-900', icon: 'text-red-500', shadow: 'shadow-red-900/20' },
    emerald: { bg: 'from-[#00A6A6] to-[#036564]', icon: 'text-[#00A6A6]', shadow: 'shadow-[#036564]/20' }
  };

  const theme = color ? colorMap[color] : null;
  const bgClass = theme ? theme.bg : gradientClasses[gradient || 'teal'];
  const iconClass = theme ? theme.icon : 'text-white';

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${bgClass} p-3 rounded-[2rem] shadow-lux transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl group animate-premium-in`}>
      <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

      <div className="relative z-10 flex flex-col h-full justify-between gap-1">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-[10px] md:text-xs font-black text-white/70 uppercase mb-1">{title}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl md:text-[28px] font-black text-white">{value?.toLocaleString('en-US')}</span>
              <span className="text-[9px] md:text-xs font-bold opacity-60 text-white">ج.م</span>
            </div>
          </div>
          <div className="p-2.5 bg-white/10 backdrop-blur-xl rounded-2xl text-white shadow-xl border border-white/10 group-hover:rotate-12 transition-transform">
            {React.cloneElement(icon, { className: `w-5 h-5 md:w-6 md:h-6 ${iconClass}` })}
          </div>
        </div>
        <div className="pt-2 mt-2 border-t border-white/5 text-[9px] md:text-[10px] text-white/50 font-bold uppercase flex items-center gap-2">
          {!theme && <span className="w-1.5 h-1.5 rounded-full bg-[#00A6A6] animate-pulse"></span>}
          {footer}
        </div>
      </div>
    </div>
  );
});

export default StatCard;
