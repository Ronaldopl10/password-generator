import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "./theme-providers";

export const metadata: Metadata = {
  title: "Password Generator",
  description: "Generador y gestor de contraseñas seguras",
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
