// Which LMS experience a user belongs to. Defaults to 'v2' (the column default)
// if the row/column is somehow absent, matching the migration's intent.
type SqlFn = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;

export type LmsVersion = "v1" | "v2";

// The home path a user of each version lands on after login / set-password.
export function lmsLanding(version: LmsVersion): "/lms" | "/lms-v2" {
  return version === "v2" ? "/lms-v2" : "/lms";
}

export async function getLmsVersion(sql: SqlFn, userId: string): Promise<LmsVersion> {
  try {
    const rows = (await sql`SELECT lms_version FROM users WHERE id = ${userId}`) as unknown as { lms_version: string | null }[];
    return rows[0]?.lms_version === "v1" ? "v1" : "v2";
  } catch {
    return "v2";
  }
}
