import { z } from "zod";

export const passwordSchema = z.object({
  title: z.string().trim().min(1, "Titúlo requerido"),
  password: z.string().min(4, "La contraseña debe tener mínimo 4 caracteres"),
  length: z.coerce.number().min(4).max(128).optional() as z.ZodOptional<z.ZodNumber>,
  hasUppercase: z.boolean().optional(),
  hasLowercase: z.boolean().optional(),
  hasNumbers: z.boolean().optional(),
  hasSymbols: z.boolean().optional(),
});


export type PasswordSchemaType = z.infer<typeof passwordSchema>