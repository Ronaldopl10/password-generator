import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap gap-4">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms of Service
          </Link>
          <Link href="/refund" className="hover:text-foreground">
            Refund Policy
          </Link>
        </nav>
        <p>
          Contact:{" "}
          <a href="mailto:contacto@ronaldopl.com" className="hover:text-foreground">
            contacto@ronaldopl.com
          </a>
        </p>
      </div>
      <div className="max-w-4xl mx-auto px-4 pb-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} IronKey. All rights reserved.
      </div>
    </footer>
  );
}
