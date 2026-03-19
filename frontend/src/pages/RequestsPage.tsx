import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchBookingRequests, deleteBookingRequest } from '../api/requests';
import { fetchEvents } from '../api/events';
import { generateSchedule, publishSchedule, discardSchedule } from '../api/solver';
import type { GenerateResult } from '../api/solver';
import type { BookingRequestType, ScheduleEvent } from '../types/types';
import { EVENT_TYPE_LABELS } from '../types/types';
import PageHeader from '../components/common/PageHeader';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import SolverReviewPanel from '../components/SolverReviewPanel';
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import './RequestsPage.css';

// sessionStorage keys for solver state persistence across navigation
const STORAGE_KEY_RESULT = 'clubsync_solverResult';
const STORAGE_KEY_DATES = 'clubsync_solverDates';

const PRIORITY_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
};

const PRIORITY_COLORS: Record<1 | 2 | 3, string> = {
  1: 'var(--cs-gray-500)',
  2: 'var(--cs-orange-600)',
  3: 'var(--cs-red-600)',
};

function formatDays(days: string[]): string {
  if (days.length === 0) return '—';
  const short: Record<string, string> = {
    monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
    thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
  };
  return days.map((d) => short[d] ?? d).join(', ');
}

export default function RequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [requests, setRequests] = useState<BookingRequestType[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Solver state
  const [dateFrom, setDateFrom] = useState('');
  const [dateUntil, setDateUntil] = useState('');
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [solverResult, setSolverResult] = useState<GenerateResult | null>(null);

  const hasProposedEvents = events.some((e) => e.status === 'proposed');

  // Restore solver state from sessionStorage (survives navigation)
  useEffect(() => {
    try {
      const savedResult = sessionStorage.getItem(STORAGE_KEY_RESULT);
      const savedDates = sessionStorage.getItem(STORAGE_KEY_DATES);
      if (savedResult) setSolverResult(JSON.parse(savedResult));
      if (savedDates) {
        const { dateFrom: df, dateUntil: du } = JSON.parse(savedDates);
        setDateFrom(df);
        setDateUntil(du);
      }
    } catch {
      // Corrupted storage — ignore
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [reqs, evts] = await Promise.all([
        fetchBookingRequests(),
        isAdmin ? fetchEvents() : Promise.resolve([]),
      ]);
      setRequests(reqs);
      setEvents(evts);

      // Auto-derive date range from proposed events (fallback if sessionStorage empty)
      const proposed = evts.filter((e: ScheduleEvent) => e.status === 'proposed');
      if (proposed.length > 0) {
        setDateFrom((prev) => {
          if (prev) return prev;
          const dates = proposed.map((e: ScheduleEvent) => e.start_time.split('T')[0]).sort();
          return dates[0];
        });
        setDateUntil((prev) => {
          if (prev) return prev;
          const dates = proposed.map((e: ScheduleEvent) => e.start_time.split('T')[0]).sort();
          return dates[dates.length - 1];
        });
      }
    } catch {
      setError('Failed to load data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (req: BookingRequestType) => {
    if (!window.confirm(`Delete booking request "${req.title}" for ${req.team_name}?`)) return;
    try {
      await deleteBookingRequest(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch {
      alert('Failed to delete request. Please try again.');
    }
  };

  // Solver handlers
  const handleGenerate = async () => {
    if (!dateFrom || !dateUntil) return;
    setGenerating(true);
    setSolverResult(null);
    try {
      const result = await generateSchedule(dateFrom, dateUntil);
      setSolverResult(result);
      // Persist for navigation resilience
      try {
        sessionStorage.setItem(STORAGE_KEY_RESULT, JSON.stringify(result));
        sessionStorage.setItem(STORAGE_KEY_DATES, JSON.stringify({ dateFrom, dateUntil }));
      } catch { /* storage full or disabled */ }
      loadData();
    } catch (err) {
      console.error('Solver error:', err);
      setSolverResult({
        success: false,
        solver_status: 'ERROR',
        solve_time_seconds: 0,
        message: 'An error occurred while running the solver.',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!dateFrom || !dateUntil) return;
    setPublishing(true);
    try {
      await publishSchedule(dateFrom, dateUntil);
      setSolverResult(null);
      sessionStorage.removeItem(STORAGE_KEY_RESULT);
      sessionStorage.removeItem(STORAGE_KEY_DATES);
      loadData();
    } catch (err) {
      console.error('Publish error:', err);
    } finally {
      setPublishing(false);
    }
  };

  const handleDiscard = async () => {
    if (!dateFrom || !dateUntil) return;
    if (!window.confirm('Discard the proposed schedule? This will delete all proposed events and reset requests to pending.')) return;
    setDiscarding(true);
    try {
      await discardSchedule(dateFrom, dateUntil);
      setSolverResult(null);
      sessionStorage.removeItem(STORAGE_KEY_RESULT);
      sessionStorage.removeItem(STORAGE_KEY_DATES);
      setDateFrom('');
      setDateUntil('');
      loadData();
    } catch (err) {
      console.error('Discard error:', err);
    } finally {
      setDiscarding(false);
    }
  };

  // Computed stats
  const totalRequests = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const scheduledCount = requests.filter((r) => r.status === 'scheduled').length;
  const conflictingCount = events.filter((e) => e.status === 'proposed').length;

  // Filtered requests
  const filteredRequests = statusFilter === 'all'
    ? requests
    : requests.filter((r) => r.status === statusFilter);

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
    <div className="req-page">
      <PageHeader
        title="Booking Requests"
        subtitle="Review and manage facility booking requests"
        action={
          <button
            className="btn btn-primary btn-sm req-btn-primary"
            onClick={() => navigate('/requests/new')}
          >
            <Plus size={16} /> New Request
          </button>
        }
      />

      {/* Stat cards */}
      <div className="req-stats">
        <StatCard
          title="Total Requests"
          value={totalRequests}
          icon={<FileText size={20} />}
        />
        <StatCard
          title="Pending"
          value={pendingCount}
          icon={<Clock size={20} />}
          valueColor="var(--cs-blue-600)"
        />
        {isAdmin && (
          <StatCard
            title="Proposed"
            value={conflictingCount}
            icon={<AlertTriangle size={20} />}
            valueColor={conflictingCount > 0 ? 'var(--cs-orange-600)' : undefined}
          />
        )}
        <StatCard
          title="Scheduled"
          value={scheduledCount}
          icon={<CheckCircle2 size={20} />}
          valueColor="var(--cs-green-600)"
        />
      </div>

      {/* Solver controls — admin only */}
      {isAdmin && (
        <div className="req-solver">
          <div className="req-solver-dates">
            <label className="req-solver-label">
              From
              <input
                type="date"
                className="req-solver-input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </label>
            <label className="req-solver-label">
              To
              <input
                type="date"
                className="req-solver-input"
                value={dateUntil}
                onChange={(e) => setDateUntil(e.target.value)}
              />
            </label>
          </div>
          <div className="req-solver-buttons">
            <button
              className="req-solver-btn req-solver-btn--generate"
              onClick={handleGenerate}
              disabled={generating || !dateFrom || !dateUntil}
            >
              {generating ? 'Generating...' : 'Run Solver'}
            </button>
            {hasProposedEvents && (
              <>
                <button
                  className="req-solver-btn req-solver-btn--discard"
                  onClick={handleDiscard}
                  disabled={discarding}
                >
                  {discarding ? 'Discarding...' : 'Discard'}
                </button>
                <button
                  className="req-solver-btn req-solver-btn--publish"
                  onClick={handlePublish}
                  disabled={publishing}
                >
                  {publishing ? 'Publishing...' : 'Publish'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Solver result banner */}
      {solverResult && (
        <div className={`req-solver-banner ${solverResult.success ? 'req-solver-banner--success' : 'req-solver-banner--error'}`}>
          <span>
            {solverResult.success
              ? `${solverResult.solver_status}: Created ${solverResult.events_created} events from ${solverResult.requests_processed} requests (${solverResult.solve_time_seconds}s)`
              : solverResult.message || `${solverResult.solver_status}: Could not generate a schedule.`
            }
          </span>
          <button className="req-solver-dismiss" onClick={() => {
            setSolverResult(null);
            sessionStorage.removeItem(STORAGE_KEY_RESULT);
          }}>
            &times;
          </button>
        </div>
      )}

      {/* Solver review panel */}
      {solverResult?.success && solverResult.schedule_diff && solverResult.schedule_diff.length > 0 && (
        <SolverReviewPanel
          diff={solverResult.schedule_diff}
          onDiscard={handleDiscard}
          discarding={discarding}
        />
      )}

      {error && <div className="req-error">{error}</div>}

      {/* Request table */}
      <div className="req-table-card">
        <div className="req-table-header">
          <h2 className="req-table-title">All Requests</h2>
          <select
            className="req-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="partial">Partial</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="req-empty">
            No {statusFilter !== 'all' ? statusFilter : ''} requests found.
          </div>
        ) : (
          <div className="req-table-wrap">
            <table className="req-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Facility Preference</th>
                  <th>Date / Time</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <div className="req-cell-team">{req.team_name || req.team}</div>
                      <div className="req-cell-type">
                        {EVENT_TYPE_LABELS[req.event_type] ?? req.event_type}
                      </div>
                    </td>
                    <td>
                      {req.preferred_facility ? (
                        <StatusBadge status={req.preferred_facility} colorMap={{
                          [req.preferred_facility]: { bg: 'var(--cs-gray-100)', text: 'var(--cs-gray-700)' },
                        }} />
                      ) : (
                        <span className="req-cell-muted">Any</span>
                      )}
                    </td>
                    <td>
                      <div className="req-cell-datetime">
                        {req.recurrence === 'once' && req.target_date
                          ? new Date(req.target_date + 'T00:00').toLocaleDateString('en-IE', {
                              weekday: 'short', day: 'numeric', month: 'short',
                            })
                          : formatDays(req.preferred_days)
                        }
                      </div>
                      <div className="req-cell-time">
                        {req.preferred_time_start}–{req.preferred_time_end} &middot; {req.duration_minutes}min
                      </div>
                    </td>
                    <td>
                      <span style={{ color: PRIORITY_COLORS[req.priority], fontWeight: 600, fontSize: '0.8rem' }}>
                        {PRIORITY_LABELS[req.priority] ?? req.priority}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={req.status} />
                    </td>
                    <td>
                      <div className="req-actions">
                        <Link to={`/requests/${req.id}`} className="req-btn-review">
                          Review
                        </Link>
                        <button
                          className="req-btn-delete"
                          onClick={() => handleDelete(req)}
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
