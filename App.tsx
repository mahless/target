import React, { useState, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import SessionSetup from './pages/SessionSetup';
import Dashboard from './pages/Dashboard';
import ServiceForm from './pages/ServiceForm';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Receivables from './pages/Receivables';
import { ModalProvider } from './context/ModalContext';
import { useAppState } from './hooks/useAppState';
import { BRANCHES } from './constants';

// Lazy load AdminInventory to isolate potential bundle crashes
const AdminInventory = React.lazy(() => import('./pages/AdminInventory'));

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, branch, currentDate } = useAppState();
  if (!user) return <Navigate to="/login" replace />;
  if (!branch || !currentDate) return <Navigate to="/setup" replace />;
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const {
    user, userRole, branch, currentDate, entries, expenses, stock,
    handleLogin, handleLogout, handleSessionSetup,
    addEntry, updateEntry, addExpense, setBranch, setCurrentDate,
    isSyncing, syncAll
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
      default: return 'تارجت للخدمات';
    }
  }, [location.pathname]);



  return (
    <div className="flex min-h-screen bg-gray-50 text-right">
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/setup" /> : <Login onLogin={handleLogin} />} />
          <Route path="/setup" element={!user ? <Navigate to="/login" /> : (branch && currentDate) ? <Navigate to="/dashboard" /> : <SessionSetup onComplete={handleSessionSetup} user={user} />} />

          <Route path="/*" element={
            <ProtectedRoute>
              <Sidebar
                isOpen={sidebarOpen} setIsOpen={setSidebarOpen}
                onLogout={handleLogout} currentBranch={branch} currentDate={currentDate}
                onBranchChange={setBranch} onDateChange={setCurrentDate}
                userRole={userRole}
                user={user}
              />
              <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} branch={branch} date={currentDate} username={user?.name || ''} pageTitle={pageTitle} />
                <main className="flex-1 overflow-y-auto">
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
                      />
                    } />
                    <Route path="/new-service" element={<ServiceForm onAddEntry={addEntry} onAddExpense={addExpense} entries={entries} branchId={branch?.id || ''} currentDate={currentDate || ''} username={user?.name || ''} userRole={userRole} />} />
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
                      />
                    } />
                    <Route path="/expenses" element={<Expenses expenses={expenses} entries={entries} onAddExpense={addExpense} branchId={branch?.id || ''} currentDate={currentDate || ''} username={user?.name || ''} />} />
                    <Route path="/reports" element={<Reports entries={entries} expenses={expenses} branches={BRANCHES} manualDate={currentDate || ''} branchId={branch?.id || ''} onUpdateEntry={updateEntry} onAddExpense={addExpense} isSyncing={isSyncing} onRefresh={syncAll} username={user?.name || ''} />} />
                    {/* استخدام Suspense لضمان تحميل الصفحة بشكل منفصل وآمن */}
                    <Route
                      path="/admin/inventory"
                      element={
                        <React.Suspense fallback={<div className="p-10 text-center font-bold text-gray-500">جاري تحميل واجهة المخزن...</div>}>
                          <AdminInventory stock={Array.isArray(stock) ? stock : []} onRefresh={syncAll} isSyncing={isSyncing} userRole={userRole} />
                        </React.Suspense>
                      }
                    />
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                  </Routes>
                </main>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </ErrorBoundary>
    </div>
  );
};

// Error Boundary بسيط لالتقاط أي انهيار في الصفحات
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
    this.props = props;
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-center">
          <h2 className="text-2xl font-black text-red-600 mb-4">حدث خطأ تقني في هذه الصفحة</h2>
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-left font-mono text-xs overflow-auto max-h-40">
            {this.state.error?.toString()}
          </div>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition"
          >
            مسح البيانات وإعادة التحميل
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => (
  <ModalProvider>
    <HashRouter>
      <AppContent />
    </HashRouter>
  </ModalProvider>
);

export default App;