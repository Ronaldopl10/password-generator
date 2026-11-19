import type { Metadata } from "next";

const FALLBACK_SITE_URL = "https://iron-key.vercel.app";

function normalizeSiteUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");

  try {
    return new URL(trimmed).toString().replace(/\/+$/, "");
  } catch {
    return FALLBACK_SITE_URL;
  }
}

/** Canonical origin of the site, without trailing slash. */
export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || FALLBACK_SITE_URL
);

export const SITE_NAME = "IronKey";

export const SITE_DESCRIPTION =
  "Generador de contraseñas seguras y personalizadas, con bóveda cifrada para guardar y gestionar tus credenciales.";

export const SITE_LOCALE = "es_CO";

export const SITE_LOGO_URL = `${SITE_URL}/ironkey-shield.png`;

/**
 * Social preview (1200x630). The PNG in `public/` is rendered from
 * `app/opengraph-image.tsx`; it is referenced explicitly because Next does not
 * merge the file convention into an `openGraph` object exported by a route.
 */
export const SITE_OG_IMAGE_URL = `${SITE_URL}/og-image.png`;

/** Shape of the plan data needed to build the JSON-LD offers. */
export type SeoPlan = {
  name: string;
  displayName: string;
  price: number;
};

export type JsonLdObject = Record<string, unknown>;

export type SocialMetadataOptions = {
  title: string;
  description: string;
  path: string;
};

function absoluteUrl(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

/** Open Graph + Twitter card metadata for a public route. */
export function buildSocialMetadata({
  title,
  description,
  path,
}: SocialMetadataOptions): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: "website",
      locale: SITE_LOCALE,
      siteName: SITE_NAME,
      url: absoluteUrl(path),
      title,
      description,
      images: [SITE_OG_IMAGE_URL],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SITE_OG_IMAGE_URL],
    },
  };
}

export function buildOrganizationJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: SITE_LOGO_URL,
    description: SITE_DESCRIPTION,
  };
}

export function buildWebSiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: SITE_LOCALE,
    description: SITE_DESCRIPTION,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: SITE_LOGO_URL,
    },
  };
}

export function buildSoftwareApplicationJsonLd(plans: SeoPlan[]): JsonLdObject {
  const prices = plans.map((plan) => plan.price);

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "SecurityApplication",
    operatingSystem: "Web",
    inLanguage: SITE_LOCALE,
    description: SITE_DESCRIPTION,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: prices.length > 0 ? Math.min(...prices) : 0,
      highPrice: prices.length > 0 ? Math.max(...prices) : 0,
      offerCount: plans.length,
      offers: plans.map((plan) => ({
        "@type": "Offer",
        name: plan.displayName,
        url: `${SITE_URL}/pricing`,
        price: plan.price,
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      })),
    },
  };
}

/** Serializes a JSON-LD object so it is safe to inline inside a <script> tag. */
export function serializeJsonLd(data: JsonLdObject): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
