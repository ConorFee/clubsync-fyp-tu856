import { useState, useEffect } from 'react';
import { fetchEvents } from '../api/events';
import { fetchBookingRequests } from '../api/requests';
import { fetchFacilities } from '../api/facilities';
import { fetchTeams } from '../api/teams';
import type { ScheduleEvent, BookingRequestType, FacilityType, TeamType } from '../types/types';
import PageHeader from '../components/common/PageHeader';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import {
  CalendarDays,
  Building2,
  CheckCircle2,
  Users,
} from 'lucide-react';
import './ReportsPage.css';

export default function ReportsPage() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [requests, setRequests] = useState<BookingRequestType[]>([]);
  const [facilities, setFacilities] = useState<FacilityType[]>([]);
  const [teams, setTeams] = useState<TeamType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [evts, reqs, facs, tms] = await Promise.all([
          fetchEvents(),
          fetchBookingRequests(),
          fetchFacilities(),
          fetchTeams(),
        ]);
        setEvents(evts);
        setRequests(reqs);
        setFacilities(facs);
        setTeams(tms);
      } catch (err) {
        console.error('Error loading report data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Computed stats
  const activeEvents = events.filter((e) => e.status === 'published' || e.status === 'proposed');
  const totalBookings = activeEvents.length;

  const scheduledRequests = requests.filter((r) => r.status === 'scheduled').length;
  const approvalRate = requests.length > 0
    ? Math.round((scheduledRequests / requests.length) * 100)
    : 0;

  const facilitiesUsed = new Set(activeEvents.map((e) => e.facility)).size;
  const facilityUsage = facilities.length > 0
    ? Math.round((facilitiesUsed / facilities.length) * 100)
    : 0;

  const activeTeams = teams.length;

  // Request status breakdown
  const statusCounts = {
    total: requests.length,
    scheduled: requests.filter((r) => r.status === 'scheduled').length,
    pending: requests.filter((r) => r.status === 'pending').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  // Facility utilization: events per facility
  const facilityEventCounts: Record<string, number> = {};
  activeEvents.forEach((e) => {
    const name = e.facility ?? 'Unknown';
    facilityEventCounts[name] = (facilityEventCounts[name] || 0) + 1;
  });
  const maxFacilityEvents = Math.max(...Object.values(facilityEventCounts), 1);

  // Bookings by team
  const teamEventCounts: Record<string, number> = {};
  activeEvents.forEach((e) => {
    const name = e.team_name || e.team || 'Unassigned';
    teamEventCounts[name] = (teamEventCounts[name] || 0) + 1;
  });
  const sortedTeamEvents = Object.entries(teamEventCounts).sort((a, b) => b[1] - a[1]);

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
    <div className="rpt-page">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Track facility usage and booking patterns"
      />

      {/* Stat cards */}
      <div className="rpt-stats">
        <StatCard
          title="Total Bookings"
          value={totalBookings}
          subtitle="+12% from last period"
          icon={<CalendarDays size={20} />}
        />
        <StatCard
          title="Facility Usage"
          value={`${facilityUsage}%`}
          subtitle={`${facilitiesUsed} of ${facilities.length} facilities`}
          icon={<Building2 size={20} />}
        />
        <StatCard
          title="Approval Rate"
          value={`${approvalRate}%`}
          subtitle={`${scheduledRequests} of ${requests.length} requests`}
          icon={<CheckCircle2 size={20} />}
          valueColor="var(--cs-green-600)"
        />
        <StatCard
          title="Active Teams"
          value={activeTeams}
          icon={<Users size={20} />}
        />
      </div>

      {/* Request Status Breakdown */}
      <div className="rpt-card">
        <h2 className="rpt-card__title">Request Status Breakdown</h2>
        <div className="rpt-status-row">
          <div className="rpt-status-chip rpt-status-chip--total">
            <span className="rpt-status-count">{statusCounts.total}</span>
            <span className="rpt-status-label">Total</span>
          </div>
          <div className="rpt-status-chip rpt-status-chip--scheduled">
            <span className="rpt-status-count">{statusCounts.scheduled}</span>
            <span className="rpt-status-label">Scheduled</span>
          </div>
          <div className="rpt-status-chip rpt-status-chip--pending">
            <span className="rpt-status-count">{statusCounts.pending}</span>
            <span className="rpt-status-label">Pending</span>
          </div>
          <div className="rpt-status-chip rpt-status-chip--rejected">
            <span className="rpt-status-count">{statusCounts.rejected}</span>
            <span className="rpt-status-label">Rejected</span>
          </div>
        </div>
      </div>

      {/* Two-column: Facility Utilization + Bookings by Team */}
      <div className="rpt-grid">
        {/* Facility Utilization */}
        <div className="rpt-card">
          <h2 className="rpt-card__title">Facility Utilization</h2>
          {facilities.length === 0 ? (
            <p className="rpt-card__empty">No facilities found.</p>
          ) : (
            <div className="rpt-bar-list">
              {facilities.map((fac) => {
                const count = facilityEventCounts[fac.name] || 0;
                const pct = Math.round((count / maxFacilityEvents) * 100);
                return (
                  <div key={fac.id} className="rpt-bar-item">
                    <div className="rpt-bar-label">
                      <span className="rpt-bar-name">{fac.name}</span>
                      <span className="rpt-bar-count">{count} bookings</span>
                    </div>
                    <div className="rpt-bar-track">
                      <div
                        className="rpt-bar-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bookings by Team */}
        <div className="rpt-card">
          <h2 className="rpt-card__title">Bookings by Team</h2>
          {sortedTeamEvents.length === 0 ? (
            <p className="rpt-card__empty">No bookings found.</p>
          ) : (
            <div className="rpt-team-table-wrap">
              <table className="rpt-team-table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Bookings</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTeamEvents.map(([name, count]) => (
                    <tr key={name}>
                      <td className="rpt-team-name">{name}</td>
                      <td>{count}</td>
                      <td><StatusBadge status="active" colorMap={{ active: { bg: 'var(--cs-green-100)', text: 'var(--cs-green-600)' } }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
