import axios from "axios";
import type { EventType } from "../types/types";

export async function fetchEvents(): Promise<EventType[]> {
  const response = await axios.get<EventType[]>("/api/events/");
  return response.data;
}
