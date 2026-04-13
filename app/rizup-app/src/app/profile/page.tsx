"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { rizupTypes, zodiacSigns, typeQuestions, calculateType } from "@/lib/rizup-types";
import type { RizupType } from "@/lib/rizup-types";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import Link from "next/link";

interface ProfileData {
  name: string;
  dream: string;
  avatar_url: string | null;
  streak: number;
  plan: string;
  zodiac?: string;
  rizup_type?: string;
  birthday?: string;
  is_admin?: boolean;
  mbti?: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [posts, setPosts] = useState<any[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalReactions, setTotalReactions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", dream: "", zodiac: "", birthday: "", rizup_type: "", mbti: "" });
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [quizResult, setQuizResult] = useState<RizupType | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setProfile(prof || { name: "ゲスト", dream: "", avatar_url: null, streak: 0, plan: "free" });

        const { data: userPosts, count } = await supabase.from("posts")
          .select("*, profiles(name, avatar_url)", { count: "exact" })
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
        if (userPosts) setPosts(userPosts);
        if (count) setTotalPosts(count);

        if (userPosts && userPosts.length > 0) {
          const { count: rxCount } = await supabase.from("reactions")
            .select("id", { count: "exact", head: true })
            .in("post_id", userPosts.map(p => p.id));
          setTotalReactions(rxCount || 0);
        }
      } catch (err) {
        console.error("[Profile]", err);
      }
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
    if (uploadErr) { setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", userId);
    setProfile(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : prev);
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

  const handleQuizAnswer = (type: string) => {
    const newAnswers = [...quizAnswers, type];
    setQuizAnswers(newAnswers);
    if (quizIndex < typeQuestions.length - 1) setQuizIndex(quizIndex + 1);
    else setQuizResult(calculateType(newAnswers));
  };

  const handleQuizSave = async () => {
    if (!quizResult || !userId) return;
    await supabase.from("profiles").update({ rizup_type: quizResult }).eq("id", userId);
    setProfile(prev => prev ? { ...prev, rizup_type: quizResult } : prev);
    setShowQuiz(false); setQuizIndex(0); setQuizAnswers([]); setQuizResult(null);
  };

  const handlePostDelete = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    setTotalPosts(prev => prev - 1);
  };

