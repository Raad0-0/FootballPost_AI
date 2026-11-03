import React from "react";
import { formatKickoff, formatScore } from "../utils/formatMatch";
import type { MatchSummary } from "../types/team";

interface Props {
  match: MatchSummary;
  type?: "fixture" | "result" | "live";
}

export const MatchCard: React.FC<Props> = ({ match, type = "fixture" }) => {
  const isLive = match.status === "live" || type === "live";
  const isFinished = match.status === "finished" || type === "result";

  return (
    <div className={`p-4 rounded-xl border transition shadow-sm ${
      isLive
        ? "bg-emerald-950/20 border-emerald-500/40"
        : "bg-gray-800/80 border-gray-700/80 hover:border-gray-600"
    }`}>
      <div className="flex items-center justify-between text-xs text-gray-400 mb-2.5">
        <span className="font-medium text-gray-300">{match.league_name || "Match"}</span>
        {isLive ? (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold uppercase tracking-wider text-[11px] animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            LIVE {match.minute ? `${match.minute}’` : ""}
          </span>
        ) : (
          <span>{isFinished ? "Full Time" : formatKickoff(match.kickoff_time)}</span>
        )}
      </div>

      <div className="flex items-center justify-between my-2">
        <div className="flex-1 text-right font-semibold text-gray-100 text-sm sm:text-base truncate pr-2">
          {match.home_team}
        </div>
        <div className="px-3 py-1 rounded-md bg-gray-900 border border-gray-700/80 text-sm sm:text-base font-bold text-center min-w-[70px]">
          {formatScore(match.home_score, match.away_score)}
        </div>
        <div className="flex-1 text-left font-semibold text-gray-100 text-sm sm:text-base truncate pl-2">
          {match.away_team}
        </div>
      </div>

      {match.venue && (
        <div className="text-center text-[11px] text-gray-400 mt-2 truncate">
          🏟️ {match.venue}
        </div>
      )}
    </div>
  );
};

