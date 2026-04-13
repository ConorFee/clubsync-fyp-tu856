import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  fetchBookingRequest,
  createBookingRequest,
  updateBookingRequest,
} from "../api/requests";
import { fetchTeams } from "../api/teams";
import { fetchFacilities } from "../api/facilities";
import type {
  BookingRequestType,
  CreateBookingRequestPayload,
  EventTypeChoice,
  FacilityType,
  TeamType,
} from "../types/types";
import { EVENT_TYPE_LABELS, EVENT_TYPE_DURATIONS } from "../types/types";
import "./BookingRequestForm.css";

const DAYS = [
  { value: "monday",    label: "Mon" },
  { value: "tuesday",   label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday",  label: "Thu" },
  { value: "friday",    label: "Fri" },
  { value: "saturday",  label: "Sat" },
  { value: "sunday",    label: "Sun" },
];

const today = new Date().toISOString().split("T")[0];
const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

const initialFormData = {
  team: "",
  title: "",
  eventType: "other" as EventTypeChoice,
  durationMinutes: 60,
  recurrence: "weekly" as "once" | "weekly",
  preferredFacility: "",
  anyFacility: false,
  preferredDays: [] as string[],
  targetDate: "",
  preferredTimeStart: "18:00",
  preferredTimeEnd: "20:00",
  scheduleFrom: today,
  scheduleUntil: nextMonth,
};

export default function BookingRequestForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCoach = user?.role === 'coach';
  const isEditMode = !!id;

  const [formData, setFormData] = useState(initialFormData);
  const [teams, setTeams] = useState<TeamType[]>([]);
  const [facilities, setFacilities] = useState<FacilityType[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const [tms, facs] = await Promise.all([fetchTeams(), fetchFacilities()]);
        setTeams(tms);
        setFacilities(facs);

        if (isEditMode && id) {
          const req: BookingRequestType = await fetchBookingRequest(Number(id));
          setFormData({
            team: req.team,
            title: req.title,
            eventType: req.event_type,
            durationMinutes: req.duration_minutes,
            recurrence: req.recurrence,
            preferredFacility: req.preferred_facility || "",
            anyFacility: !req.preferred_facility,
            preferredDays: req.preferred_days,
            targetDate: req.target_date || "",
            preferredTimeStart: req.preferred_time_start,
            preferredTimeEnd: req.preferred_time_end,
            scheduleFrom: req.schedule_from,
            scheduleUntil: req.schedule_until,
          });
        } else if (isCoach && user?.team) {
          setFormData((prev) => ({ ...prev, team: user.team! }));
        }
      } catch {
        setPageError("Failed to load data. Is the backend running?");
      } finally {
        setPageLoading(false);
      }
    };

    init();
  }, [id, isEditMode]);

  const handleEventTypeChange = (type: EventTypeChoice) => {
    const duration = EVENT_TYPE_DURATIONS[type];
    setFormData({
      ...formData,
      eventType: type,
      durationMinutes: duration ?? formData.durationMinutes,
    });
  };

  const toggleDay = (day: string) => {
    const days = formData.preferredDays.includes(day)
      ? formData.preferredDays.filter((d) => d !== day)
      : [...formData.preferredDays, day];
    setFormData({ ...formData, preferredDays: days });
  };

  const validate = (): boolean => {
    if (!formData.team) {
      setError("Please select a team"); return false;
    }
    if (!formData.title.trim()) {
      setError("Title is required"); return false;
    }
    if (formData.durationMinutes <= 0) {
      setError("Duration must be greater than 0"); return false;
    }

    if (formData.recurrence === "weekly") {
      if (formData.preferredDays.length === 0) {
        setError("Please select at least one training day"); return false;
      }
      if (!formData.scheduleFrom || !formData.scheduleUntil) {
        setError("Please set a schedule period"); return false;
      }
      if (formData.scheduleFrom > formData.scheduleUntil) {
        setError("Schedule end date must be after start date"); return false;
      }
    } else {
      if (!formData.targetDate) {
        setError("Please select an event date"); return false;
      }
    }

    if (!formData.preferredTimeStart || !formData.preferredTimeEnd) {
      setError("Please set a preferred time window"); return false;
    }
    if (formData.preferredTimeStart >= formData.preferredTimeEnd) {
      setError("Preferred end time must be after start time"); return false;
    }

    // Time window vs duration check
    const [sh, sm] = formData.preferredTimeStart.split(":").map(Number);
    const [eh, em] = formData.preferredTimeEnd.split(":").map(Number);
    const windowMinutes = (eh * 60 + em) - (sh * 60 + sm);
    if (windowMinutes < formData.durationMinutes) {
      setError(`Time window (${windowMinutes} min) is shorter than the requested duration (${formData.durationMinutes} min)`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    const payload: CreateBookingRequestPayload = {
      team: formData.team,
      title: formData.title,
      event_type: formData.eventType,
      duration_minutes: formData.durationMinutes,
      recurrence: formData.recurrence,
      preferred_facility: formData.anyFacility ? null : formData.preferredFacility || null,
      preferred_time_start: formData.preferredTimeStart,
      preferred_time_end: formData.preferredTimeEnd,
      ...(formData.recurrence === "weekly"
        ? {
            preferred_days: formData.preferredDays,
            target_date: null,
            schedule_from: formData.scheduleFrom,
            schedule_until: formData.scheduleUntil,
          }
        : {
            preferred_days: [],
            target_date: formData.targetDate,
            schedule_from: formData.targetDate,
            schedule_until: formData.targetDate,
          }),
    };

    setSaving(true);
    try {
      if (isEditMode && id) {
        await updateBookingRequest(Number(id), payload);
      } else {
        await createBookingRequest(payload);
      }
      navigate("/bookings");
    } catch (err: any) {
      const msg =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        Object.values(err.response?.data || {})[0] ||
        "Failed to save request. Please try again.";
      setError(String(msg));
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="brf-page">
        <div className="brf-state">Loading…</div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="brf-page">
        <div className="brf-state brf-state--error">{pageError}</div>
      </div>
    );
  }

  return (
    <div className="brf-page">
      {/* ── Breadcrumb ── */}
      <nav className="brf-breadcrumb">
        <Link to="/bookings" className="brf-breadcrumb-link">Bookings</Link>
        <span className="brf-breadcrumb-sep">›</span>
        <span className="brf-breadcrumb-current">
          {isEditMode ? "Edit Request" : "New Request"}
        </span>
      </nav>

      <h1 className="brf-title">
        {isEditMode ? "Edit Booking Request" : "New Booking Request"}
      </h1>

      {/* ── Form card ── */}
      <div className="brf-card">
        <form onSubmit={handleSubmit}>

          {/* ── Section: Request Details ── */}
          <div className="brf-section-label">Request Details</div>

          <div className="brf-grid-2">
            <div className="brf-field">
              <label htmlFor="brf-team">Team <span className="brf-req">*</span></label>
              <select
                id="brf-team"
                value={formData.team}
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                disabled={isCoach && !!user?.team}
              >
                <option value="">Select a team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="brf-field">
              <label htmlFor="brf-event-type">Event Type <span className="brf-req">*</span></label>
              <select
                id="brf-event-type"
                value={formData.eventType}
                onChange={(e) => handleEventTypeChange(e.target.value as EventTypeChoice)}
              >
                {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                    {EVENT_TYPE_DURATIONS[value as EventTypeChoice]
                      ? ` (${EVENT_TYPE_DURATIONS[value as EventTypeChoice]} min)`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="brf-grid-2">
            <div className="brf-field">
              <label htmlFor="brf-title">Title <span className="brf-req">*</span></label>
              <input
                id="brf-title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Weekly Training"
              />
            </div>

            <div className="brf-field">
              <label htmlFor="brf-duration">Duration (min) <span className="brf-req">*</span></label>
              <input
                id="brf-duration"
                type="number"
                min={15}
                max={300}
                value={formData.durationMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, durationMinutes: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="brf-field">
            <label>Recurrence <span className="brf-req">*</span></label>
            <div className="brf-radio-group">
              {[{ value: "weekly", label: "Weekly" }, { value: "once", label: "One-time" }].map(
                (opt) => (
                  <label key={opt.value} className="brf-radio-label">
                    <input
                      type="radio"
                      name="recurrence"
                      value={opt.value}
                      checked={formData.recurrence === opt.value}
                      onChange={() => {
                        const r = opt.value as "once" | "weekly";
                        setFormData({
                          ...formData,
                          recurrence: r,
                          ...(r === "once"
                            ? { preferredDays: [], targetDate: "" }
                            : { targetDate: "" }),
                        });
                      }}
                    />
                    {opt.label}
                  </label>
                )
              )}
            </div>
          </div>

          {/* ── Section: Preferences ── */}
          <div className="brf-section-label">Preferences (Soft Constraints)</div>

          <div className="brf-field">
            <label htmlFor="brf-facility">Preferred Facility</label>
            <select
              id="brf-facility"
              value={formData.preferredFacility}
              onChange={(e) =>
                setFormData({ ...formData, preferredFacility: e.target.value, anyFacility: false })
              }
              disabled={formData.anyFacility}
            >
              <option value="">Select a facility</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.name}>{f.name}</option>
              ))}
            </select>
            <label className="brf-checkbox-label">
              <input
                type="checkbox"
                checked={formData.anyFacility}
                onChange={(e) =>
                  setFormData({ ...formData, anyFacility: e.target.checked, preferredFacility: "" })
                }
              />
              Any suitable facility
            </label>
          </div>

          {formData.recurrence === "weekly" ? (
            <div className="brf-field">
              <label>Training Days <span className="brf-req">*</span></label>
              <div className="brf-days">
                {DAYS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    className={`brf-day-btn ${
                      formData.preferredDays.includes(d.value) ? "brf-day-btn--active" : ""
                    }`}
                    onClick={() => toggleDay(d.value)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="brf-field">
              <label htmlFor="brf-target-date">Event Date <span className="brf-req">*</span></label>
              <input
                id="brf-target-date"
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
              />
            </div>
          )}

          <div className="brf-grid-2">
            <div className="brf-field">
              <label htmlFor="brf-time-start">Earliest Start <span className="brf-req">*</span></label>
              <input
                id="brf-time-start"
                type="time"
                value={formData.preferredTimeStart}
                onChange={(e) =>
                  setFormData({ ...formData, preferredTimeStart: e.target.value })
                }
              />
            </div>
            <div className="brf-field">
              <label htmlFor="brf-time-end">Latest End <span className="brf-req">*</span></label>
              <input
                id="brf-time-end"
                type="time"
                value={formData.preferredTimeEnd}
                onChange={(e) =>
                  setFormData({ ...formData, preferredTimeEnd: e.target.value })
                }
              />
            </div>
          </div>

          {/* ── Section: Schedule Period (weekly only) ── */}
          {formData.recurrence === "weekly" && (
            <>
              <div className="brf-section-label">Schedule Period</div>

              <div className="brf-grid-2">
                <div className="brf-field">
                  <label htmlFor="brf-from">From <span className="brf-req">*</span></label>
                  <input
                    id="brf-from"
                    type="date"
                    value={formData.scheduleFrom}
                    onChange={(e) => setFormData({ ...formData, scheduleFrom: e.target.value })}
                  />
                </div>
                <div className="brf-field">
                  <label htmlFor="brf-until">Until <span className="brf-req">*</span></label>
                  <input
                    id="brf-until"
                    type="date"
                    value={formData.scheduleUntil}
                    onChange={(e) => setFormData({ ...formData, scheduleUntil: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Error ── */}
          {error && (
            <div className="brf-error">
              <span>⚠</span> {error}
            </div>
          )}

          {/* ── Actions ── */}
          <div className="brf-actions">
            <button
              type="button"
              className="brf-btn-cancel"
              onClick={() => navigate("/bookings")}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="brf-btn-submit" disabled={saving}>
              {saving ? "Saving…" : isEditMode ? "Update Request" : "Submit Request"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
