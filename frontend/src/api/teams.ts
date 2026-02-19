import axios from "axios";
import type { TeamType } from "../types/types";

export async function fetchTeams(): Promise<TeamType[]> {
  const response = await axios.get<TeamType[]>("/api/teams/");
  return response.data;
}

export interface CreateTeamPayload {
  name: string;
  age_group?: string;
  usual_day?: string;
  usual_time?: string;
  usual_facility?: string;
  is_flexible?: boolean;
}

export async function createTeam(team: CreateTeamPayload): Promise<TeamType> {
  const response = await axios.post<TeamType>("/api/teams/", team);
  return response.data;
}
