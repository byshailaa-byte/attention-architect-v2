-- Supersede the older published report in each of the 45 duplicate pairs.
--
-- For each assessment with two published non-superseded rows, sets superseded_by on the
-- OLDER row (by generated_at ASC) to the id of the NEWER row. The newer row is what
-- ORDER BY generated_at DESC LIMIT 1 already serves at /report/[sessionId], so this
-- preserves exactly what every parent sees today.
--
-- Does NOT change status on either row.
-- Idempotent: WHERE superseded_by IS NULL means a re-run is a no-op for any row already
-- superseded.
--
-- Pre-condition: run BEFORE phase_37_one_live_report.sql (the unique index).
-- Production endpoint: ep-green-truth-aqxygaj2 (never branch label).
-- No deletes.
--
-- Expected result: 45 rows updated.
-- Verify with:
--   SELECT COUNT(*) FROM reports WHERE superseded_by IS NOT NULL;          -- expect 45
--   SELECT COUNT(DISTINCT assessment_id) FROM reports
--     WHERE superseded_by IS NULL AND status = 'published'
--     GROUP BY assessment_id HAVING COUNT(*) > 1;                          -- expect 0 rows
--
-- Pair list generated 2026-09-13 from production query:
--   SELECT assessment_id, array_agg(id ORDER BY generated_at ASC)
--   FROM reports WHERE status='published'
--   GROUP BY assessment_id HAVING COUNT(*) > 1
-- older_id = ids[0], newer_id = ids[1]

-- ── backfill group (32 pairs, promoted_by = 'backfill') ─────────────────────

-- Froylan        gap=10s  2026-08-05T11:23
UPDATE reports SET superseded_by = '3ca810e8-fdcf-4519-93fd-95de87635a60'::uuid
  WHERE id = '3bc5371a-a227-4e5a-be56-2a0249ee4a0d'::uuid AND superseded_by IS NULL;

-- Priyansh       gap=7s   2026-08-05T11:24
UPDATE reports SET superseded_by = 'd7347b25-e957-4605-ac02-5dd8e97d1976'::uuid
  WHERE id = '130a0509-d2d4-447c-b370-3c1793e09a21'::uuid AND superseded_by IS NULL;

-- S (3-child)    gap=3s   2026-08-05T11:25
UPDATE reports SET superseded_by = 'c4494934-ae3e-4cfb-a3c2-f9a1f03e1d2c'::uuid
  WHERE id = 'd08be12e-0624-4992-8ab0-0972037a4be7'::uuid AND superseded_by IS NULL;

-- Amogh          gap=1s   2026-08-05T11:26
UPDATE reports SET superseded_by = '3acb5019-b127-4a03-96d8-47403ba60ca5'::uuid
  WHERE id = 'ca47d9e7-578a-42a4-942e-0d501092db19'::uuid AND superseded_by IS NULL;

-- Mokshagna      gap=5s   2026-08-05T11:27
UPDATE reports SET superseded_by = '90dec735-afa0-446c-842c-b97ebcae0ec8'::uuid
  WHERE id = '5259ab52-adfa-4a2c-a9fc-42ab03a7a5a9'::uuid AND superseded_by IS NULL;

-- Atharva.G      gap=7s   2026-08-05T11:28
UPDATE reports SET superseded_by = '4e897169-550f-46f0-8b24-9a17ce0b47e3'::uuid
  WHERE id = '5b85c7d1-d52a-4100-8d4c-afac26a4f48c'::uuid AND superseded_by IS NULL;

-- Stuti          gap=2s   2026-08-05T11:29
UPDATE reports SET superseded_by = 'dfcec706-e339-4a96-9a8e-ef73fc2799fd'::uuid
  WHERE id = '2ba66ee8-b8c6-4000-98bd-cf1055ab5e8d'::uuid AND superseded_by IS NULL;

-- Ayansh         gap=6s   2026-08-05T11:30
UPDATE reports SET superseded_by = 'eecad929-1798-48fa-ac53-7ad7c2e6984f'::uuid
  WHERE id = '65af19b0-7b65-446a-8976-20bdc81d44c2'::uuid AND superseded_by IS NULL;

