export interface ClubNews {
  id: number;
  workspace_id: number;
  headline: string;
  summary: string | null;
  source_url: string;
  source_name: string;
  category: 'news' | 'transfer' | string;
  credibility_tier: 'tier1' | 'tier2' | 'rumor' | string;
  published_at: string | null;
}

export type PostTone = 'hype' | 'banter' | 'professional';
export type PostLanguage = 'english' | 'banglish' | 'bengali';

export interface AIPostGenerateRequest {
  context_type: 'goal' | 'halftime' | 'fulltime' | 'fixture' | 'result' | 'news' | 'transfer' | string;
  context_data: Record<string, any>;
  tone?: PostTone | string;
  language?: PostLanguage | string;
  include_hashtags?: boolean;
}

export interface AIPostGenerateResponse {
  variations: {
    short: string;
    story: string;
    discussion: string;
  };
  tone_used: string;
  language_used: string;
  hashtags_appended: string;
}
