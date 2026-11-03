import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getClubJourney, searchTeams, setTrackedTeam } from "../api/teams";
import { PostStudioModal, type PostStudioContext } from "../components/PostStudioModal";
import type { ClubJourneyData, TeamSearchResult } from "../types/team";

export const ClubJourneyPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [journey, setJourney] = useState<ClubJourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Switching club state
  const [showSwitchClub, setShowSwitchClub] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TeamSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [switching, setSwitching] = useState(false);

  // AI Content Studio Modal
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioContext, setStudioContext] = useState<PostStudioContext | null>(null);

  const loadJourney = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const data = await getClubJourney(workspaceId);
      setJourney(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load club journey data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJourney();
  }, [workspaceId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchTeams(workspaceId, searchQuery);
      setSearchResults(results);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectNewClub = async (team: TeamSearchResult) => {
    if (!workspaceId) return;
    setSwitching(true);
    try {
      await setTrackedTeam(workspaceId, {
        provider_name: "mock",
        provider_team_id: team.id,
        team_name: team.name,
        league_id: team.league_id,
        country: team.country,
        is_primary_team: true,
      });
      setShowSwitchClub(false);
      setSearchResults([]);
      setSearchQuery("");
      await loadJourney();
    } catch (err: any) {
      alert(`Could not switch club: ${err.message}`);
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center text-gray-500 animate-pulse text-sm">
        Loading club history & season journey...
      </div>
    );
  }

  if (error || !journey) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-red-950/60 border border-red-500/40 rounded-2xl p-6 text-center text-red-300">
          <p className="font-semibold">{error || "Could not load club records."}</p>
          <Link
            to={`/workspace/${workspaceId}/dashboard`}
            className="inline-block mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs rounded-xl text-gray-200"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header Profile Banner */}
      <div className="bg-gradient-to-r from-gray-800 via-gray-800/95 to-gray-900 border border-gray-700/80 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-3xl shadow-inner">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-tight">
                {journey.club_name}
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                1-Time Cached
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-1">
              <span>🏟️ {journey.stadium}</span>
              <span>•</span>
              <span>👔 Manager: {journey.manager}</span>
              <span>•</span>
              <span>🏆 {journey.league}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSwitchClub(!showSwitchClub)}
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition flex items-center gap-1.5"
          >
            <span>🔄</span>
            <span>{showSwitchClub ? "Close Switcher" : "Switch Tracked Club"}</span>
          </button>

          <button
            onClick={() => {
              setStudioContext({
                contextType: "news",
                headline: `${journey.club_name}: Season Progress & Form Comparison`,
                contextData: {
                  club: journey.club_name,
                  previous_finish: journey.previous_season.league_finish,
                  previous_points: journey.previous_season.points,
                  current_position: journey.current_season.league_position,
                  current_points: journey.current_season.points,
                  points_pace: journey.comparison.points_pace,
                  takeaway: journey.comparison.takeaway,
                },
              });
              setStudioOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold transition shadow-md flex items-center gap-1.5"
          >
            <span>✨</span>
            <span>AI Storyline Post</span>
          </button>
        </div>
      </div>

      {/* Switch Club Drawer */}
      {showSwitchClub && (
        <div className="bg-gray-800/90 border border-indigo-500/40 rounded-2xl p-5 shadow-2xl space-y-4 animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🔍</span>
              <span>Change Your Tracked Club</span>
            </h3>
            <p className="text-xs text-gray-400">
              Search for another club to update this workspace. You only pick once; the dashboard will switch to your new club immediately.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search club (e.g. Real Madrid, Barcelona, Arsenal, Chelsea)..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
              {searchResults.map((team) => (
                <div
                  key={team.id}
                  onClick={() => handleSelectNewClub(team)}
                  className="p-3 bg-gray-900/80 hover:bg-gray-900 border border-gray-700 hover:border-indigo-500/60 rounded-xl cursor-pointer transition flex items-center justify-between group"
                >
                  <div>
                    <h4 className="text-xs font-bold text-gray-200 group-hover:text-indigo-400">
                      {team.name}
                    </h4>
                    <p className="text-[10px] text-gray-500">{team.country || "Club"}</p>
                  </div>
                  <span className="text-[11px] text-indigo-400 font-semibold group-hover:translate-x-0.5 transition">
                    {switching ? "..." : "Select →"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Side-by-Side Journey Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Previous Season Record */}
        <div className="bg-gray-800/90 border border-gray-700/80 rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-700/60">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Last Campaign
              </span>
              <h2 className="text-base font-extrabold text-white">
                {journey.previous_season.season} Season Summary
              </h2>
            </div>
            <span className="px-3 py-1 rounded-xl bg-gray-900 border border-gray-700 text-indigo-400 text-sm font-black">
              Finish: {journey.previous_season.league_finish}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-700/50">
              <span className="text-xl font-extrabold text-white block">
                {journey.previous_season.points}
              </span>
              <span className="text-[10px] text-gray-400 uppercase font-semibold">Points</span>
            </div>
            <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-700/50">
              <span className="text-xl font-extrabold text-emerald-400 block">
                {journey.previous_season.won}W - {journey.previous_season.drawn}D - {journey.previous_season.lost}L
              </span>
              <span className="text-[10px] text-gray-400 uppercase font-semibold">W-D-L</span>
            </div>
            <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-700/50">
              <span className="text-xl font-extrabold text-indigo-400 block">
                {journey.previous_season.goal_difference}
              </span>
              <span className="text-[10px] text-gray-400 uppercase font-semibold">Goal Diff</span>
            </div>
          </div>

          <div className="text-xs text-gray-300 space-y-2 pt-2 border-t border-gray-700/50">
            <div className="flex justify-between">
              <span className="text-gray-400">Goals Scored:</span>
              <span className="font-semibold text-white">{journey.previous_season.goals_for}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Goals Conceded:</span>
              <span className="font-semibold text-white">{journey.previous_season.goals_against}</span>
            </div>
            {journey.previous_season.top_scorer && (
              <div className="flex justify-between">
                <span className="text-gray-400">Top Scorer:</span>
                <span className="font-semibold text-indigo-300">{journey.previous_season.top_scorer}</span>
              </div>
            )}
            {journey.previous_season.notable_moments && (
              <p className="text-[11px] text-gray-400 italic pt-1">
                "{journey.previous_season.notable_moments}"
              </p>
            )}
          </div>
        </div>

        {/* Current Season Progress */}
        <div className="bg-gray-800/90 border border-gray-700/80 rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-700/60">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Active Campaign
              </span>
              <h2 className="text-base font-extrabold text-white">
                {journey.current_season.season} Season Progress
              </h2>
            </div>
            <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-black">
              Current: {journey.current_season.league_position}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-700/50">
              <span className="text-xl font-extrabold text-white block">
                {journey.current_season.points}
              </span>
              <span className="text-[10px] text-gray-400 uppercase font-semibold">Points</span>
            </div>
            <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-700/50">
              <span className="text-xl font-extrabold text-emerald-400 block">
                {journey.current_season.won}W - {journey.current_season.drawn}D - {journey.current_season.lost}L
              </span>
              <span className="text-[10px] text-gray-400 uppercase font-semibold">W-D-L</span>
            </div>
            <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-700/50">
              <span className="text-xl font-extrabold text-indigo-400 block">
                {journey.current_season.goal_difference}
              </span>
              <span className="text-[10px] text-gray-400 uppercase font-semibold">Goal Diff</span>
            </div>
          </div>

          <div className="text-xs text-gray-300 space-y-2 pt-2 border-t border-gray-700/50">
            <div className="flex justify-between">
              <span className="text-gray-400">Matches Played:</span>
              <span className="font-semibold text-white">{journey.current_season.matches_played}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Goals Scored / Conceded:</span>
              <span className="font-semibold text-white">
                {journey.current_season.goals_for} / {journey.current_season.goals_against}
              </span>
            </div>
            {journey.current_season.form && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Recent Form:</span>
                <div className="flex gap-1">
                  {journey.current_season.form.map((res, i) => (
                    <span
                      key={i}
                      className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                        res === "W"
                          ? "bg-emerald-600 text-white"
                          : res === "D"
                          ? "bg-amber-600 text-white"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {res}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Then vs. Now Comparative Insights */}
      <div className="bg-gradient-to-r from-indigo-950/40 via-gray-800 to-gray-800 border border-indigo-500/30 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <h3 className="text-base font-bold text-white">
            "Then vs. Now" Performance Comparison
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-700/60 space-y-1">
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">
              Points Trajectory
            </span>
            <p className="text-sm font-semibold text-gray-200">
              {journey.comparison.points_pace}
            </p>
          </div>

          <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-700/60 space-y-1">
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">
              Offensive Output
            </span>
            <p className="text-sm font-semibold text-gray-200">
              {journey.comparison.goals_per_game}
            </p>
          </div>

          <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-700/60 space-y-1">
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">
              Defensive Solidity
            </span>
            <p className="text-sm font-semibold text-gray-200">
              {journey.comparison.defensive_record}
            </p>
          </div>
        </div>

        <div className="p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 leading-relaxed">
          <span className="font-bold text-indigo-300 block mb-0.5">💡 Storyline Context for Social Media:</span>
          {journey.comparison.takeaway}
        </div>
      </div>

      {/* AI Post Studio Modal */}
      <PostStudioModal
        isOpen={studioOpen}
        onClose={() => setStudioOpen(false)}
        workspaceId={workspaceId || ""}
        initialContext={studioContext}
      />
    </div>
  );
};
