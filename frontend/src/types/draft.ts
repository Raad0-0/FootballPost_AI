export type DraftStatus = "new" | "edited" | "copied" | "discarded" | "used";

export type PostType =
  | "goal"
  | "red_card"
  | "halftime"
  | "fulltime"
  | "fixture"
  | "result"
  | "substitution"
  | "penalty"
  | "transfer_news";

export interface PostDraft {
  id: number;
  workspace_id: number;
  match_id?: number | null;
  post_type: PostType | string;
  content: string;
  status: DraftStatus;
  created_at: string;
  updated_at: string;
}

export interface PostDraftUpdatePayload {
  content?: string;
  status?: DraftStatus;
}

export interface PostDraftCreatePayload {
  match_id?: number | null;
  post_type: PostType | string;
  content: string;
}


