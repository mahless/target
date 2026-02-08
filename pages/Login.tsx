import React, { useState } from 'react';
import { Lock, User } from 'lucide-react';
import { User as UserType } from '../types';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { toEnglishDigits } from '../utils';
import { useModal } from '../context/ModalContext';

interface LoginProps {
  onLogin: (userData: UserType) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { setIsProcessing } = useModal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !password) {
      setError('يرجى إدخال المعرف وكلمة المرور');
      return;
    }

    setIsLoading(true);
    setIsProcessing(true);
    setError('');

    const response = await GoogleSheetsService.login(id, password);

    if (response.success && response.id && response.name && response.role) {
      // حفظ رقم الموظف الثابت في localStorage كما هو مطلوب
      localStorage.setItem('active_employee_id', String(response.id));

      onLogin({
        id: response.id,
        name: response.name,
        role: response.role,
        branchId: response.assignedBranchId || '',
        assignedBranchId: response.assignedBranchId
      });
    } else {
      setError(response.message || 'فشل تسجيل الدخول، تحقق من البيانات');
    }
    setIsLoading(false);
    setIsProcessing(false);
  };

  const inputClasses = "w-full pr-10 pl-4 py-3 border-none rounded-lg bg-gray-200 text-black font-bold placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all";

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900 p-4">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 pointer-events-none"></div>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10 border border-white/20">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-700 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl shadow-blue-900/40 rotate-3">
            <Lock className={`w-10 h-10 text-white -rotate-3 ${isLoading ? 'animate-pulse' : ''}`} />
          </div>
          <h1 className="text-3xl font-bold text-blue-900 mb-2">تارجت للخدمات الحكوميه</h1>
          <p className="text-gray-500 font-medium">سجل دخول للمتابعة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">
              المعرف (ID)
            </label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type="text"
                value={id}
                onChange={(e) => setId(toEnglishDigits(e.target.value))}
                className={inputClasses}
                placeholder="أدخل المعرف الخاص بك"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">
              كلمة المرور
            </label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(toEnglishDigits(e.target.value))}
                className={inputClasses}
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-xs bg-red-50 p-3 rounded-lg text-center font-bold border border-red-100 animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-700/30 active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? 'جاري التحقق...' : 'دخول للنظام'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;