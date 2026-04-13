import { readFileSync } from "fs";

// .env.localから環境変数を読み込む
const env = readFileSync("app/rizup-app/.env.local", "utf8");
const vars = Object.fromEntries(
  env.split("\n").filter(l => l.includes("=")).map(l => {
    const idx = l.indexOf("=");
    return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
  })
);
const url = vars.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = vars.SUPABASE_SERVICE_ROLE_KEY?.trim();

console.log("URL:", url);
console.log("KEY:", key ? `${key.slice(0, 20)}...` : "(未設定)");

if (!key || !url || url.includes("placeholder")) {
  console.error("\n❌ .env.local に実鍵が入っていません。処理を中断します。");
  console.error("   必要: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sql = readFileSync("app/rizup-app/supabase-v3-rebuild.sql", "utf8");

// Management API で実行（注意: PAT 'sbp_...' が必要。service role key では通常 401）
const mgmt = await fetch(
  "https://api.supabase.com/v1/projects/pcysqlvvqqfborgymabl/database/query",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({ query: sql }),
  }
);

console.log("Status:", mgmt.status);
const result = await mgmt.text();
console.log("Result:", result.substring(0, 500));
