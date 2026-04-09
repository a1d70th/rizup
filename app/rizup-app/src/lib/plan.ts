/* eslint-disable @typescript-eslint/no-unused-vars */
// All features unlocked for launch
type Profile = { plan?: string | null; trial_ends_at?: string | null } | null;
export function isProOrAbove(p: Profile): boolean { return true; }
export function isPremium(p: Profile): boolean { return true; }
export function isFree(p: Profile): boolean { return false; }
export function isTrialActive(p: Profile): boolean { return true; }
