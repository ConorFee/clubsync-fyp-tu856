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
}

