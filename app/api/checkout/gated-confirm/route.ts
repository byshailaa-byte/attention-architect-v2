import { after, NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { verifyPaymentSignature } from "@/lib/razorpay/client";
import { capturePayment } from "@/lib/razorpay/capture";
import { assertBootGuards } from "@/lib/boot-guard";
import { sendCapiEvents } from "@/lib/meta/capi";
import { sendPurchaseReceipt } from "@/lib/auth/email";

assertBootGuards();

export async function POST(req: NextRequest) {
  try {
    const { sessionId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      (await req.json()) as {
        sessionId: string;
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
      };

    if (!sessionId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let valid: boolean;
    try {
      valid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    } catch {
      return NextResponse.json({ error: "Payment system unavailable" }, { status: 503 });
    }

    if (!valid) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const sql = getSql();
    let outcome: "processed" | "duplicate" | "not_found";
    try {
      outcome = await capturePayment(sql, razorpayPaymentId, razorpayOrderId);
    } catch (e) {
      console.error("[checkout/gated-confirm] capturePayment failed:", e);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    if (outcome === "not_found") {
      console.error(
        `[checkout/gated-confirm] UNMATCHED PAYMENT — no purchases row: order=${razorpayOrderId} payment=${razorpayPaymentId}`,
      );
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (outcome === "processed") {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ?? "https://attentionparents.thehumandecision.in";

      after(async () => {
        try {
          const rows = (await sql`
            SELECT a.session_id::text, p.tier, p.amount_paise, a.email, a.phone,
                   a.child_name, u.email AS user_email
            FROM purchases p
            JOIN assessments a ON a.id = p.assessment_id
            LEFT JOIN users u ON u.id = p.user_id
            WHERE p.razorpay_order_id = ${razorpayOrderId}
            LIMIT 1
          `) as unknown as {
            session_id: string;
            tier: string;
            amount_paise: number;
            email: string | null;
            phone: string | null;
            child_name: string | null;
            user_email: string | null;
          }[];
          const row = rows[0];
          if (!row) return;

          await sendCapiEvents([{
            event_name: "Purchase",
            event_time: Math.floor(Date.now() / 1000),
            event_id: `purchase:${razorpayPaymentId}`,
            event_source_url: `${baseUrl}/report/${row.session_id}`,
            action_source: "website",
            userData: { email: row.email, phone: row.phone },
            custom_data: {
              value: row.amount_paise / 100,
              currency: "INR",
              content_name: row.tier,
              content_ids: [row.tier],
              content_type: "product",
              num_items: 1,
            },
          }]);

          await sql`
            INSERT INTO funnel_events (event_type, session_id, metadata)
            VALUES ('purchase', ${row.session_id}::uuid, ${JSON.stringify({
              tier: row.tier,
              value: row.amount_paise / 100,
              razorpay_payment_id: razorpayPaymentId,
              variant: "gated",
            })}::jsonb)
          `.catch((e: unknown) =>
            console.warn("[funnel] purchase event (gated):", (e as Error).message),
          );

          // Send receipt email with set-password link if we have an email address.
          // gated-confirm wins the capturePayment race so the webhook gets "duplicate"
          // and skips its email block — this is the authoritative send for gated arm.
          const recipientEmail = row.user_email ?? row.email;
          if (recipientEmail) {
            await sendPurchaseReceipt({
              to: recipientEmail,
              paymentId: razorpayPaymentId,
              amount: row.amount_paise,
              tier: row.tier,
              paidAt: new Date().toISOString(),
              childName: row.child_name,
              setPasswordUrl: `${baseUrl}/lms/set-password?session=${row.session_id}`,
            });
          }
        } catch (e: unknown) {
          console.warn("[capi] gated purchase:", (e as Error).message);
        }
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[checkout/gated-confirm]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
