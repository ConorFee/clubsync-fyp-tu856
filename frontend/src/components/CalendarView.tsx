import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventType } from "../types/types";

interface CalendarViewProps {
  events: EventType[];
}

export default function CalendarView({ events }: CalendarViewProps) {
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
      events={events.map((e) => ({
        title: `${e.title} – ${e.facility.name}`,
        start: e.start_time,
        end: e.end_time,
        backgroundColor: e.is_fixed ? "#dc3545" : "#28a745",
        textColor: "white",
      }))}
    />
  );
}
