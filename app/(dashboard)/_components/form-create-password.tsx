"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { generatePassword, PasswordConfig } from "@/lib/password";
import {
  ArrowUp01,
  CaseLower,
  CaseUpper,
  CopyIcon,
  Hash,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import FormSavePassword from "./form-save-password";

const options = [
  {
    key: "hasUppercase",
    label: "Mayúsculas (A-Z)",
    icon: <CaseUpper />,
  },
  {
    key: "hasLowercase",
    label: "Minúsculas (a-z)",
    icon: <CaseLower />,
  },
  {
    key: "hasNumbers",
    label: "Números (0-9)",
    icon: <ArrowUp01 />,
  },
  {
    key: "hasSymbols",
    label: "Symbolos (!@#$)",
    icon: <Hash />,
  },
] as const;

const FormCreatePassword = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  const [password, setPassword] = useState("");
  const [pendingAutoOpen, setPendingAutoOpen] = useState(false);

  const form = useForm<PasswordConfig>({
    defaultValues: {
      hasUppercase: true,
      hasLowercase: true,
      hasNumbers: true,
      hasSymbols: true,
      length: 8,
    },
  });

  useEffect(() => {
    const generated = generatePassword({
      hasUppercase: true,
      hasLowercase: true,
      hasNumbers: true,
      hasSymbols: true,
      length: 10,
    });
    setPassword(generated);

    // Restaurar contraseña pendiente si el usuario acaba de autenticarse
    if (isAuthenticated) {
      const raw = sessionStorage.getItem("pg_pending");
      if (raw) {
        try {
          const pending = JSON.parse(raw) as {
            password: string;
            config: PasswordConfig;
            expiresAt: number;
          };
          sessionStorage.removeItem("pg_pending"); // consumir inmediatamente
          if (pending.expiresAt > Date.now()) {
            setPassword(pending.password);
            form.reset(pending.config);
            setPendingAutoOpen(true);
          }
        } catch {
          sessionStorage.removeItem("pg_pending");
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password).then(() => {
      toast.success("Password copiada en el portapapeles correctamente");
    });
  };

  const handleGenerate = () => {
    const values = form.getValues();
    const newPassword = generatePassword(values);
    setPassword(newPassword);
  };

  return (
    <div className="space-y-6 pb-6">
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-primary-foreground/60 mb-1">
              Tu contraseña generada:
            </p>
            <p className="text-xl font-mono break-all text-primary-foreground leading-relaxed">
              {password}
            </p>
          </div>
          <Button
            onClick={handleCopyPassword}
            variant="secondary"
            className="shrink-0 px-4 py-2 transition-all duration-200 hover:scale-105 cursor-pointer"
          >
            <CopyIcon />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Configuración de tu contraseña:
          </h2>
          <Form {...form}>
            <form
              className="space-y-6"
              onSubmit={form.handleSubmit(handleGenerate)}
            >
              <FormField
                control={form.control}
                name="length"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      Longitud de tu contraseña
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        className="text-center text-lg font-semibold h-12 min{4} max{128}"
                      ></Input>
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="space-y-3 ">
                <h3 className="text-sm font-medium text-foreground">
                  Incluir caracteres
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {options.map(({ key, label, icon }) => (
                    <FormField
                      key={key}
                      control={form.control}
                      name={key}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className=""
                              />
                            </FormControl>
                            <span className="text-xl">{icon}</span>
                            <div>
                              <p>{label}</p>
                            </div>
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                <Button type="submit">
                  <ShieldCheck />
                  Generar contraseña nueva
                </Button>
                <FormSavePassword
                  password={password}
                  passwordConfig={form.getValues()}
                  isAuthenticated={isAuthenticated}
                  autoOpen={pendingAutoOpen}
                  onAutoOpenConsumed={() => setPendingAutoOpen(false)}
                />
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FormCreatePassword;
