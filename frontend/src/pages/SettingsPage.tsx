import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTrackedTeam } from "../api/teams";
import { deleteWorkspace, getWorkspace, updateWorkspace } from "../api/workspaces";
import { useApiUsage } from "../hooks/useApiUsage";
import type { TrackedTeam } from "../types/team";
import type { Workspace } from "../types/workspace";

interface Props {
  onWorkspaceRenamed?: (id: number, name: string) => void;
  onWorkspaceDeleted?: (id: number) => void;
}

export const SettingsPage: React.FC<Props> = ({
  onWorkspaceRenamed,
  onWorkspaceDeleted,
}) => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [trackedTeam, setTrackedTeam] = useState<TrackedTeam | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [tone, setTone] = useState("hype");
  const [language, setLanguage] = useState("english");
  const [geminiKey, setGeminiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const { usage } = useApiUsage();

  useEffect(() => {
    if (!workspaceId) return;
    getWorkspace(workspaceId)
      .then((ws) => {
        setWorkspace(ws);
        setName(ws.workspace_name || "");
        setHashtags(ws.default_hashtags || "");
        setTone(ws.default_tone || "hype");
        setLanguage(ws.default_language || "english");
      })
      .catch((err) => setError(err.message));

    getTrackedTeam(workspaceId)
      .then((t) => setTrackedTeam(t))
      .catch(() => setTrackedTeam(null));
  }, [workspaceId]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !name.trim()) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload: any = {
        workspace_name: name.trim(),
        default_hashtags: hashtags.trim(),
        default_tone: tone,
        default_language: language,
      };

      if (geminiKey.trim()) {
        payload.gemini_api_key = geminiKey.trim();
      }

      const updated = await updateWorkspace(workspaceId, payload);
      setWorkspace(updated);
      setGeminiKey(""); // Clear input after update
      setMessage("Workspace preferences updated successfully!");
      if (onWorkspaceRenamed) onWorkspaceRenamed(updated.id, updated.workspace_name);
    } catch (err: any) {
      setError(err.message || "Failed to update workspace settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!workspaceId) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this workspace? All drafts and tracked matches will be permanently removed."
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteWorkspace(workspaceId);
      if (onWorkspaceDeleted) onWorkspaceDeleted(Number(workspaceId));
      navigate("/workspaces");
    } catch (err: any) {
      setError(err.message || "Failed to delete workspace");
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Workspace Settings & AI Configuration
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Customize post tone, club hashtags, languages, and Google Gemini API keys for {workspace?.workspace_name || "this workspace"}.
        </p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs">
          ✓ {message}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs">
          ⚠️ {error}
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Basic Details */}
        <div className="bg-gray-800/90 border border-gray-700/80 rounded-2xl p-6 shadow-md space-y-4">
          <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
            <span>🛡️</span>
            <span>Workspace & Club Branding</span>
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Workspace / Page Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Default Club Hashtags
              </label>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#COYG #Arsenal #PremierLeague"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition font-mono text-xs"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                These tags will be appended deterministically to all generated AI posts so Gemini doesn't waste tokens or hallucinate random tags.
              </p>
            </div>
          </div>
        </div>

        {/* AI Content Studio Defaults */}
        <div className="bg-gray-800/90 border border-gray-700/80 rounded-2xl p-6 shadow-md space-y-4">
          <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
            <span>✨</span>
            <span>AI Studio Default Presets</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Default Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="hype">🔥 Hype (Excited & Bold)</option>
                <option value="banter">😂 Banter (Cheeky & Playful)</option>
                <option value="professional">👔 Professional (Calm & Journalistic)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Default Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="english">🇬🇧 English (Global)</option>
                <option value="banglish">💬 Banglish (Phonetic Romanized)</option>
                <option value="bengali">🇧🇩 Bengali (বাংলা Script)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Google Gemini Free-Tier API Key */}
        <div className="bg-gray-800/90 border border-gray-700/80 rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
              <span>🤖</span>
              <span>Google Gemini API Key (100% Free)</span>
            </h2>
            {workspace?.has_gemini_key ? (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                ✓ Key Configured
              </span>
            ) : (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                Using Fallback AI
              </span>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-300">
              API Key {workspace?.has_gemini_key ? "(Leave blank to keep current key)" : ""}
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder={workspace?.has_gemini_key ? "••••••••••••••••••••••••••••••••" : "Paste your AI Studio key: AIzaSy..."}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 pr-20 text-sm text-white focus:outline-none focus:border-indigo-500 transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-200"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>

            <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-xl text-indigo-300 text-xs space-y-1.5 mt-2">
              <div className="flex items-center gap-1.5 font-semibold text-indigo-200">
                <span>💡</span>
                <span>Get a Free API Key</span>
              </div>
              <p className="text-[11px] leading-relaxed text-indigo-200/80">
                Google provides Gemini Flash on a free tier (1,500 requests/day, 1M tokens/min) with no credit card required at{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-indigo-300 hover:text-white font-semibold"
                >
                  aistudio.google.com ↗
                </a>.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition shadow-lg disabled:opacity-50"
          >
            {saving ? "Saving Changes..." : "Save All Settings"}
          </button>
        </div>
      </form>

      {/* Football Data & Tracking Summary */}
      <div className="bg-gray-800/90 border border-gray-700/80 rounded-2xl p-6 shadow-md space-y-3">
        <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
          <span>⚽</span>
          <span>Football Data Status</span>
        </h2>
        <div className="text-xs text-gray-300 space-y-1">
          <p><span className="text-gray-500">Provider:</span> Football Data Mock Provider (Active)</p>
          <p><span className="text-gray-500">Tracked Club:</span> {trackedTeam ? trackedTeam.team_name : "None selected"}</p>
          <p><span className="text-gray-500">RSS News Aggregator:</span> BBC Sport, Sky Sports & The Guardian</p>
          <p><span className="text-gray-500">Live Polling:</span> 5 minutes during active matches</p>
        </div>
      </div>

      {/* API Quota Rules */}
      {usage && (
        <div className="bg-gray-800/90 border border-gray-700/80 rounded-2xl p-6 shadow-md space-y-3">
          <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
            <span>🛡️</span>
            <span>API Quota Protection</span>
          </h2>
          <div className="text-xs text-gray-300 space-y-2">
            <div className="flex justify-between">
              <span>Daily Free-Tier Quota:</span>
              <span className="font-semibold text-gray-100">{usage.daily_limit} calls</span>
            </div>
            <div className="flex justify-between">
              <span>Used Today:</span>
              <span className="font-semibold text-emerald-400">{usage.used_today} calls ({usage.percentage}%)</span>
            </div>
            <div className="flex justify-between">
              <span>Remaining:</span>
              <span className="font-semibold text-gray-100">{usage.remaining} calls</span>
            </div>
            <p className="text-[11px] text-gray-400 pt-1 border-t border-gray-700/60">
              Yellow warning triggers at 70%, critical warning at 90%, and all provider fetches safely pause at 100% until midnight UTC.
            </p>
          </div>
        </div>
      )}

      {/* Danger Zone: Delete Workspace */}
      <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-6 shadow-md space-y-3">
        <h2 className="text-base font-bold text-red-400">Danger Zone</h2>
        <p className="text-xs text-gray-400">
          Permanently delete this workspace and all associated post drafts, match snapshots, and tracking history.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition shadow disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete Workspace"}
        </button>
      </div>
    </div>
  );
};
