export function getQuotaVisuals(status: string) {
  switch (status) {
    case "blocked":
      return {
        badgeBg: "bg-red-950/80 border-red-500/40 text-red-300",
        icon: "🚫",
        label: "API Limit Reached",
      };
    case "critical":
      return {
        badgeBg: "bg-red-900/60 border-red-500/30 text-red-300",
        icon: "🔴",
        label: "Critical",
      };
    case "warning":
      return {
        badgeBg: "bg-yellow-950/60 border-yellow-500/30 text-yellow-300",
        icon: "⚠️",
        label: "Warning",
      };
    default:
      return {
        badgeBg: "bg-emerald-950/40 border-emerald-500/20 text-emerald-300",
        icon: "⚡",
        label: "OK",
      };
  }
}

