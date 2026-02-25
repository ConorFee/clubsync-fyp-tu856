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

function getEventColor(e: EventType): string {
  if (e.is_fixed) return '#c62828';       // Red — county fixtures
  switch (e.status) {
    case 'published': return '#2e7d32';   // Green — confirmed
    case 'proposed':  return '#e65100';   // Orange — solver output, pending approval
    case 'draft':     return '#757575';   // Grey — manual draft
    case 'cancelled': return '#bdbdbd';   // Light grey
    default:          return '#2e7d32';
  }
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
        backgroundColor: getEventColor(e),
        borderColor: getEventColor(e),
        textColor: "white",
        extendedProps: { eventId: e.id },
      }))}
    />
  );
}
