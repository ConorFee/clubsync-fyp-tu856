import axios from "axios";

export async function runSolverCheck(): Promise<string> {
  const response = await axios.post<{ message: string }>("/api/schedule/solve/");
  return response.data.message;
}
