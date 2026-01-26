import React, { useState, useEffect } from 'react';
import { BRANCHES } from '../constants';
import { Branch, User } from '../types';
import { MapPin, Calendar, ArrowLeft, Lock } from 'lucide-react';

interface SessionSetupProps {
  onComplete: (branch: Branch, date: string) => void;
  user: User;
}

const SessionSetup: React.FC<SessionSetupProps> = ({ onComplete, user }) => {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const isRestricted = !!user.assignedBranchId;
  const assignedBranch = isRestricted ? BRANCHES.find(b => b.id === user.assignedBranchId) : null;

  // Auto-select assigned branch if user is restricted
  useEffect(() => {
    if (assignedBranch) {
      setSelectedBranchId(assignedBranch.id);
    }
  }, [assignedBranch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const branch = BRANCHES.find(b => b.id === selectedBranchId);
    if (branch && selectedDate) {
      onComplete(branch, selectedDate);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-xl border border-gray-100">
        <div className="flex items-center gap-3 mb-8 border-b pb-4">
          <div className="p-3 bg-blue-100 rounded-lg text-blue-700">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">إعداد الجلسة</h2>
            <p className="text-sm text-gray-500">اختر الفرع وتاريخ العمل لبدء الوردية</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Branch Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-700 mr-1">تحديد الفرع الحالي</label>

            {isRestricted && assignedBranch ? (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Lock className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-black text-blue-900">أنت مخصص لفرع واحد</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <MapPin className="w-6 h-6 text-blue-600" />
                  <span className="text-xl font-black text-blue-700">{assignedBranch.name}</span>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {BRANCHES.map((branch) => (
                  <div key={branch.id} className="relative">
                    <input
                      type="radio"
                      name="branch"
                      id={branch.id}
                      value={branch.id}
                      className="peer sr-only"
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      checked={selectedBranchId === branch.id}
                    />
                    <label
                      htmlFor={branch.id}
                      className="flex flex-col items-center justify-center p-4 bg-gray-200 border-2 border-transparent rounded-xl cursor-pointer peer-checked:border-blue-600 peer-checked:bg-white peer-checked:ring-4 peer-checked:ring-blue-50 transition-all text-center h-full"
                    >
                      <MapPin className={`w-6 h-6 mb-2 ${selectedBranchId === branch.id ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className={`text-sm font-bold ${selectedBranchId === branch.id ? 'text-black' : 'text-gray-600'}`}>{branch.name}</span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Date Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-700 mr-1">تاريخ وردية العمل</label>
            <div className="relative">
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pr-11 pl-4 py-4 border-none rounded-xl bg-gray-200 text-black font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!selectedBranchId || !selectedDate}
            className="w-full bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-700/20"
          >
            <span>تأكيد البيانات وبدء العمل</span>
            <ArrowLeft className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default SessionSetup;