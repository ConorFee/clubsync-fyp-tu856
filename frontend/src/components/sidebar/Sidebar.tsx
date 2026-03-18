import "./Sidebar.css";
import type { ScheduleEvent } from "../../types/types";

interface SidebarProps {
  onRefresh: () => void;
  events: ScheduleEvent[];
  selectedFacility: string;
  onSelectFacility: (name: string) => void;
  onEditEvent?: (event: ScheduleEvent) => void;
  onDeleteEvent?: (id: number) => void;
}

export default function Sidebar({
  onRefresh,
  events,
  selectedFacility,
  onSelectFacility,
  onEditEvent,
  onDeleteEvent,
}: SidebarProps) {
  
  const facilityOptions = ["All", "Main Pitch", "Training Pitch", "Hall", "Gym"];

  return (
    <div className="sidebar-container">
      <h2 className="sidebar-title">Facility Bookings</h2>

      <div className="sidebar-filter-section">
        <label className="filter-label">Filters</label>

        <select
          className="facility-dropdown"
          value={selectedFacility}
          onChange={(e) => onSelectFacility(e.target.value)}
        >
          {facilityOptions.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        <button className="sidebar-refresh-btn" onClick={onRefresh}>
          Refresh Events
        </button>
      </div>

      {/* --- Event Cards --- */}
      <div className="event-list">
        {events.length === 0 && (
          <p className="no-events">No events for this facility.</p>
        )}

        {events.map((ev) => (
          <div key={ev.id} className="event-card">
            <div className="event-title">{ev.title}</div>

            <div className="event-meta">
              <span className="event-status">
                <span
                  className="event-status-dot"
                  style={{ background: ev.is_fixed ? '#c62828' : ev.status === 'published' ? '#2e7d32' : ev.status === 'proposed' ? '#e65100' : '#757575' }}
                />
                {ev.is_fixed ? 'Fixed' : ev.status.charAt(0).toUpperCase() + ev.status.slice(1)}
              </span>
              <span>•</span>
              <span>{ev.facility.name}</span>
            </div>

            <div className="event-actions">
              {onEditEvent && (
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => onEditEvent(ev)}
                >
                  Edit
                </button>
              )}
              {onDeleteEvent && (
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => onDeleteEvent(ev.id)}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
