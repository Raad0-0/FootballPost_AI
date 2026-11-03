import { apiRequest } from "./client";
import type { AuthResponse, User } from "../types/user";

export async function registerUser(email: string, password: string): Promise<User> {
  return apiRequest<User>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data.access_token) {
    localStorage.setItem("clubpost_token", data.access_token);
  }
  return data;
}

export async function logoutUser(): Promise<void> {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } finally {
    localStorage.removeItem("clubpost_token");
  }
}

export async function getCurrentUser(): Promise<User> {
  return apiRequest<User>("/api/auth/me");
}

