import axios from "axios";

// --- Schedule Diff ---

export interface WeeklyBreakdownEntry {
  date: string;
  facility: string;
  time: string;
  duration: number;
}

export interface ScheduleDiffEntry {
  request_id: number;
  team_name: string;
  event_type: string;
  title: string;
  requested_facility: string;
  assigned_facility: string;
  facility_changed: boolean;
  requested_time: string;
  assigned_time: string;
  time_changed: boolean;
  events_count: number;
  priority: number;
  weekly_breakdown: WeeklyBreakdownEntry[];
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
  schedule_diff?: ScheduleDiffEntry[];
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

// --- Discard Schedule ---

export interface DiscardResult {
  success: boolean;
  events_deleted: number;
  requests_reset: number;
}

export async function discardSchedule(
  dateFrom: string,
  dateUntil: string
): Promise<DiscardResult> {
  const response = await axios.post<DiscardResult>("/api/schedule/discard/", {
    date_from: dateFrom,
    date_until: dateUntil,
  });
  return response.data;
}
