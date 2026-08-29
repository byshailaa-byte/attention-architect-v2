import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { getRazorpayClient, getPublicKeyId } from "@/lib/razorpay/client";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

const TIERS = {
  module1: { amount_paise:  49900, label: "Module 1" },
  full:    { amount_paise:  99900, label: "Full 6-Module Roadmap" },
  topup:   { amount_paise:  50000, label: "Upgrade to Full Roadmap" },
  tier1:   { amount_paise: 299900, label: "Roadmap" },
  tier2:   { amount_paise: 499900, label: "Roadmap + Founder Call" },
} as const;

type Tier = keyof typeof TIERS;

export async function POST(req: NextRequest) {
  try {
    const { sessionId, tier } = (await req.json()) as {
      sessionId: string;
      tier: Tier;
    };

    if (!sessionId || !tier) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!(tier in TIERS)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const sql = getSql();

    // Look up the assessment — fetch email and phone for user creation, pricing_variant for the purchase record
    const assessments = (await sql`
      SELECT id, email, phone, pricing_variant FROM assessments
      WHERE session_id = ${sessionId}::uuid
      LIMIT 1
    `) as unknown as { id: string; email: string | null; phone: string | null; pricing_variant: string | null }[];

    if (assessments.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { id: assessmentId, email: rawEmail, phone: rawPhone, pricing_variant } = assessments[0];

    if (!rawEmail && !rawPhone) {
      return NextResponse.json(
        { error: "No contact on file for this session — please re-enter your details to continue." },
        { status: 400 }
      );
    }

    // Create Razorpay order
    const rzp = getRazorpayClient();
    const tierConfig = TIERS[tier];

    const order = await rzp.orders.create({
      amount: tierConfig.amount_paise,
      currency: "INR",
      receipt: `${tier}_${sessionId.slice(0, 8)}`,
      notes: {
        assessment_id: assessmentId,
        tier,
      },
    });

    // Upsert user by email (preferred) or phone (gated arm, phone-only capture)
    let userId: string | null = null;
    if (rawEmail) {
      const email = rawEmail.trim().toLowerCase();
      await sql`
        INSERT INTO users (email) VALUES (${email})
        ON CONFLICT (email) WHERE email IS NOT NULL DO NOTHING
      `;
      const userRows = (await sql`
        SELECT id FROM users WHERE email = ${email} LIMIT 1
      `) as unknown as { id: string }[];
      userId = userRows[0]?.id ?? null;
    } else if (rawPhone) {
      const phone = rawPhone.trim();
      await sql`
        INSERT INTO users (phone) VALUES (${phone})
        ON CONFLICT (phone) DO NOTHING
      `;
      const userRows = (await sql`
        SELECT id FROM users WHERE phone = ${phone} LIMIT 1
      `) as unknown as { id: string }[];
      userId = userRows[0]?.id ?? null;
    }

    if (userId) {
      const variant = (pricing_variant === "gated" || pricing_variant === "control" || pricing_variant === "simplified")
        ? pricing_variant
        : null;
      await sql`
        INSERT INTO purchases
          (user_id, assessment_id, tier, amount_paise, razorpay_order_id, status, variant)
        VALUES
          (${userId}, ${assessmentId}, ${tier}, ${tierConfig.amount_paise},
           ${order.id}, 'pending', ${variant})
      `;
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: getPublicKeyId(),
    });
  } catch (e) {
    console.error("[checkout/order]", e);
    const msg = (e as Error).message;
    if (msg.startsWith("[Razorpay]")) {
      return NextResponse.json({ error: "Payment system unavailable" }, { status: 503 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
