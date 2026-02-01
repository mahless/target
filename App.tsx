import React, { useState, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ServiceForm from './pages/ServiceForm';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Receivables from './pages/Receivables';
import AdminInventory from './pages/AdminInventory';
import AttendanceDashboard from './pages/AttendanceDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { ModalProvider } from './context/ModalContext';
import { useAppState } from './hooks/useAppState';

const AppContent: React.FC = () => {
  const {
    user, userRole, branch, currentDate, entries, expenses, stock,
    handleLogin, handleLogout,
    addEntry, updateEntry, addExpense, setBranch, setCurrentDate,
    isSyncing, syncAll, isSubmitting, startSubmitting, stopSubmitting,
    attendanceStatus, checkIn, checkOut, branchTransfer, branches // Added
  } = useAppState();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const pageTitle = useMemo(() => {
    switch (location.pathname) {
      case '/dashboard': return 'لوحة التحكم اليومية';
      case '/new-service': return 'تسجيل خدمة جديدة';
      case '/receivables': return 'سجل المتبقيات والتحصيل';
      case '/expenses': return 'إدارة المصروفات';
      case '/reports': return 'تقارير الأداء المالي';
      case '/admin/inventory': return 'إدارة المخزن';
      case '/admin/attendance': return 'لوحة الحضور والانصراف';
      default: return 'تارجت للخدمات';
    }
  }, [location.pathname]);

  // Navigation Guard: Prevent closing/refreshing while submitting
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmitting) {
        e.preventDefault();
        e.returnValue = 'هناك عملية جارية، هل أنت متأكد من المغادرة؟ قد تفقد البيانات.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSubmitting]);

  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (!user) return <Navigate to="/login" replace />;
    return <>{children}</>;
  };

  const isAccessLocked = userRole !== 'مدير' && attendanceStatus !== 'checked-in';

  return (
    <div className="flex min-h-screen bg-gray-50 text-right">
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <Sidebar
              isOpen={sidebarOpen} setIsOpen={setSidebarOpen}
              onLogout={handleLogout} currentBranch={branch} currentDate={currentDate}
              onBranchChange={setBranch} onDateChange={setCurrentDate}
              userRole={userRole}
              attendanceStatus={attendanceStatus}
              onCheckIn={checkIn}
              onCheckOut={checkOut}
              user={user}
              startSubmitting={startSubmitting}
              stopSubmitting={stopSubmitting}
              branches={branches}
            />
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
              <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} branch={branch} date={currentDate} username={user?.name || ''} pageTitle={pageTitle} />
              <main className={`flex-1 overflow-y-auto ${isSubmitting ? 'pointer-events-none opacity-90' : ''}`}>
                {isAccessLocked ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gray-50">
                    <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                      <span className="text-4xl">⚠️</span>
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">النظام مغلق</h2>
                    <p className="text-gray-500 mb-6 max-w-md">
                      لا يمكن الوصول لصفحات العمل إلا بعد تسجيل الحضور.
                    </p>
                    <p className="bg-white px-4 py-2 rounded-xl border border-blue-100 text-blue-800 font-bold text-sm shadow-sm">
                      👈 يرجى "تسجيل الحضور" من القائمه الجانبيه للمتابعة.
                    </p>
                  </div>
                ) : (
                  <Routes>
                    <Route path="/dashboard" element={
                      <Dashboard
                        allEntries={entries}
                        allExpenses={expenses}
                        currentDate={currentDate || ''}
                        branchId={branch?.id || ''}
                        onUpdateEntry={updateEntry}
                        isSyncing={isSyncing}
                        onRefresh={syncAll}
                        isSubmitting={isSubmitting}
                        username={user?.name || ''}
                        onAddExpense={addExpense}
                        branches={branches}
                        onBranchTransfer={branchTransfer}
                        userRole={userRole}
                      />
                    } />
                    <Route path="/new-service" element={
                      <ServiceForm
                        onAddEntry={addEntry}
                        onAddExpense={addExpense}
                        entries={entries}
                        branchId={branch?.id || ''}
                        currentDate={currentDate || ''}
                        username={user?.name || ''}
                        userRole={userRole}
                        isSubmitting={isSubmitting}
                      />
                    } />
                    <Route path="/receivables" element={
                      <Receivables
                        entries={entries}
                        onUpdateEntry={updateEntry}
                        onAddEntry={addEntry}
                        branchId={branch?.id || ''}
                        currentDate={currentDate || ''}
                        username={user?.name || ''}
                        isSyncing={isSyncing}
                        onRefresh={syncAll}
                        isSubmitting={isSubmitting}
                      />
                    } />
                    <Route path="/expenses" element={
                      <Expenses
                        expenses={expenses}
                        entries={entries}
                        onAddExpense={addExpense}
                        branchId={branch?.id || ''}
                        currentDate={currentDate || ''}
                        username={user?.name || ''}
                        isSubmitting={isSubmitting}
                        branches={branches}
                      />
                    } />
                    <Route path="/reports" element={
                      <Reports
                        entries={entries}
                        expenses={expenses}
                        branches={branches}
                        manualDate={currentDate || ''}
                        branchId={branch?.id || ''}
                        onUpdateEntry={updateEntry}
                        onAddExpense={addExpense}
                        isSyncing={isSyncing}
                        onRefresh={syncAll}
                        username={user?.name || ''}
                        userRole={userRole}
                        isSubmitting={isSubmitting}
                      />
                    } />
                    <Route path="/admin/inventory" element={
                      <AdminInventory
                        stock={stock}
                        onRefresh={syncAll}
                        isSyncing={isSyncing}
                        userRole={userRole}
                        isSubmitting={isSubmitting}
                        startSubmitting={startSubmitting}
                        stopSubmitting={stopSubmitting}
                        branches={branches}
                      />
                    } />
                    <Route path="/admin/attendance" element={
                      userRole === 'مدير' ? <AttendanceDashboard /> : <Navigate to="/dashboard" />
                    } />
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                  </Routes>
                )}
              </main>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <ModalProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </ModalProvider>
  </ErrorBoundary>
);

export default App;