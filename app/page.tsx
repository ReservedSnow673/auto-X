/** Minimal root — this app is API-only (no UI). */
export default function HomePage() {
  return (
    <main style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", padding: 24 }}>
      <h1 style={{ fontSize: 18, marginBottom: 8 }}>auto-x</h1>
      <p style={{ marginBottom: 8 }}>API-only X engagement bot.</p>
      <ul>
        <li>GET /api/cron — Vercel Cron (Bearer CRON_SECRET)</li>
        <li>POST /api/engage — manual run (Bearer CRON_SECRET)</li>
      </ul>
    </main>
  );
}
