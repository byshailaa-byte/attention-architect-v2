import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { verifyWebhookSignature } from "@/lib/razorpay/client";
import { capturePayment } from "@/lib/razorpay/capture";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let valid: boolean;
  try {
    valid = verifyWebhookSignature(rawBody, signature);
  } catch {
    // Key not configured — can't verify
    return NextResponse.json({ error: "Payment system unavailable" }, { status: 503 });
  }

  if (!valid) {
    console.warn("[webhook/razorpay] Signature mismatch — possible replay or misconfiguration");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: {
    event: string;
    payload: {
      payment?: {
        entity: {
          id: string;
          order_id: string;
          status: string;
        };
      };
    };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event } = payload;

  if (event === "payment.captured") {
    const payment = payload.payload.payment?.entity;
    if (!payment) {
      return NextResponse.json({ error: "Missing payment entity" }, { status: 400 });
    }

    const { id: razorpayPaymentId, order_id: razorpayOrderId } = payment;

    const sql = getSql();
    const outcome = await capturePayment(sql, razorpayPaymentId, razorpayOrderId);

    if (outcome === "duplicate") {
      // Either not found or already processed — both are fine
      console.log(
        `[webhook/razorpay] Skipped duplicate or unknown order: ${razorpayOrderId}`
      );
    } else {
      console.log(
        `[webhook/razorpay] payment.captured: order=${razorpayOrderId} payment=${razorpayPaymentId}`
      );
    }
  } else if (event === "payment.failed") {
    const payment = payload.payload.payment?.entity;
    if (payment) {
      const sql = getSql();
      await sql`
        UPDATE purchases SET status = 'failed'
        WHERE razorpay_order_id = ${payment.order_id}
          AND status = 'pending'
      `;
      console.log(`[webhook/razorpay] payment.failed: order=${payment.order_id}`);
    }
  } else {
    // Acknowledge unknown events without acting on them
    console.log(`[webhook/razorpay] Unhandled event: ${event}`);
  }

  return NextResponse.json({ ok: true });
}