-- Ian            gap=1s   2026-08-05T11:31
UPDATE reports SET superseded_by = 'e729a8e6-50ea-49bf-a349-9d525221b022'::uuid
  WHERE id = '984563a0-e538-488b-baac-143f0733d628'::uuid AND superseded_by IS NULL;

-- Gurnoor        gap=0s   2026-08-05T11:32
UPDATE reports SET superseded_by = 'aa4116cb-3ae8-4b56-90e8-9007055513fa'::uuid
  WHERE id = 'e97f8077-c1b0-47f6-9be8-73c8c0b911ff'::uuid AND superseded_by IS NULL;

-- Tanish         gap=6s   2026-08-05T11:33
UPDATE reports SET superseded_by = '8a5905d6-ecd2-4550-b195-c5bc7a6ecf11'::uuid
  WHERE id = 'c34ac7b2-b58c-4fb2-b024-d61421fa7f0d'::uuid AND superseded_by IS NULL;

-- (null) internal gap=2s  2026-08-05T11:34  [is_internal]
UPDATE reports SET superseded_by = '5888b084-c933-44c2-ad69-a37c90f3c6ff'::uuid
  WHERE id = 'a3e52ab9-d50b-427a-8ccf-bd19d9fde028'::uuid AND superseded_by IS NULL;

-- Namish         gap=11s  2026-08-05T11:35
UPDATE reports SET superseded_by = '0f68235a-fd1e-49fa-ac3e-7a1d5ec79304'::uuid
  WHERE id = 'aef56b99-b952-45fb-a5d5-147a275d2633'::uuid AND superseded_by IS NULL;

-- D              gap=10s  2026-08-05T11:35
UPDATE reports SET superseded_by = '4c176af9-d29e-463c-9d54-63d41caaf815'::uuid
  WHERE id = '2fa3aea2-5231-405c-88f2-4ea7e3f3e106'::uuid AND superseded_by IS NULL;

-- Richard        gap=0s   2026-08-05T11:37
UPDATE reports SET superseded_by = '3322d75b-d731-4bf3-8ea3-58eedb58c46f'::uuid
  WHERE id = 'aba3966e-32bc-4d74-bfdc-eb0d4199b714'::uuid AND superseded_by IS NULL;

-- Ahsan          gap=2s   2026-08-05T11:37
UPDATE reports SET superseded_by = 'cf1097b5-afc4-4790-8649-c2ac896f3fc0'::uuid
  WHERE id = '9c7a78ef-c9f9-44f0-8fe0-26c5536f7d18'::uuid AND superseded_by IS NULL;

-- Parvathi       gap=10s  2026-08-05T11:38
UPDATE reports SET superseded_by = '4bf1807b-c9fb-4435-9994-70426ad33c0f'::uuid
  WHERE id = '0e3dcaae-89c9-4383-b9d1-6d125ee01d9a'::uuid AND superseded_by IS NULL;

-- Atharv         gap=2s   2026-08-05T11:39
UPDATE reports SET superseded_by = 'fbf5b456-395c-42fc-8b26-933b906940e3'::uuid
  WHERE id = '7fbd0bd7-d013-4a1c-af4e-1ab8676c5152'::uuid AND superseded_by IS NULL;

-- (null)         gap=0s   2026-08-05T11:40
UPDATE reports SET superseded_by = '7ac7d013-cd34-4c7d-acfd-87b8ccbf3ecb'::uuid
  WHERE id = 'da5049b4-dbfa-4230-847c-deee200953ac'::uuid AND superseded_by IS NULL;

-- Devsaran       gap=4s   2026-08-05T11:41
UPDATE reports SET superseded_by = 'b20bf910-8f9c-429c-805a-e542f91a9842'::uuid
  WHERE id = '25ea2952-c826-4ddf-9a9f-ed6c1c5cf802'::uuid AND superseded_by IS NULL;

