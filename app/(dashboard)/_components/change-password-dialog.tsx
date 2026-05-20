"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  changePasswordSchema,
  ChangePasswordInput,
} from "@/schema/auth.schema";
import { changePasswordAction } from "@/app/(auth)/_actions/change-password.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Eye, EyeOff } from "lucide-react";

export default function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: ChangePasswordInput) {
    setIsLoading(true);
    try {
      const result = await changePasswordAction(values);
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.success) {
        toast.success(result.message);
        form.reset();
        setOpen(false);
      }
    } catch {
      toast.error("Error al cambiar la contraseña");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <KeyRound className="size-4 mr-1" />
          Cambiar contraseña
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>
            Ingresa tu contraseña actual y la nueva contraseña.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña actual</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input type={showCurrent ? "text" : "password"} className="pr-10" placeholder="••••••••" {...field} />
                    </FormControl>
                    <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 text-muted-foreground" onClick={() => setShowCurrent(!showCurrent)}>
                      {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva contraseña</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input type={showNew ? "text" : "password"} className="pr-10" placeholder="••••••••" {...field} />
                    </FormControl>
                    <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 text-muted-foreground" onClick={() => setShowNew(!showNew)}>
                      {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar contraseña</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input type={showConfirm ? "text" : "password"} className="pr-10" placeholder="••••••••" {...field} />
                    </FormControl>
                    <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 text-muted-foreground" onClick={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Cambiando..." : "Cambiar contraseña"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
