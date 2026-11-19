import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "./theme-providers";

export const metadata: Metadata = {
  title: "IronKey",
  description:
    "Secure password generator and encrypted vault for your passwords.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
