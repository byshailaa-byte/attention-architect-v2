import { after, NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { verifyWebhookSignature } from "@/lib/razorpay/client";
import { capturePayment } from "@/lib/razorpay/capture";
import { sendPurchaseReceipt } from "@/lib/auth/email";
import { assertBootGuards } from "@/lib/boot-guard";
import { sendCapiEvents } from "@/lib/meta/capi";

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
    let outcome: "processed" | "duplicate" | "not_found";
    try {
      outcome = await capturePayment(sql, razorpayPaymentId, razorpayOrderId);
    } catch (e) {
      // DB error — return 500 so Razorpay retries; do not silently swallow
      console.error(`[webhook/razorpay] capturePayment failed: order=${razorpayOrderId}`, e);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    if (outcome === "not_found") {
      // No purchases row for this order — payment captured by Razorpay but unrecorded in DB.
      // This should be unreachable now that checkout gates on non-null email, but if it
      // happens it means money was collected with no purchase record: manual reconciliation needed.
      console.error(
        `[webhook/razorpay] UNMATCHED PAYMENT — no purchases row found: order=${razorpayOrderId} payment=${razorpayPaymentId}. Manual reconciliation required.`
      );
      // Return 200 so Razorpay stops retrying; retrying would always get the same result
    } else if (outcome === "duplicate") {
      console.log(
        `[webhook/razorpay] Duplicate webhook, already processed: ${razorpayOrderId}`
      );
    } else {
      console.log(
        `[webhook/razorpay] payment.captured: order=${razorpayOrderId} payment=${razorpayPaymentId}`
      );

      // CAPI Purchase + funnel event — both run in after() post-response.
      // after() guarantees execution even after 200 is sent; single SELECT serves both.
      after(async () => {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://attentionparents.thehumandecision.in";
          const rows = await sql`
            SELECT a.session_id::text, p.tier, p.amount_paise, a.email, a.phone
            FROM purchases p
            JOIN assessments a ON a.id = p.assessment_id
            WHERE p.razorpay_order_id = ${razorpayOrderId}
            LIMIT 1
          ` as unknown as {
            session_id: string;
            tier: string;
            amount_paise: number;
            email: string | null;
            phone: string | null;
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
            })}::jsonb)
          `.catch((e: unknown) => console.warn("[funnel] purchase event:", (e as Error).message));
        } catch (e: unknown) {
          console.warn("[capi] purchase:", (e as Error).message);
        }
      });

      // Fire-and-forget receipt email. Never blocks the 200 response.
      // capturePayment guarantees "processed" is returned exactly once per order,
      // so this block — and the email — runs at most once even if Razorpay retries.
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ?? "https://attentionparents.thehumandecision.in";

      sql`
        SELECT
          u.email,
          a.child_name,
          a.session_id::text  AS session_id,
          p.amount_paise,
          p.tier
        FROM purchases p
        JOIN assessments a ON a.id = p.assessment_id
        JOIN users       u ON u.id  = p.user_id
        WHERE p.razorpay_order_id = ${razorpayOrderId}
        LIMIT 1
      `.then((rows) => {
        const row = (rows as {
          email: string | null;
          child_name: string | null;
          session_id: string | null;
          amount_paise: number;
          tier: string;
        }[])[0];
        if (!row?.email) {
          console.warn(`[webhook/razorpay] no email for receipt: order=${razorpayOrderId}`);
          return;
        }
        const setPasswordUrl = row.session_id
          ? `${baseUrl}/lms/set-password?session=${row.session_id}`
          : `${baseUrl}/lms/login`;
        return sendPurchaseReceipt({
          to: row.email,
          paymentId: razorpayPaymentId,
          amount: row.amount_paise,
          tier: row.tier,
          paidAt: new Date().toISOString(),
          childName: row.child_name,
          setPasswordUrl,
        });
      }).catch((err) =>
        console.error(`[webhook/razorpay] receipt lookup failed: order=${razorpayOrderId}`, err)
      );
    }
  } else if (event === "payment.failed") {
    const payment = payload.payload.payment?.entity;
    if (payment) {
      const sql = getSql();
      try {
        await sql`
          UPDATE purchases SET status = 'failed'
          WHERE razorpay_order_id = ${payment.order_id}
            AND status = 'pending'
        `;
        console.log(`[webhook/razorpay] payment.failed: order=${payment.order_id}`);
      } catch (e) {
        console.error(`[webhook/razorpay] payment.failed DB error: order=${payment.order_id}`, e);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }
    }
  } else {
    // Acknowledge unknown events without acting on them
    console.log(`[webhook/razorpay] Unhandled event: ${event}`);
  }

  return NextResponse.json({ ok: true });
}
