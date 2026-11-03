import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMatch } from "../api/matches";
import { getWorkspace } from "../api/workspaces";
import { generateAIPost } from "../api/newsAi";
import { createDraft, getDrafts } from "../api/drafts";
import { formatKickoff, formatScore } from "../utils/formatMatch";
import type { Match, MatchEvent } from "../types/match";
import type { Workspace } from "../types/workspace";
import type { PostDraft } from "../types/draft";
import type { AIPostGenerateRequest, AIPostGenerateResponse, PostLanguage, PostTone } from "../types/ai";

export const MatchDetailPage: React.FC = () => {
  const { workspaceId, matchId } = useParams<{ workspaceId: string; matchId: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [existingDrafts, setExistingDrafts] = useState<PostDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active event or context selected on the right
  const [selectedEvent, setSelectedEvent] = useState<MatchEvent | null>(null);
  const [postMode, setPostMode] = useState<"event" | "fulltime" | "halftime" | "fixture" | "lineup" | "analysis">("event");
  const [rightTab, setRightTab] = useState<"moments" | "lineups" | "analysis">("moments");
  const [lineupTeam, setLineupTeam] = useState<"home" | "away">("home");

  // Post generation controls
  const [tone, setTone] = useState<PostTone>("hype");
  const [language, setLanguage] = useState<PostLanguage>("english");
  const [includeHashtags, setIncludeHashtags] = useState<boolean>(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Generated variations & draft editor
  const [variations, setVariations] = useState<{
    short: string;
    story: string;
    discussion: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"short" | "story" | "discussion">("short");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId || !matchId) return;
    setLoading(true);
    Promise.all([
      getMatch(workspaceId, matchId),
      getWorkspace(workspaceId).catch(() => null),
      getDrafts(workspaceId).catch(() => []),
    ])
      .then(([m, ws, allDrafts]) => {
        setMatch(m);
        if (ws) {
          setWorkspace(ws);
          if (ws.default_tone) setTone(ws.default_tone as PostTone);
          if (ws.default_language) setLanguage(ws.default_language as PostLanguage);
        }
        const matchDrafts = allDrafts.filter((d) => String(d.match_id) === String(matchId));
        setExistingDrafts(matchDrafts);

        // Auto-select initial mode
        if (m.events && m.events.length > 0) {
          setSelectedEvent(m.events[0]);
          setPostMode("event");
          setRightTab("moments");
        } else if (m.status === "finished") {
          setPostMode("analysis");
          setRightTab("analysis");
        } else {
          setPostMode("fixture");
          setRightTab(m.lineups ? "lineups" : "moments");
        }

        // If existing drafts exist for this match, populate preview
        if (matchDrafts.length > 0) {
          setVariations({
            short: matchDrafts[0].content,
            story: matchDrafts[0].content,
            discussion: matchDrafts[0].content,
          });
        }
      })
      .catch((err) => setError(err.message || "Failed to load match details"))
      .finally(() => setLoading(false));
  }, [workspaceId, matchId]);

  const handleSelectEvent = (evt: MatchEvent) => {
    setSelectedEvent(evt);
    setPostMode("event");
    setRightTab("moments");
    setVariations(null); // Reset to prompt generate
  };

  const matchMinute = match?.minute || 0;
  const isHalfTimeEligible = Boolean(
    match && (match.status === "finished" || match.status === "halftime" || (match.status === "live" && matchMinute >= 45))
  );
  const isFullTimeEligible = Boolean(
    match && (match.status === "finished" || matchMinute >= 90)
  );

  const handleSelectMode = (mode: "fulltime" | "halftime" | "fixture" | "lineup" | "analysis") => {
    if (mode === "halftime" && !isHalfTimeEligible) return;
    if (mode === "fulltime" && !isFullTimeEligible) return;

    setSelectedEvent(null);
    setPostMode(mode);
    setVariations(null);
    if (mode === "lineup") {
      setRightTab("lineups");
    } else if (mode === "analysis") {
      setRightTab("analysis");
    } else {
      setRightTab("moments");
    }
  };

  const handleGeneratePost = async (overrideMode?: string) => {
    if (!workspaceId || !match) return;
    setGenerating(true);
    setGenError(null);

    const activeMode = (overrideMode || postMode) as "event" | "fulltime" | "halftime" | "fixture" | "lineup" | "analysis";
    let contextType = "fixture";
    let contextData: Record<string, any> = {};

    if (activeMode === "lineup") {
      contextType = "lineup";
      const lineups = match.lineups;
      const isHome = lineupTeam === "home";
      const targetXI = isHome ? lineups?.home_starting_xi : lineups?.away_starting_xi;
      const targetBench = isHome ? lineups?.home_bench : lineups?.away_bench;
      const targetNews = isHome ? lineups?.home_team_news : lineups?.away_team_news;
      const formation = isHome ? (lineups?.home_formation || "4-3-3") : (lineups?.away_formation || "4-2-3-1");
      const teamName = isHome ? match.home_team : match.away_team;
      const oppName = isHome ? match.away_team : match.home_team;

      contextData = {
        team: teamName,
        opponent: oppName,
        formation: formation,
        is_confirmed: lineups?.is_confirmed,
        starting_xi: targetXI?.map((p) => `#${p.number} ${p.name} (${p.pos}${p.captain ? " - C" : ""})`).join(", ") || "",
        bench: targetBench?.join(", ") || "",
        changes: targetNews?.starting_changes?.join("; ") || "",
        missing: targetNews?.missing_players?.join("; ") || "",
        tactics: targetNews?.tactical_notes || "",
        venue: match.venue || "Stadium",
        league: match.league_name || "League",
      };
    } else if (activeMode === "event" && selectedEvent) {
      contextType = selectedEvent.event_type;
      contextData = {
        event_type: selectedEvent.event_type,
        player: selectedEvent.player_name || "Star Player",
        team: selectedEvent.team_name || match.home_team,
        minute: selectedEvent.minute || "Live",
        score: `${match.home_score ?? 0} - ${match.away_score ?? 0}`,
        match: `${match.home_team} vs ${match.away_team}`,
        detail: selectedEvent.event_detail || "",
      };
    } else if (activeMode === "halftime") {
      contextType = "halftime";
      contextData = {
        team: match.home_team,
        opponent: match.away_team,
        match: `${match.home_team} vs ${match.away_team}`,
        score: `${match.home_score ?? 0} - ${match.away_score ?? 0}`,
        league: match.league_name || "League Match",
        events: match.events?.filter(e => (e.minute || 0) <= 45).map(e => `${e.minute}' ${e.player_name} (${e.event_type})`).join(", ") || "",
      };
    } else if (activeMode === "analysis") {
      contextType = "analysis";
      const analysis = match.analysis;
      contextData = {
        team: match.home_team,
        opponent: match.away_team,
        score: `${match.home_score ?? 0} - ${match.away_score ?? 0}`,
        man_of_the_match: analysis?.man_of_the_match || "Key Player",
        rating: analysis?.rating || "8.8/10",
        summary: analysis?.summary || `Full-time tactical review: ${match.home_team} ${match.home_score ?? 0}-${match.away_score ?? 0} ${match.away_team}`,
        key_stats: analysis?.key_stats || { possession: "58% - 42%", shots: "16 - 8", xg: "2.4 - 0.8" },
        takeaways: analysis?.tactical_takeaways?.join("; ") || "",
        impact: analysis?.season_impact || "Key 3 points secured.",
      };
    } else if (activeMode === "fulltime") {
      contextType = "fulltime";
      contextData = {
        match: `${match.home_team} vs ${match.away_team}`,
        score: `${match.home_score ?? 0} - ${match.away_score ?? 0}`,
        league: match.league_name || "League Match",
        events: match.events?.map((e) => `${e.minute}' ${e.player_name} (${e.event_type})`).join(", ") || "",
      };
    } else {
      contextType = "fixture";
      contextData = {
        match: `${match.home_team} vs ${match.away_team}`,
        kickoff_time: match.kickoff_time,
        venue: match.venue || "Stadium",
        league: match.league_name || "League",
      };
    }

    try {
      const payload: AIPostGenerateRequest = {
        context_type: contextType,
        context_data: contextData,
        tone,
        language,
        include_hashtags: includeHashtags,
      };

      const res: AIPostGenerateResponse = await generateAIPost(workspaceId, payload);
      setVariations(res.variations);
      setActiveTab("short");
    } catch (err: any) {
      setGenError(err.message || "Failed to generate post. Check Gemini key in settings.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (key: "short" | "story" | "discussion") => {
    if (!variations) return;
    const text = variations[key];
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const handleSaveDraft = async (key: "short" | "story" | "discussion") => {
    if (!variations || !workspaceId || !match) return;
    setSavedKey(key);
    try {
      const newDraft = await createDraft(workspaceId, {
        match_id: Number(match.id),
        post_type: postMode === "event" ? selectedEvent?.event_type || "goal" : postMode,
        content: variations[key],
      });
      setExistingDrafts((prev) => [newDraft, ...prev]);
      setTimeout(() => setSavedKey(null), 3000);
    } catch (err: any) {
      alert(`Could not save draft: ${err.message || "Unknown error"}`);
      setSavedKey(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center text-gray-500 animate-pulse text-sm">
        Loading match center data & timeline...
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-red-950/60 border border-red-500/40 rounded-2xl p-6 text-center text-red-300">
          <p className="font-semibold">{error || "Match not found."}</p>
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

  const isLive = match.status === "live" || match.status === "halftime";
  const isFinished = match.status === "finished";

  // Compute focus details for the prominent banner
  let focusIcon = "🏟️";
  let focusTitle = "Pre-Match Fixture Preview";
  let focusBadge = "PRE-MATCH PREVIEW";
  let focusSub = `${match.home_team} vs ${match.away_team} • ${match.venue || "Matchday"}`;
  let focusGradient = "from-indigo-950/90 via-slate-900 to-indigo-900/40 border-indigo-500/70 text-indigo-300";

  if (postMode === "event" && selectedEvent) {
    const isGoal = selectedEvent.event_type === "goal";
    const isCard = selectedEvent.event_type.includes("card");
    const isSub = selectedEvent.event_type === "substitution" || selectedEvent.event_type === "sub";
    focusIcon = isGoal ? "⚽" : isCard ? "🟨" : isSub ? "🔄" : "⚡";
    focusTitle = `${selectedEvent.minute ? `${selectedEvent.minute}’ ` : ""}${selectedEvent.player_name || selectedEvent.team_name || "Match Event"}`;
    focusBadge = isGoal ? "GOAL ALERT" : isCard ? "CARD DISMISSAL" : isSub ? "TACTICAL SUBSTITUTION" : "KEY EVENT";
    focusSub = selectedEvent.event_detail || `${match.home_team} vs ${match.away_team} (${match.home_score ?? 0} - ${match.away_score ?? 0})`;
    focusGradient = isGoal
      ? "from-emerald-950/90 via-slate-900 to-emerald-900/40 border-emerald-500/70 text-emerald-300"
      : isCard
        ? "from-amber-950/90 via-slate-900 to-amber-900/40 border-amber-500/70 text-amber-300"
        : isSub
          ? "from-cyan-950/90 via-slate-900 to-cyan-900/40 border-cyan-500/70 text-cyan-300"
          : "from-indigo-950/90 via-slate-900 to-indigo-900/40 border-indigo-500/70 text-indigo-300";
  } else if (postMode === "lineup") {
    const isConf = match.lineups?.is_confirmed;
    focusIcon = "📋";
    focusTitle = `Official Starting XI Announcement (${match.lineups?.home_formation || "4-3-3"})`;
    focusBadge = isConf ? "CONFIRMED STARTING XI" : "PROVISIONAL (45M RELEASE)";
    focusSub = `${match.home_team} vs ${match.away_team} • ${match.lineups?.status_badge || "Tactical Formation"}`;
    focusGradient = isConf
      ? "from-emerald-950/90 via-slate-900 to-teal-900/40 border-emerald-500/70 text-emerald-300"
      : "from-amber-950/90 via-slate-900 to-orange-900/40 border-amber-500/70 text-amber-300";
  } else if (postMode === "halftime") {
    focusIcon = "⏱️";
    focusTitle = `Half-Time Score & Tactical Wrap (${match.home_score ?? 0} - ${match.away_score ?? 0})`;
    focusBadge = "HALF-TIME SUMMARY";
    focusSub = `${match.home_team} vs ${match.away_team} • 45 Minutes Played`;
    focusGradient = "from-indigo-950/90 via-slate-900 to-purple-900/40 border-indigo-500/70 text-indigo-300";
  } else if (postMode === "fulltime") {
    focusIcon = "🏁";
    focusTitle = `Full-Time Result Wrap (${match.home_score ?? 0} - ${match.away_score ?? 0})`;
    focusBadge = "FULL-TIME RESULT";
    focusSub = `${match.home_team} vs ${match.away_team} • Final Whistle`;
    focusGradient = "from-purple-950/90 via-slate-900 to-pink-900/40 border-purple-500/70 text-purple-300";
  } else if (postMode === "analysis") {
    focusIcon = "📊";
    focusTitle = `Full Game Tactical Analysis & Ratings`;
    focusBadge = "TACTICAL GAME ANALYSIS";
    focusSub = `Man of the Match: ${match.analysis?.man_of_the_match || "MVP"} • Rating: ${match.analysis?.rating || "8.8/10"}`;
    focusGradient = "from-cyan-950/90 via-slate-900 to-blue-900/40 border-cyan-400/80 text-cyan-200";
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <Link
          to={`/workspace/${workspaceId}/dashboard`}
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition font-medium"
        >
          <span>←</span>
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400">Competition:</span>
          <span className="font-bold text-gray-200">{match.league_name || "Matchday"}</span>
        </div>
      </div>

      {/* Main Split-Screen Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ====================================================
            LEFT SIDE: POST DRAFTS & GEMINI STUDIO (7 COLUMNS)
        ==================================================== */}
        <div className="lg:col-span-7 space-y-5">
          {/* Post Draft Control Box */}
          <div className="bg-gray-800/95 border border-gray-700/80 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-700/80">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Social Post Studio
                </h2>
              </div>

              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                1 Call = 3 Variations
              </span>
            </div>

            {/* Super Prominent Active Focus Highlight Banner */}
            <div className={`p-4 rounded-2xl border-2 bg-gradient-to-r ${focusGradient} shadow-lg relative overflow-hidden transition-all duration-200`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-current animate-ping opacity-75"></span>
                  <span className="font-extrabold">NOW CREATING DRAFT</span>
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-black/50 border border-white/10 uppercase tracking-wide">
                  {focusBadge}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 rounded-xl bg-black/30 border border-white/10 shrink-0">
                  {focusIcon}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-black text-white truncate tracking-tight">
                    {focusTitle}
                  </h3>
                  <p className="text-xs text-gray-200/90 truncate mt-0.5">
                    {focusSub}
                  </p>
                </div>
              </div>
            </div>

            {/* Tone & Language Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-900/60 p-3 rounded-xl border border-gray-700/50">
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  Post Tone
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(["hype", "banter", "professional"] as PostTone[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTone(t)}
                      className={`py-1 rounded-lg text-[11px] font-medium border transition capitalize ${tone === t
                          ? "bg-indigo-600/30 border-indigo-500 text-indigo-200"
                          : "bg-gray-800/80 border-gray-700 text-gray-400 hover:text-gray-200"
                        }`}
                    >
                      {t === "hype" ? "🔥 Hype" : t === "banter" ? "😂 Banter" : "👔 Pro"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  Language
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(["english", "banglish", "bengali"] as PostLanguage[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLanguage(l)}
                      className={`py-1 rounded-lg text-[11px] font-medium border transition ${language === l
                          ? "bg-indigo-600/30 border-indigo-500 text-indigo-200"
                          : "bg-gray-800/80 border-gray-700 text-gray-400 hover:text-gray-200"
                        }`}
                    >
                      {l === "english" ? "🇬🇧 EN" : l === "banglish" ? "💬 Banglish" : "🇧🇩 বাংলা"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Hashtag options and Generate Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={includeHashtags}
                  onChange={(e) => setIncludeHashtags(e.target.checked)}
                  className="rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-0"
                />
                <span className="truncate max-w-[240px]">
                  Attach hashtags {workspace?.default_hashtags ? `(${workspace.default_hashtags})` : ""}
                </span>
              </label>

              <button
                onClick={() => handleGeneratePost()}
                disabled={generating}
                className="py-2 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {generating ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Generating with Gemini...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>{variations ? "Regenerate Draft" : "Generate Draft with Gemini"}</span>
                  </>
                )}
              </button>
            </div>

            {genError && (
              <div className="p-3 bg-red-950/60 border border-red-500/30 rounded-xl text-red-300 text-xs">
                ⚠️ {genError}
              </div>
            )}

            {/* Draft Editor / Output Variations */}
            {variations ? (
              <div className="space-y-3 pt-2">
                {/* 3 Tabs */}
                <div className="flex border-b border-gray-700 gap-2">
                  {[
                    { id: "short", label: "⚡ Short & Punchy" },
                    { id: "story", label: "🔥 Narrative Story" },
                    { id: "discussion", label: "💬 Fan Debate Question" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`pb-2 px-3 text-xs font-semibold border-b-2 transition ${activeTab === tab.id
                          ? "border-indigo-500 text-white"
                          : "border-transparent text-gray-400 hover:text-gray-200"
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Textarea */}
                <div className="space-y-2">
                  <textarea
                    rows={6}
                    value={variations[activeTab]}
                    onChange={(e) =>
                      setVariations({
                        ...variations,
                        [activeTab]: e.target.value,
                      })
                    }
                    className="w-full bg-gray-900 border border-gray-700/80 rounded-xl p-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed"
                  />

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{variations[activeTab]?.length || 0} characters</span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveDraft(activeTab)}
                        className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium transition"
                      >
                        {savedKey === activeTab ? (
                          <span className="text-emerald-400 font-bold">✓ Saved</span>
                        ) : (
                          "💾 Save as Draft"
                        )}
                      </button>

                      <button
                        onClick={() => handleCopy(activeTab)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow ${copiedKey === activeTab
                            ? "bg-emerald-600 text-white"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white"
                          }`}
                      >
                        {copiedKey === activeTab ? "✓ Copied!" : "📋 Copy Post"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-gray-900/40 rounded-xl border border-dashed border-gray-700 text-xs text-gray-400 space-y-2">
                <span className="text-2xl block">📝</span>
                <p className="font-semibold text-gray-200">
                  {isFinished
                    ? "Select an event from the right or click 'Generate Draft with Gemini' for this finished match"
                    : "Click 'Generate Draft with Gemini' to create high-engagement match posts"}
                </p>
                <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                  Gemini produces 3 tailored variations in 1 call with your default club hashtags attached.
                </p>
              </div>
            )}
          </div>

          {/* Existing Saved Drafts for this Match */}
          {existingDrafts.length > 0 && (
            <div className="bg-gray-800/80 border border-gray-700/80 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <span>📋</span>
                <span>Saved Drafts for this match ({existingDrafts.length})</span>
              </h3>
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {existingDrafts.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 bg-gray-900/60 rounded-xl border border-gray-700/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-bold uppercase mb-0.5">
                        <span>{d.post_type}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-500 font-normal">
                          {new Date(d.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-gray-300 truncate">{d.content}</p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(d.content);
                        alert("Copied to clipboard!");
                      }}
                      className="px-2.5 py-1 text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded font-medium"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ====================================================
            RIGHT SIDE: MATCH SCOREBOARD & KEY MOMENTS (5 COLS)
        ==================================================== */}
        <div className="lg:col-span-5 space-y-5">
          {/* Scoreboard Card */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">
                {match.venue || "Stadium"}
              </span>

              {isLive ? (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold uppercase text-[11px] animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  LIVE {match.minute ? `${match.minute}’` : ""}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-gray-800 text-gray-300 font-semibold text-xs border border-gray-700">
                  {isFinished ? "Full Time" : formatKickoff(match.kickoff_time)}
                </span>
              )}
            </div>

            {/* Score Banner */}
            <div className="grid grid-cols-3 items-center py-2 text-center">
              <div className="px-2">
                <div className="font-extrabold text-white text-base sm:text-lg truncate">
                  {match.home_team}
                </div>
                <div className="text-[10px] text-gray-400 uppercase font-semibold">Home</div>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-3xl sm:text-4xl font-black text-indigo-400 tracking-tight">
                  {formatScore(match.home_score, match.away_score)}
                </span>
              </div>

              <div className="px-2">
                <div className="font-extrabold text-white text-base sm:text-lg truncate">
                  {match.away_team}
                </div>
                <div className="text-[10px] text-gray-400 uppercase font-semibold">Away</div>
              </div>
            </div>
          </div>

          {/* Key Moments & Lineups Container */}
          <div className="bg-gray-800/90 border border-gray-700/80 rounded-2xl p-5 shadow-md space-y-4">
            {/* View Selector Tabs */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-700/60">
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setRightTab("moments")}
                  className={`pb-1 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${rightTab === "moments"
                      ? "border-indigo-500 text-white"
                      : "border-transparent text-gray-400 hover:text-gray-200"
                    }`}
                >
                  <span>⚡</span>
                  <span>Moments</span>
                  {match.events && match.events.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-900/50 text-indigo-300 font-semibold border border-indigo-500/30">
                      {match.events.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setRightTab("lineups")}
                  className={`pb-1 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${rightTab === "lineups"
                      ? "border-indigo-500 text-white"
                      : "border-transparent text-gray-400 hover:text-gray-200"
                    }`}
                >
                  <span>📋</span>
                  <span>Lineups</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold border ${match.lineups?.is_confirmed
                      ? "bg-emerald-900/50 text-emerald-300 border-emerald-500/30"
                      : "bg-amber-900/50 text-amber-300 border-amber-500/30"
                    }`}>
                    {match.lineups?.is_confirmed ? "Official" : "45m Drop"}
                  </span>
                </button>

                {isFinished && (
                  <button
                    type="button"
                    onClick={() => setRightTab("analysis")}
                    className={`pb-1 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${rightTab === "analysis"
                        ? "border-cyan-400 text-cyan-200"
                        : "border-transparent text-gray-400 hover:text-gray-200"
                      }`}
                  >
                    <span>📊</span>
                    <span>Game Analysis</span>
                  </button>
                )}
              </div>

              <span className="text-[11px] text-gray-400 hidden sm:inline">
                {rightTab === "moments" ? "Click event to draft" : rightTab === "lineups" ? "Tactical setup" : "Post-match stats"}
              </span>
            </div>

            {/* Quick Context Triggers */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectMode("fixture")}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition text-center truncate ${postMode === "fixture"
                      ? "bg-indigo-600 border-indigo-500 text-white shadow"
                      : "bg-gray-900/60 border-gray-700 text-gray-300 hover:text-white"
                    }`}
                >
                  🏟️ Pre-Match
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectMode("lineup")}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition text-center truncate ${postMode === "lineup"
                      ? "bg-indigo-600 border-indigo-500 text-white shadow"
                      : "bg-gray-900/60 border-gray-700 text-gray-300 hover:text-white"
                    }`}
                >
                  📋 Lineup
                </button>
                <button
                  type="button"
                  disabled={!isHalfTimeEligible}
                  onClick={() => handleSelectMode("halftime")}
                  title={!isHalfTimeEligible ? "Available once match reaches 45' / Half-Time" : "Draft Half-Time Summary"}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition text-center truncate ${!isHalfTimeEligible
                      ? "opacity-35 cursor-not-allowed bg-gray-900/40 border-gray-800 text-gray-500"
                      : postMode === "halftime"
                        ? "bg-indigo-600 border-indigo-500 text-white shadow"
                        : "bg-gray-900/60 border-gray-700 text-gray-300 hover:text-white"
                    }`}
                >
                  ⏱️ Half-Time
                </button>
                <button
                  type="button"
                  disabled={!isFullTimeEligible}
                  onClick={() => handleSelectMode("fulltime")}
                  title={!isFullTimeEligible ? "Available once match reaches 90' / Full-Time" : "Draft Full-Time Result Wrap"}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition text-center truncate ${!isFullTimeEligible
                      ? "opacity-35 cursor-not-allowed bg-gray-900/40 border-gray-800 text-gray-500"
                      : postMode === "fulltime"
                        ? "bg-indigo-600 border-indigo-500 text-white shadow"
                        : "bg-gray-900/60 border-gray-700 text-gray-300 hover:text-white"
                    }`}
                >
                  🏁 Full-Time
                </button>
              </div>

              {isFinished && (
                <button
                  type="button"
                  onClick={() => handleSelectMode("analysis")}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-extrabold border transition flex items-center justify-center gap-2 ${postMode === "analysis"
                      ? "bg-cyan-600/40 border-cyan-400 text-cyan-100 shadow-md ring-1 ring-cyan-400"
                      : "bg-cyan-950/30 border-cyan-800/40 text-cyan-300 hover:bg-cyan-900/40"
                    }`}
                >
                  <span>📊</span>
                  <span>Full Game Tactical Analysis & Ratings Post</span>
                </button>
              )}
            </div>

            {/* TAB 1: KEY MOMENTS */}
            {rightTab === "moments" && (
              <div>
                {!match.events || match.events.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-500 bg-gray-900/40 rounded-xl border border-dashed border-gray-700/60 p-4">
                    No individual in-match events recorded yet. You can still generate pre-match preview or lineup announcements above!
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                    {match.events.map((evt) => {
                      const isGoal = evt.event_type === "goal";
                      const isCard = evt.event_type.includes("card");
                      const isSub = evt.event_type === "substitution" || evt.event_type === "sub";
                      const isSelected = selectedEvent?.id === evt.id && postMode === "event";

                      return (
                        <div
                          key={evt.id}
                          onClick={() => handleSelectEvent(evt)}
                          className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${isSelected
                              ? "bg-indigo-950/60 border-indigo-500 shadow-md ring-1 ring-indigo-500"
                              : "bg-gray-900/60 border-gray-700/70 hover:border-gray-600 hover:bg-gray-900"
                            }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-xs text-indigo-400 shrink-0">
                              {evt.minute ? `${evt.minute}’` : "•"}
                            </span>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-100 truncate">
                                <span>{isGoal ? "⚽" : isCard ? "🟨" : isSub ? "🔄" : "⏱️"}</span>
                                <span className="truncate">{evt.player_name || evt.team_name || "Match Event"}</span>
                              </div>
                              {evt.event_detail && (
                                <p className="text-[11px] text-gray-400 mt-0.5 truncate">{evt.event_detail}</p>
                              )}
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-800 text-gray-400 border border-gray-700"
                              }`}
                          >
                            {isSelected ? "Active" : "Select →"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: LINEUPS & TACTICS */}
            {rightTab === "lineups" && (
              <div className="space-y-4">
                {/* 45-min Timing and Official vs Provisional Status Banner */}
                <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${match.lineups?.is_confirmed
                    ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-200"
                    : "bg-amber-950/70 border-amber-500/50 text-amber-200"
                  }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{match.lineups?.is_confirmed ? "⚡" : "⏳"}</span>
                    <div className="min-w-0">
                      <div className="font-extrabold tracking-wide uppercase text-[11px]">
                        {match.lineups?.is_confirmed ? "Official Starting XI Confirmed" : "Provisional Lineup (Placeholder)"}
                      </div>
                      <p className="text-[11px] opacity-90 mt-0.5 truncate">
                        {match.lineups?.release_note || (match.lineups?.is_confirmed ? "Official starting XI published by the club." : "Official starting XI drops 45 mins before kickoff. Displaying previous game's lineup.")}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${match.lineups?.is_confirmed ? "bg-emerald-500/20 border-emerald-500/40" : "bg-amber-500/20 border-amber-500/40"
                    }`}>
                    {match.lineups?.is_confirmed ? "Official" : "45m Drop"}
                  </span>
                </div>

                {/* Team Selector & Formation Badges */}
                <div className="grid grid-cols-2 gap-2 bg-gray-900/70 p-1.5 rounded-xl border border-gray-700/60">
                  <button
                    type="button"
                    onClick={() => setLineupTeam("home")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex flex-col items-center gap-0.5 ${lineupTeam === "home"
                        ? "bg-indigo-600 text-white shadow"
                        : "text-gray-400 hover:text-gray-200"
                      }`}
                  >
                    <span className="truncate max-w-[130px]">{match.home_team}</span>
                    <span className="text-[10px] opacity-80 font-mono">
                      {match.lineups?.home_formation || "4-3-3"} (Home)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLineupTeam("away")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex flex-col items-center gap-0.5 ${lineupTeam === "away"
                        ? "bg-indigo-600 text-white shadow"
                        : "text-gray-400 hover:text-gray-200"
                      }`}
                  >
                    <span className="truncate max-w-[130px]">{match.away_team}</span>
                    <span className="text-[10px] opacity-80 font-mono">
                      {match.lineups?.away_formation || "4-2-3-1"} (Away)
                    </span>
                  </button>
                </div>

                {/* Team News & Comparative Changes Section */}
                {(() => {
                  const isHome = lineupTeam === "home";
                  const news = isHome ? match.lineups?.home_team_news : match.lineups?.away_team_news;
                  const xi = isHome ? match.lineups?.home_starting_xi : match.lineups?.away_starting_xi;
                  const bench = isHome ? match.lineups?.home_bench : match.lineups?.away_bench;
                  const formation = isHome ? match.lineups?.home_formation : match.lineups?.away_formation;
                  const currentTeam = isHome ? match.home_team : match.away_team;

                  return (
                    <div className="space-y-3">
                      {/* Comparative Changes & Missing Players Card */}
                      <div className="bg-gray-900/80 rounded-xl p-3.5 border border-gray-700/70 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-700/50">
                          <span className="font-bold text-gray-200 flex items-center gap-1.5">
                            <span>📰</span>
                            <span>Squad News & Changes</span>
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            Formation: {formation || "4-3-3"}
                          </span>
                        </div>

                        {/* Starting Changes */}
                        {news?.starting_changes && news.starting_changes.length > 0 && (
                          <div>
                            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1 mb-1">
                              <span>🟢</span>
                              <span>Starting Changes (vs. Previous Match)</span>
                            </div>
                            <ul className="space-y-1">
                              {news.starting_changes.map((change, i) => (
                                <li key={i} className="text-gray-300 text-[11px] flex items-start gap-1.5 pl-1">
                                  <span className="text-emerald-400">•</span>
                                  <span>{change}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Missing Players */}
                        {news?.missing_players && news.missing_players.length > 0 && (
                          <div>
                            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1 mb-1">
                              <span>🔴</span>
                              <span>Missing / Injured Players</span>
                            </div>
                            <ul className="space-y-1">
                              {news.missing_players.map((miss, i) => (
                                <li key={i} className="text-gray-300 text-[11px] flex items-start gap-1.5 pl-1">
                                  <span className="text-amber-400">•</span>
                                  <span>{miss}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Tactical Notes */}
                        {news?.tactical_notes && (
                          <div className="pt-1 text-[11px] text-gray-400 italic bg-gray-800/40 p-2 rounded-lg border border-gray-700/40">
                            💡 <span className="text-gray-300 font-medium">Tactics:</span> {news.tactical_notes}
                          </div>
                        )}
                      </div>

                      {/* Starting XI List */}
                      <div className="bg-gray-900/80 rounded-xl p-3.5 border border-gray-700/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                            <span>👕</span>
                            <span>Starting XI ({currentTeam})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectMode("lineup");
                              handleGeneratePost("lineup");
                            }}
                            className="text-[10px] font-bold px-2 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 transition"
                          >
                            ✨ Draft Lineup Post
                          </button>
                        </div>

                        <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                          {xi && xi.length > 0 ? (
                            xi.map((player) => (
                              <div
                                key={player.number}
                                className="p-1.5 px-2 bg-gray-800/60 rounded-lg flex items-center justify-between text-xs hover:bg-gray-800 transition"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded bg-gray-700 flex items-center justify-center font-mono text-[10px] font-bold text-gray-300">
                                    {player.number}
                                  </span>
                                  <span className="font-semibold text-gray-200">
                                    {player.name}
                                    {player.captain && (
                                      <span className="ml-1 text-[10px] text-amber-400 font-bold" title="Captain">
                                        (C)
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-900/40 text-indigo-300 border border-indigo-500/20">
                                  {player.pos}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-gray-500 py-3 text-center">Starting XI pending release.</div>
                          )}
                        </div>
                      </div>

                      {/* Substitutes Bench */}
                      {bench && bench.length > 0 && (
                        <div className="bg-gray-900/80 rounded-xl p-3 border border-gray-700/70 space-y-1.5 text-xs">
                          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                            Substitutes Bench
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {bench.map((sub, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-[11px]"
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB 3: FULL GAME ANALYSIS (FINISHED MATCHES) */}
            {rightTab === "analysis" && (
              <div className="space-y-4">
                {/* Man of the Match Hero */}
                <div className="bg-gradient-to-r from-amber-950/60 via-gray-900 to-gray-900 border border-amber-500/40 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                      <span>🌟</span>
                      <span>Man of the Match</span>
                    </span>
                    <span className="font-black text-amber-300 px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-xs">
                      Rating: {match.analysis?.rating || "8.8 / 10"}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-white">
                      {match.analysis?.man_of_the_match || "Key Player"}
                    </h4>
                    <p className="text-xs text-amber-200/90 mt-0.5">
                      {match.analysis?.motm_stat || "Outstanding contribution across 90 minutes."}
                    </p>
                  </div>
                </div>

                {/* Match Stats Grid */}
                <div className="bg-gray-900/80 rounded-xl p-4 border border-gray-700/70 space-y-3">
                  <div className="text-xs font-bold text-gray-200 flex items-center justify-between pb-2 border-b border-gray-700/60">
                    <span>📊 Key Match Statistics</span>
                    <span className="text-[10px] text-gray-400">{match.home_team} vs {match.away_team}</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {[
                      { label: "Possession", value: match.analysis?.key_stats?.possession || "58% - 42%" },
                      { label: "Total Shots (On Target)", value: match.analysis?.key_stats?.shots || "16 (7) - 8 (3)" },
                      { label: "Expected Goals (xG)", value: match.analysis?.key_stats?.xg || "2.45 - 0.82" },
                      { label: "Pass Accuracy", value: match.analysis?.key_stats?.pass_accuracy || "87% - 80%" },
                      { label: "Corners", value: match.analysis?.key_stats?.corners || "7 - 3" },
                      { label: "Fouls Committed", value: match.analysis?.key_stats?.fouls || "9 - 13" },
                    ].map((stat, i) => (
                      <div key={i} className="flex items-center justify-between py-1 border-b border-gray-800/60 last:border-0">
                        <span className="text-gray-400">{stat.label}</span>
                        <span className="font-mono font-bold text-indigo-300">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tactical Takeaways */}
                <div className="bg-gray-900/80 rounded-xl p-4 border border-gray-700/70 space-y-2 text-xs">
                  <div className="font-bold text-gray-200 flex items-center gap-1.5">
                    <span>🧠</span>
                    <span>Tactical Takeaways</span>
                  </div>
                  <ul className="space-y-1.5 text-gray-300 text-[11px]">
                    {(match.analysis?.tactical_takeaways || [
                      "Dominant territorial pressing limited opponent high-value chances.",
                      "Fluid rotations between wingers and midfielders created crucial overloads.",
                      "Tactical substitutions safely closed out all 3 points.",
                    ]).map((takeaway, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-indigo-400">•</span>
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Coach Quote & Season Impact */}
                {match.analysis?.coach_quote && (
                  <div className="p-3 bg-gray-800/40 border border-gray-700/40 rounded-xl text-xs text-gray-400 italic">
                    💬 <span className="text-gray-300 font-medium">Coach's View:</span> "{match.analysis.coach_quote}"
                  </div>
                )}

                {/* One-Click Action: Draft Analysis Post */}
                <button
                  type="button"
                  onClick={() => {
                    handleSelectMode("analysis");
                    handleGeneratePost("analysis");
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
                >
                  <span>✨</span>
                  <span>Draft Full Game Tactical Review Post</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
