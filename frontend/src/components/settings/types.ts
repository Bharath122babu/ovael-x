export interface UserProfile {
  user_id: string;
  username: string;
  role: string;
  display_name: string;
  institution: string | null;
  preferences: Record<string, any>;
  synthetic: boolean;
  updated_at: string | null;
}

export interface AuthSessionItem {
  session_id: string;
  user_agent: string;
  ip_address: string;
  created_at: string;
  expires_at: string;
  is_current: boolean;
}

export interface MemorySettings {
  personalization_enabled: boolean;
}

export interface SystemHealth {
  status: string;
  product: string;
  version: string;
  database?: string;
  dynamic_teaching?: string;
  decision_runtime?: string;
  ai_policy?: string;
}
