import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { getRazorpayClient, getPublicKeyId } from "@/lib/razorpay/client";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

const TIERS = {
  module1: { amount_paise: 49900, label: "Module 1" },
  full:    { amount_paise: 99900, label: "Full 6-Module Roadmap" },
  topup:   { amount_paise: 50000, label: "Upgrade to Full Roadmap" },
} as const;

type Tier = keyof typeof TIERS;

export async function POST(req: NextRequest) {
  try {
    const { sessionId, tier, phone } = (await req.json()) as {
      sessionId: string;
      tier: Tier;
      phone?: string;
    };

    if (!sessionId || !tier) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!(tier in TIERS)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const sql = getSql();

    // Look up the assessment
    const assessments = (await sql`
      SELECT id FROM assessments
      WHERE session_id = ${sessionId}::uuid
      LIMIT 1
    `) as unknown as { id: string }[];

    if (assessments.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const assessmentId = assessments[0].id;

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

    // If phone was provided, upsert user and record purchase
    if (phone?.trim()) {
      const normalizedPhone = phone.trim().replace(/\s+/g, "");
      if (/^(\+91)?[6-9]\d{9}$/.test(normalizedPhone)) {
        await sql`
          INSERT INTO users (phone, email)
          VALUES (${normalizedPhone}, NULL)
          ON CONFLICT (phone) DO NOTHING
        `;
        const users = (await sql`
          SELECT id FROM users WHERE phone = ${normalizedPhone} LIMIT 1
        `) as unknown as { id: string }[];
        if (users.length > 0) {
          await sql`
            INSERT INTO purchases
              (user_id, assessment_id, tier, amount_paise, razorpay_order_id, status)
            VALUES
              (${users[0].id}, ${assessmentId}, ${tier}, ${tierConfig.amount_paise},
               ${order.id}, 'pending')
          `;
        }
      }
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
