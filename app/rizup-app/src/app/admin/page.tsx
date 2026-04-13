"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0, activeToday: 0, totalPosts: 0, totalReports: 0,
    trialUsers: 0, proUsers: 0, premiumUsers: 0, freeUsers: 0,
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/home"; return; }
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
      if (!profile?.is_admin) { window.location.href = "/home"; return; }
      setAuthorized(true);

      const { count: totalUsers } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      const today = new Date().toISOString().split("T")[0];
      const { count: totalPosts } = await supabase.from("posts").select("id", { count: "exact", head: true });
      const { count: todayPosts } = await supabase.from("posts").select("id", { count: "exact", head: true }).gte("created_at", today);
      const { count: totalReports } = await supabase.from("reports").select("id", { count: "exact", head: true });

      const { data: plans } = await supabase.from("profiles").select("plan, trial_ends_at");
      let trial = 0, pro = 0, premium = 0, free = 0;
      plans?.forEach(p => {
        const plan = p.plan || "free";
        if (plan === "premium") premium++;
        else if (plan === "pro") pro++;
        else if (p.trial_ends_at && new Date(p.trial_ends_at) > new Date()) trial++;
        else free++;
      });

      setStats({
        totalUsers: totalUsers || 0, activeToday: todayPosts || 0,
        totalPosts: totalPosts || 0, totalReports: totalReports || 0,
        trialUsers: trial, proUsers: pro, premiumUsers: premium, freeUsers: free,
      });
      setLoading(false);
    };
    init();
  }, []);

  if (!authorized) return null;
  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Image src="/sho.png" alt="Rizup" width={48} height={48} className="animate-sho-float rounded-full" />
    </div>
  );

  const statCards = [
    { label: "総ユーザー", value: stats.totalUsers, color: "text-mint", bg: "bg-mint-light" },
    { label: "今日の投稿", value: stats.activeToday, color: "text-orange", bg: "bg-orange-light" },
    { label: "総投稿数", value: stats.totalPosts, color: "text-mint", bg: "bg-mint-light" },
    { label: "通報件数", value: stats.totalReports, color: "text-red-500", bg: "bg-red-50" },
  ];

  const planBars = [
    { label: "無料", count: stats.freeUsers, color: "#9ca3af" },
    { label: "トライアル", count: stats.trialUsers, color: "#fbbf24" },
    { label: "Pro", count: stats.proUsers, color: "#6ecbb0" },
    { label: "Premium", count: stats.premiumUsers, color: "#f4976c" },
  ];
  const maxPlan = Math.max(...planBars.map(b => b.count), 1);

  const navLinks = [
    { href: "/admin/users", icon: "👥", label: "ユーザー管理", desc: "一覧・停止・プラン変更" },
    { href: "/admin/posts", icon: "📝", label: "投稿管理", desc: "通報対応・削除" },
    { href: "/admin/notifications", icon: "📣", label: "通知配信", desc: "お知らせ・イベント" },
    { href: "/admin/content", icon: "📚", label: "レコメンド管理", desc: "Shoのおすすめ" },
  ];

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Image src="/sho.png" alt="Rizup" width={32} height={32} className="rounded-full" />
          <h1 className="text-lg font-extrabold">管理ダッシュボード</h1>
          <Link href="/home" className="ml-auto text-xs text-text-light hover:text-mint">← ホーム</Link>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {statCards.map((s, i) => (
            <div key={i} className={`${s.bg} rounded-2xl p-4 text-center`}>
              <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-text-mid mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
          <h3 className="text-sm font-bold mb-3">📊 プラン別ユーザー数</h3>
          <div className="space-y-2">
            {planBars.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs w-20 shrink-0">{b.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                    style={{ width: `${Math.max((b.count / maxPlan) * 100, 8)}%`, background: b.color }}>
                    <span className="text-[10px] text-white font-bold">{b.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {navLinks.map((link, i) => (
            <Link key={i} href={link.href}
              className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:border-mint transition">
              <span className="text-2xl">{link.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-bold">{link.label}</p>
                <p className="text-xs text-text-light">{link.desc}</p>
              </div>
              <span className="text-text-light">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
