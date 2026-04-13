// 共通ユーティリティ
import fs from "node:fs/promises";
import fss from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const POSTED_FILE = path.join(__dirname, "posted-log.json");
export const PROFILE_MD = path.join(ROOT, "marketing", "x-profile.md");

export function loadEnv() {
  // .env.local を順に探す
  const candidates = [
    path.join(ROOT, ".env.local"),
    path.join(ROOT, "app", "rizup-app", ".env.local"),
    path.join(__dirname, ".env.local"),
  ];
  for (const p of candidates) {
    if (fss.existsSync(p)) {
      const txt = fss.readFileSync(p, "utf8");
      for (const line of txt.split(/\r?\n/)) {
        if (!line || line.startsWith("#")) continue;
        const i = line.indexOf("=");
        if (i <= 0) continue;
        const k = line.slice(0, i).trim();
        const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
        if (!(k in process.env)) process.env[k] = v;
      }
    }
  }
}

/** marketing/x-profile.md から投稿候補を抽出 */
export async function loadPostCandidates() {
  const md = await fs.readFile(PROFILE_MD, "utf8");
  // ``` で囲まれたコードブロックのうち、日本語を含み、160〜500字程度のものを候補に
  const blocks = [];
  const re = /```\s*\n([\s\S]*?)\n```/g;
  let m;
  while ((m = re.exec(md)) !== null) {
    const body = m[1].trim();
    if (!body) continue;
    // 日本語を含み、ハッシュタグや URL を含む「投稿っぽい」ものだけ
    const hasJa = /[\u3040-\u30ff\u4e00-\u9fff]/.test(body);
    const len = body.replace(/\s+/g, "").length;
    if (!hasJa || len < 30 || len > 700) continue;
    // 見出し的なショートブロックを除外（YAMLっぽいもの）
    if (/^[A-Z_]+=/.test(body)) continue;
    blocks.push(body);
  }
  return blocks;
}

export async function loadPostedLog() {
  try {
    const raw = await fs.readFile(POSTED_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { threads: [], x: [] };
  }
}

export async function savePostedLog(log) {
  await fs.writeFile(POSTED_FILE, JSON.stringify(log, null, 2), "utf8");
}

export function hashContent(s) {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
}

export function truncate(s, max) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

export async function notify(title, body) {
  const tasks = [];
  const discord = process.env.DISCORD_WEBHOOK_URL;
  if (discord) {
    tasks.push(
      fetch(discord, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `**${title}**\n${body}` }),
      }).catch(() => null)
    );
  }
  const resend = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  const from = process.env.FROM_EMAIL || "onboarding@resend.dev";
  if (resend && to) {
    tasks.push(
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resend}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `Rizup Social <${from}>`,
          to: [to],
          subject: title,
          text: body,
        }),
      }).catch(() => null)
    );
  }
  await Promise.all(tasks);
}

/** 次に投稿すべき候補を返す（重複回避） */
export async function pickNextCandidate(platform /* "threads" | "x" */) {
  const candidates = await loadPostCandidates();
  const log = await loadPostedLog();
  const posted = new Set((log[platform] || []).map((r) => r.hash));
  for (const body of candidates) {
    if (!posted.has(hashContent(body))) return body;
  }
  return null; // すべて投稿済み → 翌サイクルで最古のものから再利用したい場合は null チェック
}

export async function markPosted(platform, body, meta = {}) {
  const log = await loadPostedLog();
  log[platform] = log[platform] || [];
  log[platform].push({
    hash: hashContent(body),
    excerpt: truncate(body.replace(/\s+/g, " "), 80),
    posted_at: new Date().toISOString(),
    ...meta,
  });
  await savePostedLog(log);
}
