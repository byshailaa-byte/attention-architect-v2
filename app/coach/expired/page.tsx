// Shown when a trial link is invalid, ended, or expired.
export const dynamic = "force-dynamic";

export default async function CoachExpired({ searchParams }: { searchParams: Promise<{ why?: string }> }) {
  const { why } = await searchParams;
  const msg = why === "ended"
    ? "This Quick Start has ended."
    : why === "expired"
    ? "This Quick Start link has expired."
    : "This link isn't valid anymore.";
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FBF6EE", fontFamily: "'Figtree', system-ui, sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 26, color: "#1E3A5F", margin: "0 0 10px" }}>{msg}</h1>
        <p style={{ color: "#5B6577", fontSize: 15, lineHeight: 1.5 }}>
          If you think this is a mistake, reply to the message we sent you and we'll sort it out.
        </p>
      </div>
    </main>
  );
}
