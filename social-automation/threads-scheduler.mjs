#!/usr/bin/env node
// Threads 専用スケジューラー
// 毎朝8時・昼12時・夜21時（JST）に threads-post.mjs を実行。
// node-cron 不使用（依存ゼロ）。JST計算は toLocaleString で行う。
//
// Usage:
//   node social-automation/threads-scheduler.mjs         # 常駐
//   node social-automation/threads-scheduler.mjs --now   # 即時1回
//
// Vercel Cron を使う場合は、このファイルではなく threads-post.mjs を直接呼ぶ：
//   vercel.json の crons に
//   { "path": "/api/cron/threads-post", "schedule": "0 23,3,12 * * *" }
//   を登録（UTC表記で JST 8時/12時/21時）

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv, notify } from "./_utils.mjs";

loadEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SLOTS_JST = [
  { h: 8, m: 0, label: "朝" },
  { h: 12, m: 0, label: "昼" },
  { h: 21, m: 0, label: "夜" },
];

function jstNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
}

function nextSlot() {
  const now = jstNow();
  for (const s of SLOTS_JST) {
    const t = new Date(now);
    t.setHours(s.h, s.m, 0, 0);
    if (t.getTime() > now.getTime()) return { slot: s, at: t };
  }
  const t = new Date(now);
  t.setDate(t.getDate() + 1);
  t.setHours(SLOTS_JST[0].h, SLOTS_JST[0].m, 0, 0);
  return { slot: SLOTS_JST[0], at: t };
}

function runThreadsPost() {
  const script = path.join(__dirname, "threads-post.mjs");
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script], {
      cwd: __dirname, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    });
    let out = ""; let err = "";
    child.stdout.on("data", (d) => { const s = d.toString(); out += s; process.stdout.write(s); });
    child.stderr.on("data", (d) => { const s = d.toString(); err += s; process.stderr.write(s); });
    child.on("close", (code) => resolve({ code, out, err }));
  });
}

function parseArgs() {
  const a = process.argv.slice(2);
  return { now: a.includes("--now") };
}

async function main() {
  const args = parseArgs();
  if (args.now) {
    const r = await runThreadsPost();
    await notify("🧵 Threads（即時実行）", r.code === 0 ? "完了 ✅" : `失敗 code=${r.code}`);
    process.exit(r.code === 0 ? 0 : 1);
  }
  console.log("🧵 Threads Scheduler started. Slots: 8/12/21 JST");
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { slot, at } = nextSlot();
    const ms = at.getTime() - jstNow().getTime();
    console.log(`⏰ next: ${at.toISOString().slice(0, 16).replace("T", " ")} JST (${slot.label}) in ${Math.round(ms / 60000)}min`);
    await new Promise((r) => setTimeout(r, ms));
    const res = await runThreadsPost();
    await notify(`🧵 Threads ${slot.label}`, res.code === 0 ? "投稿完了" : `失敗 code=${res.code}`);
    await new Promise((r) => setTimeout(r, 60_000)); // 連投防止
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
