import { useState, useEffect } from "react";
import { createEvent, updateEvent } from "../api/events";
import type { EventType, FacilityType, CreateEventPayload, EventTypeChoice } from "../types/types";
import { EVENT_TYPE_LABELS, EVENT_TYPE_DURATIONS } from "../types/types";
import "./EventFormModal.css";

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  event?: EventType;
  facilities: FacilityType[];
}

// Initial empty form state
const initialFormData = {
  eventType: "other" as EventTypeChoice,
  title: "",
  facility: "",
  startDate: new Date().toISOString().split("T")[0], // Today's date
  startTime: "18:00",
  endDate: new Date().toISOString().split("T")[0],
  endTime: "19:30",
  teamName: "",
  isFixed: false,
};

export default function EventFormModal({
  isOpen,
  onClose,
  onSave,
  event,
  facilities,
}: EventFormModalProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditMode = !!event;

  // Populate form when editing an existing event
  useEffect(() => {
    if (event) {
      // Parse ISO datetime into separate date and time
      const startDate = new Date(event.start_time);
      const endDate = new Date(event.end_time);

      setFormData({
        eventType: event.event_type || "other",
        title: event.title,
        facility: event.facility.name, // Extract name from facility object
        startDate: startDate.toISOString().split("T")[0],
        startTime: startDate.toTimeString().slice(0, 5),
        endDate: endDate.toISOString().split("T")[0],
        endTime: endDate.toTimeString().slice(0, 5),
        teamName: event.team_name || "",
        isFixed: event.is_fixed,
      });
      setError(""); // Clear any previous errors
    } else {
      // Reset form for create mode
      setFormData(initialFormData);
      setError("");
    }
  }, [event]);

  // Client-side validation
  const validate = (): boolean => {
    if (!formData.title.trim()) {
      setError("Title is required");
      return false;
    }

    if (!formData.facility) {
      setError("Please select a facility");
      return false;
    }

    // Check that end time is after start time
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

    if (endDateTime <= startDateTime) {
      setError("End time must be after start time");
      return false;
    }

    return true;
  };

  // Auto-fill end time when event type changes
  const handleEventTypeChange = (type: EventTypeChoice) => {
    const duration = EVENT_TYPE_DURATIONS[type];
    if (duration && formData.startTime) {
      const [hours, mins] = formData.startTime.split(":").map(Number);
      const startMinutes = hours * 60 + mins;
      const endMinutes = startMinutes + duration;
      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;
      const endTime = `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;
      setFormData({ ...formData, eventType: type, endTime, endDate: formData.startDate });
    } else {
      setFormData({ ...formData, eventType: type });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous error
    setError("");

    // Validate form
    if (!validate()) {
      return;
    }

    // Convert form data to API payload format
    const payload: CreateEventPayload = {
      title: formData.title,
      start_time: `${formData.startDate}T${formData.startTime}:00Z`, // ISO format
      end_time: `${formData.endDate}T${formData.endTime}:00Z`,
      facility: formData.facility, // Facility NAME (not ID)
      is_fixed: formData.isFixed,
      team_name: formData.teamName || undefined,
      event_type: formData.eventType,
    };

    setLoading(true);

    try {
      if (isEditMode && event) {
        // Update existing event
        await updateEvent(event.id, payload);
      } else {
        // Create new event
        await createEvent(payload);
      }

      // Success - close modal and refresh calendar
      onSave();
      onClose();
    } catch (err: any) {
      // Handle API errors
      const errorMessage =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        "Failed to save event. Please try again.";

      setError(errorMessage);
      // Modal stays open so user can fix the issue
    } finally {
      setLoading(false);
    }
  };

  // Handle overlay click (click outside modal to close)
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Don't render if modal is not open
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        {/* Header */}
        <div className="modal-header">
          <h2>{isEditMode ? "Edit Event" : "Create Event"}</h2>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Event Type */}
          <div className="form-group">
            <label htmlFor="eventType">
              Event Type <span className="required">*</span>
            </label>
            <select
              id="eventType"
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

          {/* Title */}
          <div className="form-group">
            <label htmlFor="title">
              Title <span className="required">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="e.g., U14 Football Training"
            />
          </div>

          {/* Facility */}
          <div className="form-group">
            <label htmlFor="facility">
              Facility <span className="required">*</span>
            </label>
            <select
              id="facility"
              value={formData.facility}
              onChange={(e) =>
                setFormData({ ...formData, facility: e.target.value })
              }
            >
              <option value="">Select a facility</option>
              {facilities.map((facility) => (
                <option key={facility.id} value={facility.name}>
                  {facility.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date & Time */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">
                Start Date <span className="required">*</span>
              </label>
              <input
                type="date"
                id="startDate"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label htmlFor="startTime">
                Start Time <span className="required">*</span>
              </label>
              <input
                type="time"
                id="startTime"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
              />
            </div>
          </div>

          {/* End Date & Time */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="endDate">
                End Date <span className="required">*</span>
              </label>
              <input
                type="date"
                id="endDate"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label htmlFor="endTime">
                End Time <span className="required">*</span>
              </label>
              <input
                type="time"
                id="endTime"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({ ...formData, endTime: e.target.value })
                }
              />
            </div>
          </div>

          {/* Team Name (Optional) */}
          <div className="form-group">
            <label htmlFor="teamName">Team Name (optional)</label>
            <input
              type="text"
              id="teamName"
              value={formData.teamName}
              onChange={(e) =>
                setFormData({ ...formData, teamName: e.target.value })
              }
              placeholder="e.g., U14 Boys"
            />
          </div>

          {/* Fixed Event Checkbox */}
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.isFixed}
                onChange={(e) =>
                  setFormData({ ...formData, isFixed: e.target.checked })
                }
              />
              <span>Fixed Event (cannot be moved by scheduler)</span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠</span> {error}
            </div>
          )}

          {/* Buttons */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
