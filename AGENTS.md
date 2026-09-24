<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Operational hard rules

Read these before any deploy, env change, or commit. Each exists because it was violated and caused real damage.

## 1. There are TWO Vercel projects with similar names

- **`attention-architect-v2`** (`prj_qT1IJK7HoIAkdqwbQENgbAoPy1oo`) — **THIS app.** Serves the production domain `attentionparents.thehumandecision.in`. Production DB is the Neon endpoint `ep-green-truth-aqxygaj2`.
- **`the-human-decision`** (`prj_gHA5j0t0wPIRr7E48h0vD6c143Fd`) — a **separate** project: the marketing site. Not this app.

Env changes and redeploys on the wrong project **silently do nothing** — no error, no effect. Always target the project by **ID**, not by its similar-sounding name. Acting on `the-human-decision` instead of `attention-architect-v2` caused a **production outage on 24 Sep 2026** during a credential rotation.

## 2. NEVER `git add -A` or `git commit -am` — stage named files only

Always `git add <specific paths>` then `git commit -m` (no `-a`), and run `git status` to confirm ONLY the intended files are staged before committing. Two incidents in one week both came from these commands:
- An unapproved WATI transport change shipped under a commit labelled "pause cron" (`git commit -am` swept in unrelated uncommitted edits).
- 251 stray files — including 31 with plaintext DB credentials — were pushed to the **public** repo (`git add -A` swept in untracked debug scripts).

## 3. Credential rotation runbook

When rotating DB credentials, do all of these in order:
1. Rotate in **Neon** for **both branches** — prod `ep-green-truth-aqxygaj2` and dev `ep-wild-paper-aqlx0vrm`. Verify each by its **endpoint ID**, never by branch label.
2. Update **BOTH** `DATABASE_URL` **and** `DATABASE_URL_PROD` in the **correct** Vercel project (`attention-architect-v2`, `prj_qT1IJK7HoIAkdqwbQENgbAoPy1oo` — see rule 1).
3. **Redeploy AFTER saving** the env vars (env changes only take effect on a new deployment).
4. Confirm by **opening a real report URL** and checking it renders — not just by the deploy going READY.
