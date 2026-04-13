#!/usr/bin/env node
// X (Twitter) 自動投稿スクリプト
// Usage:
//   node social-automation/x-post.mjs              # 次の未投稿候補を自動選択
//   node social-automation/x-post.mjs --text "..."
//
// X API v2  POST /2/tweets  (OAuth 1.0a user context)
// 280文字制限（日本語も1文字=1文字、URLは t.co 短縮で23字扱い）

import crypto from "node:crypto";
import { loadEnv, pickNextCandidate, markPosted, truncate, notify } from "./_utils.mjs";

loadEnv();

const API_KEY = process.env.X_API_KEY;
const API_SECRET = process.env.X_API_SECRET;
const ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
const ACCESS_SECRET = process.env.X_ACCESS_TOKEN_SECRET;
const ENDPOINT = "https://api.x.com/2/tweets";
const MAX_CHARS = 280;

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { text: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--text") out.text = args[++i];
  }
  return out;
}

function percentEncode(s) {
  return encodeURIComponent(s).replace(/[!*()']/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function oauth1Header(method, url, params = {}) {
  const oauth = {
    oauth_consumer_key: API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN,
    oauth_version: "1.0",
  };
  const all = { ...oauth, ...params };
  const paramStr = Object.keys(all).sort().map((k) => `${percentEncode(k)}=${percentEncode(all[k])}`).join("&");
  const base = [method.toUpperCase(), percentEncode(url), percentEncode(paramStr)].join("&");
  const key = `${percentEncode(API_SECRET)}&${percentEncode(ACCESS_SECRET)}`;
  const sig = crypto.createHmac("sha1", key).update(base).digest("base64");
  oauth.oauth_signature = sig;
  const header = "OAuth " + Object.keys(oauth).sort().map((k) => `${percentEncode(k)}="${percentEncode(oauth[k])}"`).join(", ");
  return header;
}

async function postTweet(text) {
  // OAuth 1.0a の署名は URL + クエリ/ボディの全キーを含む。
  // JSON body の場合、署名にはボディパラメータを含めない（仕様）
  const auth = oauth1Header("POST", ENDPOINT);
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`X API error: ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  if (!API_KEY || !API_SECRET || !ACCESS_TOKEN || !ACCESS_SECRET) {
    console.error("❌ X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET を .env.local に設定してください");
    console.error("   詳細: social-automation/ENV_REQUIRED.md");
    process.exit(2);
  }
  const { text: argText } = parseArgs();
  const text = argText || (await pickNextCandidate("x"));
  if (!text) {
    console.log("📭 未投稿の候補がありません（すべて投稿済み）");
    return;
  }
  const body = truncate(text, MAX_CHARS);
  console.log(`📝 X 投稿本文 (${body.length}字):`);
  console.log("---");
  console.log(body);
  console.log("---");

  try {
    const res = await postTweet(body);
    const id = res?.data?.id;
    console.log(`✅ posted: ${id}`);
    await markPosted("x", body, { tweet_id: id });
    await notify(
      "𝕏 X 投稿完了",
      `tweet_id: ${id}\nhttps://x.com/i/web/status/${id}\n\n${truncate(body, 200)}`
    );
  } catch (e) {
    console.error(`❌ X 投稿失敗: ${e.message}`);
    await notify("⚠️ X 投稿失敗", String(e.message));
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
