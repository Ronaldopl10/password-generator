import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "./theme-providers";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  buildOrganizationJsonLd,
  buildSocialMetadata,
  buildWebSiteJsonLd,
  serializeJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  ...buildSocialMetadata({
    title: `${SITE_NAME} — Generador de contraseñas y bóveda cifrada`,
    description: SITE_DESCRIPTION,
    path: "/",
  }),
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(buildWebSiteJsonLd()),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(buildOrganizationJsonLd()),
          }}
        />
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
