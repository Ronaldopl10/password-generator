import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;

  try {
    await resend.emails.send({
      from: "IronKey <onboarding@resend.dev>",
      to: email,
      subject: "Restablece tu contraseña - IronKey",
      text: `Haz clic en el siguiente enlace para restablecer tu contraseña:\n\n${resetUrl}\n\nEste enlace expira en 1 hora.`,
    });
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    // Don't throw — we don't want to leak email send failures to the user
  }
}
