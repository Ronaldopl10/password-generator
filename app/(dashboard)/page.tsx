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
        <div className="flex-1 space-y-1">
          <h1 className="text-3xl font-bold text-foreground">PassGen</h1>
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
