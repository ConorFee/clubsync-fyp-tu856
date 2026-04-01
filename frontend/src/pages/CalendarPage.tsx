import { useEffect, useState } from 'react';
import type { ScheduleEvent, FacilityType } from '../types/types';
import { useAuth } from '../context/AuthContext';

import { fetchEvents } from '../api/events';
import { fetchFacilities } from '../api/facilities';

import CalendarView from '../components/CalendarView';
import EventFormModal from '../components/EventFormModal';
import PageHeader from '../components/common/PageHeader';
import { Plus } from 'lucide-react';

import './CalendarPage.css';

export default function CalendarPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [facilities, setFacilities] = useState<FacilityType[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<string>('All');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

  const filteredEvents = events.filter((e) =>
    selectedFacility === 'All' ? true : e.facility === selectedFacility
  );

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

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleEditEvent = (event: ScheduleEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
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
      <PageHeader
        title="Calendar"
        subtitle="Manage facility bookings and events"
        action={
          isAdmin ? (
            <button
              className="btn btn-primary btn-sm cal-btn-primary"
              onClick={handleCreateEvent}
            >
              <Plus size={16} /> New Booking
            </button>
          ) : undefined
        }
      />

      {/* Toolbar: facility filter */}
      <div className="cal-toolbar">
        <div className="cal-filter">
          <label className="cal-filter-label">Facility</label>
          <select
            className="cal-filter-select"
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value)}
          >
            <option value="All">All Facilities</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.name}>{f.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar */}
      <div className="calendar-wrapper">
        <CalendarView events={filteredEvents} onEventClick={handleEditEvent} />

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
