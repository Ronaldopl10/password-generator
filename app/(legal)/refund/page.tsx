import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Refund Policy — IronKey",
  description:
    "The IronKey refund terms: when a refund applies, how to request one, and what happens to your vault when you cancel.",
};

const UPDATED = "November 19, 2026";

const sections = [
  {
    heading: "1. Our refund policy in short",
    bullets: [
      "We do not refund a subscription once it has been purchased. IronKey is a digital service that is available the moment your payment clears, so its value is delivered from the first second and cannot be returned.",
      "We do refund in three cases: a duplicated charge, a charge that failed or was taken twice by the payment processor, and a charge you tell us within 30 days was taken by mistake (for example, a payment you did not authorise).",
      "Where the consumer protection law that applies to you gives you a right to a refund or to withdraw from the contract, that right prevails over this policy.",
      "We do not issue partial or pro-rata refunds.",
      "Refunds, when they apply, are issued to the original payment method by the payment processor.",
    ],
  },
  {
    heading: "2. How to request a refund",
    bullets: [
      <span key="email">
        Email{" "}
        <a
          href="mailto:contacto@ronaldopl.com"
          className="underline underline-offset-2 hover:text-foreground"
        >
          contacto@ronaldopl.com
        </a>{" "}
        from the same address you use for your IronKey account.
      </span>,
      "Include the email address of your account, the plan name and the date of the charge, and describe what happened.",
      "We answer every refund request within 3 business days. The refund is issued by the payment processor, and how long it takes to appear on your statement depends on your bank, usually a few business days.",
    ],
  },
  {
    heading: "3. Why there is no general refund window",
    paragraphs: [
      "This policy is stricter than the standard SaaS refund window, and it is deliberate. The service you buy is delivered immediately: the generator, your vault, the plan limits and the support that come with them are all available from the first minute, and none of them can be returned once used. A general refund window would price in a risk we do not carry, and we would rather be explicit about it than surprise you at checkout.",
      "This policy covers the case where you buy the service and then change your mind. It does not apply when we discontinue the Service or materially reduce the functionality of a plan you are paying for: in those cases we refund the unused portion of the period you have already paid for, as described in the Terms of Service.",
      "If you think a charge is wrong, write to us before you dispute it with your bank. A chargeback costs us a fee and delays the money for you as well.",
    ],
  },
  {
    heading: "4. What happens to your vault if you cancel",
    bullets: [
      "Cancelling does not delete your data. Your saved passwords stay in your account, readable, until you delete them yourself or ask us to delete your account.",
      "Until the end of the period you paid for, you keep the features and limits of the plan you bought. After that, your account goes back to the Free plan: you can still read and delete your stored passwords, but you can only save as many new ones as the Free limit allows.",
      "Cancelling stops future renewals. It does not give you a refund of the current period — see section 1.",
      "Your account and your data stay with us until you ask us to delete them. We delete your account and your vault entries within 30 days of a verified deletion request, as described in the Privacy Policy.",
    ],
  },
  {
    heading: "5. Disputes and chargebacks",
    paragraphs: [
      "If you dispute a charge with your bank, we will respond and provide the transaction details. Please note that a chargeback costs us a processing fee and takes considerably longer than contacting us directly, so writing to us first is the fastest route to a resolution for you.",
    ],
  },
  {
    heading: "6. Consumer protection rights",
    paragraphs: [
      "If the law that applies to you gives you a right to a refund, to withdraw from the contract, or to a cooling-off period, contact us and we will comply with it. Nothing in this policy excludes a right that cannot legally be excluded, and we will not rely on this policy to deny a right you have.",
    ],
  },
  {
    heading: "7. Contact",
    paragraphs: [
      <span key="contact">
        Refund requests:{" "}
        <a
          href="mailto:contacto@ronaldopl.com"
          className="underline underline-offset-2 hover:text-foreground"
        >
          contacto@ronaldopl.com
        </a>
        . Include the account email, the plan and the charge date so we can
        process it in one go.
      </span>,
    ],
  },
];

export default function RefundPage() {
  return (
    <LegalDocument
      title="Refund Policy"
      updated={UPDATED}
      intro="Cancelling is simple and stops the next renewal. This page sets out our refund terms — they are stricter than the usual SaaS refund window — and explains exactly what applies and why."
      sections={sections}
    />
  );
}
