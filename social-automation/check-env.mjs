#!/usr/bin/env node
// 環境変数チェッカー
import { loadEnv } from "./_utils.mjs";
loadEnv();

const REQUIRED = {
  "Threads": ["THREADS_ACCESS_TOKEN", "THREADS_USER_ID"],
  "X": ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"],
};
const OPTIONAL = {
  "Discord": ["DISCORD_WEBHOOK_URL"],
  "Resend (メール)": ["RESEND_API_KEY", "NOTIFY_EMAIL", "FROM_EMAIL"],
};

console.log("── 必須 ──");
for (const [group, keys] of Object.entries(REQUIRED)) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length === 0) console.log(`  ✅ ${group}: OK`);
  else console.log(`  ❌ ${group}: 未設定 ${missing.join(", ")}`);
}
console.log("\n── オプション ──");
for (const [group, keys] of Object.entries(OPTIONAL)) {
  const set = keys.filter((k) => process.env[k]);
  console.log(`  ${set.length ? "✅" : "⚪"} ${group}: ${set.length}/${keys.length}`);
}
