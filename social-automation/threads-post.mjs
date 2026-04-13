#!/usr/bin/env node
// Threads 自動投稿スクリプト
// Usage:
//   node social-automation/threads-post.mjs            # 次の未投稿候補を自動選択
//   node social-automation/threads-post.mjs --text "任意の本文"
//
// 仕組み（Threads Graph API v1.0）:
//   1. POST /{user_id}/threads  media_type=TEXT text=<本文>   → container_id を取得
//   2. POST /{user_id}/threads_publish  creation_id=<container_id> → media_id が返る

import { loadEnv, pickNextCandidate, markPosted, truncate, notify } from "./_utils.mjs";

loadEnv();

const TOKEN = process.env.THREADS_ACCESS_TOKEN;
const USER_ID = process.env.THREADS_USER_ID;
const API = "https://graph.threads.net/v1.0";
const MAX = 500; // Threads 本文は500字

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { text: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--text") { out.text = args[++i]; }
  }
  return out;
}

async function createContainer(text) {
  const url = `${API}/${USER_ID}/threads`;
  const body = new URLSearchParams({
    media_type: "TEXT",
    text,
    access_token: TOKEN,
  });
  const res = await fetch(url, { method: "POST", body });
  const data = await res.json();
  if (!res.ok) throw new Error(`createContainer: ${JSON.stringify(data)}`);
  return data.id;
}

async function publishContainer(containerId) {
  const url = `${API}/${USER_ID}/threads_publish`;
  const body = new URLSearchParams({
    creation_id: containerId,
    access_token: TOKEN,
  });
  const res = await fetch(url, { method: "POST", body });
  const data = await res.json();
  if (!res.ok) throw new Error(`publish: ${JSON.stringify(data)}`);
  return data.id;
}

async function main() {
  if (!TOKEN || !USER_ID) {
    console.error("❌ THREADS_ACCESS_TOKEN と THREADS_USER_ID を .env.local に設定してください");
    console.error("   詳細: social-automation/ENV_REQUIRED.md");
    process.exit(2);
  }
  const { text: argText } = parseArgs();
  const text = argText || (await pickNextCandidate("threads"));
  if (!text) {
    console.log("📭 未投稿の候補がありません（すべて投稿済み）");
    return;
  }
  const body = truncate(text, MAX);
  console.log(`📝 Threads 投稿本文 (${body.length}字):`);
  console.log("---");
  console.log(body);
  console.log("---");

  try {
    const containerId = await createContainer(body);
    console.log(`🧱 container created: ${containerId}`);
    // Threads 推奨：publish 前に少し待つ
    await new Promise((r) => setTimeout(r, 1500));
    const mediaId = await publishContainer(containerId);
    console.log(`✅ published: ${mediaId}`);
    await markPosted("threads", body, { media_id: mediaId });
    await notify(
      "🧵 Threads 投稿完了",
      `media_id: ${mediaId}\n\n${truncate(body, 200)}`
    );
  } catch (e) {
    console.error(`❌ Threads 投稿失敗: ${e.message}`);
    await notify("⚠️ Threads 投稿失敗", String(e.message));
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
