import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    SELECT id, child_name, parent_name, archetype, archetype_fit_tier,
           generation_attempts,
           (SELECT COUNT(*) FROM reports r WHERE r.assessment_id = a.id AND r.status = 'preview') as preview_count
    FROM assessments a
    WHERE parent_name IS NOT NULL
      AND child_name IS NOT NULL
      AND child_name NOT ILIKE 'dsfsf%'
      AND child_name NOT ILIKE 'test%'
      AND answers != '{}'::jsonb
      AND generation_attempts < 5
    ORDER BY generation_attempts ASC, id
    LIMIT 10
  `;
  console.log(JSON.stringify(rows, null, 2));
}
main().catch(console.error);
