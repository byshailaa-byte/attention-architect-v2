// Test stub for the `server-only` marker module. In the app, `server-only` is provided by Next's
// bundler and only throws if a server module is pulled into a client bundle. Under vitest (plain node)
// there is no bundler, so we alias `server-only` to this empty module (see vitest.config.ts) — it lets
// server-only modules (e.g. lib/report-v2/service.ts → lib/coach/runtime.ts) import cleanly in tests.
export {};
