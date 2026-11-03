import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTrackedTeam, searchTeams, setTrackedTeam } from "../api/teams";
import type { TeamSearchResult, TrackedTeam } from "../types/team";

export const TeamSelectPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TeamSearchResult[]>([]);
  const [currentTeam, setCurrentTeam] = useState<TrackedTeam | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Load current team and initial suggestions
  useEffect(() => {
    if (!workspaceId) return;
    getTrackedTeam(workspaceId)
      .then((t) => setCurrentTeam(t))
      .catch(() => setCurrentTeam(null));

    doSearch("");
  }, [workspaceId]);

  const doSearch = async (q: string) => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchTeams(workspaceId, q);
      setResults(data);
    } catch (err: any) {
      setError(err.message || "Failed to search teams");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
  };

  const handleSelectTeam = async (team: TeamSearchResult) => {
    if (!workspaceId) return;
    setSaving(true);
    setError(null);
    try {
      await setTrackedTeam(workspaceId, {
        provider_name: "mock",
        provider_team_id: team.id,
        team_name: team.name,
        league_id: team.league_id,
        country: team.country,
        is_primary_team: true,
      });
      navigate(`/workspace/${workspaceId}/dashboard`);
    } catch (err: any) {
      setError(err.message || "Failed to set tracked team");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Select Club to Track
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Search for the football team you manage or want to generate posts for.
        </p>
      </div>

      {currentTeam && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              Currently Tracking
            </span>
            <div className="text-base font-bold text-gray-100">
              {currentTeam.team_name} ({currentTeam.country || "League"})
            </div>
          </div>
          <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full font-medium">
            Active
          </span>
        </div>
      )}

      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            doSearch(e.target.value);
          }}
          placeholder="Search by team name (e.g. Arsenal, Real Madrid, Barcelona)..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition shadow-sm"
        />
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition shadow-md whitespace-nowrap"
        >
          Search
        </button>
      </form>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* Search Results Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Available Clubs ({results.length})
        </h2>

        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm animate-pulse">
            Searching provider database...
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/40 rounded-2xl border border-dashed border-gray-700 p-6 text-sm text-gray-500">
            No clubs matching "{query}". Try another query!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.map((team) => {
              const isSelected = currentTeam?.provider_team_id === team.id;
              return (
                <div
                  key={team.id}
                  className={`p-4 rounded-xl border flex items-center justify-between transition ${
                    isSelected
                      ? "bg-emerald-950/30 border-emerald-500/50"
                      : "bg-gray-800/80 border-gray-700 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-3 truncate pr-2">
                    <span className="text-2xl">🛡️</span>
                    <div className="truncate">
                      <h3 className="font-bold text-gray-100 text-sm sm:text-base truncate">
                        {team.name}
                      </h3>
                      <div className="text-xs text-gray-400">
                        {team.league_name || "League"} • {team.country || "Global"}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectTeam(team)}
                    disabled={saving || isSelected}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition shadow-sm whitespace-nowrap ${
                      isSelected
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                  >
                    {isSelected ? "Tracked ✓" : saving ? "Selecting..." : "Select Club"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

