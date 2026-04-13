import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Stripe Webhook — checkout完了/解約 で profiles.plan を自動更新
// 設定手順:
// 1. Stripe Dashboard → Developers → Webhooks → Add endpoint
//    URL: https://rizup-app.vercel.app/api/stripe/webhook
//    Events: checkout.session.completed / customer.subscription.updated / customer.subscription.deleted
// 2. Signing Secret を Vercel 環境変数 STRIPE_WEBHOOK_SECRET に設定
// 3. STRIPE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY が必要

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const PRO_PRICE = process.env.STRIPE_PRO_PRICE_ID;
const PREMIUM_PRICE = process.env.STRIPE_PREMIUM_PRICE_ID;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function verifySignature(payload: string, sigHeader: string | null, secret: string): Promise<boolean> {
  if (!sigHeader) return false;
  const parts = sigHeader.split(",").reduce<Record<string, string>>((acc, p) => {
    const [k, v] = p.split("=");
    acc[k] = v;
    return acc;
  }, {});
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const signed = `${t}.${payload}`;
  const expected = createHmac("sha256", secret).update(signed).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(v1, "hex"), Buffer.from(expected, "hex"));
  } catch { return false; }
}

function planFromPriceId(priceId: string | null | undefined): "pro" | "premium" | null {
  if (!priceId) return null;
  if (priceId === PRO_PRICE) return "pro";
  if (priceId === PREMIUM_PRICE) return "premium";
  return null;
}

export async function POST(request: NextRequest) {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }
  const payload = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (STRIPE_WEBHOOK_SECRET) {
    const ok = await verifySignature(payload, sig, STRIPE_WEBHOOK_SECRET);
    if (!ok) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!serviceKey) return NextResponse.json({ error: "No DB credentials" }, { status: 500 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Record<string, unknown>;
      const userId = (s.client_reference_id || (s.metadata as Record<string, string> | null)?.user_id) as string | undefined;
      const subId = s.subscription as string | undefined;
      const custId = s.customer as string | undefined;
      const metaPlan = ((s.metadata as Record<string, string> | null)?.plan) as string | undefined;
      if (userId) {
        const updates: Record<string, unknown> = {};
        if (metaPlan === "pro" || metaPlan === "premium") updates.plan = metaPlan;
        if (subId) updates.stripe_subscription_id = subId;
        if (custId) updates.stripe_customer_id = custId;
        if (Object.keys(updates).length > 0) {
          await supabase.from("profiles").update(updates).eq("id", userId);
        }
      }
    } else if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Record<string, unknown>;
      const custId = sub.customer as string | undefined;
      const items = (sub.items as { data?: { price?: { id?: string } }[] } | undefined)?.data || [];
      const priceId = items[0]?.price?.id;
      const plan = planFromPriceId(priceId);
      if (custId && plan) {
        await supabase.from("profiles").update({ plan, stripe_subscription_id: sub.id })
          .eq("stripe_customer_id", custId);
      }
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Record<string, unknown>;
      const custId = sub.customer as string | undefined;
      if (custId) {
        await supabase.from("profiles").update({ plan: "free" }).eq("stripe_customer_id", custId);
      }
    }
  } catch (err) {
    console.error("[Stripe Webhook]", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
