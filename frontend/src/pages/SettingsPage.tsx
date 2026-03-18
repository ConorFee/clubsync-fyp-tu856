import { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import { Users, Sliders, Link2 } from 'lucide-react';
import './SettingsPage.css';

type Tab = 'users' | 'config' | 'integrations';

const MOCK_USERS = [
  { id: 1, name: 'Admin User', email: 'admin@clubsync.ie', role: 'admin', team: '—', status: 'active' },
  { id: 2, name: 'Coach User', email: 'coach@clubsync.ie', role: 'coach', team: 'U14 Boys', status: 'active' },
  { id: 3, name: 'Viewer User', email: 'viewer@clubsync.ie', role: 'viewer', team: '—', status: 'active' },
];

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin:  { bg: 'var(--cs-red-100)',    text: 'var(--cs-red-600)' },
  coach:  { bg: 'var(--cs-blue-100)',   text: 'var(--cs-blue-700)' },
  viewer: { bg: 'var(--cs-gray-100)',   text: 'var(--cs-gray-600)' },
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users');

  return (
    <div className="set-page">
      <PageHeader
        title="Settings"
        subtitle="Manage users, club configuration, and integrations"
      />

      {/* Tab navigation */}
      <div className="set-tabs">
        <button
          className={`set-tab ${activeTab === 'users' ? 'set-tab--active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} /> User Management
        </button>
        <button
          className={`set-tab ${activeTab === 'config' ? 'set-tab--active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          <Sliders size={16} /> Club Configuration
        </button>
        <button
          className={`set-tab ${activeTab === 'integrations' ? 'set-tab--active' : ''}`}
          onClick={() => setActiveTab('integrations')}
        >
          <Link2 size={16} /> Integrations
        </button>
      </div>

      {/* Tab content */}
      <div className="set-content">
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'config' && <ConfigTab />}
        {activeTab === 'integrations' && <IntegrationsTab />}
      </div>
    </div>
  );
}

/* ── Tab 1: User Management ── */
function UsersTab() {
  return (
    <div className="set-card">
      <div className="set-card__header">
        <h2 className="set-card__title">Users</h2>
      </div>
      <div className="set-table-wrap">
        <table className="set-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Team</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_USERS.map((u) => (
              <tr key={u.id}>
                <td className="set-cell-name">{u.name}</td>
                <td className="set-cell-email">{u.email}</td>
                <td>
                  <StatusBadge status={u.role} colorMap={ROLE_COLORS} />
                </td>
                <td>{u.team}</td>
                <td>
                  <StatusBadge status={u.status} colorMap={{
                    active: { bg: 'var(--cs-green-100)', text: 'var(--cs-green-600)' },
                  }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Tab 2: Club Configuration ── */
function ConfigTab() {
  return (
    <div className="set-config-grid">
      {/* Booking Rules */}
      <div className="set-card">
        <h2 className="set-card__title">Booking Rules</h2>
        <div className="set-form-group">
          <label className="set-label">Default Session Duration</label>
          <select className="set-input" defaultValue="60">
            <option value="60">60 minutes</option>
            <option value="90">90 minutes</option>
            <option value="120">120 minutes</option>
          </select>
        </div>
        <div className="set-form-group">
          <label className="set-label">Max Sessions Per Team / Week</label>
          <input className="set-input" type="number" defaultValue={3} />
        </div>
        <div className="set-form-group">
          <label className="set-label">Advance Booking Period</label>
          <select className="set-input" defaultValue="4">
            <option value="2">2 weeks</option>
            <option value="4">4 weeks</option>
            <option value="8">8 weeks</option>
          </select>
        </div>
        <button className="set-btn-save" disabled>Save Changes</button>
      </div>

      {/* Solver Configuration */}
      <div className="set-card">
        <h2 className="set-card__title">Solver Configuration</h2>
        <div className="set-form-group">
          <label className="set-label">Preferred Facility Weight</label>
          <input className="set-input" type="range" min={0} max={200} defaultValue={100} />
          <span className="set-range-value">100</span>
        </div>
        <div className="set-form-group">
          <label className="set-label">Preferred Time Weight</label>
          <input className="set-input" type="range" min={0} max={200} defaultValue={60} />
          <span className="set-range-value">60</span>
        </div>
        <div className="set-form-group">
          <label className="set-label">Usual Slot Weight (Strict)</label>
          <input className="set-input" type="range" min={0} max={400} defaultValue={200} />
          <span className="set-range-value">200</span>
        </div>
        <div className="set-form-group">
          <label className="set-label">Younger-Earlier Weight</label>
          <input className="set-input" type="range" min={0} max={100} defaultValue={30} />
          <span className="set-range-value">30</span>
        </div>
        <button className="set-btn-save" disabled>Save Changes</button>
      </div>
    </div>
  );
}

/* ── Tab 3: Integrations ── */
function IntegrationsTab() {
  const [toggles, setToggles] = useState({
    google: false,
    outlook: false,
    ical: true,
    confirmations: true,
    reminders: true,
    statusUpdates: false,
  });

  const toggle = (key: keyof typeof toggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="set-config-grid">
      {/* Calendar Sync */}
      <div className="set-card">
        <h2 className="set-card__title">Calendar Sync</h2>
        <p className="set-card__desc">Connect external calendars to sync bookings automatically.</p>
        <div className="set-toggle-list">
          <ToggleRow label="Google Calendar" checked={toggles.google} onChange={() => toggle('google')} />
          <ToggleRow label="Outlook Calendar" checked={toggles.outlook} onChange={() => toggle('outlook')} />
          <ToggleRow label="iCal Export" checked={toggles.ical} onChange={() => toggle('ical')} />
        </div>
      </div>

      {/* Email Notifications */}
      <div className="set-card">
        <h2 className="set-card__title">Email Notifications</h2>
        <p className="set-card__desc">Configure which email notifications are sent to users.</p>
        <div className="set-toggle-list">
          <ToggleRow label="Booking Confirmations" checked={toggles.confirmations} onChange={() => toggle('confirmations')} />
          <ToggleRow label="Schedule Reminders" checked={toggles.reminders} onChange={() => toggle('reminders')} />
          <ToggleRow label="Status Updates" checked={toggles.statusUpdates} onChange={() => toggle('statusUpdates')} />
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="set-toggle-row">
      <span className="set-toggle-label">{label}</span>
      <button
        className={`set-toggle ${checked ? 'set-toggle--on' : ''}`}
        onClick={onChange}
        role="switch"
        aria-checked={checked}
      >
        <span className="set-toggle-knob" />
      </button>
    </div>
  );
}
