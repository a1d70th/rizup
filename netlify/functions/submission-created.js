// Netlify Function: フォーム送信時に自動返信メールを送信する
// トリガー: "submission-created" は Netlify Forms の送信時に自動で呼ばれる
//
// 必要な環境変数（Netlify ダッシュボードで設定）:
//   RESEND_API_KEY  — Resend (https://resend.com) の API キー
//   FROM_EMAIL      — 送信元メールアドレス（Resend で認証済みのドメイン）
//
// Resend 無料プラン: 月3,000通まで無料・クレジットカード不要

exports.handler = async function (event) {
  const { payload } = JSON.parse(event.body);
  const email = payload.data.email;

  if (!email) {
    console.log("No email address found in submission");
    return { statusCode: 200, body: "No email to reply to" };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@rizup.com";

  if (!RESEND_API_KEY) {
    console.log("RESEND_API_KEY not set, skipping auto-reply");
    return { statusCode: 200, body: "API key not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Rizup <${FROM_EMAIL}>`,
        to: [email],
        subject: "Rizupへようこそ！",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
            <h2 style="color: #6ecbb0; margin-bottom: 1rem;">Rizup へようこそ！</h2>
            <p style="color: #3a3a3a; line-height: 1.8;">
              登録ありがとうございます。<br>
              Discord でお待ちしています。下記リンクから参加してください。
            </p>
            <a href="https://discord.gg/ssA69BTe4"
               style="display: inline-block; margin-top: 1rem; padding: 0.8rem 2rem;
                      background: #6ecbb0; color: #fff; text-decoration: none;
                      border-radius: 999px; font-weight: bold;">
              Discord に参加する
            </a>
            <p style="margin-top: 2rem; font-size: 0.85rem; color: #a0a0a0;">
              このメールは Rizup への登録時に自動送信されています。
            </p>
          </div>
        `,
        text: "登録ありがとうございます。Discordでお待ちしています。下記リンクから参加してください。\nhttps://discord.gg/ssA69BTe4",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.log("Resend API error:", error);
      return { statusCode: response.status, body: error };
    }

    console.log(`Auto-reply sent to ${email}`);
    return { statusCode: 200, body: "Auto-reply sent" };
  } catch (error) {
    console.log("Error sending email:", error);
    return { statusCode: 500, body: "Failed to send auto-reply" };
  }
};
