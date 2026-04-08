import { NextResponse } from "next/server";

const ADMIN_EMAIL = "a1d.70th@gmail.com";
const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function POST(request: Request) {
  try {
    const { postId, reporterName, postContent, reason } = await request.json();

    // Send notification email to admin if Resend key available
    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Rizup <noreply@rizup.vercel.app>",
          to: ADMIN_EMAIL,
          subject: `⚠️ 投稿が通報されました (${postId.slice(0, 8)})`,
          html: `
            <h2>通報通知</h2>
            <p><strong>通報者：</strong>${reporterName}</p>
            <p><strong>理由：</strong>${reason || "指定なし"}</p>
            <p><strong>投稿内容：</strong></p>
            <blockquote>${postContent}</blockquote>
            <p><strong>投稿ID：</strong>${postId}</p>
          `,
        }),
      }).catch(console.error);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Report API]", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
