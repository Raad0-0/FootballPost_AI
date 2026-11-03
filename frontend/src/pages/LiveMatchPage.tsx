import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getDashboard } from "../api/teams";
import { DraftCard } from "../components/DraftCard";
import { LiveMatchBanner } from "../components/LiveMatchBanner";
import { useDrafts } from "../hooks/useDrafts";
import { useLiveMatch } from "../hooks/useLiveMatch";
import type { DashboardData } from "../types/team";

export const LiveMatchPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    match,
    fetching,
    cooldownSeconds,
    message,
    error,
    triggerFetchNow,
  } = useLiveMatch(workspaceId || "", dashboard?.live_match as any);

  const {
    drafts,
    editDraft,
    changeStatus,
    copyDraftToClipboard,
    removeDraft,
    refresh: refreshDrafts,
  } = useDrafts(workspaceId || "");

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    getDashboard(workspaceId)
      .then((d) => setDashboard(d))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleFetchWithRefresh = async () => {
    const res = await triggerFetchNow();
    if (res && res.new_drafts_count > 0) {
      await refreshDrafts();
    }
  };

  const currentMatch = match || dashboard?.live_match;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Live Matchday Monitor
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Monitor your club's matchday events in real time and receive instant post drafts.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500 animate-pulse text-sm">
          Checking live match status...
        </div>
      ) : !currentMatch ? (
        <div className="bg-gray-800/60 border border-dashed border-gray-700 rounded-2xl p-10 text-center space-y-3">
          <span className="text-4xl">⏱️</span>
          <h2 className="text-lg font-bold text-gray-200">No Match Currently In Progress</h2>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Live auto-refresh runs every 5 minutes when a match kicks off. You can also trigger a manual fetch anytime using the button below.
          </p>
          <div className="pt-2">
            <button
              onClick={handleFetchWithRefresh}
              disabled={fetching || cooldownSeconds > 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition disabled:opacity-50"
            >
              {fetching ? "Checking..." : cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : "Check for Live Match"}
            </button>
          </div>
          {message && <div className="text-xs text-emerald-400">{message}</div>}
          {error && <div className="text-xs text-red-400">{error}</div>}
        </div>
      ) : (
        <>
          {/* Live Hero Banner */}
          <LiveMatchBanner
            match={currentMatch}
            fetching={fetching}
            cooldownSeconds={cooldownSeconds}
            message={message}
            error={error}
            onFetchNow={handleFetchWithRefresh}
          />

          {/* Generated Matchday Drafts Section */}
          <div className="space-y-4 pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                <span>📝</span>
                <span>Matchday Post Drafts ({drafts.length})</span>
              </h2>
              <span className="text-xs text-gray-400">
                Click "Copy Post" to quickly paste directly to Facebook.
              </span>
            </div>

            {drafts.length === 0 ? (
              <div className="text-center py-8 bg-gray-800/30 rounded-xl border border-dashed border-gray-700 text-xs text-gray-400">
                No event drafts created yet. When goals, cards, or half-time arrive, drafts will appear here!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {drafts.map((draft) => (
                  <DraftCard
                    key={draft.id}
                    draft={draft}
                    onEdit={editDraft}
                    onChangeStatus={changeStatus}
                    onCopy={copyDraftToClipboard}
                    onDelete={removeDraft}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

