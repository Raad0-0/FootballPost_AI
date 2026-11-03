import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Workspace, WorkspaceCreatePayload } from "../types/workspace";
import { searchTeams, setTrackedTeam } from "../api/teams";

interface Props {
  workspaces: Workspace[];
  loading: boolean;
  onAddWorkspace: (payload: WorkspaceCreatePayload | string) => Promise<Workspace>;
}

interface ClubPreset {
  name: string;
  badge: string;
  searchQuery: string;
  defaultHashtags: string;
}

const PRESET_CLUBS: ClubPreset[] = [
  { name: "Arsenal", badge: "🔴", searchQuery: "Arsenal", defaultHashtags: "#COYG #Arsenal #PremierLeague" },
  { name: "Barcelona", badge: "🔵🔴", searchQuery: "Barcelona", defaultHashtags: "#ViscaBarca #FCBarcelona #LaLiga" },
  { name: "Real Madrid", badge: "⚪", searchQuery: "Real Madrid", defaultHashtags: "#HalaMadrid #RealMadrid #LaLiga" },
  { name: "Manchester City", badge: "🩵", searchQuery: "Manchester City", defaultHashtags: "#ManCity #MCFC #PremierLeague" },
  { name: "Liverpool", badge: "🔴", searchQuery: "Liverpool", defaultHashtags: "#YNWA #LFC #Liverpool" },
  { name: "Chelsea", badge: "🔵", searchQuery: "Chelsea", defaultHashtags: "#CFC #Chelsea #PremierLeague" },
  { name: "Manchester United", badge: "🔴👹", searchQuery: "Manchester United", defaultHashtags: "#MUFC #ManUtd #PremierLeague" },
  { name: "Bayern Munich", badge: "🔴⚪", searchQuery: "Bayern", defaultHashtags: "#MiaSanMia #FCBayern #Bundesliga" },
];

export const WorkspaceListPage: React.FC<Props> = ({
  workspaces,
  loading,
  onAddWorkspace,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<ClubPreset | null>(PRESET_CLUBS[0]);
  const [wsName, setWsName] = useState(PRESET_CLUBS[0].name + " Social Hub");
  const [hashtags, setHashtags] = useState(PRESET_CLUBS[0].defaultHashtags);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSelectPreset = (preset: ClubPreset) => {
    setSelectedPreset(preset);
    setWsName(`${preset.name} Social Hub`);
    setHashtags(preset.defaultHashtags);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim()) return;
    setCreating(true);
    setError(null);

    try {
      // 1. Create workspace with hashtags and defaults
      const created = await onAddWorkspace({
        workspace_name: wsName.trim(),
        default_hashtags: hashtags.trim(),
        default_language: "english",
        default_tone: "hype",
      });

      // 2. Automatically bind tracked team if preset selected
      if (selectedPreset) {
        try {
          const results = await searchTeams(created.id, selectedPreset.searchQuery);
          if (results && results.length > 0) {
            const team = results[0];
            await setTrackedTeam(created.id, {
              provider_name: "mock",
              provider_team_id: team.id,
              team_name: team.name,
              league_id: team.league_id,
              country: team.country,
              is_primary_team: true,
            });
          }
        } catch (teamErr) {
          console.warn("Could not auto-bind preset team:", teamErr);
        }
      }

      // 3. Directly navigate to Dashboard
      navigate(`/workspace/${created.id}/dashboard`);
    } catch (err: any) {
      setError(err.message || "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <span>⚽</span>
          <span>ClubPost Studio</span>
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          High-engagement football post generation powered by Gemini AI, live match tracking, and verified club news.
        </p>
      </div>

      {/* Upfront Club Selection & Workspace Creation Card */}
      <div className="bg-gray-800/90 border border-gray-700/80 rounded-2xl p-6 shadow-xl mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
              <span>🚀</span>
              <span>Quick Onboarding: Choose Your Club</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Select your football club below to instantly set up your dashboard, match center, and default hashtags.
            </p>
          </div>
        </div>

        {/* Quick Preset Badges */}
        <div className="flex flex-wrap gap-2 my-4">
          {PRESET_CLUBS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                selectedPreset?.name === preset.name
                  ? "bg-indigo-600/30 border-indigo-500 text-indigo-200 shadow-sm"
                  : "bg-gray-900/60 border-gray-700/60 text-gray-400 hover:text-gray-200 hover:bg-gray-900"
              }`}
            >
              <span>{preset.badge}</span>
              <span>{preset.name}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setSelectedPreset(null);
              setWsName("Custom Football Hub");
              setHashtags("#Football #Matchday");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              selectedPreset === null
                ? "bg-indigo-600/30 border-indigo-500 text-indigo-200"
                : "bg-gray-900/60 border-gray-700/60 text-gray-400 hover:text-gray-200"
            }`}
          >
            ➕ Other Club
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Workspace / Page Name
              </label>
              <input
                type="text"
                required
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                placeholder="e.g. Arsenal Gunners Hub"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Default Hashtags (Appended to posts)
              </label>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#ClubTag #Matchday"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={creating || !wsName.trim()}
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Setting up workspace...
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Create & Launch Dashboard</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Workspaces Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Your Existing Workspaces ({workspaces.length})
        </h2>

        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm animate-pulse">
            Loading workspaces...
          </div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/40 rounded-2xl border border-dashed border-gray-700 p-8">
            <span className="text-4xl">🏟️</span>
            <h3 className="text-base font-semibold text-gray-200 mt-2">No workspaces yet</h3>
            <p className="text-xs text-gray-400 mt-1">
              Select your club above to immediately launch your AI-assisted workspace!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                onClick={() => navigate(`/workspace/${ws.id}/dashboard`)}
                className="group cursor-pointer bg-gray-800/90 hover:bg-gray-800 border border-gray-700 hover:border-indigo-500/50 rounded-2xl p-5 transition shadow-sm hover:shadow-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl group-hover:scale-105 transition">
                    🛡️
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-100 group-hover:text-indigo-400 transition text-base">
                      {ws.workspace_name}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                      <span>Created {new Date(ws.created_at).toLocaleDateString()}</span>
                      {ws.default_hashtags && (
                        <span className="text-indigo-400/80 truncate max-w-[150px]">
                          {ws.default_hashtags}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition">
                  <span>Enter Studio</span>
                  <span>→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
