'use client';

/** OkeyBanner — OKEY Rötar reklam GIF'i; GrandpashaBet'in hemen altında, doğal oranıyla (bozulmadan) */
import { trackSponsorClick } from './Sponsors';

const OKEY_URL = 'https://www.ok.com.tr/prezervatifler/';

export default function OkeyBanner() {
  return (
    <section className="okey-banner-wrap" data-testid="okey-banner" aria-label="Reklam — OKEY">
      <a
        href={OKEY_URL}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="okey-banner"
        onClick={() => trackSponsorClick('okey', 'OKEY Rötar')}
        data-testid="okey-banner-link"
        aria-label="OKEY Rötar — Heyecanı sabahlara kadar sürecek"
      >
        <img
          src="/ads/okey_banner.gif"
          alt="OKEY Rötar — Heyecanı sabahlara kadar sürecek · #OKupaBuKupa"
          className="okey-banner-gif"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
        <span className="okey-adbadge" aria-hidden="true">Reklam</span>
      </a>
    </section>
  );
}
