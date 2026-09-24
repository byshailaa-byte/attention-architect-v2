import { neon } from "@neondatabase/serverless";
const sql = neon("postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require");

// Run all 45 supersession updates from phase_37a_supersede_duplicates.sql
// Each is idempotent: WHERE superseded_by IS NULL

const pairs: [string, string][] = [
  ["3bc5371a-a227-4e5a-be56-2a0249ee4a0d", "3ca810e8-fdcf-4519-93fd-95de87635a60"],
  ["130a0509-d2d4-447c-b370-3c1793e09a21", "d7347b25-e957-4605-ac02-5dd8e97d1976"],
  ["d08be12e-0624-4992-8ab0-0972037a4be7", "c4494934-ae3e-4cfb-a3c2-f9a1f03e1d2c"],
  ["ca47d9e7-578a-42a4-942e-0d501092db19", "3acb5019-b127-4a03-96d8-47403ba60ca5"],
  ["5259ab52-adfa-4a2c-a9fc-42ab03a7a5a9", "90dec735-afa0-446c-842c-b97ebcae0ec8"],
  ["5b85c7d1-d52a-4100-8d4c-afac26a4f48c", "4e897169-550f-46f0-8b24-9a17ce0b47e3"],
  ["2ba66ee8-b8c6-4000-98bd-cf1055ab5e8d", "dfcec706-e339-4a96-9a8e-ef73fc2799fd"],
  ["65af19b0-7b65-446a-8976-20bdc81d44c2", "eecad929-1798-48fa-ac53-7ad7c2e6984f"],
  ["984563a0-e538-488b-baac-143f0733d628", "e729a8e6-50ea-49bf-a349-9d525221b022"],
  ["e97f8077-c1b0-47f6-9be8-73c8c0b911ff", "aa4116cb-3ae8-4b56-90e8-9007055513fa"],
  ["c34ac7b2-b58c-4fb2-b024-d61421fa7f0d", "8a5905d6-ecd2-4550-b195-c5bc7a6ecf11"],
  ["a3e52ab9-d50b-427a-8ccf-bd19d9fde028", "5888b084-c933-44c2-ad69-a37c90f3c6ff"],
  ["aef56b99-b952-45fb-a5d5-147a275d2633", "0f68235a-fd1e-49fa-ac3e-7a1d5ec79304"],
  ["2fa3aea2-5231-405c-88f2-4ea7e3f3e106", "4c176af9-d29e-463c-9d54-63d41caaf815"],
  ["aba3966e-32bc-4d74-bfdc-eb0d4199b714", "3322d75b-d731-4bf3-8ea3-58eedb58c46f"],
  ["9c7a78ef-c9f9-44f0-8fe0-26c5536f7d18", "cf1097b5-afc4-4790-8649-c2ac896f3fc0"],
  ["0e3dcaae-89c9-4383-b9d1-6d125ee01d9a", "4bf1807b-c9fb-4435-9994-70426ad33c0f"],
  ["7fbd0bd7-d013-4a1c-af4e-1ab8676c5152", "fbf5b456-395c-42fc-8b26-933b906940e3"],
  ["da5049b4-dbfa-4230-847c-deee200953ac", "7ac7d013-cd34-4c7d-acfd-87b8ccbf3ecb"],
  ["25ea2952-c826-4ddf-9a9f-ed6c1c5cf802", "b20bf910-8f9c-429c-805a-e542f91a9842"],
  ["04d9f802-c85c-4cbf-b92c-b40d57299ad5", "d043ba46-dcf0-45fb-bb6a-0be96b17427d"],
  ["4cb18f98-c4ab-4b88-8b9a-00a3c9dfeb1a", "d228a54e-58cf-42a2-9e9e-0904120834b2"],
  ["7c9d2c61-dd34-4903-85b7-ab22da768e4b", "2cf70a26-3691-477d-a38d-73bd0a214a44"],
  ["e8bb9816-d851-414d-a80f-e0e80027b0a7", "efb471e8-1605-4912-b967-c65d6becbdc7"],
  ["8bf993b0-9b35-4833-a44f-d6bdf079c6df", "7d4c620c-b4cd-4eaf-8067-df474c0e9b7a"],
  ["12522f90-a090-45ef-8853-baf1dc406434", "118bdc2d-4ebd-4ee9-a5c5-9c4ac502737f"],
  ["0a7219e2-e16b-4dc8-8fb5-658d1eb4bf81", "5a67da01-363f-4337-8eef-b2fc9ad86193"],
  ["1733e775-19d9-4e8d-9210-b0021118d998", "fd60b74b-3ef7-498e-896f-7f46a266e159"],
  ["b0aece4b-b810-4653-9711-d68974ba802d", "1143899f-311a-49e0-9b49-1d34afae221b"],
  ["5f07099b-6b80-406b-b8c1-0c80127409ae", "2cb75b8d-7362-4bc6-96ac-a2adbb7e3283"],
  ["7ac879fe-2350-4223-a57f-c9471bf54f98", "14940f92-c7cd-42cd-a233-b7dded813a46"],
  ["960354ed-0e57-49f6-af58-c48d4f5d8c26", "d1071673-f2a6-4e48-bb0e-10268558153a"],
  ["825b3c27-ab1d-43e0-8f57-ee5e432a80ab", "df919a01-69ac-45b6-99c6-be7d55dcd135"],
  ["c1b491fa-ac0c-425d-a3e1-2659089f1efd", "c6dd2ab8-f6d7-437e-9b2f-b373c66133f4"],
  ["2e1801ef-0361-4195-ac76-6b6e4e019e48", "fbb9a72b-9bde-4f6b-ba37-626065fbf919"],
  ["f3074a7a-f06d-4d84-9717-ea12ba08b736", "9a8f42d0-bbeb-4087-bbae-62e6285b148b"],
  ["4a9e5931-c469-46c1-b7fe-524657860e2b", "60ffe94c-04a2-4e63-95ab-21f617a6ebc7"],
  ["966fd73a-d943-476b-8933-33707145c924", "4a79e211-8798-4e5a-94dc-1db7733ab433"],
  ["56b009f5-67ae-4a40-92eb-59465ddcd0bf", "e8ed94cc-30b0-48bb-b9ae-ba0c47ff5328"],
  ["428692ba-3cd1-43fa-88b3-4608051bba9b", "ea71133a-96cf-4822-a140-9779952c62ee"],
  ["2df78bd2-6b56-4959-b784-7b6e634c500b", "bfb053c0-80be-447b-bcd8-c60b5f0ebd6c"],
  ["353bf7f5-578c-4cdf-b54f-ffbd0a1a75c0", "799e0adb-1d5f-428f-8974-39ceeafaf540"],
  ["71e04224-d7c1-463f-84d2-aee282121a22", "6279be99-9d54-4388-98a6-43f8dd9b6b66"],
  ["29167d8a-6f01-4988-aa70-9c628e9597ce", "0c85d3df-5005-4baf-b271-486e522c814c"],
  ["6bfcd0ad-e722-49e8-8b4f-ae62334674ae", "76a73295-c2e5-45c2-b077-d4d99386650c"],
];

