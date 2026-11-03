import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMatches } from "../api/matches";
import { MatchCard } from "../components/MatchCard";
import type { Match } from "../types/match";

export const MatchesPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    getMatches(workspaceId)
      .then((data) => {
        setMatches(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to load matches");
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const upcomingMatches = matches.filter((m) => m.status === "scheduled");
  const pastMatches = matches.filter((m) => m.status === "finished");
  const liveMatches = matches.filter((m) => m.status === "live" || m.status === "halftime");

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Fixtures & Results
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Synced match schedule and final results for your tracked club.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-500 animate-pulse text-sm">
          Loading match schedule...
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/40 rounded-2xl border border-dashed border-gray-700 p-8 text-sm text-gray-400">
          No matches found for this club yet. Ensure a team is selected!
        </div>
      ) : (
        <>
          {/* Live Matches if any */}
          {liveMatches.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Active Live Match
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveMatches.map((m) => (
                  <Link key={m.id} to={`/workspace/${workspaceId}/match/${m.id}`} className="block transition hover:scale-[1.01]">
                    <MatchCard match={m as any} type="live" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Fixtures */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Upcoming Fixtures ({upcomingMatches.length})
            </h2>
            {upcomingMatches.length === 0 ? (
              <div className="p-4 bg-gray-800/40 rounded-xl text-xs text-gray-500">
                No upcoming fixtures scheduled.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingMatches.map((m) => (
                  <Link key={m.id} to={`/workspace/${workspaceId}/match/${m.id}`} className="block transition hover:scale-[1.01]">
                    <MatchCard match={m as any} type="fixture" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Past Results */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Recent Results ({pastMatches.length})
            </h2>
            {pastMatches.length === 0 ? (
              <div className="p-4 bg-gray-800/40 rounded-xl text-xs text-gray-500">
                No recent results recorded.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastMatches.map((m) => (
                  <Link key={m.id} to={`/workspace/${workspaceId}/match/${m.id}`} className="block transition hover:scale-[1.01]">
                    <MatchCard match={m as any} type="result" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

