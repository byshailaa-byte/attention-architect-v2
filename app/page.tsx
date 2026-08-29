// / is served via the beforeFiles rewrite in next.config.ts (→ /simplified).
// Old landing page is archived unrouted at app/_old-funnel/page.tsx (also in git).
//
// ROLLBACK — primary path (fastest, ~30s):
//   Vercel Dashboard → Deployments → find pre-cutover deploy → Promote to Production
//   OR: vercel rollback <previous-url>
//   This reverts all files atomically; nothing else required.
//
// ROLLBACK — code-only path (if Vercel rollback unavailable):
//   1. Remove the rewrite + redirect blocks from next.config.ts
//   2. Restore app/page.tsx from app/_old-funnel/page.tsx
//   Both steps are required. Removing only the rewrite leaves / serving this
//   re-export → still shows the simplified home, not the old landing.
//   3. git commit + push (requires explicit authorisation)
export { default } from "@/app/simplified/page";
