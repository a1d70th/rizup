export type UserPlan = "free" | "pro" | "premium";

export interface Profile {
  id: string;
  email: string;
  name: string;
  dream: string;
  avatar_url: string | null;
  streak: number;
  plan: UserPlan;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  type: "morning" | "evening";
  content: string;
  mood: number;
  ai_feedback: string | null;
  created_at: string;
  profiles?: Profile;
  reactions?: Reaction[];
  reaction_counts?: { cheer: number; relate: number; amazing: number };
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

export interface Badge {
  id: string;
  user_id: string;
  type: string;
  earned_at: string;
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