-- Chinu          gap=8s   2026-08-05T11:42  [is_internal]
UPDATE reports SET superseded_by = 'd043ba46-dcf0-45fb-bb6a-0be96b17427d'::uuid
  WHERE id = '04d9f802-c85c-4cbf-b92c-b40d57299ad5'::uuid AND superseded_by IS NULL;

-- Ram            gap=6s   2026-08-05T11:43
UPDATE reports SET superseded_by = 'd228a54e-58cf-42a2-9e9e-0904120834b2'::uuid
  WHERE id = '4cb18f98-c4ab-4b88-8b9a-00a3c9dfeb1a'::uuid AND superseded_by IS NULL;

-- Namasya        gap=6s   2026-08-05T11:44
UPDATE reports SET superseded_by = '2cf70a26-3691-477d-a38d-73bd0a214a44'::uuid
  WHERE id = '7c9d2c61-dd34-4903-85b7-ab22da768e4b'::uuid AND superseded_by IS NULL;

-- Darshita       gap=6s   2026-08-05T11:45
UPDATE reports SET superseded_by = 'efb471e8-1605-4912-b967-c65d6becbdc7'::uuid
  WHERE id = 'e8bb9816-d851-414d-a80f-e0e80027b0a7'::uuid AND superseded_by IS NULL;

-- (null) internal gap=5s  2026-08-05T11:48  [is_internal]
UPDATE reports SET superseded_by = '7d4c620c-b4cd-4eaf-8067-df474c0e9b7a'::uuid
  WHERE id = '8bf993b0-9b35-4833-a44f-d6bdf079c6df'::uuid AND superseded_by IS NULL;

-- Shrungi        gap=2s   2026-08-05T11:49
UPDATE reports SET superseded_by = '118bdc2d-4ebd-4ee9-a5c5-9c4ac502737f'::uuid
  WHERE id = '12522f90-a090-45ef-8853-baf1dc406434'::uuid AND superseded_by IS NULL;

-- Mukta          gap=5s   2026-08-05T11:50
UPDATE reports SET superseded_by = '5a67da01-363f-4337-8eef-b2fc9ad86193'::uuid
  WHERE id = '0a7219e2-e16b-4dc8-8fb5-658d1eb4bf81'::uuid AND superseded_by IS NULL;

-- Samyak         gap=4s   2026-08-05T11:51
UPDATE reports SET superseded_by = 'fd60b74b-3ef7-498e-896f-7f46a266e159'::uuid
  WHERE id = '1733e775-19d9-4e8d-9210-b0021118d998'::uuid AND superseded_by IS NULL;

-- KS             gap=3s   2026-08-05T11:52
UPDATE reports SET superseded_by = '1143899f-311a-49e0-9b49-1d34afae221b'::uuid
  WHERE id = 'b0aece4b-b810-4653-9711-d68974ba802d'::uuid AND superseded_by IS NULL;

-- (null) internal gap=2s  2026-08-05T11:53  [is_internal]
UPDATE reports SET superseded_by = '2cb75b8d-7362-4bc6-96ac-a2adbb7e3283'::uuid
  WHERE id = '5f07099b-6b80-406b-b8c1-0c80127409ae'::uuid AND superseded_by IS NULL;

-- Jaggu          gap=4s   2026-08-05T11:46
UPDATE reports SET superseded_by = '14940f92-c7cd-42cd-a233-b7dded813a46'::uuid
  WHERE id = '7ac879fe-2350-4223-a57f-c9471bf54f98'::uuid AND superseded_by IS NULL;

-- Shivani        gap=1s   2026-08-05T11:47
UPDATE reports SET superseded_by = 'd1071673-f2a6-4e48-bb0e-10268558153a'::uuid
  WHERE id = '960354ed-0e57-49f6-af58-c48d4f5d8c26'::uuid AND superseded_by IS NULL;

-- ── auto-pipeline group (13 pairs, promoted_by = 'auto-pipeline') ────────────

-- Arjun          gap=0s   2026-08-07T13:49
UPDATE reports SET superseded_by = 'df919a01-69ac-45b6-99c6-be7d55dcd135'::uuid
  WHERE id = '825b3c27-ab1d-43e0-8f57-ee5e432a80ab'::uuid AND superseded_by IS NULL;

