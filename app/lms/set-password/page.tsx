import { Suspense } from "react";
import { getSql } from "@/lib/db/client";
import SetPasswordForm from "./SetPasswordForm";

type Props = { searchParams: Promise<{ session?: string }> };

export default async function SetPasswordPage({ searchParams }: Props) {
  const { session: sessionId } = await searchParams;

  let email: string | null = null;
  if (sessionId) {
    try {
      const sql = getSql();
      const rows = (await sql`
        SELECT email FROM assessments
        WHERE session_id = ${sessionId}::uuid AND email IS NOT NULL
        LIMIT 1
      `) as unknown as { email: string }[];
      email = rows[0]?.email ?? null;
    } catch {
      // Fall through — form will show without pre-filled email
    }
  }

  return (
    <Suspense>
      <SetPasswordForm sessionId={sessionId ?? ""} email={email} />
    </Suspense>
  );
}
