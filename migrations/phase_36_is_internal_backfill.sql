-- Backfill: mark 67 confirmed-internal sessions as is_internal = true.
--
-- Decided 2026-09-12. The decision is recorded here, not recomputed at runtime.
-- 61 sessions from Stage 1 definitive set.
-- 6 added from ambiguous set per owner decision 2026-09-12:
--   e20c3100 (Gugu, curiouscube12@gmail.com, ...0676)
--   ace95e9b (no name, priya@gmail.com, ...0676)
--   2bdbe0d0 (no name, sa@gmail.com, ...0676)
--   01481d3b (no name, shashiravi033@gmail.com, ...9293) — confirmed ID 2026-09-12
--   d1dc6285 (Shankz, teambhavalay@gmail.com, ...9293)
--   1826f92d (SHAILAA, teambhavalay@gmail.com, ...9293)
-- NOT flagged: 16833b0b (SB, curiouscube12@gmail.com, ...7226) — different phone, treat as real customer.
--
-- Run manually after phase_36_is_internal.sql has been applied.
-- Production endpoint: ep-green-truth-aqxygaj2 (never branch label).
-- No deletes. Idempotent (UPDATE WHERE session_id IN is safe to re-run).

UPDATE assessments
SET is_internal = true
WHERE session_id IN (
  -- Signal: test-name only
  '00000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  '40111006-130e-4a5f-a7e0-77bc15d2700b',
  'c71697f2-d673-434a-862c-23432a7ecf32',
  'bb434bd4-9c6c-414b-ac14-4bc71b6912f7',
  '167d4d6e-00be-4cd9-a738-7ee1663e5bae',
  '9d230eb8-bf3a-4d50-879c-9b8c11e9e623',
  '9212ee7e-a0be-4fd4-ba74-8411ed30b198',
  '0091dac0-9ac5-4023-8eec-cd2c95c85ed8',
  '4dce903e-dc17-44d6-9765-9fc713b851f8',
  'f8f896dc-2211-4648-ad36-0d07c6759315',
  -- Signal: internal-email (no phone signal)
  '3322fa7d-6f34-4baa-ba78-206bc303fd1f',
  '263a6c2c-7b54-491e-b8b2-791b7466389f',
  '1aa4c676-faad-47d8-9c21-76447f666646',
  '8944a926-5484-40b3-9a2a-0c3b79b72e8f',
  'a7afe921-80a3-4544-8f9c-c47ef6622ce8',
  '9a3dfca7-181d-4945-b5b7-03e1349de2c7',
  'fdc29b5c-9321-4332-ad7c-f255a093457e',
  '70942566-0150-4cae-96d0-12cbd7e44aba',
  '179e9f09-21bc-43b7-ae2c-094c6739c99d',
  'b371b8bd-c9f6-40cc-be1b-f64a4ea3d017',
  'feb39ba4-f86e-4a08-8bee-6eaa965f6151',
  -- Signal: phone-0676 (with or without internal-email)
  'a8fbd532-3cfe-4356-9210-10dcbbea3adb',
  'a805778e-0d4f-453c-84bb-ea5cc1e698d9',
  '45d9d57b-71c2-423a-9961-7f00c997f112',
  '1e84eb42-625e-4ef4-b17f-39c0dfb894db',
  '2bcbab8a-c904-4721-995e-7d2813c8223f',
  'bbfe9b5b-c59d-4fee-98cb-480a7dfb6c7d',
  '4e33c63e-1092-4db6-8d43-5f1cf4837a7e',
  'a1062c20-a16c-4c1d-a943-362255953e68',
  '5df32311-32f0-412b-9d11-d611377c1da8',
  '96cb5ade-1509-44e6-8dcf-7e6eb74941b5',
  '3e18fbd9-e081-496f-b8c2-7c558859260f',
  '68726518-31db-4c70-ab2b-091a5a3bd86d',
  '4c243ecd-0c71-43e1-b080-0035205fe4c9',
  '13dfe8dd-b353-4ce9-bbef-a2e7852fde51',
  '6a827ff3-5b76-4b36-af63-8b5f24aee2bd',
  '481783d1-6520-42f5-b707-331b003a32a7',
  '722f53a9-e8eb-422d-9426-64f84bf7deec',
  '75178044-9a49-4e08-809d-b12179b82102',
  '579e7106-0308-4106-aa20-d98b07c83511',
  'cf6bfc3c-b1ed-4d51-9903-06f80dcb18eb',
  'e1fb36fa-e44e-4736-a851-babf5da10136',
  'c46f225c-2815-4e6c-9ca7-dd7492b36e88',
  '69fcf3dc-6659-43d0-8660-c65214aad050',
  '0ece705a-f0cd-42ca-b704-46989e4618f8',
  'a43cf568-cc7a-4ad3-961f-74a08499b338',
  'a9215710-1bb3-4105-9c71-560d85242f9d',
  '69f78013-847f-4213-a764-3c7aee287d3c',
  '84796138-5d77-43e3-8f25-fd77b4cf9f60',
  '6280e9eb-a811-478b-aef2-850875ed9562',
  'a0173f0c-f4cf-412f-8014-e91cd807cb14',
  'df788bfc-ac2d-49e0-96a7-175b13b1d9da',
  'f667a671-ef39-45a3-b5ba-64bd32c37ba4',
  'e46fbb11-8313-42a8-b3d8-ecc41c6062db',
  '375d0aed-069e-4a58-a563-f8ab939d3413',
  -- Signal: phone-0676 + test-name
  '7764cee7-f8fa-48e4-80c7-aff2b9968f4d',
  -- Signal: internal-email + test-name
  '40b8c3e2-9145-43ae-83bc-7064b1e80d8d',
  '09deabba-0657-4923-b458-c6745d87a72b',
  -- Signal: phone-9293 + internal-email
  'a9169661-8cd0-4cd3-8383-7c757a0ea390',
  -- Approved ambiguous additions (owner decision 2026-09-12)
  'e20c3100-e9ef-4397-bae7-2e73e9c1c470',   -- Gugu, curiouscube12@gmail.com, ...0676
  'ace95e9b-6c7a-48df-bb35-b4450750ccc7',   -- no name, priya@gmail.com, ...0676
  '2bdbe0d0-ba4f-4e7b-8581-9b41450fcc1d',   -- no name, sa@gmail.com, ...0676
  '01481d3b-270a-40be-b660-71620e9db0a6',   -- no name, shashiravi033@gmail.com, ...9293
  'd1dc6285-3a51-462c-8a14-6c2a15aaac1d',   -- Shankz, teambhavalay@gmail.com, ...9293
  '1826f92d-0793-4bc5-a5b9-e33d08af74a1'    -- SHAILAA, teambhavalay@gmail.com, ...9293
);

-- Verify: should return 67
-- SELECT COUNT(*) FROM assessments WHERE is_internal = true;
