import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

const result = await sql`
  UPDATE assessments
  SET is_internal = true
  WHERE session_id IN (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    '964ecfae-0668-41e5-ab3c-fe0ecb615dca',
    '50763596-1568-4615-af64-2b2a450db5b1',
    '06f08a97-f6b9-4e46-9cbe-bf8d546b9fac'
  )
`;
console.log("Rows updated:", result.length);

const check = await sql`SELECT COUNT(*)::int AS n FROM assessments WHERE is_internal = true`;
console.log("Total is_internal = true:", (check as {n:number}[])[0].n, "(expected 71)");
