import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Privacy Policy — IronKey",
  description:
    "What data IronKey collects, how it is encrypted, who processes it, how long we keep it and how you can exercise your rights.",
};

const UPDATED = "November 19, 2026";

const sections = [
  {
    heading: "1. Overview",
    paragraphs: [
      "IronKey is a web-based password generator and password vault operated by Ronaldo Pérez Lezama (\"we\", \"us\", \"our\"). This Privacy Policy explains what personal data we collect when you use IronKey (the \"Service\"), why we collect it, who processes it on our behalf, how long we keep it, and how you can exercise your rights over it.",
      "The Service encrypts the passwords you store, but it does not use end-to-end encryption. Section 5 explains exactly what that means in plain language, because it is the single most important thing to understand before you trust a web-based vault with your credentials.",
    ],
  },
  {
    heading: "1.1 The operator",
    paragraphs: [
      <span key="operator">
        IronKey is a product of{" "}
        <a
          href="https://ronaldopl.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Ronaldo Pérez Lezama
        </a>
        , who is the data controller and the party responsible for the Service.
        You can reach us at{" "}
        <a
          href="mailto:contacto@ronaldopl.com"
          className="underline underline-offset-2 hover:text-foreground"
        >
          contacto@ronaldopl.com
        </a>
        .
      </span>,
    ],
  },
  {
    heading: "2. Data we collect",
    bullets: [
      "Account data: your email address, the optional display name you choose, and a hash of your account password. Your account password is never stored in plain text.",
      "Vault data: the title you give each saved password, the password value itself (stored encrypted), the generation options you used (length and character-type flags) and the creation and update timestamps.",
      "Session data: the authentication cookies required to keep you signed in.",
      "Technical data: IP address, browser and user-agent information and request timestamps, recorded in our server logs and error reports. We use them for security, abuse prevention and debugging.",
      "Billing data: the plan you subscribed to, the amount, the status of the subscription and a customer reference. Card numbers are collected by the payment processor, never by us.",
    ],
    paragraphs: [
      "We do not collect your contacts, photos, files or browsing activity, and we do not use advertising or analytics cookies.",
    ],
  },
  {
    heading: "3. How we use your data",
    bullets: [
      "To provide the Service: create and operate your account, generate and store passwords, and keep you signed in.",
      "To process payments and subscriptions, and to keep the accounting records required for them.",
      "To send service emails, such as password reset links and billing notices.",
      "To keep the Service secure, prevent abuse and diagnose errors.",
      "To comply with our legal, tax and accounting obligations.",
    ],
    paragraphs: [
      "We do not sell your personal data, we do not share it for advertising, and we do not use automated decision-making or profiling.",
    ],
  },
  {
    heading: "4. Who processes your data",
    bullets: [
      "Hosting and delivery: Vercel, which serves the application.",
      "Database: Neon (PostgreSQL), which stores your account and vault records.",
      "Email delivery: Resend, which sends password reset and billing emails.",
      "Payments: Mercado Pago, our current payment provider, which acts as merchant of record for the payment transaction: it collects the money, issues the receipt and applies its own terms to the payment step.",
    ],
    paragraphs: [
      "Each provider receives only what it needs to do its job — for example, the email provider receives the recipient address and the message content, and the payment processor receives the payment data and the customer reference. Some of these providers process data outside your country; where required, they rely on standard contractual clauses for international transfers.",
    ],
  },
  {
    heading: "5. Encryption: what we do and what we do not guarantee",
    paragraphs: [
      "Passwords you save are encrypted on our servers with AES (via Cryptr) using a key that never reaches the browser. What is stored in the database is ciphertext, not plain text, and traffic between your browser and our servers is protected with HTTPS.",
      "This is encryption at rest. It is not end-to-end encryption. To display a password in your vault, our servers decrypt it. That is the only way a web vault that shows your passwords can work, and it means our server is technically capable of reading the contents of your vault.",
      "We do not read your vault: there is no internal tool, dashboard or support workflow that displays stored passwords, and the encryption key is not shared with anyone outside the systems that need it to serve you. We cannot, however, cryptographically prove that we are not reading it. If you need an absolute guarantee that only you can read your credentials, do not store your most critical ones in IronKey — use a dedicated end-to-end encrypted password manager for those.",
      "If we lose the encryption key, the passwords you stored become unrecoverable. There is no recovery path for them.",
    ],
  },
  {
    heading: "6. How long we keep your data",
    bullets: [
      "Vault entries and account data: for as long as your account is active.",
      "Deletion requests: once you ask us to delete your account, we delete your account, your stored vault entries and your outstanding password reset tokens from our database within 30 days, except for data we are legally required to keep.",
      "Password reset tokens: they expire one hour after they are issued and can be used only once.",
      "Payment and invoice records: for the period required by tax and consumer-protection law.",
      "Server logs, which may include your IP address: for the limited period our hosting provider keeps them for security and diagnostics. They are not used for advertising or profiling.",
      "Backups: deleted within 30 days of the deletion request.",
    ],
  },
  {
    heading: "7. Your rights",
    paragraphs: [
      "Depending on where you live, you may have the right to access, correct, export or delete your personal data, to object to or restrict certain processing, to withdraw consent, and to lodge a complaint with your local data protection authority. You can exercise most of these rights directly in the app — change your password, delete individual vault entries — or by emailing us. We respond within 30 days and we do not charge for it.",
      "We do not sell or share personal data with third parties for their own purposes, so we do not offer \"do not sell or share my personal data\" controls.",
    ],
  },
  {
    heading: "8. Security",
    paragraphs: [
      "Besides encryption at rest, we hash account passwords with bcrypt (12 rounds), use single-use reset tokens with a one-hour expiry, and scope every database query to the authenticated user, so one account can never read another account's vault.",
      "If a security incident affects your personal data, we will notify you and any authority as required by applicable law, and we will tell you what data was involved and what steps you should take.",
    ],
  },
  {
    heading: "9. Children",
    paragraphs: [
      "The Service is not directed to children under 13 (or under 16 where that is the applicable legal threshold) and we do not knowingly collect data from them. If you believe a child has created an account, contact us and we will delete it.",
    ],
  },
  {
    heading: "10. Changes to this policy",
    paragraphs: [
      "We may update this policy as the Service or the law changes. The date at the top always reflects the current version. If a change materially affects how we use your data, we will notify you by email before it takes effect.",
    ],
  },
  {
    heading: "11. Contact",
    paragraphs: [
      <span key="contact">
        Questions about this policy or about your data:{" "}
        <a
          href="mailto:contacto@ronaldopl.com"
          className="underline underline-offset-2 hover:text-foreground"
        >
          contacto@ronaldopl.com
        </a>
        . Include the email address you use for your IronKey account and we will
        verify your identity before acting on the request.
      </span>,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      updated={UPDATED}
      intro="This policy describes how IronKey handles personal data. It is written to be read, not to be skipped: the encryption section in particular tells you exactly what this service can and cannot protect."
      sections={sections}
    />
  );
}
