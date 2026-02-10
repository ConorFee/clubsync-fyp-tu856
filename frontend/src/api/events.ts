import axios from "axios";
import type { EventType, CreateEventPayload } from "../types/types";

// Fetch all events from the API
// 
export async function fetchEvents(): Promise<EventType[]> {
  const response = await axios.get<EventType[]>("/api/events/");
  return response.data;
}
// Create a new event
//
export async function createEvent(event: CreateEventPayload): Promise<EventType> {
  const response = await axios.post<EventType>("/api/events/", event);
  return response.data;
}

// Update a specific event by ID
//
export async function updateEvent(id: number, event: Partial<CreateEventPayload>): Promise<EventType> {
  const response = await axios.put<EventType>(`/api/events/${id}/`, event);
  return response.data;
}

// Delete an event by ID
//
export async function deleteEvent(id: number): Promise<void> {
  await axios.delete(`/api/events/${id}/`);
}
