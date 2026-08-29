// Compare dev and production schemas and print differences.
// Usage:
//   DATABASE_URL_PROD=<prod_url> DATABASE_URL_DEV=<dev_url> npx tsx scripts/check-schema-drift.ts
//
// Or add both to .env.local and run without prefix.
// Exits 0 = no drift. Exits 1 = drift found (safe to use as a CI gate).

import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const PROD_URL = process.env.DATABASE_URL_PROD;
const DEV_URL = process.env.DATABASE_URL_DEV;

if (!PROD_URL || !DEV_URL) {
  console.error(
    "Missing env vars. Set DATABASE_URL_PROD and DATABASE_URL_DEV before running.\n" +
    "Both can go in .env.local or be passed inline:\n" +
    "  DATABASE_URL_PROD=... DATABASE_URL_DEV=... npx tsx scripts/check-schema-drift.ts"
  );
  process.exit(1);
}

const prod = neon(PROD_URL);
const dev = neon(DEV_URL);

// Use the concrete inferred type rather than SqlClient,
// which resolves differently across neon overloads and causes TS2345.
type SqlClient = typeof prod;

// Prisma ORM tables that exist in dev only (created by a prior `prisma db push`).
// Not part of our application schema; application code uses lowercase unquoted names.
// Do not drop from dev (shared branch); do not create on prod.
const KNOWN_DEV_ONLY_TABLES = new Set(["Assessment", "Lead", "Report", "Response", "Score"]);

type Row = Record<string, unknown>;

async function getTables(db: SqlClient): Promise<string[]> {
  const rows = await db`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  ` as Row[];
  return rows.map((r) => r.table_name as string);
}

async function getColumns(db: SqlClient, table: string): Promise<Row[]> {
  return await db`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
    ORDER BY ordinal_position
  ` as Row[];
}

async function getConstraints(db: SqlClient, table: string): Promise<Row[]> {
  return await db`
    SELECT tc.constraint_name, tc.constraint_type, cc.check_clause
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.check_constraints cc
      ON tc.constraint_name = cc.constraint_name
      AND tc.constraint_schema = cc.constraint_schema
    WHERE tc.table_schema = 'public' AND tc.table_name = ${table}
    ORDER BY tc.constraint_name
  ` as Row[];
}

async function getIndexes(db: SqlClient, table: string): Promise<Row[]> {
  return await db`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = ${table}
    ORDER BY indexname
  ` as Row[];
}

async function drift() {
  console.log("Checking schema drift: dev vs production\n");

  const [prodTables, devTables] = await Promise.all([
    getTables(prod),
    getTables(dev),
  ]);

  const prodSet = new Set(prodTables);
  const devSet = new Set(devTables);
  let hasDrift = false;

  for (const t of devTables) {
    if (!prodSet.has(t) && !KNOWN_DEV_ONLY_TABLES.has(t)) {
      console.log(`MISSING IN PROD  table: ${t}`);
      hasDrift = true;
    }
  }
  for (const t of prodTables) {
    if (!devSet.has(t)) {
      console.log(`MISSING IN DEV   table: ${t}`);
      hasDrift = true;
    }
  }

  const commonTables = prodTables.filter((t) => devSet.has(t) && !KNOWN_DEV_ONLY_TABLES.has(t));

  for (const table of commonTables) {
    const [prodCols, devCols, prodCons, devCons, prodIdx, devIdx] = await Promise.all([
      getColumns(prod, table),
      getColumns(dev, table),
      getConstraints(prod, table),
      getConstraints(dev, table),
      getIndexes(prod, table),
      getIndexes(dev, table),
    ]);

    const prodColMap = new Map(prodCols.map((c) => [c.column_name as string, c]));
    const devColMap  = new Map(devCols.map((c)  => [c.column_name as string, c]));

    for (const [name, col] of devColMap) {
      if (!prodColMap.has(name)) {
        console.log(`${table}: MISSING IN PROD  col: ${name} (${col.data_type})`);
        hasDrift = true;
      }
    }
    for (const [name] of prodColMap) {
      if (!devColMap.has(name)) {
        console.log(`${table}: MISSING IN DEV   col: ${name}`);
        hasDrift = true;
      }
    }

    const prodConMap = new Map(prodCons.map((c) => [c.constraint_name as string, c]));
    const devConMap  = new Map(devCons.map((c)  => [c.constraint_name as string, c]));

    for (const [name, con] of devConMap) {
      if (!prodConMap.has(name)) {
        console.log(`${table}: MISSING IN PROD  constraint: ${name} (${con.constraint_type})`);
        hasDrift = true;
      } else {
        const prodCon = prodConMap.get(name)!;
        if (con.check_clause !== prodCon.check_clause) {
          console.log(`${table}: CONSTRAINT MISMATCH  ${name}`);
          console.log(`  prod: ${prodCon.check_clause}`);
          console.log(`  dev:  ${con.check_clause}`);
          hasDrift = true;
        }
      }
    }
    for (const [name] of prodConMap) {
      if (!devConMap.has(name)) {
        console.log(`${table}: MISSING IN DEV   constraint: ${name}`);
        hasDrift = true;
      }
    }

    const prodIdxMap = new Map(prodIdx.map((i) => [i.indexname as string, i]));
    const devIdxMap  = new Map(devIdx.map((i)  => [i.indexname as string, i]));

    for (const [name] of devIdxMap) {
      if (!prodIdxMap.has(name)) {
        console.log(`${table}: MISSING IN PROD  index: ${name}`);
        hasDrift = true;
      }
    }
    for (const [name] of prodIdxMap) {
      if (!devIdxMap.has(name)) {
        console.log(`${table}: MISSING IN DEV   index: ${name}`);
        hasDrift = true;
      }
    }
  }

  if (!hasDrift) {
    console.log("No drift detected. Dev and production schemas match.");
  } else {
    process.exit(1);
  }
}

drift().catch((e) => {
  console.error(e);
  process.exit(1);
});
