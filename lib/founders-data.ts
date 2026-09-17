// Static founder/team data — safe for both server and client components.
// Photo loading (base64) lives in lib/founders.ts (server-only).

export type Person = {
  name: string;
  role: string;
  credential: string | null; // null when the person has no stated credential
  alt: string;
};

export const SHASHI: Person = {
  name: "Smt. Shashi Agrawal",
  role: "Founder",
  credential: "MHSc in Child Development",
  alt: "Smt. Shashi Agrawal",
};

export const SHAILY: Person = {
  name: "Shaily Badonia",
  role: "Chief Intelligence Officer",
  credential: null,
  alt: "Shaily Badonia",
};

export const SHASHANK: Person = {
  name: "Shashank Agrawal",
  role: "Chief Attention Architect",
  credential: "IIM Rohtak",
  alt: "Shashank Agrawal",
};

// Team in display order — Founder first.
export const TEAM: readonly Person[] = [SHASHI, SHAILY, SHASHANK];

// "Role · Credential", or just "Role" when the person has no stated credential.
export function roleLine(p: Person): string {
  return p.credential ? `${p.role} · ${p.credential}` : p.role;
}
