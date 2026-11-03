export function getPostTypeBadge(postType: string): { label: string; bg: string; text: string } {
  switch (postType.toLowerCase()) {
    case "goal":
      return { label: "Goal", bg: "bg-emerald-950/80 border border-emerald-500/30", text: "text-emerald-400" };
    case "red_card":
      return { label: "Red Card", bg: "bg-rose-950/80 border border-rose-500/30", text: "text-rose-400" };
    case "halftime":
      return { label: "Half-Time", bg: "bg-blue-950/80 border border-blue-500/30", text: "text-blue-400" };
    case "fulltime":
      return { label: "Full-Time", bg: "bg-purple-950/80 border border-purple-500/30", text: "text-purple-400" };
    case "fixture":
      return { label: "Fixture", bg: "bg-amber-950/80 border border-amber-500/30", text: "text-amber-400" };
    case "result":
      return { label: "Result", bg: "bg-indigo-950/80 border border-indigo-500/30", text: "text-indigo-400" };
    default:
      return { label: postType, bg: "bg-gray-800 border border-gray-700", text: "text-gray-300" };
  }
}

export function getStatusBadge(status: string): { label: string; color: string } {
  switch (status.toLowerCase()) {
    case "new":
      return { label: "New Draft", color: "bg-blue-500/20 text-blue-300 border border-blue-500/30" };
    case "edited":
      return { label: "Edited", color: "bg-amber-500/20 text-amber-300 border border-amber-500/30" };
    case "copied":
      return { label: "Copied", color: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" };
    case "used":
      return { label: "Posted / Used", color: "bg-purple-500/20 text-purple-300 border border-purple-500/30" };
    case "discarded":
      return { label: "Discarded", color: "bg-gray-700 text-gray-400 border border-gray-600" };
    default:
      return { label: status, color: "bg-gray-800 text-gray-400" };
  }
}

