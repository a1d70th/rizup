// Demo data shown when Supabase tables don't exist yet

export const demoProfile = {
  name: "ゲスト",
  dream: "Rizup で前向きな毎日を始める",
  avatar_url: "🌿",
  streak: 3,
  plan: "free" as const,
};

export const demoPosts = [
  {
    id: "demo-1",
    user_id: "demo",
    type: "evening",
    content: "今日は朝から気分が重かったけど、30分だけ散歩した。帰ってきたらちょっとだけ楽になった。小さなことだけど、動けた自分を褒めたい。",
    mood: 3,
    ai_feedback: "気分が重い日に「30分だけ」って決めて動けたの、すごいよ。完璧じゃなくていい、動けたことが大事。明日もあなたのペースでいこう。",
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    profiles: { name: "はなさん", avatar_url: null },
  },
  {
    id: "demo-2",
    user_id: "demo",
    type: "morning",
    content: "面接の練習を友達に付き合ってもらった。「思ったより話せてたよ」って言われて嬉しかった。本番は来週。緊張するけど、やれることはやった。",
    mood: 4,
    ai_feedback: "友達に練習をお願いできたこと、それ自体がすごい行動力だよ。「やれることはやった」って言えるのがかっこいい。本番も応援してる。",
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    profiles: { name: "たかしさん", avatar_url: null },
  },
  {
    id: "demo-3",
    user_id: "demo",
    type: "evening",
    content: "今日は1日中だらだらしてしまった。でも、夜になってこれを書いてる。何もしなかった日でも、ここに来れたことだけは自分を認めてあげたい。",
    mood: 2,
    ai_feedback: "何もできなかった日でも、ここに書いてくれたこと、それが十分すごいことだよ。自分を認めてあげようとしてるの、ちゃんと伝わってるよ。",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    profiles: { name: "みおさん", avatar_url: null },
  },
];

export const demoBadges = ["first_post", "streak_7"];
