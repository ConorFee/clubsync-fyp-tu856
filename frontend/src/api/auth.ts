import axios from "axios";

export interface AuthUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: "admin" | "coach" | "viewer";
  team: string | null;
}

interface AuthResponse {
  success: boolean;
  user: AuthUser;
}

export async function login(
  username: string,
  password: string
): Promise<AuthUser> {
  const response = await axios.post<AuthResponse>("/api/auth/login/", {
    username,
    password,
  });
  return response.data.user;
}

export async function logout(): Promise<void> {
  await axios.post("/api/auth/logout/");
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await axios.get<AuthResponse>("/api/auth/me/");
  return response.data.user;
}
