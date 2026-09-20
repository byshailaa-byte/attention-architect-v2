"use client";

// WhatsApp support widget — ported from wati-chat-widget-v2.html.
// - Client component mounted once in the root layout.
// - Costs nothing on first paint: the UI mounts only after a next/script
//   strategy="lazyOnload" boot fires (loads during browser idle time).
// - Returns null on HIDE_ON routes: nothing rendered, not a hidden node.
// - No new stylesheet, no dependency, no WATI SDK; CSS is inline below.

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Kept verbatim from the source.
const PHONE = "919993374923";
const WA_REPLY_LINE = ""; // empty — no reply-time claim

// Paths where the widget must NOT render at all (prefix match). Verified against
// real routes: /pre-assessment, /assessment, /simplified/start and /start (its
// rewrite target), /report/generating (report build screen), and /lms — which
// via startsWith also covers /lms-v2, so programme customers get no floating
// assessment-support button.
const HIDE_ON = [
  "/pre-assessment",
  "/assessment",
  "/simplified/start",
  "/start",
  "/report/generating",
  "/lms",
];

// Revenue pages: raise the FAB so it clears the inline pricing CTA. /roadmap is
// the canonical rewrite of /simplified/roadmap; include both. "/report/" covers
// /report/[sessionId] (PriceCards); /report/generating is already excluded by
// HIDE_ON, which is checked first.
const RAISE_ON = ["/preview/simplified-v1", "/simplified/roadmap", "/roadmap", "/report/"];

declare global {
  interface Window {
    __waWidgetReady?: () => void;
  }
}

const WA_CSS = `
  #wa-widget{
    position:fixed;
    right:16px;
    bottom:calc(16px + env(safe-area-inset-bottom, 0px));
    z-index:60;
    font-family:'Instrument Sans',system-ui,-apple-system,sans-serif;
  }
  #wa-widget .wa-card{
    width:290px;max-width:calc(100vw - 32px);background:#fff;border-radius:14px;
    box-shadow:0 10px 34px rgba(20,40,77,.22);overflow:hidden;margin-bottom:10px;
    display:none;
  }
  #wa-widget.open .wa-card{display:block}
  #wa-widget .wa-head{
    background:#14284D;color:#fff;padding:13px 15px;
    display:flex;align-items:center;justify-content:space-between;gap:8px;
  }
  #wa-widget .wa-head strong{display:block;font-size:14.5px;font-weight:600}
  #wa-widget .wa-head span{font-size:11.5px;opacity:.75}
  #wa-widget .wa-close{
    background:none;border:0;color:#fff;font-size:21px;line-height:1;
    cursor:pointer;padding:0 4px;opacity:.8;
  }
  #wa-widget .wa-body{padding:14px 15px;background:#FDF9F1}
  #wa-widget .wa-msg{
    background:#fff;border:1px solid #E8E4DC;border-radius:0 11px 11px 11px;
    padding:10px 12px;font-size:13.5px;line-height:1.5;color:#14284D;
  }
  #wa-widget .wa-cta{
    display:block;text-align:center;margin:0 15px 15px;padding:11px;
    border-radius:999px;background:#25D366;color:#fff;font-weight:600;
    font-size:14px;text-decoration:none;
  }
  #wa-widget .wa-fab{
    width:54px;height:54px;border-radius:50%;border:0;background:#25D366;
    box-shadow:0 4px 14px rgba(0,0,0,.22);cursor:pointer;
    display:flex;align-items:center;justify-content:center;margin-left:auto;
  }
  #wa-widget .wa-fab svg{width:30px;height:30px;fill:#fff}
  @media (prefers-reduced-motion:no-preference){
    #wa-widget .wa-fab{transition:transform .15s ease}
    #wa-widget .wa-fab:active{transform:scale(.94)}
  }
`;

export function WhatsAppWidget() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState(`https://wa.me/${PHONE}`);

  useEffect(() => {
    window.__waWidgetReady = () => setReady(true);
    // Give support the 8-char session ref only, never the full URL.
    const session = new URLSearchParams(window.location.search).get("session");
    let prefill = "Hi! I have a question about my child's attention report.";
    if (session) prefill += "\n\nRef: " + session.slice(0, 8);
    setHref(`https://wa.me/${PHONE}?text=${encodeURIComponent(prefill)}`);
  }, [pathname]);

  // Renders nothing at all on assessment / programme routes.
  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  const raised = RAISE_ON.some((p) => pathname.startsWith(p));

  return (
    <>
      <Script id="wa-widget-boot" strategy="lazyOnload">
        {"if (window.__waWidgetReady) window.__waWidgetReady();"}
      </Script>
      {ready && (
        <div
          id="wa-widget"
          className={open ? "open" : undefined}
          style={raised ? { bottom: "calc(76px + env(safe-area-inset-bottom, 0px))" } : undefined}
        >
          <style>{WA_CSS}</style>
          <div className="wa-card" role="dialog" aria-label="Chat on WhatsApp">
            <div className="wa-head">
              <div>
                <strong>Attention Architect</strong>
                {WA_REPLY_LINE && <span>{WA_REPLY_LINE}</span>}
              </div>
              <button className="wa-close" type="button" aria-label="Close" onClick={() => setOpen(false)}>
                &times;
              </button>
            </div>
            <div className="wa-body">
              <div className="wa-msg">
                {"Question about your child's assessment or your report? Message us on WhatsApp — a real person reads these."}
              </div>
            </div>
            <a className="wa-cta" target="_blank" rel="noopener" href={href}>
              Chat on WhatsApp
            </a>
          </div>
          <button
            className="wa-fab"
            type="button"
            aria-label="Chat on WhatsApp"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path d="M16.03 3C9.4 3 4.02 8.37 4.02 15c0 2.12.55 4.19 1.6 6.01L4 29l8.2-1.58A11.97 11.97 0 0 0 16.03 27C22.65 27 28.03 21.63 28.03 15S22.65 3 16.03 3zm0 21.9c-1.78 0-3.52-.48-5.04-1.38l-.36-.21-4.87.94.97-4.75-.24-.38A9.87 9.87 0 0 1 6.1 15c0-5.46 4.44-9.9 9.93-9.9s9.93 4.44 9.93 9.9-4.45 9.9-9.93 9.9zm5.44-7.42c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
