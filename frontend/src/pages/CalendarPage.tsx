import { useEffect, useState } from 'react';
import type { EventType, FacilityType } from '../types/types';
import type { GenerateResult } from '../api/solver';

import { fetchEvents, deleteEvent } from '../api/events';
import { fetchFacilities } from '../api/facilities';
import { generateSchedule, publishSchedule } from '../api/solver';

import CalendarView from '../components/CalendarView';
import Sidebar from '../components/sidebar/Sidebar';
import EventFormModal from '../components/EventFormModal';

import './CalendarPage.css';

export default function CalendarPage() {
  const [events, setEvents] = useState<EventType[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<string>('All');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [facilities, setFacilities] = useState<FacilityType[]>([]);

  // Solver state
  const [dateFrom, setDateFrom] = useState('');
  const [dateUntil, setDateUntil] = useState('');
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [solverResult, setSolverResult] = useState<GenerateResult | null>(null);

  const filteredEvents = events.filter((e) =>
    selectedFacility === 'All' ? true : e.facility.name === selectedFacility
  );

  const hasProposedEvents = events.some((e) => e.status === 'proposed');

  useEffect(() => {
    refreshEvents();
    fetchFacilities()
      .then((data) => setFacilities(data))
      .catch((err) => console.error('Error loading facilities:', err));
  }, []);

  const refreshEvents = () => {
    fetchEvents()
      .then((data) => setEvents(data))
      .catch((err) => console.error('Error loading events:', err));
  };

  const handleGenerate = async () => {
    if (!dateFrom || !dateUntil) return;
    setGenerating(true);
    setSolverResult(null);
    try {
      const result = await generateSchedule(dateFrom, dateUntil);
      setSolverResult(result);
      refreshEvents();
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
      refreshEvents();
    } catch (err) {
      console.error('Publish error:', err);
    } finally {
      setPublishing(false);
    }
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleEditEvent = (event: EventType) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleDeleteEvent = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteEvent(id);
        refreshEvents();
      } catch (err) {
        console.error('Failed to delete event:', err);
        alert('Failed to delete event. Please try again.');
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleSaveEvent = () => {
    refreshEvents();
  };

  return (
    <div className="calendar-page">
      {/* Page header */}
      <div className="calendar-page-header">
        <h2>Schedule</h2>
        <button className="btn btn-primary btn-sm" onClick={handleCreateEvent}>
          + Create Event
        </button>
      </div>

      {/* Solver controls */}
      <div className="solver-controls">
        <div className="solver-dates">
          <label className="solver-date-label">
            From
            <input
              type="date"
              className="solver-date-input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label className="solver-date-label">
            To
            <input
              type="date"
              className="solver-date-input"
              value={dateUntil}
              onChange={(e) => setDateUntil(e.target.value)}
            />
          </label>
        </div>
        <div className="solver-buttons">
          <button
            className="solver-btn solver-btn--generate"
            onClick={handleGenerate}
            disabled={generating || !dateFrom || !dateUntil}
          >
            {generating ? 'Generating...' : 'Generate Schedule'}
          </button>
          {hasProposedEvents && (
            <button
              className="solver-btn solver-btn--publish"
              onClick={handlePublish}
              disabled={publishing}
            >
              {publishing ? 'Publishing...' : 'Publish Schedule'}
            </button>
          )}
        </div>
      </div>

      {/* Solver result banner */}
      {solverResult && (
        <div className={`solver-result-banner ${solverResult.success ? 'solver-result--success' : 'solver-result--error'}`}>
          <span>
            {solverResult.success
              ? `${solverResult.solver_status}: Created ${solverResult.events_created} events from ${solverResult.requests_processed} requests (${solverResult.solve_time_seconds}s)`
              : solverResult.message || `${solverResult.solver_status}: Could not generate a schedule.`
            }
          </span>
          <button className="solver-result-dismiss" onClick={() => setSolverResult(null)}>
            &times;
          </button>
        </div>
      )}

      {/* Main layout — Sidebar + Calendar */}
      <div className="calendar-layout">
        <Sidebar
          onRefresh={refreshEvents}
          events={filteredEvents}
          selectedFacility={selectedFacility}
          onSelectFacility={setSelectedFacility}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
        />

        <div className="calendar-wrapper">
          <CalendarView events={events} onEventClick={handleEditEvent} />

          {/* Colour legend */}
          <div className="calendar-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#c62828' }} />
              Fixed
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#2e7d32' }} />
              Published
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#e65100' }} />
              Proposed
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#757575' }} />
              Draft
            </div>
          </div>
        </div>
      </div>

      {/* Event Form Modal */}
      <EventFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveEvent}
        event={selectedEvent ?? undefined}
        facilities={facilities}
      />
    </div>
  );
}
