import axios from "axios";
import type { FacilityType } from "../types/types";

export async function fetchFacilities(): Promise<FacilityType[]> {
  const response = await axios.get<FacilityType[]>("/api/facilities/");
  return response.data;
}
