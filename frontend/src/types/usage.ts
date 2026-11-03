export interface ApiUsage {
  daily_limit: number;
  used_today: number;
  remaining: number;
  percentage: number;
  status: "ok" | "warning" | "critical" | "blocked";
  warning_message?: string | null;
}

