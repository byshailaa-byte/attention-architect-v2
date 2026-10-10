// The start-flow selections (child name, age, worry, gender, "how often") travel between
// /simplified/start and /assessment in sessionStorage — NOT in the URL. Putting them in the URL
// leaked the child's name/age/worry into GA4 page_location (dl) and the Meta Pixel PageView.
// Only flow/variant stay in the URL. sessionStorage also lets a reload on the intro keep the
// answers instead of resetting to the age step.
export type StartState = {
  name: string;
  gender: string | null;
  age: string | null;        // "8-9" | "10-11" | "12-14"
  worry: string | null;      // canonical worry key
  frequency: string | null;  // d1_2 | d3_4 | most | daily | null
};

const KEY = "aa_start_v2";

export function saveStartState(s: StartState): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked — ignore */ }
}

export function loadStartState(): StartState | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<StartState>;
    return {
      name: typeof s.name === "string" ? s.name : "",
      gender: s.gender ?? null,
      age: s.age ?? null,
      worry: s.worry ?? null,
      frequency: s.frequency ?? null,
    };
  } catch { return null; }
}

export function clearStartState(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}
