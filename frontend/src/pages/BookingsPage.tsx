import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { fetchBookingRequests, deleteBookingRequest } from "../api/requests";
import type { BookingRequestType } from "../types/types";
import { EVENT_TYPE_LABELS } from "../types/types";
import "./BookingsPage.css";

const STATUS_CONFIG: Record<
  BookingRequestType["status"],
  { label: string; className: string }
> = {
  pending:   { label: "Pending",   className: "bp-badge--pending" },
  scheduled: { label: "Scheduled", className: "bp-badge--scheduled" },
  partial:   { label: "Partial",   className: "bp-badge--partial" },
  rejected:  { label: "Rejected",  className: "bp-badge--rejected" },
};

const PRIORITY_LABELS: Record<1 | 2 | 3, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
};

function formatDays(days: string[]): string {
  if (days.length === 0) return "—";
  const short: Record<string, string> = {
    monday: "Mon", tuesday: "Tue", wednesday: "Wed",
    thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun",
  };
  return days.map((d) => short[d] ?? d).join(", ");
}

export default function BookingsPage() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState<BookingRequestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRequests(await fetchBookingRequests());
    } catch {
      setError("Failed to load booking requests. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (req: BookingRequestType) => {
    if (!window.confirm(`Delete booking request "${req.title}" for ${req.team_name}?`)) return;
    try {
      await deleteBookingRequest(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch {
      alert("Failed to delete request. Please try again.");
    }
  };

  return (
    <div className="bp-page">
      {/* ── Header ── */}
      <div className="bp-header">
        <div>
          <h1 className="bp-title">Booking Requests</h1>
          <p className="bp-subtitle">
            Submit and manage facility booking requests for the scheduler.
          </p>
        </div>
        <button className="bp-btn-new" onClick={() => navigate("/bookings/new")}>
          + New Booking Request
        </button>
      </div>

      {/* ── States ── */}
      {loading && <div className="bp-state">Loading requests…</div>}
      {!loading && error && <div className="bp-state bp-state--error">{error}</div>}

      {!loading && !error && requests.length === 0 && (
        <div className="bp-empty">
          <div className="bp-empty-icon">📋</div>
          <p>No booking requests yet.</p>
          <p>Click <strong>+ New Booking Request</strong> to get started.</p>
        </div>
      )}

      {!loading && !error && requests.length > 0 && (
        <div className="bp-table-wrap">
          <table className="bp-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Title</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Recurrence</th>
                <th>Preferred Days</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const statusCfg = STATUS_CONFIG[req.status] ?? {
                  label: req.status,
                  className: "",
                };
                return (
                  <tr key={req.id}>
                    <td className="bp-cell-team">{req.team_name || req.team}</td>
                    <td className="bp-cell-title">
                      <Link to={`/bookings/${req.id}`} className="bp-link-title">
                        {req.title}
                      </Link>
                    </td>
                    <td>{EVENT_TYPE_LABELS[req.event_type] ?? req.event_type}</td>
                    <td>{req.duration_minutes} min</td>
                    <td className="bp-cell-recurrence">
                      {req.recurrence === "weekly" ? "Weekly" : "One-time"}
                    </td>
                    <td>{formatDays(req.preferred_days)}</td>
                    <td>{PRIORITY_LABELS[req.priority] ?? req.priority}</td>
                    <td>
                      <span className={`bp-badge ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td>
                      <button
                        className="bp-btn-delete"
                        onClick={() => handleDelete(req)}
                        title="Delete request"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
