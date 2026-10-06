// Server-side LMS impersonation for the admin "view as user" feature.
//
// The admin catch-all route (app/admin/lms-user/[userId]/view/...) renders the REAL LMS page
// components for a target user. Those components resolve "who am I" via getLmsUserContext(), which
// normally reads the lms_session cookie. During an admin view we instead run the render inside
// runImpersonated(...) so getLmsUserContext() resolves to the target user — WITHOUT ever reading
// or setting the customer's session cookie.
//
// This only works inside the admin route (there is no other caller of runImpersonated), so it is
// NOT reachable from /lms/*. Everything here is server-only (AsyncLocalStorage).
import { AsyncLocalStorage } from "async_hooks";

export type Impersonation = { userId: string; readOnly: boolean };

const store = new AsyncLocalStorage<Impersonation>();

export function runImpersonated<T>(ctx: Impersonation, fn: () => T): T {
  return store.run(ctx, fn);
}

export function currentImpersonation(): Impersonation | null {
  return store.getStore() ?? null;
}
