// Shared client-side validators for the v2 flow steps 3/4/7. Pure functions so the
// exact gating logic in the screens is unit-testable (and identical across screens).

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

// Indian mobile: 10 digits starting 6–9, tolerating a leading +91/91 and separators.
// Mirrors the server's acceptance (lib/phone.normalizePhone).
export function isValidIndianMobile(raw: string): boolean {
  let d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  return /^[6-9]\d{9}$/.test(d);
}

// Step 3 (child): first name + gender both required.
export function childStepReady(name: string, gender: string | null): boolean {
  return name.trim().length > 0 && !!gender;
}

// Step 7 (details): parent name + a valid email, both required. NO phone (captured at step 4).
export function detailsReady(parentName: string, email: string): boolean {
  return parentName.trim().length > 0 && isValidEmail(email);
}
