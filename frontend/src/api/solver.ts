import axios from "axios";

// --- Legacy solver check ---

export async function runSolverCheck(): Promise<string> {
  const response = await axios.post<{ message: string }>("/api/schedule/solve/");
  return response.data.message;
}

// --- Generate Schedule ---

export interface GenerateResult {
  success: boolean;
  solver_status: string;
  solve_time_seconds: number;
  total_penalty?: number;
  events_created?: number;
  requests_processed?: number;
  message?: string;
}

export async function generateSchedule(
  dateFrom: string,
  dateUntil: string
): Promise<GenerateResult> {
  const response = await axios.post<GenerateResult>("/api/schedule/generate/", {
    date_from: dateFrom,
    date_until: dateUntil,
  });
  return response.data;
}

// --- Publish Schedule ---

export interface PublishResult {
  success: boolean;
  events_published: number;
}

export async function publishSchedule(
  dateFrom: string,
  dateUntil: string
): Promise<PublishResult> {
  const response = await axios.post<PublishResult>("/api/schedule/publish/", {
    date_from: dateFrom,
    date_until: dateUntil,
  });
  return response.data;
}
