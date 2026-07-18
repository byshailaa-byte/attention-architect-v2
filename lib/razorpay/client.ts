import Razorpay from "razorpay";
import crypto from "crypto";

// Boot guard for missing keys — warn, don't crash (keys are optional in dev).
// Boot DOES crash (in boot-guard.ts) if a live key is present — that's the hard constraint.
function getRazorpayKeys(): { keyId: string; keySecret: string } {
  const keyId = process.env.RAZORPAY_KEY_ID ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
  if (!keyId || !keySecret) {
    throw new Error(
      "[Razorpay] RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set. " +
        "Add rzp_test_* keys to .env.local."
    );
  }
  return { keyId, keySecret };
}

export function getRazorpayClient(): Razorpay {
  const { keyId, keySecret } = getRazorpayKeys();
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export function getPublicKeyId(): string {
  return getRazorpayKeys().keyId;
}

function getWebhookSecret(): string {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
  if (!secret) {
    throw new Error(
      "[Razorpay] RAZORPAY_WEBHOOK_SECRET must be set. " +
        "Generate a webhook secret in the Razorpay dashboard and copy it here."
    );
  }
  return secret;
}

// Webhook HMAC-SHA256 signature verification.
// Uses RAZORPAY_WEBHOOK_SECRET (the secret set in Razorpay's dashboard webhook config),
// NOT RAZORPAY_KEY_SECRET. These are two distinct secrets.
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const secret = getWebhookSecret();
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
