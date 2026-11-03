import React, { useState } from 'react';
import type { AIPostGenerateRequest, AIPostGenerateResponse, PostTone, PostLanguage } from '../types/ai';
import { generateAIPost } from '../api/newsAi';
import { createDraft } from '../api/drafts';

export interface PostStudioContext {
  contextType: 'goal' | 'halftime' | 'fulltime' | 'fixture' | 'result' | 'news' | 'transfer' | string;
  contextData: Record<string, any>;
  headline: string;
  sourceUrl?: string;
  sourceName?: string;
  matchId?: number | null;
}

interface PostStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: number | string;
  initialContext: PostStudioContext | null;
  defaultTone?: string;
  defaultLanguage?: string;
  defaultHashtags?: string;
  onDraftSaved?: () => void;
}

export const PostStudioModal: React.FC<PostStudioModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  initialContext,
  defaultTone = 'hype',
  defaultLanguage = 'english',
  defaultHashtags = '',
  onDraftSaved,
}) => {
  const [tone, setTone] = useState<PostTone>((defaultTone as PostTone) || 'hype');
  const [language, setLanguage] = useState<PostLanguage>((defaultLanguage as PostLanguage) || 'english');
  const [includeHashtags, setIncludeHashtags] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [variations, setVariations] = useState<{
    short: string;
    story: string;
    discussion: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'short' | 'story' | 'discussion'>('short');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedSuccessKey, setSavedSuccessKey] = useState<string | null>(null);

  if (!isOpen || !initialContext) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: AIPostGenerateRequest = {
        context_type: initialContext.contextType,
        context_data: initialContext.contextData,
        tone,
        language,
        include_hashtags: includeHashtags,
      };

      const res: AIPostGenerateResponse = await generateAIPost(workspaceId, payload);
      setVariations(res.variations);
      setActiveTab('short');
    } catch (err: any) {
      setError(err?.message || 'Failed to generate posts. Check your Gemini API key in workspace settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (key: 'short' | 'story' | 'discussion') => {
    if (!variations) return;
    const text = variations[key];
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      // Fallback copy
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const handleSaveToDrafts = async (key: 'short' | 'story' | 'discussion') => {
    if (!variations) return;
    setSavingKey(key);
    try {
      await createDraft(workspaceId, {
        match_id: initialContext.matchId || null,
        post_type: initialContext.contextType,
        content: variations[key],
      });
      setSavedSuccessKey(key);
      if (onDraftSaved) onDraftSaved();
      setTimeout(() => setSavedSuccessKey(null), 3000);
    } catch (err: any) {
      alert(`Could not save draft: ${err?.message || 'Unknown error'}`);
    } finally {
      setSavingKey(null);
    }
  };

  const updateVariationText = (key: 'short' | 'story' | 'discussion', text: string) => {
    if (!variations) return;
    setVariations({
      ...variations,
      [key]: text,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h2 className="text-lg font-bold text-white tracking-wide">
              AI Content Studio
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Gemini Free-Tier
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Source / Context Banner */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-slate-300">
                Source Context: <span className="text-indigo-400">{initialContext.contextType}</span>
              </span>
              {initialContext.sourceUrl && (
                <a
                  href={initialContext.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 hover:underline font-medium"
                >
                  {initialContext.sourceName || 'Original Story'}
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
            <p className="text-sm font-medium text-slate-200">
              {initialContext.headline}
            </p>
          </div>

          {/* Configuration Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-800/30 p-4 rounded-xl border border-slate-800">
            {/* Tone */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Post Tone
              </label>
              <div className="flex flex-col gap-1.5">
                {[
                  { id: 'hype', label: '🔥 Hype', desc: 'Excited & bold' },
                  { id: 'banter', label: '😂 Banter', desc: 'Cheeky & playful' },
                  { id: 'professional', label: '👔 Professional', desc: 'Journalistic & calm' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTone(t.id as PostTone)}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      tone === t.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                        : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{t.label}</span>
                    <span className="text-[10px] text-slate-500">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Language
              </label>
              <div className="flex flex-col gap-1.5">
                {[
                  { id: 'english', label: '🇬🇧 English', desc: 'Global fans' },
                  { id: 'banglish', label: '💬 Banglish', desc: 'Romanized Bangla' },
                  { id: 'bengali', label: '🇧🇩 বাংলা', desc: 'Bengali script' },
                ].map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLanguage(l.id as PostLanguage)}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      language === l.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                        : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{l.label}</span>
                    <span className="text-[10px] text-slate-500">{l.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hashtag & Action */}
            <div className="flex flex-col justify-between">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Hashtag Options
                </label>
                <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeHashtags}
                    onChange={(e) => setIncludeHashtags(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                  />
                  <span>
                    Append default tags
                    {defaultHashtags && (
                      <span className="block text-[11px] text-slate-500 truncate max-w-[180px]">
                        {defaultHashtags}
                      </span>
                    )}
                  </span>
                </label>
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="w-full mt-4 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Generating 3 variations...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>{variations ? 'Regenerate Variations' : 'Generate with Gemini'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {/* Generated Variations Workspace */}
          {variations && (
            <div className="space-y-3">
              {/* Tabs */}
              <div className="flex border-b border-slate-800 gap-2">
                {[
                  { id: 'short', label: '⚡ Short & Punchy', sub: 'Urgent' },
                  { id: 'story', label: '🔥 Narrative Story', sub: 'Full context' },
                  { id: 'discussion', label: '💬 Facebook Debate', sub: 'Comments magnet' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`pb-2 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-white'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Active Tab Textarea & Actions */}
              <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Editable Content Preview</span>
                  <span>{variations[activeTab]?.length || 0} characters</span>
                </div>
                <textarea
                  value={variations[activeTab]}
                  onChange={(e) => updateVariationText(activeTab, e.target.value)}
                  rows={6}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                  placeholder="Generated text will appear here..."
                />

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-slate-500">
                    💡 100% ready for Facebook. Review, edit, or copy straight to clipboard.
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveToDrafts(activeTab)}
                      disabled={savingKey === activeTab}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-1"
                    >
                      {savedSuccessKey === activeTab ? (
                        <span className="text-emerald-400 font-semibold">✓ Saved to Drafts</span>
                      ) : (
                        <>
                          <span>💾</span>
                          <span>Save as Draft</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeTab)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                        copiedKey === activeTab
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {copiedKey === activeTab ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          <span>Copy Post</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!variations && !loading && (
            <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
              <span className="text-3xl block mb-2">⚡</span>
              <h3 className="text-sm font-semibold text-slate-300">Ready to Generate Post</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Choose your preferred tone and language above, then click "Generate with Gemini" to produce 3 tailored variations in one go.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

