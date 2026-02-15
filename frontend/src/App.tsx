import { Routes, Route } from 'react-router-dom';

import AuthenticatedLayout from './components/layout/AuthenticatedLayout';
import LoginPage from './pages/LoginPage';
import CalendarPage from './pages/CalendarPage';
import BookingsPage from './pages/BookingsPage';
import RequestsPage from './pages/RequestsPage';
import TeamsPage from './pages/TeamsPage';

function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/" element={<LoginPage />} />

      {/* Protected routes — wrapped in app shell */}
      <Route element={<AuthenticatedLayout />}>
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/teams" element={<TeamsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
