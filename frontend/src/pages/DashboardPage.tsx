import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchEvents } from '../api/events';
import { fetchBookingRequests } from '../api/requests';
import type { ScheduleEvent, BookingRequestType } from '../types/types';
import { EVENT_TYPE_LABELS } from '../types/types';
import PageHeader from '../components/common/PageHeader';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import {
  CalendarDays,
  Clock,
  AlertTriangle,
  Building2,
  Plus,
  Calendar,
  FileText,
} from 'lucide-react';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [requests, setRequests] = useState<BookingRequestType[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin';
  const isCoach = user?.role === 'coach';

  useEffect(() => {
    async function loadData() {
      try {
        const [evts, reqs] = await Promise.all([
          fetchEvents(),
          (isAdmin || isCoach) ? fetchBookingRequests() : Promise.resolve([]),
        ]);
        setEvents(evts);
        setRequests(reqs);
      } catch {
        // Silently handle — cards will show 0
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isAdmin, isCoach]);

  // Computed values
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const upcomingEvents = events
    .filter((e) => {
      const start = new Date(e.start_time);
      return start > now && start <= weekFromNow && e.status !== 'cancelled';
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const conflictingCount = events.filter((e) => e.status === 'proposed').length;
  const totalPublished = events.filter((e) => e.status === 'published').length;
  const totalFacilities = new Set(events.map((e) => e.facility?.name)).size;
  const facilityUsage = totalFacilities > 0 ? Math.min(Math.round((totalPublished / Math.max(totalFacilities * 5, 1)) * 100), 100) : 0;

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const firstName = user?.first_name || user?.username || 'User';

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dash">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle={dateStr}
        action={
          isCoach ? (
            <button
              className="btn btn-primary btn-sm dash-btn-primary"
              onClick={() => navigate('/requests/new')}
            >
              <Plus size={16} /> Request Slot
            </button>
          ) : undefined
        }
      />

      {/* Stat cards */}
      <div className="dash-stats">
        <StatCard
          title="Upcoming Sessions"
          value={upcomingEvents.length}
          subtitle="Next 7 days"
          icon={<CalendarDays size={20} />}
        />
        {(isAdmin || isCoach) && (
          <StatCard
            title="Pending Requests"
            value={pendingRequests.length}
            subtitle="Awaiting review"
            icon={<Clock size={20} />}
            valueColor="var(--cs-blue-600)"
          />
        )}
        {isAdmin && (
          <StatCard
            title="Conflicts"
            value={conflictingCount}
            subtitle="Proposed events"
            icon={<AlertTriangle size={20} />}
            valueColor={conflictingCount > 0 ? 'var(--cs-orange-600)' : undefined}
          />
        )}
        {isAdmin && (
          <StatCard
            title="Facility Usage"
            value={`${facilityUsage}%`}
            subtitle={`${totalFacilities} facilities active`}
            icon={<Building2 size={20} />}
          />
        )}
      </div>

      {/* Two-column content */}
      <div className="dash-grid">
        {/* Upcoming Bookings */}
        <div className="dash-card">
          <h2 className="dash-card__title">Upcoming Bookings</h2>
          <p className="dash-card__desc">Next 7 days</p>
          {upcomingEvents.length === 0 ? (
            <p className="dash-card__empty">No upcoming bookings.</p>
          ) : (
            <div className="dash-event-list">
              {upcomingEvents.slice(0, 8).map((evt) => {
                const start = new Date(evt.start_time);
                const end = new Date(evt.end_time);
                return (
                  <div key={evt.id} className="dash-event-item">
                    <div className="dash-event-dot" />
                    <div className="dash-event-info">
                      <span className="dash-event-title">{evt.title}</span>
                      <span className="dash-event-meta">
                        {evt.facility?.name} &middot;{' '}
                        {start.toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' })}{' '}
                        {start.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}
                        –{end.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <StatusBadge status={evt.status} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Requests */}
        {(isAdmin || isCoach) && (
          <div className="dash-card">
            <h2 className="dash-card__title">Pending Requests</h2>
            <p className="dash-card__desc">{pendingRequests.length} request{pendingRequests.length !== 1 ? 's' : ''} awaiting review</p>
            {pendingRequests.length === 0 ? (
              <p className="dash-card__empty">No pending requests.</p>
            ) : (
              <div className="dash-request-list">
                {pendingRequests.slice(0, 6).map((req) => (
                  <div key={req.id} className="dash-request-item">
                    <div className="dash-request-info">
                      <span className="dash-request-team">{req.team_name || req.team}</span>
                      <span className="dash-request-detail">
                        {EVENT_TYPE_LABELS[req.event_type] ?? req.event_type} &middot;{' '}
                        {req.preferred_facility || 'Any facility'}
                      </span>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions — coach only */}
      {isCoach && (
        <div className="dash-card dash-quick-actions">
          <h2 className="dash-card__title">Quick Actions</h2>
          <div className="dash-actions-row">
            <button className="dash-action-btn" onClick={() => navigate('/requests/new')}>
              <Plus size={18} />
              Request Slot
            </button>
            <button className="dash-action-btn" onClick={() => navigate('/calendar')}>
              <Calendar size={18} />
              View Calendar
            </button>
            <button className="dash-action-btn" onClick={() => navigate('/requests')}>
              <FileText size={18} />
              My Requests
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
