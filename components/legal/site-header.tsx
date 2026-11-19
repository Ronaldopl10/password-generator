import Link from "next/link";
import ThemeToggle from "@/components/ui/theme-toggle";
import { IronKeyLogo } from "@/components/brand/ironkey-logo";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3">
          <IronKeyLogo className="size-12 text-primary shrink-0" />
          <h1 className="text-3xl text-primary">
            <span className="font-medium">Iron</span>
            <span className="font-bold">Key</span>
          </h1>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/pricing"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Plans
          </Link>
        </div>
      </div>
    </header>
  );
}
