// Rizup プラン制御
// free / pro / premium の3段階。VIPは廃止。
// 7日間無料トライアル中は Pro 相当として扱う。

export type UserPlan = "free" | "pro" | "premium";

export interface ProfilePlan {
  plan?: string | null;
  trial_ends_at?: string | null;
}

const RANK: Record<string, number> = { free: 0, pro: 1, premium: 2 };

export function isTrialActive(p: ProfilePlan | null | undefined): boolean {
  if (!p?.trial_ends_at) return false;
  return new Date(p.trial_ends_at).getTime() > Date.now();
}

export function effectiveRank(p: ProfilePlan | null | undefined): number {
  if (!p) return 0;
  const base = RANK[p.plan ?? "free"] ?? 0;
  if (isTrialActive(p)) return Math.max(base, RANK.pro);
  return base;
}

export function isProOrAbove(p: ProfilePlan | null | undefined): boolean {
  return effectiveRank(p) >= RANK.pro;
}

export function isPremium(p: ProfilePlan | null | undefined): boolean {
  return effectiveRank(p) >= RANK.premium;
}

export function isFree(p: ProfilePlan | null | undefined): boolean {
  return effectiveRank(p) < RANK.pro;
}
