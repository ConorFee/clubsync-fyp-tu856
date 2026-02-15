import { useEffect, useState } from 'react';
import type { EventType, FacilityType } from '../types/types';

import { fetchEvents } from '../api/events';
import { fetchFacilities } from '../api/facilities';
import { runSolverCheck } from '../api/solver';

import CalendarView from '../components/CalendarView';
import Sidebar from '../components/sidebar/Sidebar';
import EventFormModal from '../components/EventFormModal';

import './CalendarPage.css';

export default function CalendarPage() {
  const [events, setEvents] = useState<EventType[]>([]);
  const [solverStatus, setSolverStatus] = useState('');
  const [selectedFacility, setSelectedFacility] = useState<string>('All');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [facilities, setFacilities] = useState<FacilityType[]>([]);

  const filteredEvents = events.filter((e) =>
    selectedFacility === 'All' ? true : e.facility.name === selectedFacility
  );

  useEffect(() => {
    fetchEvents()
      .then((data) => setEvents(data))
      .catch((err) => console.error('Error loading events:', err));

    fetchFacilities()
      .then((data) => setFacilities(data))
      .catch((err) => console.error('Error loading facilities:', err));
  }, []);

  const handleRefreshEvents = () => {
    fetchEvents()
      .then((data) => setEvents(data))
      .catch((err) => console.error('Refresh error:', err));
  };

  const handleSolverRun = () => {
    runSolverCheck()
      .then((message) => setSolverStatus(message))
      .catch(() => setSolverStatus('Solver error'));
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  // handleEditEvent and handleDeleteEvent will be added in Tasks 4-5
  // (calendar click handler + sidebar buttons)

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleSaveEvent = async () => {
    try {
      const data = await fetchEvents();
      setEvents(data);
    } catch (err) {
      console.error('Error refreshing events:', err);
    }
  };

  return (
    <div className="calendar-page">
      {/* Page header with solver */}
      <div className="calendar-page-header">
        <h2>Schedule</h2>
        <div className="solver-area">
          <button className="btn btn-primary btn-sm" onClick={handleCreateEvent}>
            + Create Event
          </button>
          <button className="btn btn-outline-primary btn-sm" onClick={handleSolverRun}>
            Run Solver Check
          </button>
          {solverStatus && (
            <span className={`solver-status ${solverStatus.includes('feasible') ? 'text-success' : 'text-danger'}`}>
              {solverStatus}
            </span>
          )}
        </div>
      </div>

      {/* Main layout — Sidebar + Calendar */}
      <div className="calendar-layout">
        <Sidebar
          onRefresh={handleRefreshEvents}
          events={filteredEvents}
          selectedFacility={selectedFacility}
          onSelectFacility={setSelectedFacility}
        />

        <div className="calendar-wrapper">
          <CalendarView events={events} />
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
