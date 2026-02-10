export interface FacilityType {
    id: number;
    name: string;
    type: string;
}

export interface EventType {
    id: number;
    title: string;
    start_time: string;
    end_time: string;
    facility: FacilityType;
    is_fixed: boolean;
    team_name?: string;  // Optional team name
}

// Payload for creating/updating events (what we send to API)
//
export interface CreateEventPayload {
    title: string;
    start_time: string;      // format: "2026-02-05T18:00:00Z"
    end_time: string;        //
    facility: string;        // Facility name ("Main Pitch"), not ID
    is_fixed: boolean;
    team_name?: string;      // Optional
}

