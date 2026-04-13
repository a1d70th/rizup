#!/usr/bin/env node
// Rizup Social Scheduler
// 朝8時 / 昼12時 / 夜21時 に Threads と X に自動投稿
//
// Usage:
//   node social-automation/social-scheduler.mjs          # 常駐して cron ループ
//   node social-automation/social-scheduler.mjs --now    # 即時1回実行（テスト）
//   node social-automation/social-scheduler.mjs --platform threads   # Threads のみ
//   node social-automation/social-scheduler.mjs --platform x         # X のみ
//
// Vercel Cron で使う場合は scheduler ではなく threads-post.mjs / x-post.mjs を
// 個別に呼び出す (cron: "0 23,3,12 * * *" UTC = JST 8時/12時/21時)

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv, notify } from "./_utils.mjs";

loadEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// JST: 8:00 / 12:00 / 21:00
const JST_SLOTS = [
  { h: 8, m: 0 },
  { h: 12, m: 0 },
  { h: 21, m: 0 },
];

function jstNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
}

function nextSlotDelay() {
  const now = jstNow();
  let next = null;
  for (const s of JST_SLOTS) {
    const cand = new Date(now);
    cand.setHours(s.h, s.m, 0, 0);
    if (cand.getTime() > now.getTime() && (!next || cand < next)) next = cand;
  }
  if (!next) {
    // 今日の分は終わったので翌朝8時
    next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(JST_SLOTS[0].h, JST_SLOTS[0].m, 0, 0);
  }
  const diffLocalMs = next.getTime() - now.getTime();
  // now は JST 表記の Date だが wall-clock 差分のみ使う
  return { next, ms: diffLocalMs };
}

function runScript(script, args = []) {
  const full = path.join(__dirname, script);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [full, ...args], {
      cwd: __dirname, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    });
    let out = ""; let err = "";
    child.stdout.on("data", (d) => { const s = d.toString(); out += s; process.stdout.write(s); });
    child.stderr.on("data", (d) => { const s = d.toString(); err += s; process.stderr.write(s); });
    child.on("close", (code) => resolve({ code, out, err }));
  });
}

async function runSlot(platformFilter = null) {
  console.log(`[${new Date().toISOString()}] running slot...`);
  const results = [];
  if (!platformFilter || platformFilter === "threads") {
    const r = await runScript("threads-post.mjs");
    results.push({ platform: "threads", ...r });
  }
  if (!platformFilter || platformFilter === "x") {
    const r = await runScript("x-post.mjs");
    results.push({ platform: "x", ...r });
  }
  const summary = results.map((r) => `${r.platform}: ${r.code === 0 ? "✅" : "❌ code=" + r.code}`).join(" / ");
  console.log("📊 " + summary);
  await notify("🤖 Rizup 自動投稿", summary);
  return results;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { now: false, platform: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--now") out.now = true;
    else if (args[i] === "--platform") out.platform = args[++i];
  }
  return out;
}

async function mainLoop(platform) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { next, ms } = nextSlotDelay();
    console.log(`⏰ next slot: ${next.toISOString().replace("T", " ").slice(0, 16)} JST （${Math.round(ms/60000)}分後）`);
    await new Promise((r) => setTimeout(r, ms));
    await runSlot(platform);
    // 連投防止のため1分待ってから次ループ
    await new Promise((r) => setTimeout(r, 60_000));
  }
}

const args = parseArgs();
if (args.now) {
  runSlot(args.platform).then((r) => process.exit(r.every(x => x.code === 0) ? 0 : 1));
} else {
  mainLoop(args.platform).catch((e) => { console.error(e); process.exit(1); });
}
