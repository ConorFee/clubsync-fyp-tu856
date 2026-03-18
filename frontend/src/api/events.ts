import axios from "axios";
import type { ScheduleEvent, CreateEventPayload } from "../types/types";

// Fetch all events from the API
// 
export async function fetchEvents(): Promise<ScheduleEvent[]> {
  const response = await axios.get<ScheduleEvent[]>("/api/events/");
  return response.data;
}
// Create a new event
//
export async function createEvent(event: CreateEventPayload): Promise<ScheduleEvent> {
  const response = await axios.post<ScheduleEvent>("/api/events/", event);
  return response.data;
}

// Update a specific event by ID
//
export async function updateEvent(id: number, event: Partial<CreateEventPayload>): Promise<ScheduleEvent> {
  const response = await axios.put<ScheduleEvent>(`/api/events/${id}/`, event);
  return response.data;
}

// Delete an event by ID
//
export async function deleteEvent(id: number): Promise<void> {
  await axios.delete(`/api/events/${id}/`);
}
