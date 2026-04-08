const planRank: Record<string, number> = { free: 0, pro: 1, premium: 2, vip: 3 };

interface ProfilePlan {
  plan?: string | null;
  trial_ends_at?: string | null;
}

/** Trial is active if trial_ends_at is in the future */
export function isTrialActive(profile: ProfilePlan): boolean {
  if (!profile.trial_ends_at) return false;
  return new Date(profile.trial_ends_at).getTime() > Date.now();
}

/** Pro or above — or trial active (trial = Pro equivalent) */
export function isProOrAbove(profile: ProfilePlan): boolean {
  const rank = planRank[profile.plan || "free"] ?? 0;
  if (rank >= 1) return true;
  return isTrialActive(profile);
}

/** Premium or above — or trial active (trial = Pro, so Premium gates still block) */
export function isPremiumOrAbove(profile: ProfilePlan): boolean {
  const rank = planRank[profile.plan || "free"] ?? 0;
  if (rank >= 2) return true;
  // Trial gives Pro-level access, not Premium
  return false;
}

/** VIP only */
export function isVIP(profile: ProfilePlan): boolean {
  return (profile.plan || "free") === "vip";
}