  if (loading) return (
    <div className="min-h-screen bg-bg pb-20">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center mb-4 animate-pulse">
          <div className="w-20 h-20 rounded-full bg-gray-200 mx-auto mb-3" />
          <div className="h-5 bg-gray-200 rounded-full w-32 mx-auto" />
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
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            {typeInfo && (
              <button onClick={() => { setShowQuiz(true); setQuizIndex(0); setQuizAnswers([]); setQuizResult(null); }}
                className="px-3 py-1 rounded-full text-xs font-bold transition hover:opacity-80"
                style={{ background: `${typeInfo.color}20`, color: typeInfo.color }}>
                {typeInfo.emoji} {typeInfo.label}タイプ
              </button>
            )}
            {profile.zodiac && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-light text-orange">{profile.zodiac}</span>}
          </div>
          <div className="mt-3">
            <button onClick={() => {
              setEditForm({
                name: profile.name, dream: profile.dream || "",
                zodiac: profile.zodiac || "", birthday: profile.birthday || "",
                rizup_type: profile.rizup_type || "", mbti: profile.mbti || "",
              });
              setShowEdit(true);
            }} className="text-xs text-mint font-bold border border-mint rounded-full px-4 py-1.5 hover:bg-mint-light transition">
              ✏️ プロフィールを編集
            </button>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="text-center"><div className="text-xl font-extrabold text-mint">{totalPosts}</div><div className="text-[10px] text-text-light">投稿</div></div>
            <div className="text-center"><div className="text-xl font-extrabold text-orange">🔥 {profile.streak}</div><div className="text-[10px] text-text-light">連続日数</div></div>
            <div className="text-center"><div className="text-xl font-extrabold text-mint">{totalReactions}</div><div className="text-[10px] text-text-light">受けた応援</div></div>
          </div>
        </div>

        {/* 成長グラフへ */}
        <Link href="/growth" className="block bg-gradient-to-br from-mint-light to-orange-light rounded-2xl p-4 mb-4 border border-mint/20 hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📈</span>
            <div className="flex-1">
              <p className="text-sm font-bold">成長グラフを見る</p>
              <p className="text-[10px] text-text-mid">気分・睡眠・ポジティブ度の推移</p>
            </div>
            <span className="text-text-light">→</span>
          </div>
        </Link>

        {/* Actions */}
        <div className="flex gap-2 mb-4">
          <Link href="/vision" className="flex-1 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center text-sm font-bold text-text-mid hover:border-mint transition">🎯 ビジョン</Link>
          <Link href="/anti-vision" className="flex-1 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center text-sm font-bold text-text-mid hover:border-mint transition">🚫 アンチ</Link>
          <Link href="/settings" className="flex-1 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center text-sm font-bold text-text-mid hover:border-mint transition">⚙️ 設定</Link>
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
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 animate-fade-in overflow-y-auto"
            style={{ maxHeight: "calc(100vh - env(safe-area-inset-bottom, 0px))", paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold">プロフィール編集</h2>
              <button onClick={() => setShowEdit(false)} className="text-text-light text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <Field label="名前"><input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="fld" /></Field>
              <Field label="夢・目標"><input type="text" value={editForm.dream} onChange={e => setEditForm(f => ({ ...f, dream: e.target.value }))} className="fld" /></Field>
              <Field label="星座">
                <select value={editForm.zodiac} onChange={e => setEditForm(f => ({ ...f, zodiac: e.target.value }))} className="fld bg-white">
                  <option value="">選択してください</option>
                  {zodiacSigns.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </Field>
              <Field label="生年月日"><input type="date" value={editForm.birthday} onChange={e => setEditForm(f => ({ ...f, birthday: e.target.value }))} className="fld" /></Field>
              <Field label="Rizup タイプ">
                <select value={editForm.rizup_type} onChange={e => setEditForm(f => ({ ...f, rizup_type: e.target.value }))} className="fld bg-white">
                  <option value="">選択してください</option>
                  {(Object.keys(rizupTypes) as RizupType[]).map(t => (
                    <option key={t} value={t}>{rizupTypes[t].emoji} {rizupTypes[t].label}</option>
                  ))}
                </select>
              </Field>
              <Field label="MBTI">
                <select value={editForm.mbti} onChange={e => setEditForm(f => ({ ...f, mbti: e.target.value }))} className="fld bg-white">
                  <option value="">選択してください</option>
                  {["INTJ","INTP","ENTJ","ENTP","INFJ","INFP","ENFJ","ENFP","ISTJ","ISFJ","ESTJ","ESFJ","ISTP","ISFP","ESTP","ESFP"].map(t => <option key={t} value={t}>{t}</option>)}
                  <option value="unknown">わからない</option>
                </select>
              </Field>
            </div>
            <button onClick={handleEditSave} disabled={!editForm.name.trim()}
              className="w-full bg-mint text-white font-bold py-3 rounded-full mt-5 shadow-lg shadow-mint/30 disabled:opacity-30">保存する</button>
          </div>
        </div>
      )}

      {/* Type Quiz Modal */}
      {showQuiz && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4" style={{ zIndex: 9999 }} onClick={() => setShowQuiz(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            {!quizResult ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-extrabold">Rizupタイプ診断</h2>
                  <button onClick={() => setShowQuiz(false)} className="text-text-light text-xl">✕</button>
                </div>
                <div className="flex justify-center gap-1 mb-4">
                  {typeQuestions.map((_, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= quizIndex ? "bg-mint" : "bg-gray-200"}`} />
                  ))}
                </div>
                <h3 className="text-base font-extrabold text-center mb-1">Q{quizIndex + 1}. {typeQuestions[quizIndex].q}</h3>
                <p className="text-text-light text-xs text-center mb-4">直感で選んでね</p>
                <div className="flex flex-col gap-2">
                  {typeQuestions[quizIndex].a.map((a, i) => (
                    <button key={i} onClick={() => handleQuizAnswer(a.type)}
                      className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm text-left font-medium hover:border-mint hover:bg-mint-light transition">
                      {a.text}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="text-5xl mb-3">{rizupTypes[quizResult].emoji}</div>
                <h2 className="text-xl font-extrabold mb-1">あなたは{rizupTypes[quizResult].label}タイプ！</h2>
                <p className="text-text-mid text-sm leading-relaxed mb-5">{rizupTypes[quizResult].desc}</p>
                <button onClick={handleQuizSave} className="w-full bg-mint text-white font-bold py-3.5 rounded-full shadow-lg shadow-mint/30 mb-2">このタイプに更新する</button>
                <button onClick={() => setShowQuiz(false)} className="w-full text-text-light text-sm py-2">キャンセル</button>
              </div>
            )}
          </div>
        </div>
      )}

      {!showEdit && !showQuiz && <BottomNav />}
      <style jsx>{`
        .fld { width: 100%; border: 2px solid #f3f4f6; border-radius: 0.75rem; padding: 0.625rem 1rem; font-size: 0.875rem; outline: none; }
        .fld:focus { border-color: #6ecbb0; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-text-mid block mb-1">{label}</label>
      {children}
    </div>
  );
}
