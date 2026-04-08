"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { rizupTypes, zodiacSigns } from "@/lib/rizup-types";
import type { RizupType } from "@/lib/rizup-types";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
// Image import removed — profile uses img tags for dynamic avatar URLs

interface ProfileData {
  name: string; dream: string; avatar_url: string | null;
  streak: number; plan: string; zodiac?: string;
  rizup_type?: string; birthday?: string; is_admin?: boolean;
}

const moodColors: Record<number, string> = { 1: "#ef4444", 2: "#f97316", 3: "#eab308", 4: "#6ecbb0", 5: "#5ab89d" };
const moodLabels = [
  { c: "#ef4444", l: "つらい" }, { c: "#f97316", l: "ふつう" },
  { c: "#eab308", l: "まあまあ" }, { c: "#6ecbb0", l: "いい感じ" }, { c: "#5ab89d", l: "最高" },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [posts, setPosts] = useState<any[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalReactions, setTotalReactions] = useState(0);
  const [moodHistory, setMoodHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [wordAnalysis, setWordAnalysis] = useState<{ weeklyTrend: { week: string; score: number }[]; topWords: { word: string; count: number }[]; overallScore: number; changeMessage: string | null } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", dream: "", zodiac: "", birthday: "", rizup_type: "", mbti: "" });

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const { data: prof, error: profErr } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (profErr || !prof || !prof.name) { window.location.href = "https://rizup-app.vercel.app/onboarding"; return; }
        setProfile(prof);

        const { data: userPosts, count } = await supabase.from("posts")
          .select("*, profiles(name, avatar_url)", { count: "exact" })
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
        if (userPosts) setPosts(userPosts);
        if (count) setTotalPosts(count);

        // Mood history from real posts (last 14)
        const { data: moodPosts } = await supabase.from("posts").select("mood")
          .eq("user_id", user.id).order("created_at", { ascending: true }).limit(14);
        if (moodPosts) setMoodHistory(moodPosts.map(p => p.mood));

        const { data: userBadges } = await supabase.from("badges").select("type").eq("user_id", user.id);
        if (userBadges) setBadges(userBadges.map(b => b.type));

        if (userPosts && userPosts.length > 0) {
          const { count: rxCount } = await supabase.from("reactions")
            .select("id", { count: "exact", head: true })
            .in("post_id", userPosts.map(p => p.id));
          setTotalReactions(rxCount || 0);
        }
        // Fetch word analysis
        fetch("/api/analyze/words").then(r => r.json()).then(d => {
          if (d && !d.error) setWordAnalysis(d);
        }).catch(() => {});
      } catch (err) { console.error("[Rizup Profile]", err); }
      setLoading(false);
    };
    init();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadErr) { console.error("[Avatar Upload]", uploadErr); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
    setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : prev);
    setUploading(false);
  };

  const handleEditSave = async () => {
    (document.activeElement as HTMLElement)?.blur();
    if (!userId || !editForm.name.trim()) return;
    const updates: Record<string, string> = {};
    if (editForm.name.trim()) updates.name = editForm.name.trim();
    if (editForm.dream !== undefined) updates.dream = editForm.dream;
    if (editForm.zodiac) updates.zodiac = editForm.zodiac;
    if (editForm.birthday) updates.birthday = editForm.birthday;
    if (editForm.rizup_type) updates.rizup_type = editForm.rizup_type;
    if (editForm.mbti) updates.mbti = editForm.mbti;
    await supabase.from("profiles").update(updates).eq("id", userId);
    setProfile(prev => prev ? { ...prev, ...updates } : prev);
    setShowEdit(false);
  };

  const handlePostDelete = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    setTotalPosts(prev => prev - 1);
  };

  const badgeMap: Record<string, { emoji: string; label: string }> = {
    first_post: { emoji: "🌱", label: "初投稿" }, streak_7: { emoji: "🔥", label: "7日連続" },
    streak_14: { emoji: "🔥", label: "14日連続" }, streak_30: { emoji: "💎", label: "30日連続" },
    posts_100: { emoji: "📝", label: "100投稿" }, comments_50: { emoji: "💬", label: "励ましの達人" },
    reactions_100: { emoji: "❤️", label: "応援王" }, weekly_mvp: { emoji: "⭐", label: "週間MVP" },
    monthly_mvp: { emoji: "👑", label: "月間MVP" },
  };

  if (loading) return (
    <div className="min-h-screen bg-bg pb-20">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center mb-4 animate-pulse">
          <div className="w-20 h-20 rounded-full bg-gray-200 mx-auto mb-3" />
          <div className="h-5 bg-gray-200 rounded-full w-32 mx-auto mb-2" />
          <div className="h-3 bg-gray-100 rounded-full w-48 mx-auto" />
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded-full w-24 mb-3" />
          <div className="h-20 bg-gray-100 rounded-xl" />
        </div>
      </div>
      <BottomNav />
    </div>
  );
  if (!profile) return null;

  const typeInfo = profile.rizup_type && profile.rizup_type in rizupTypes ? rizupTypes[profile.rizup_type as RizupType] : null;
  const isUrl = profile.avatar_url?.startsWith("http");

  return (
    <div className="min-h-screen bg-bg pb-20">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center mb-4">
          <div className="relative w-20 h-20 mx-auto mb-3">
            {isUrl ? (
              <img src={profile.avatar_url!} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-[3px] border-mint" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-mint-light flex items-center justify-center text-3xl border-[3px] border-mint">
                {profile.avatar_url || "🌿"}
              </div>
            )}
            <button onClick={() => fileRef.current?.click()} aria-label="アバター画像を変更"
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-mint text-white rounded-full flex items-center justify-center text-xs shadow-md">
              {uploading ? "..." : "📷"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <h1 className="text-xl font-extrabold">{profile.name}</h1>
          {profile.dream && <p className="text-sm text-text-mid mt-1">🎯 {profile.dream}</p>}
          {typeInfo && (
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold" style={{ background: `${typeInfo.color}20`, color: typeInfo.color }}>
              {typeInfo.emoji} {typeInfo.label}タイプ
            </span>
          )}
          {profile.zodiac && <span className="inline-block mt-1 ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-light text-orange">{profile.zodiac}</span>}
          <div className="mt-3">
            <button onClick={() => {
              setEditForm({ name: profile.name, dream: profile.dream || "", zodiac: profile.zodiac || "", birthday: profile.birthday || "", rizup_type: profile.rizup_type || "", mbti: (profile as unknown as Record<string, string>).mbti || "" });
              setShowEdit(true);
            }} className="text-xs text-mint font-bold border border-mint rounded-full px-4 py-1.5 hover:bg-mint-light transition">
              ✏️ プロフィールを編集
            </button>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="text-center"><div className="text-xl font-extrabold text-mint">{totalPosts}</div><div className="text-[10px] text-text-light">投稿</div></div>
            <div className="text-center"><div className="text-xl font-extrabold text-orange">🔥 {profile.streak}</div><div className="text-[10px] text-text-light">連続日数</div></div>
            <div className="text-center"><div className="text-xl font-extrabold text-mint">{totalReactions}</div><div className="text-[10px] text-text-light">もらった応援</div></div>
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
            <h3 className="text-sm font-bold mb-3">🏅 獲得バッジ</h3>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => { const info = badgeMap[b] || { emoji: "🎖️", label: b }; return (
                <span key={b} className="bg-mint-light text-mint px-3 py-1 rounded-full text-xs font-bold">{info.emoji} {info.label}</span>
              ); })}
            </div>
          </div>
        )}

        {/* Mood Graph — real data */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
          <h3 className="text-sm font-bold mb-3">📊 気分の推移</h3>
          {moodHistory.length === 0 ? (
            <p className="text-xs text-text-light text-center py-4">ジャーナルを投稿すると、ここにグラフが表示されます</p>
          ) : (
            <>
              <div className="flex items-end gap-1 h-20" style={{ maxWidth: moodHistory.length <= 3 ? `${moodHistory.length * 48}px` : "100%" }}>
                {moodHistory.map((mood, i) => (
                  <div key={i} className="rounded-t-md" style={{ height: `${mood * 20}%`, background: moodColors[mood] || "#6ecbb0", flex: "1 1 0", maxWidth: 40, minWidth: 12 }} />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-text-light mt-1">
                <span>{moodHistory.length}件前</span><span>最新</span>
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {moodLabels.map(x => (
                  <div key={x.l} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: x.c }} />
                    <span className="text-[9px] text-text-light">{x.l}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sleep × Mood correlation */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
          <h3 className="text-sm font-bold mb-3">😴 睡眠 × 気分の相関</h3>
          {moodHistory.length < 5 ? (
            <p className="text-xs text-text-light text-center py-4">データが増えると睡眠と気分の相関が見えてきます（5件以上で表示）</p>
          ) : (
            <>
              <div className="relative h-24 border-l border-b border-gray-200 ml-4 mb-2">
                {moodHistory.slice(-10).map((mood, i) => {
                  const x = (i / Math.max(moodHistory.slice(-10).length - 1, 1)) * 90 + 5;
                  const y = 100 - mood * 20;
                  return <div key={i} className="absolute w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ left: `${x}%`, top: `${y}%`, background: moodColors[mood] }} />;
                })}
              </div>
              <div className="flex justify-between text-[10px] text-text-light ml-4">
                <span>少ない睡眠</span><span>多い睡眠</span>
              </div>
              <p className="text-[10px] text-text-light mt-2 text-center">睡眠データを記録するほど、相関の精度が上がります</p>
            </>
          )}
        </div>

        {/* Word Analysis */}
        {wordAnalysis && (wordAnalysis.weeklyTrend.length > 0 || wordAnalysis.topWords.length > 0) && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
            <h3 className="text-sm font-bold mb-3">📝 言葉のポジティブ度</h3>
            {/* Overall score */}
            <div className="flex items-center justify-between bg-mint-light rounded-xl p-3 mb-3">
              <span className="text-xs font-bold">ポジティブ度</span>
              <span className="text-xl font-extrabold text-mint">{wordAnalysis.overallScore}%</span>
            </div>
            {wordAnalysis.changeMessage && (
              <p className="text-xs text-text-mid text-center mb-3">{wordAnalysis.changeMessage}</p>
            )}
            {/* Weekly trend */}
            {wordAnalysis.weeklyTrend.length > 1 && (
              <>
                <p className="text-xs font-bold mb-2">週別トレンド</p>
                <div className="flex items-end gap-1 h-16 mb-2">
                  {wordAnalysis.weeklyTrend.map((w, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full rounded-t-md bg-mint" style={{ height: `${Math.max(w.score * 0.6, 4)}px` }} />
                      <span className="text-[8px] text-text-light">{w.week}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {/* Top words */}
            {wordAnalysis.topWords.length > 0 && (
              <>
                <p className="text-xs font-bold mb-2 mt-3">よく使うポジティブワード</p>
                <div className="flex flex-wrap gap-1.5">
                  {wordAnalysis.topWords.map((w, i) => (
                    <span key={i} className="bg-mint-light text-mint px-2.5 py-1 rounded-full text-xs font-bold">
                      {w.word} ({w.count})
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mb-4">
          <a href="/vision" className="flex-1 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center text-sm font-bold text-text-mid hover:border-mint transition">🎯 ビジョン</a>
          <a href="/settings" className="flex-1 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center text-sm font-bold text-text-mid hover:border-mint transition">⚙️ 設定</a>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "https://rizup-app.vercel.app/"; }}
            className="flex-1 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center text-sm font-bold text-red-400 hover:bg-red-50 transition">
            ログアウト
          </button>
        </div>

        <h3 className="text-sm font-bold mb-3">📝 投稿履歴</h3>
        {posts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-text-light">まだ投稿がありません</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} userId={userId}
                isAdmin={profile.is_admin} onDelete={handlePostDelete} />
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center" style={{ zIndex: 9999 }} onClick={() => setShowEdit(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 animate-fade-in overflow-y-auto" style={{ maxHeight: "calc(100vh - env(safe-area-inset-bottom, 0px))", paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold">プロフィール編集</h2>
              <button onClick={() => setShowEdit(false)} className="text-text-light text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-text-mid block mb-1">名前</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint" />
              </div>
              <div>
                <label className="text-xs font-bold text-text-mid block mb-1">夢・目標</label>
                <input type="text" value={editForm.dream} onChange={(e) => setEditForm(f => ({ ...f, dream: e.target.value }))}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint" />
              </div>
              <div>
                <label className="text-xs font-bold text-text-mid block mb-1">星座</label>
                <select value={editForm.zodiac} onChange={(e) => setEditForm(f => ({ ...f, zodiac: e.target.value }))}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint bg-white">
                  <option value="">選択してください</option>
                  {zodiacSigns.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-text-mid block mb-1">生年月日</label>
                <input type="date" value={editForm.birthday} onChange={(e) => setEditForm(f => ({ ...f, birthday: e.target.value }))}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint" />
              </div>
              <div>
                <label className="text-xs font-bold text-text-mid block mb-1">Rizup タイプ</label>
                <select value={editForm.rizup_type} onChange={(e) => setEditForm(f => ({ ...f, rizup_type: e.target.value }))}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint bg-white">
                  <option value="">選択してください</option>
                  {(Object.keys(rizupTypes) as RizupType[]).map(t => (
                    <option key={t} value={t}>{rizupTypes[t].emoji} {rizupTypes[t].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-text-mid block mb-1">MBTI</label>
                <select value={editForm.mbti} onChange={(e) => setEditForm(f => ({ ...f, mbti: e.target.value }))}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint bg-white">
                  <option value="">選択してください</option>
                  {["INTJ","INTP","ENTJ","ENTP","INFJ","INFP","ENFJ","ENFP","ISTJ","ISFJ","ESTJ","ESFJ","ISTP","ISFP","ESTP","ESFP"].map(t => <option key={t} value={t}>{t}</option>)}
                  <option value="unknown">わからない</option>
                </select>
              </div>
            </div>
            <button onClick={handleEditSave} disabled={!editForm.name.trim()}
              className="w-full bg-mint text-white font-bold py-3 rounded-full mt-5 shadow-lg shadow-mint/30 disabled:opacity-30">保存する</button>
          </div>
        </div>
      )}

      {!showEdit && <BottomNav />}
    </div>
  );
}
