// Rizup 複利エフェクト計算ライブラリ
// ダーレン・ハーディ「The Compound Effect」に基づき、毎日1%の小さな改善が
// 1年（365日）で約37.78倍になる複利曲線を提供する。

export const DAILY_GROWTH = 0.01; // 1日あたり1%の成長

/** 日数経過時の複利倍率（1.01^days） */
export function compoundMultiplier(days: number): number {
  if (days <= 0) return 1;
  return Math.pow(1 + DAILY_GROWTH, days);
}

/** 複利成長率をパーセントで返す（0日→0%、365日→約3678%） */
export function compoundPercent(days: number): number {
  return Math.round((compoundMultiplier(days) - 1) * 100);
}

/** 実際の達成率を反映した複利倍率
 *  achievementRate = 0〜1。0.8 なら日々の成長率は 0.01 * 0.8 = 0.008
 */
export function actualCompound(days: number, achievementRate: number): number {
  if (days <= 0) return 1;
  const rate = Math.max(0, Math.min(1, achievementRate));
  return Math.pow(1 + DAILY_GROWTH * rate, days);
}

export function actualCompoundPercent(days: number, achievementRate: number): number {
  return Math.round((actualCompound(days, achievementRate) - 1) * 100);
}

/** 複利曲線用の点を返す（0日から targetDays まで step日刻み） */
export function compoundSeries(targetDays: number, step = 1): { day: number; ideal: number; }[] {
  const out: { day: number; ideal: number }[] = [];
  for (let d = 0; d <= targetDays; d += step) {
    out.push({ day: d, ideal: compoundMultiplier(d) });
  }
  return out;
}

/** 実績曲線：streakと平均達成率から算出 */
export function actualSeries(targetDays: number, achievementRate: number, step = 1): { day: number; actual: number }[] {
  const out: { day: number; actual: number }[] = [];
  for (let d = 0; d <= targetDays; d += step) {
    out.push({ day: d, actual: actualCompound(d, achievementRate) });
  }
  return out;
}

/** 1日の複利スコア（0〜100）
 *  計算: 朝ToDo達成率 × 習慣チェック率 × ポジティブ度
 *  入力はすべて 0〜1 に正規化済みの想定
 */
export function dailyCompoundScore(params: {
  todoCompletionRate: number; // 0〜1
  habitCompletionRate: number; // 0〜1
  positivityRate: number;      // 0〜1
}): number {
  const { todoCompletionRate: t, habitCompletionRate: h, positivityRate: p } = params;
  const normalize = (x: number) => Math.max(0, Math.min(1, x));
  // いずれかゼロだとスコアが消えるので、ベースラインを 0.2 確保
  const tN = normalize(t) * 0.8 + 0.2;
  const hN = normalize(h) * 0.8 + 0.2;
  const pN = normalize(p) * 0.8 + 0.2;
  const raw = tN * hN * pN; // 0.008〜1
  return Math.round(raw * 100);
}

/** ビジョン達成予測日数
 *  仮定：現在の進捗が 0〜100%、達成ペース（日）=直近7日で何%進んだか
 */
export function estimateDaysToGoal(params: {
  currentProgress: number; // 0〜100
  recentWeeklyGainPct: number; // 過去7日で進んだパーセントポイント
}): number | null {
  const { currentProgress, recentWeeklyGainPct } = params;
  if (currentProgress >= 100) return 0;
  if (recentWeeklyGainPct <= 0) return null; // 予測不可
  const remaining = 100 - currentProgress;
  const dailyGain = recentWeeklyGainPct / 7;
  return Math.ceil(remaining / dailyGain);
}

/** 習慣を N日続けた時の複利成長パーセント */
export function habitCompoundForecast(days: number): number {
  return compoundPercent(days);
}
