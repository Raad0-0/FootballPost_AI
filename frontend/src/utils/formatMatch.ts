export function formatKickoff(dateStr?: string | null): string {
  if (!dateStr) return "TBD";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function formatScore(homeScore?: number | null, awayScore?: number | null): string {
  if (homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) {
    return "vs";
  }
  return `${homeScore} - ${awayScore}`;
}

