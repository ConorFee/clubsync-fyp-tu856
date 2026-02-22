import axios from "axios";
import type { BookingRequestType, CreateBookingRequestPayload } from "../types/types";

export async function fetchBookingRequests(): Promise<BookingRequestType[]> {
  const response = await axios.get<BookingRequestType[]>("/api/requests/");
  return response.data;
}

export async function fetchBookingRequest(id: number): Promise<BookingRequestType> {
  const response = await axios.get<BookingRequestType>(`/api/requests/${id}/`);
  return response.data;
}

export async function createBookingRequest(
  payload: CreateBookingRequestPayload
): Promise<BookingRequestType> {
  const response = await axios.post<BookingRequestType>("/api/requests/", payload);
  return response.data;
}

export async function updateBookingRequest(
  id: number,
  payload: Partial<CreateBookingRequestPayload>
): Promise<BookingRequestType> {
  const response = await axios.put<BookingRequestType>(`/api/requests/${id}/`, payload);
  return response.data;
}

export async function deleteBookingRequest(id: number): Promise<void> {
  await axios.delete(`/api/requests/${id}/`);
}
