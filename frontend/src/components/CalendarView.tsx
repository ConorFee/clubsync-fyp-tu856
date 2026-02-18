import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import type { EventType } from "../types/types";

interface CalendarViewProps {
  events: EventType[];
  onEventClick?: (event: EventType) => void;
}

export default function CalendarView({ events, onEventClick }: CalendarViewProps) {
  const handleEventClick = (info: EventClickArg) => {
    if (!onEventClick) return;
    const eventId = Number(info.event.extendedProps.eventId);
    const original = events.find((e) => e.id === eventId);
    if (original) {
      onEventClick(original);
    }
  };

  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="timeGridWeek"
      headerToolbar={{
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay",
      }}
      slotMinTime="06:00:00"
      slotMaxTime="23:00:00"
      height="auto"
      eventClick={handleEventClick}
      events={events.map((e) => ({
        title: `${e.title} – ${e.facility.name}`,
        start: e.start_time,
        end: e.end_time,
        backgroundColor: e.is_fixed ? "#dc3545" : "#28a745",
        textColor: "white",
        extendedProps: { eventId: e.id },
      }))}
    />
  );
}
