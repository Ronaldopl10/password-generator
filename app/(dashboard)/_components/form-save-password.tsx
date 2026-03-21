"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { passwordSchema, PasswordSchemaType } from "@/schema/password.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { SaveIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { PasswordConfig } from "@/lib/password";
import PasswordOptionsTags from "./password-options-tags";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreatePasswordAction } from "../_actions/create-password.action";
import { toast } from "sonner";

interface Props {
  password: string;
  passwordConfig: PasswordConfig;
}

export function FormSavePassword({ password, passwordConfig }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<PasswordSchemaType>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      title: "",
      password: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.setValue("password", password);
      form.setValue("length", passwordConfig.length);
      form.setValue("hasLowercase", passwordConfig.hasLowercase);
      form.setValue("hasUppercase", passwordConfig.hasUppercase);
      form.setValue("hasNumbers", passwordConfig.hasNumbers);
      form.setValue("hasSymbols", passwordConfig.hasSymbols);
    }
  }, [isOpen, password, passwordConfig, form]);

  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: CreatePasswordAction,
    async onSuccess(data) {
      form.reset();

      toast.success(`Password ${data.title} fue guardada con exito 🎉 😇 `);

      setIsOpen(false);

      //TODO: revalidar la data
      queryClient.invalidateQueries({
        queryKey: ["password"],
      });
    },
    onError(error) {
      toast.error(`Error: ${error.message}`);
    },
  });

  function onSubmit(values: PasswordSchemaType) {
    mutate(values);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <SaveIcon />
          Guardar Contraseña
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <SaveIcon />
            Guardar Contraseña
          </DialogTitle>
          <DialogDescription>
            Guarta tu contraseña generada de forma segura con toda su
            configuración
          </DialogDescription>
        </DialogHeader>
        <section className="space-y-6">
          {/* Formulario */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titulo de la contraseña</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Google, Gmail, Facebook, etc..."
                        {...field}
                        className="h-12"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titulo de la contraseña</FormLabel>
                    <FormControl>
                      <Input
                        disabled
                        {...field}
                        className="h-12 bg-gray-100 font-mono text-gray-800"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-blue-800 mb-3">
                  Configuración aplicada
                </h3>
                <div className="space-y-4 text-sm">
                  <p>
                    <span className="font-bold">Longitud: </span>
                    {passwordConfig.length} caracteres
                  </p>
                  <PasswordOptionsTags passwordConfig={passwordConfig} />
                </div>
              </div>
            </form>
          </Form>
        </section>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={isPending}
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
          >
            Guardar contraseña
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FormSavePassword;
