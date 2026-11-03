export interface Workspace {
  id: number;
  owner_user_id: number;
  workspace_name: string;
  default_hashtags?: string;
  default_language?: string;
  default_tone?: string;
  has_gemini_key?: boolean;
  created_at: string;
}

export interface WorkspaceCreatePayload {
  workspace_name: string;
  default_hashtags?: string;
  default_language?: string;
  default_tone?: string;
  gemini_api_key?: string;
}

export interface WorkspaceUpdatePayload {
  workspace_name?: string;
  default_hashtags?: string;
  default_language?: string;
  default_tone?: string;
  gemini_api_key?: string;
}
