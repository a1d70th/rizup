export type UserPlan = "free" | "pro" | "premium";

export interface Profile {
  id: string;
  email: string;
  name: string;
  dream: string;
  avatar_url: string | null;
  streak: number;
  plan: UserPlan;
  mbti: string | null;
  is_admin: boolean;
  warning_count: number;
  is_suspended: boolean;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  type: "morning" | "evening";
  content: string;
  mood: number;
  ai_feedback: string | null;
  image_url: string | null;
  created_at: string;
  profiles?: Profile;
  reactions?: Reaction[];
  reaction_counts?: { cheer: number; relate: number; amazing: number };
}

export interface Report {
  id: string;
  post_id: string;
  reporter_id: string;
  reason: string;
  status: string;
  created_at: string;
}

export interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  type: "cheer" | "relate" | "amazing";
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Recommendation {
  id: string;
  type: "book" | "movie" | "place" | "quote";
  title: string;
  description: string;
  url: string | null;
  created_at: string;
}
