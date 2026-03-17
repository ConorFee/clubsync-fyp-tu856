import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import AuthenticatedLayout from './components/layout/AuthenticatedLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import RequestsPage from './pages/RequestsPage';
import BookingRequestForm from './components/BookingRequestForm';
import TeamsPage from './pages/TeamsPage';
import FacilitiesPage from './pages/FacilitiesPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function LoginRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LoginPage />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/" element={<LoginRoute />} />

      {/* Protected routes — wrapped in app shell */}
      <Route
        element={
          <ProtectedRoute>
            <AuthenticatedLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/requests/new" element={<BookingRequestForm />} />
        <Route path="/requests/:id" element={<BookingRequestForm />} />
        <Route path="/facilities" element={<FacilitiesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/teams" element={<TeamsPage />} />

        {/* Backward compat: /bookings → /requests */}
        <Route path="/bookings" element={<Navigate to="/requests" replace />} />
        <Route path="/bookings/new" element={<Navigate to="/requests/new" replace />} />
        <Route path="/bookings/:id" element={<Navigate to="/requests/:id" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
