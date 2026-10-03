// Coarse device class from a User-Agent string. We store ONLY this class on
// flow_sessions, NEVER the raw UA (per the measurement rules in the baseline doc).

export type DeviceClass = "mobile" | "tablet" | "desktop";

export function deviceFromUA(ua: string | null | undefined): DeviceClass {
  const s = (ua ?? "").toLowerCase();
  // Tablets first — an Android tablet UA contains "android" but not "mobile".
  if (/ipad|tablet|playbook|silk/.test(s) || (/android/.test(s) && !/mobile/.test(s))) {
    return "tablet";
  }
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini|windows phone/.test(s)) {
    return "mobile";
  }
  return "desktop";
}
