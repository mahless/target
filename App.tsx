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
import ThirdPartySettlements from './pages/ThirdPartySettlements';
import ErrorBoundary from './components/ErrorBoundary';
import { normalizeArabic } from './utils';
import { useAppState } from './hooks/useAppState';
import { ModalProvider, useModal } from './context/ModalContext';
import AdminDashboard from './pages/AdminDashboard';

const AppContent: React.FC = () => {
  const {
    user, userRole, branch, currentDate, entries, expenses, stock,
    handleLogin, handleLogout,
    addEntry, updateEntry, addExpense, deleteExpense, setBranch, setCurrentDate,
    isSyncing, syncAll, isSubmitting, startSubmitting, stopSubmitting,
    attendanceStatus, checkIn, checkOut, deliverOrder, branchTransfer, branches,
    users, manageUsers, manageBranches,
    serviceTypes, expenseCategories, updateSettings, deleteStock
  } = useAppState();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { setIsProcessing } = useModal();

  // Sync isSubmitting with global Processing Overlay
  React.useEffect(() => {
    setIsProcessing(isSubmitting);
  }, [isSubmitting, setIsProcessing]);

  const pageTitle = useMemo(() => {
    switch (location.pathname) {
      case '/dashboard': return 'لوحة التحكم اليومية';
      case '/new-service': return 'تسجيل خدمة جديدة';
      case '/receivables': return 'سجل المتبقيات والتحصيل';
      case '/expenses': return 'إدارة المصروفات';
      case '/reports': return 'تقارير الأداء المالي';
      case '/admin/inventory': return 'إدارة المخزن';
      case '/admin/attendance': return 'لوحة الحضور والانصراف';
      case '/admin/dashboard': return 'لوحة التحكم الإدارية';
      case '/third-party-settlements': return 'تسويات الموردين المتأخرة';
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

  const isAccessLocked = userRole !== 'مدير' && userRole !== 'مشاهد' && attendanceStatus !== 'checked-in';

  return (
    <div className="flex min-h-screen bg-[#F2E3D5] text-right overflow-hidden">
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
                      تسجيل الحضور أولا.
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
                        onDeliverOrder={deliverOrder}
                        onBranchTransfer={branchTransfer}
                        userRole={userRole}
                      />
                    } />
                    <Route path="/new-service" element={
                      userRole === 'مشاهد' ? <Navigate to="/dashboard" /> : (
                        <ServiceForm
                          onAddEntry={addEntry}
                          onAddExpense={addExpense}
                          entries={entries}
                          serviceTypes={serviceTypes}
                          branchId={branch?.id || ''}
                          currentDate={currentDate || ''}
                          username={user?.name || ''}
                          userRole={userRole}
                          isSubmitting={isSubmitting}
                        />
                      )
                    } />
                    <Route path="/receivables" element={
                      userRole === 'مشاهد' ? <Navigate to="/dashboard" /> : (
                        <Receivables
                          entries={entries}
                          serviceTypes={serviceTypes}
                          onUpdateEntry={updateEntry}
                          onAddEntry={addEntry}
                          branchId={branch?.id || ''}
                          currentDate={currentDate || ''}
                          username={user?.name || ''}
                          isSyncing={isSyncing}
                          onRefresh={syncAll}
                          isSubmitting={isSubmitting}
                          userRole={userRole}
                        />
                      )
                    } />
                    <Route path="/expenses" element={
                      userRole === 'مشاهد' ? <Navigate to="/dashboard" /> : (
                        <Expenses
                          expenses={expenses}
                          entries={entries}
                          expenseCategories={expenseCategories}
                          onAddExpense={addExpense}
                          onDeleteExpense={deleteExpense}
                          branchId={branch?.id || ''}
                          currentDate={currentDate || ''}
                          username={user?.name || ''}
                          isSubmitting={isSubmitting}
                          branches={branches}
                        />
                      )
                    } />
                    <Route path="/reports" element={
                      <Reports
                        entries={entries}
                        expenses={expenses}
                        serviceTypes={serviceTypes}
                        expenseCategories={expenseCategories}
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
                    <Route path="/third-party-settlements" element={
                      userRole === 'مشاهد' ? <Navigate to="/dashboard" /> : (
                        <ThirdPartySettlements
                          entries={entries}
                          onUpdateEntry={updateEntry}
                          onAddExpense={addExpense}
                          branchId={branch?.id || ''}
                          currentDate={currentDate || ''}
                          username={user?.name || ''}
                          isSyncing={isSyncing}
                          onRefresh={syncAll}
                          isSubmitting={isSubmitting}
                          branches={branches}
                          userRole={userRole}
                        />
                      )
                    } />
                    <Route path="/admin/inventory" element={
                      <AdminInventory
                        stock={stock}
                        onRefresh={syncAll}
                        onDeleteStock={deleteStock}
                        isSyncing={isSyncing}
                        userRole={userRole}
                        username={user?.name || ''}
                        isSubmitting={isSubmitting}
                        startSubmitting={startSubmitting}
                        stopSubmitting={stopSubmitting}
                        branches={branches}
                      />
                    } />
                    <Route path="/admin/attendance" element={
                      normalizeArabic(userRole) === normalizeArabic('مدير') || userRole === 'Admin' ? <AttendanceDashboard /> : <Navigate to="/dashboard" />
                    } />
                    <Route path="/admin/dashboard" element={
                      normalizeArabic(userRole) === normalizeArabic('مدير') || userRole === 'Admin' ? (
                        <AdminDashboard
                          users={users}
                          branches={branches}
                          serviceTypes={serviceTypes}
                          expenseCategories={expenseCategories}
                          onManageUsers={manageUsers}
                          onManageBranches={manageBranches}
                          onUpdateSettings={updateSettings}
                          isSubmitting={isSubmitting}
                        />
                      ) : <Navigate to="/dashboard" />
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