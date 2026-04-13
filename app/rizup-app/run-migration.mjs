import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, "supabase-v3-rebuild.sql");
const envPath = path.join(__dirname, ".env.local");

const sql = fs.readFileSync(sqlPath, "utf8");
const envContent = fs.readFileSync(envPath, "utf8");

const serviceKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const url = urlMatch || "https://pcysqlvvqqfborgymabl.supabase.co";

if (!serviceKey || serviceKey.startsWith("placeholder")) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY が .env.local に設定されていません");
  console.error("   取得先: Supabase Dashboard → Settings → API → service_role key");
  process.exit(1);
}

console.log(`🔌 接続先: ${url}`);
console.log(`🔑 キー: ${serviceKey.slice(0, 20)}...（末尾省略）`);

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

// SQLをセミコロンで分割（DO $$ ... END $$ ブロックは別扱い）
function splitSql(text) {
  const out = [];
  let buf = "";
  let inDollar = false;
  const lines = text.split("\n");
  for (const line of lines) {
    if (line.trim().startsWith("--")) continue;
    if (/DO \$\$/.test(line)) inDollar = true;
    buf += line + "\n";
    if (inDollar && /END \$\$;/.test(line)) {
      out.push(buf.trim());
      buf = "";
      inDollar = false;
      continue;
    }
    if (!inDollar && line.trim().endsWith(";")) {
      out.push(buf.trim());
      buf = "";
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(s => s.length > 0 && !/^--/.test(s));
}

const statements = splitSql(sql);
console.log(`📝 ${statements.length} 個のステートメントを実行します`);

let success = 0;
let failed = 0;
const errors = [];

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  const preview = stmt.split("\n")[0].slice(0, 80);
  try {
    const { error } = await supabase.rpc("exec", { sql: stmt });
    if (error) {
      failed++;
      errors.push({ idx: i + 1, preview, message: error.message });
      console.error(`  ✗ [${i + 1}/${statements.length}] ${preview}`);
      console.error(`    → ${error.message}`);
    } else {
      success++;
      console.log(`  ✓ [${i + 1}/${statements.length}] ${preview}`);
    }
  } catch (e) {
    failed++;
    errors.push({ idx: i + 1, preview, message: String(e) });
    console.error(`  ✗ [${i + 1}/${statements.length}] ${preview}`);
    console.error(`    → ${e}`);
  }
}

console.log(`\n━━━━━━━━━━━━━━━━━`);
console.log(`✅ 成功: ${success}`);
console.log(`❌ 失敗: ${failed}`);
console.log(`━━━━━━━━━━━━━━━━━`);
if (failed > 0) process.exit(2);
