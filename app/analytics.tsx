"use client";

import { useState, useEffect } from "react";
import Script from "next/script";

// Defers GA4 and Meta Pixel until the first user interaction (touchstart,
// mousedown, scroll, keydown) or 3 seconds — whichever comes first.
// PageView still fires; it fires a few seconds later than afterInteractive.
// UTM capture is independent (sessionStorage, no dependency on these scripts).
export function AnalyticsLoader({
  gaId,
  pixelId,
}: {
  gaId: string | undefined;
  pixelId: string | undefined;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let done = false;
    function go() {
      if (done) return;
      done = true;
      setReady(true);
    }
    const opts: AddEventListenerOptions = { once: true, passive: true };
    window.addEventListener("touchstart", go, opts);
    window.addEventListener("mousedown", go, opts);
    window.addEventListener("scroll", go, opts);
    window.addEventListener("keydown", go, opts);
    const timer = setTimeout(go, 3000);
    return () => {
      window.removeEventListener("touchstart", go);
      window.removeEventListener("mousedown", go);
      window.removeEventListener("scroll", go);
      window.removeEventListener("keydown", go);
      clearTimeout(timer);
    };
  }, []);

  if (!ready) return null;

  return (
    <>
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga4-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
                (window.__gtagQueue || []).forEach(function(e) { gtag('event', e.event, e.params); });
                window.__gtagQueue = [];
              `,
            }}
          />
        </>
      )}
      {pixelId && (
        <>
          <Script
            id="meta-pixel-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${pixelId}');
                fbq('track', 'PageView');
              `,
            }}
          />
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}
    </>
  );
}