console.log("Running 45 supersession updates…");
let updated = 0;
for (const [older_id, newer_id] of pairs) {
  const result = await sql`
    UPDATE reports
    SET superseded_by = ${newer_id}::uuid
    WHERE id = ${older_id}::uuid
      AND superseded_by IS NULL
  `;
  // neon returns an object with `rowCount` when using the neon() client
  updated += (result as unknown as { rowCount: number }).rowCount ?? 0;
}
console.log(`Rows updated: ${updated} (expect 45)`);

// ── Verify ───────────────────────────────────────────────────────────────────
console.log("\n── Verification ──");

const [blocking] = await sql`
  SELECT COUNT(DISTINCT assessment_id)::int AS n
  FROM (
    SELECT assessment_id FROM reports
    WHERE superseded_by IS NULL AND status = 'published'
    GROUP BY assessment_id HAVING COUNT(*) > 1
  ) sub
` as unknown as { n: number }[];
console.log(`Assessments with >1 live published row: ${blocking.n}  (expect 0)`);

const [total] = await sql`
  SELECT COUNT(*)::int AS n FROM reports WHERE status = 'published'
` as unknown as { n: number }[];
console.log(`Total published rows:                   ${total.n}  (expect 350)`);

const [superseded] = await sql`
  SELECT COUNT(*)::int AS n FROM reports WHERE superseded_by IS NOT NULL
` as unknown as { n: number }[];
console.log(`Rows with superseded_by set:            ${superseded.n}  (expect 45)`);
