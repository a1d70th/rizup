import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRO_PRICE_ID || "price_1TJrqX2L4WVM0isfmmryC15w",
  premium: process.env.STRIPE_PREMIUM_PRICE_ID || "price_1TJrr92L4WVM0isfGz0qxfpn",
  vip: process.env.STRIPE_VIP_PRICE_ID || "price_1TJrrh2L4WVM0isfG62PrANr",
};

export async function POST(request: NextRequest) {
  try {
    if (!STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
    }

    const { plan } = await request.json();
    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Get current user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create Stripe Checkout Session
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode": "subscription",
        "payment_method_types[0]": "card",
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        "success_url": "https://rizup-app.vercel.app/settings?checkout=success",
        "cancel_url": "https://rizup-app.vercel.app/settings?checkout=cancel",
        "client_reference_id": user.id,
        "metadata[user_id]": user.id,
        "metadata[plan]": plan,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Stripe Checkout] Error:", err);
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }

    const session = await response.json();
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[Stripe Checkout]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
