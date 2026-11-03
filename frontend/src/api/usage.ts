import { apiRequest } from "./client";
import type { ApiUsage } from "../types/usage";

export async function getApiUsage(): Promise<ApiUsage> {
  return apiRequest<ApiUsage>("/api/usage");
}

