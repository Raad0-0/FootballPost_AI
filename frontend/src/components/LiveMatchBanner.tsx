import React from "react";
import { formatScore } from "../utils/formatMatch";
import type { MatchSummary } from "../types/team";

interface Props {
  match: MatchSummary;
  fetching: boolean;
  cooldownSeconds: number;
  message?: string | null;
  error?: string | null;
  onFetchNow: () => void;
}

export const LiveMatchBanner: React.FC<Props> = ({
  match,
  fetching,
  cooldownSeconds,
  message,
  error,
  onFetchNow,
}) => {
  const isCooldownActive = cooldownSeconds > 0;

  return (
    <div className="bg-gradient-to-r from-emerald-950/60 via-gray-800 to-gray-800 border-2 border-emerald-500/50 hover:border-emerald-400 rounded-2xl p-5 shadow-xl relative overflow-hidden transition group cursor-pointer">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-400 font-bold uppercase tracking-wider text-xs">
            Match In Progress • {match.minute ? `${match.minute}’` : "Live"}
          </span>
          {match.league_name && (
            <span className="text-gray-400 text-xs hidden sm:inline">
              ({match.league_name})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-emerald-300 group-hover:translate-x-0.5 transition hidden sm:inline">
            Match Details →
          </span>

          {/* Manual Fetch Button with Cooldown */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFetchNow();
            }}
            disabled={fetching || isCooldownActive}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shadow-md ${
              isCooldownActive
                ? "bg-gray-700/60 text-gray-400 border border-gray-600 cursor-not-allowed"
                : fetching
                ? "bg-emerald-700 text-white animate-pulse"
                : "bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95"
            }`}
          >
            <span>⚡</span>
            <span>
              {fetching
                ? "Fetching updates..."
                : isCooldownActive
                ? `Wait ${cooldownSeconds}s`
                : "Fetch now"}
            </span>
          </button>
        </div>
      </div>

      {/* Scoreline Board */}
      <div className="grid grid-cols-3 items-center py-4 my-1 bg-gray-900/80 rounded-xl border border-gray-700/60 text-center">
        <div className="px-3 truncate">
          <div className="text-base sm:text-xl font-bold text-gray-100">{match.home_team}</div>
          <div className="text-[11px] text-gray-400">Home</div>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-emerald-400">
            {formatScore(match.home_score, match.away_score)}
          </span>
          <span className="text-[10px] text-emerald-500/80 uppercase font-semibold mt-1">
            Auto-polling every 5m
          </span>
        </div>

        <div className="px-3 truncate">
          <div className="text-base sm:text-xl font-bold text-gray-100">{match.away_team}</div>
          <div className="text-[11px] text-gray-400">Away</div>
        </div>
      </div>

      {/* Feedback Messages */}
      {message && (
        <div className="mt-3 text-xs bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 p-2.5 rounded-lg flex items-center gap-2">
          <span>✓</span>
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="mt-3 text-xs bg-red-950/60 border border-red-500/30 text-red-300 p-2.5 rounded-lg flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

