export interface FacilityType {
    id: number;
    name: string;
    type: string;
}

export interface TeamType {
    id: number;
    name: string;
    age_group: string;
    usual_day: string;
    usual_time: string | null;
    usual_facility: string | null;
    is_flexible: boolean;
}

// Event type choices with default durations (minutes)
export type EventTypeChoice =
    | 'juvenile_training'
    | 'adult_training'
    | 'gym_session'
    | 'match'
    | 'championship'
    | 'meeting'
    | 'other';

export const EVENT_TYPE_LABELS: Record<EventTypeChoice, string> = {
    juvenile_training: 'Juvenile Training',
    adult_training: 'Adult Training',
    gym_session: 'Gym Session',
    match: 'Match',
    championship: 'Championship Match',
    meeting: 'Meeting',
    other: 'Other',
};

export const EVENT_TYPE_DURATIONS: Record<EventTypeChoice, number | null> = {
    juvenile_training: 60,
    adult_training: 90,
    gym_session: 60,
    match: 120,
    championship: 150,
    meeting: 60,
    other: null,
};

export interface EventType {
    id: number;
    title: string;
    start_time: string;
    end_time: string;
    facility: FacilityType;
    is_fixed: boolean;
    team_name?: string;
    event_type: EventTypeChoice;
    status: 'draft' | 'proposed' | 'published' | 'cancelled';
    team: string | null;
}

// Payload for creating/updating events (what we send to API)
export interface CreateEventPayload {
    title: string;
    start_time: string;      // format: "2026-02-05T18:00:00Z"
    end_time: string;
    facility: string;        // Facility name ("Main Pitch"), not ID
    is_fixed: boolean;
    team_name?: string;
    event_type: EventTypeChoice;
}
