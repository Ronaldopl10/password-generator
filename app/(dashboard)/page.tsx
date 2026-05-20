import FormCreatePassword from "./_components/form-create-password";
import PasswordLists from "./_components/password-lists";
import AuthHeader from "./_components/auth-header";
import ThemeToggle from "@/components/ui/theme-toggle";
import { auth } from "@/auth";

const DashboardPage = async () => {
  const session = await auth();
  const isAuthenticated = !!session?.user?.id;

  return (
    <div className="max-w-2xl mx-auto px-4">
      <header className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 100 100" className="size-12 text-primary shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 4 L18 20 L18 48 C18 68 32 84 50 96 C68 84 82 68 82 48 L82 20 Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="none"/>
            <path d="M50 12 L26 24 L26 48 C26 64 37 78 50 88 C63 78 74 64 74 48 L74 24 Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" opacity="0.4"/>
            <circle cx="50" cy="32" r="12" stroke="currentColor" strokeWidth="2" fill="none"/>
            <circle cx="50" cy="32" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <rect x="47" y="44" width="6" height="38" rx="1.5" fill="currentColor"/>
            <path d="M53 58 L60 58 L60 61 L53 61" fill="currentColor"/>
            <path d="M53 64 L58 64 L58 67 L53 67" fill="currentColor"/>
            <path d="M53 72 L62 72 L62 75 L53 75" fill="currentColor"/>
            <line x1="38" y1="48" x2="38" y2="72" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
            <line x1="62" y1="48" x2="62" y2="72" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
            <line x1="50" y1="82" x2="50" y2="88" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <h1 className="text-3xl text-primary">
            <span className="font-medium">Iron</span><span className="font-bold">Key</span>
          </h1>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <ThemeToggle />
          <AuthHeader />
        </div>
      </header>
      <p className="text-muted-foreground text-center mb-5 text-lg">
        Crea contraseñas más seguras 🔐  y personalizadas 💥
      </p>
      <FormCreatePassword isAuthenticated={isAuthenticated} />
      <PasswordLists isAuthenticated={isAuthenticated} />
    </div>
  );
};
export default DashboardPage;
