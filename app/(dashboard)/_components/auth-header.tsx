import { auth } from "@/auth";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, UserCircle } from "lucide-react";
import Link from "next/link";

export default async function AuthHeader() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/pricing">Planes</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login">
            <LogIn className="size-4 mr-1" />
            Iniciar sesión
          </Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/register">Registrarse</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/pricing">Planes</Link>
      </Button>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <UserCircle className="size-4" />
        <span className="hidden sm:inline">{session.user.name ?? session.user.email}</span>
      </div>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <Button variant="ghost" size="sm" type="submit">
          <LogOut className="size-4 mr-1" />
          Salir
        </Button>
      </form>
    </div>
  );
}
