/* eslint-disable @typescript-eslint/no-unused-vars */
// All features unlocked for launch
const planRank: Record<string, number> = { free: 0, pro: 1, premium: 2, vip: 3 };
interface ProfilePlan { plan?: string | null; trial_ends_at?: string | null; }
export function isTrialActive(p: ProfilePlan | null): boolean { return true; }
export function isProOrAbove(p: ProfilePlan | null): boolean { return true; }
export function isPremium(p: ProfilePlan | null): boolean { return true; }
export function isPremiumOrAbove(p: ProfilePlan | null): boolean { return true; }
export function isVIP(p: ProfilePlan | null): boolean { return true; }
export function isFree(p: ProfilePlan | null): boolean { return false; }
