// Report v2 (?report=v2). Plain, unstyled REVIEW page — the content layer (generator +
// validator + fallback) lands in Phase 1; final card/one-page layout is decided after a
// parent test. Default report stays v1; this is opt-in via ?report=v2 or a ?flow=v2 session.
export default function ReportV2({ session }: { session: string }) {
  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, sans-serif", lineHeight: 1.5 }}>
      <h1 style={{ fontSize: 22 }}>Report v2 — review scaffold</h1>
      <p style={{ color: "#555" }}>Session {session}. Content layer (Phase 1) renders the generated fields here.</p>
    </main>
  );
}
