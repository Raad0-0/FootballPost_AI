import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getDashboard } from "../api/teams";
import { getWorkspace } from "../api/workspaces";
import { getClubNews } from "../api/newsAi";
import { LiveMatchBanner } from "../components/LiveMatchBanner";
import { PostStudioModal, type PostStudioContext } from "../components/PostStudioModal";
import { useDrafts } from "../hooks/useDrafts";
import { useLiveMatch } from "../hooks/useLiveMatch";
import type { DashboardData } from "../types/team";
import type { Workspace } from "../types/workspace";
import type { ClubNews } from "../types/ai";

export const DashboardPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [newsList, setNewsList] = useState<ClubNews[]>([]);
  const [newsCategory, setNewsCategory] = useState<"all" | "transfers" | "news">("all");
  const [loading, setLoading] = useState(true);
  const [loadingNews, setLoadingNews] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Content Studio Modal State
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioContext, setStudioContext] = useState<PostStudioContext | null>(null);

  const {
    match: liveMatch,
    fetching,
    cooldownSeconds,
    message,
    error: liveError,
    triggerFetchNow,
  } = useLiveMatch(workspaceId || "", dashboard?.live_match as any);

  const { drafts, refresh: refreshDrafts, copyDraftToClipboard } = useDrafts(workspaceId || "");

  const loadData = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const [dashData, wsData, newsData] = await Promise.all([
        getDashboard(workspaceId),
        getWorkspace(workspaceId),
        getClubNews(workspaceId).catch(() => []),
      ]);
      setDashboard(dashData);
      setWorkspace(wsData);
      setNewsList(newsData);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshNews = async () => {
    if (!workspaceId) return;
    setLoadingNews(true);
    try {
      const freshNews = await getClubNews(workspaceId, true);
      setNewsList(freshNews);
    } catch (err: any) {
      console.error("Failed to refresh news:", err);
    } finally {
      setLoadingNews(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const openStudio = (context: PostStudioContext) => {
    setStudioContext(context);
    setStudioOpen(true);
  };

  const filteredNews = newsList.filter((item) => {
    if (newsCategory === "transfers") return item.category === "transfer";
    if (newsCategory === "news") return item.category === "news";
    return true;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500 animate-pulse text-sm">
        Loading ClubPost Dashboard & Live Feeds...
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-950/60 border border-red-500/40 rounded-2xl p-6 text-center text-red-300">
          <p className="font-semibold">{error || "Could not load workspace."}</p>
          <Link
            to="/workspaces"
            className="inline-block mt-3 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs rounded-xl text-gray-200"
          >
            ← Back to Workspaces
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Workspace Header & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {dashboard.workspace_name}
            </h1>
            {workspace?.has_gemini_key ? (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Gemini Active
              </span>
            ) : (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                ✨ Free-Tier AI Fallback
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <span>Tracked Club:</span>
              {dashboard.tracked_team ? (
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <span>🛡️</span>
                  <span>{dashboard.tracked_team.team_name}</span>
                </span>
              ) : (
                <span className="text-amber-400 font-medium">None selected</span>
              )}
            </div>

            {workspace?.default_hashtags && (
              <div className="hidden sm:flex items-center gap-1 text-slate-500">
                <span>•</span>
                <span className="text-slate-400 font-mono text-[11px]">
                  {workspace.default_hashtags}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5">
          <Link
            to={`/workspace/${workspaceId}/settings`}
            className="inline-flex items-center gap-1.5 bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-xs font-semibold px-3.5 py-2 rounded-xl border border-gray-700 transition"
          >
            <span>⚙️</span>
            <span>Settings</span>
          </Link>
          <Link
            to={`/workspace/${workspaceId}/drafts`}
            className="inline-flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold px-3.5 py-2 rounded-xl border border-indigo-500/30 transition"
          >
            <span>📋</span>
            <span>Drafts Queue ({drafts.length})</span>
          </Link>
          {!dashboard.tracked_team && (
            <Link
              to={`/workspace/${workspaceId}/teams`}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md"
            >
              <span>🔍</span>
              <span>Pick Club</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Dual-Zone Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* =========================================
            ZONE 1: MATCH CENTER (7 COLUMNS)
        ========================================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* Live Match Hero Banner or "No Live Match" Card */}
          {(liveMatch || dashboard.live_match) ? (
            <Link
              to={`/workspace/${workspaceId}/match/${(liveMatch || dashboard.live_match)?.id}`}
              className="block group"
            >
              <LiveMatchBanner
                match={(liveMatch || dashboard.live_match)!}
                fetching={fetching}
                cooldownSeconds={cooldownSeconds}
                message={message}
                error={liveError}
                onFetchNow={triggerFetchNow}
              />
            </Link>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3.5">
                <span className="text-3xl">⏱️</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">No Live Match in Progress</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {dashboard.next_fixture
                      ? `Next: ${dashboard.next_fixture.home_team} vs ${dashboard.next_fixture.away_team} • ${dashboard.next_fixture.kickoff_time ? new Date(dashboard.next_fixture.kickoff_time).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Upcoming"}`
                      : "Live tracking automatically engages on matchday kickoff."}
                  </p>
                </div>
              </div>
              {dashboard.next_fixture && (
                <Link
                  to={`/workspace/${workspaceId}/match/${dashboard.next_fixture.id}`}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
                >
                  Preview Next →
                </Link>
              )}
            </div>
          )}

          {/* Upcoming Matches (Next 3 Matches) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📅</span>
                <span>Upcoming Matches (Next 3)</span>
              </h2>
              <span className="text-[11px] text-slate-400">Click any to enter match</span>
            </div>

            <div className="space-y-2.5">
              {(dashboard.upcoming_fixtures && dashboard.upcoming_fixtures.length > 0
                ? dashboard.upcoming_fixtures
                : dashboard.next_fixture
                ? [dashboard.next_fixture]
                : []
              ).map((f) => (
                <Link
                  key={f.id}
                  to={`/workspace/${workspaceId}/match/${f.id}`}
                  className="block bg-slate-900/90 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 transition shadow-sm group cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-bold uppercase mb-1">
                        <span>{f.league_name || "Matchday"}</span>
                        <span>•</span>
                        <span className="text-slate-400 font-normal">
                          {f.kickoff_time ? new Date(f.kickoff_time).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Scheduled"}
                        </span>
                        {f.venue && <span className="text-slate-500 hidden sm:inline">• 🏟️ {f.venue}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-100 group-hover:text-indigo-300 transition truncate">
                          {f.home_team} vs {f.away_team}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openStudio({
                            contextType: "fixture",
                            headline: `Match Preview: ${f.home_team} vs ${f.away_team}`,
                            matchId: Number(f.id),
                            contextData: {
                              match: `${f.home_team} vs ${f.away_team}`,
                              kickoff_time: f.kickoff_time,
                              venue: f.venue,
                              league: f.league_name,
                            },
                          });
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold transition"
                      >
                        ✨ AI Post
                      </button>
                      <span className="text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition font-bold text-sm">
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Results (Last 3 Matches) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🏁</span>
                <span>Recent Results (Last 3)</span>
              </h2>
              <span className="text-[11px] text-slate-400">Click any to enter match</span>
            </div>

            <div className="space-y-2.5">
              {(dashboard.recent_results && dashboard.recent_results.length > 0
                ? dashboard.recent_results
                : dashboard.recent_result
                ? [dashboard.recent_result]
                : []
              ).map((r) => (
                <Link
                  key={r.id}
                  to={`/workspace/${workspaceId}/match/${r.id}`}
                  className="block bg-slate-900/90 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 transition shadow-sm group cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold uppercase mb-1">
                        <span>{r.league_name || "Finished"}</span>
                        <span>•</span>
                        <span className="text-slate-400 font-normal">Full Time</span>
                        {r.venue && <span className="text-slate-500 hidden sm:inline">• 🏟️ {r.venue}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-100 group-hover:text-emerald-300 transition truncate">
                          {r.home_team} {r.home_score} - {r.away_score} {r.away_team}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openStudio({
                            contextType: "result",
                            headline: `Full-Time: ${r.home_team} ${r.home_score} - ${r.away_score} ${r.away_team}`,
                            matchId: Number(r.id),
                            contextData: {
                              match: `${r.home_team} vs ${r.away_team}`,
                              score: `${r.home_score} - ${r.away_score}`,
                              league: r.league_name,
                            },
                          });
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold transition"
                      >
                        ✨ AI Wrap
                      </button>
                      <span className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition font-bold text-sm">
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Drafts Queue Quick Access */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>📋</span>
                  <span>Ready Drafts Queue</span>
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {drafts.length} posts
                </span>
              </div>
              <Link
                to={`/workspace/${workspaceId}/drafts`}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                Manage Queue →
              </Link>
            </div>

            {drafts.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                Drafts queue is empty. Generate posts from matches or news to store them here!
              </p>
            ) : (
              <div className="space-y-2">
                {drafts.slice(0, 3).map((d) => (
                  <div
                    key={d.id}
                    className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-0.5">
                        <span>{d.post_type}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-500 font-normal">
                          {new Date(d.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 truncate">
                        {d.content}
                      </p>
                    </div>

                    <button
                      onClick={() => copyDraftToClipboard(d)}
                      className="px-2.5 py-1 text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-lg font-medium transition whitespace-nowrap"
                    >
                      📋 Copy
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* =========================================
            ZONE 2: NEWS & TRANSFER CENTER (5 COLUMNS)
        ========================================= */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>📰</span>
              <span>News & Transfers</span>
            </h2>
            <button
              onClick={handleRefreshNews}
              disabled={loadingNews}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1 font-medium disabled:opacity-50"
            >
              <span>{loadingNews ? "Refreshing..." : "🔄 Refresh"}</span>
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-medium">
            <button
              onClick={() => setNewsCategory("all")}
              className={`flex-1 py-1.5 rounded-lg transition ${
                newsCategory === "all"
                  ? "bg-indigo-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All ({newsList.length})
            </button>
            <button
              onClick={() => setNewsCategory("transfers")}
              className={`flex-1 py-1.5 rounded-lg transition ${
                newsCategory === "transfers"
                  ? "bg-indigo-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🔄 Transfers
            </button>
            <button
              onClick={() => setNewsCategory("news")}
              className={`flex-1 py-1.5 rounded-lg transition ${
                newsCategory === "news"
                  ? "bg-indigo-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              📰 Club News
            </button>
          </div>

          {/* News List */}
          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            {filteredNews.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/60 rounded-2xl border border-dashed border-slate-800 p-6 text-xs text-slate-500">
                No articles found for this filter. Hit refresh to check live RSS feeds!
              </div>
            ) : (
              filteredNews.map((article) => {
                const isTransfer = article.category === "transfer";
                const isTier1 = article.credibility_tier === "tier1";

                return (
                  <div
                    key={article.id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 space-y-3 transition shadow-sm group"
                  >
                    {/* Tags row */}
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[10px] ${
                            isTransfer
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {isTransfer ? "🔄 Transfer" : "📰 Club News"}
                        </span>

                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            isTier1
                              ? "text-emerald-400 bg-emerald-500/10"
                              : "text-slate-400 bg-slate-800"
                          }`}
                        >
                          {isTier1 ? "Tier 1 Verified" : "Trusted Report"}
                        </span>
                      </div>

                      <span className="text-slate-500 font-medium">
                        {article.source_name}
                      </span>
                    </div>

                    {/* Headline */}
                    <h3 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition leading-snug">
                      {article.headline}
                    </h3>

                    {/* Summary snippet */}
                    {article.summary && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {article.summary}
                      </p>
                    )}

                    {/* Actions: Source Link & AI Post Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <a
                        href={article.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-400 font-medium transition"
                      >
                        <span>Source Link</span>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>

                      <button
                        onClick={() =>
                          openStudio({
                            contextType: article.category,
                            headline: article.headline,
                            sourceUrl: article.source_url,
                            sourceName: article.source_name,
                            contextData: {
                              headline: article.headline,
                              summary: article.summary,
                              source: article.source_name,
                              category: article.category,
                            },
                          })
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold transition shadow-sm"
                      >
                        <span>✨</span>
                        <span>AI Post</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* AI Post Studio Modal */}
      <PostStudioModal
        isOpen={studioOpen}
        onClose={() => setStudioOpen(false)}
        workspaceId={workspaceId || ""}
        initialContext={studioContext}
        defaultTone={workspace?.default_tone}
        defaultLanguage={workspace?.default_language}
        defaultHashtags={workspace?.default_hashtags}
        onDraftSaved={refreshDrafts}
      />
    </div>
  );
};
