"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";

interface UserRow {
  id: string; name: string; email: string; plan: string;
  is_suspended: boolean; warning_count: number;
  created_at: string; avatar_url: string | null;
}

const planColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-600", pro: "bg-mint-light text-mint",
  premium: "bg-orange-light text-orange",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/home"; return; }
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
      if (!profile?.is_admin) { window.location.href = "/home"; return; }
      setAdminId(user.id);

      const { data } = await supabase.from("profiles")
        .select("id, name, email, plan, is_suspended, warning_count, created_at, avatar_url")
        .order("created_at", { ascending: false });
      if (data) setUsers(data);
      setLoading(false);
    };
    init();
  }, []);

  const toggleSuspend = async (userId: string, current: boolean) => {
    await supabase.from("profiles").update({ is_suspended: !current }).eq("id", userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_suspended: !current } : u));
  };

  const sendWarning = async (userId: string) => {
    const msg = prompt("警告メッセージを入力してください");
    if (!msg || !adminId) return;
    await fetch("/api/warn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: userId, adminUserId: adminId, message: msg }),
    });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, warning_count: u.warning_count + 1 } : u));
  };

  const changePlan = async (userId: string) => {
    const plan = prompt("新しいプランを入力 (free / pro / premium)");
    if (!plan || !["free", "pro", "premium"].includes(plan)) return;
    await supabase.from("profiles").update({ plan }).eq("id", userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan } : u));
  };

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Image src="/sho.png" alt="Sho" width={48} height={48} className="animate-sho-float rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/admin" className="text-text-light hover:text-mint">←</Link>
          <h1 className="text-lg font-extrabold">👥 ユーザー管理</h1>
          <span className="ml-auto text-xs text-text-light">{users.length}人</span>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className={`bg-white rounded-2xl p-4 border shadow-sm ${u.is_suspended ? "border-red-200 bg-red-50/30" : "border-gray-100"}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-mint-light flex items-center justify-center text-lg shrink-0">
                  {u.avatar_url?.startsWith("http") ? (
                    <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (u.avatar_url || "🌿")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold truncate">{u.name || "未設定"}</p>
                    {u.is_suspended && <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full font-bold">停止中</span>}
                  </div>
                  <p className="text-xs text-text-light truncate">{u.email}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${planColors[u.plan] || planColors.free}`}>
                  {(u.plan || "free").toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-text-light mb-3">
                <span>登録: {new Date(u.created_at).toLocaleDateString("ja-JP")}</span>
                <span>|</span>
                <span>警告: {u.warning_count}/3</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => toggleSuspend(u.id, u.is_suspended)}
                  className={`text-xs px-3 py-1.5 rounded-full font-bold border transition ${u.is_suspended ? "border-mint text-mint hover:bg-mint-light" : "border-red-300 text-red-500 hover:bg-red-50"}`}>
                  {u.is_suspended ? "復活" : "停止"}
                </button>
                <button onClick={() => sendWarning(u.id)}
                  className="text-xs px-3 py-1.5 rounded-full font-bold border border-orange text-orange hover:bg-orange-light transition">
                  ⚠️ 警告
                </button>
                <button onClick={() => changePlan(u.id)}
                  className="text-xs px-3 py-1.5 rounded-full font-bold border border-gray-200 text-text-mid hover:bg-gray-50 transition">
                  💳 プラン変更
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