-- Devansh        gap=4s   2026-08-07T14:59
UPDATE reports SET superseded_by = 'c6dd2ab8-f6d7-437e-9b2f-b373c66133f4'::uuid
  WHERE id = 'c1b491fa-ac0c-425d-a3e1-2659089f1efd'::uuid AND superseded_by IS NULL;

-- SHAILAA (int)  gap=1s   2026-08-07T15:05  [is_internal]
UPDATE reports SET superseded_by = 'fbb9a72b-9bde-4f6b-ba37-626065fbf919'::uuid
  WHERE id = '2e1801ef-0361-4195-ac76-6b6e4e019e48'::uuid AND superseded_by IS NULL;

-- Manan          gap=7s   2026-08-07T15:40
UPDATE reports SET superseded_by = '9a8f42d0-bbeb-4087-bbae-62e6285b148b'::uuid
  WHERE id = 'f3074a7a-f06d-4d84-9717-ea12ba08b736'::uuid AND superseded_by IS NULL;

-- (null) internal gap=5s  2026-08-07T14:09  [is_internal]
UPDATE reports SET superseded_by = '60ffe94c-04a2-4e63-95ab-21f617a6ebc7'::uuid
  WHERE id = '4a9e5931-c469-46c1-b7fe-524657860e2b'::uuid AND superseded_by IS NULL;

-- Rathnavel      gap=6s   2026-08-07T17:17
UPDATE reports SET superseded_by = '4a79e211-8798-4e5a-94dc-1db7733ab433'::uuid
  WHERE id = '966fd73a-d943-476b-8933-33707145c924'::uuid AND superseded_by IS NULL;

-- (null) internal gap=4s  2026-08-08T11:46  [is_internal]
UPDATE reports SET superseded_by = 'e8ed94cc-30b0-48bb-b9ae-ba0c47ff5328'::uuid
  WHERE id = '56b009f5-67ae-4a40-92eb-59465ddcd0bf'::uuid AND superseded_by IS NULL;

-- Priya          gap=25s  2026-08-08T12:14
UPDATE reports SET superseded_by = 'ea71133a-96cf-4822-a140-9779952c62ee'::uuid
  WHERE id = '428692ba-3cd1-43fa-88b3-4608051bba9b'::uuid AND superseded_by IS NULL;

-- (null) internal gap=5s  2026-08-08T13:47  [is_internal]
UPDATE reports SET superseded_by = 'bfb053c0-80be-447b-bcd8-c60b5f0ebd6c'::uuid
  WHERE id = '2df78bd2-6b56-4959-b784-7b6e634c500b'::uuid AND superseded_by IS NULL;

-- jlk            gap=2s   2026-08-08T18:53
UPDATE reports SET superseded_by = '799e0adb-1d5f-428f-8974-39ceeafaf540'::uuid
  WHERE id = '353bf7f5-578c-4cdf-b54f-ffbd0a1a75c0'::uuid AND superseded_by IS NULL;

-- CB (internal)  gap=6s   2026-08-09T13:28  [is_internal]
UPDATE reports SET superseded_by = '6279be99-9d54-4388-98a6-43f8dd9b6b66'::uuid
  WHERE id = '71e04224-d7c1-463f-84d2-aee282121a22'::uuid AND superseded_by IS NULL;

-- (null) internal gap=4s  2026-08-09T19:36  [is_internal]
UPDATE reports SET superseded_by = '0c85d3df-5005-4baf-b271-486e522c814c'::uuid
  WHERE id = '29167d8a-6f01-4988-aa70-9c628e9597ce'::uuid AND superseded_by IS NULL;

-- Shaigugu       gap=10s  2026-08-09T19:08
UPDATE reports SET superseded_by = '76a73295-c2e5-45c2-b077-d4d99386650c'::uuid
  WHERE id = '6bfcd0ad-e722-49e8-8b4f-ae62334674ae'::uuid AND superseded_by IS NULL;
