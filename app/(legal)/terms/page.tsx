import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { buildSocialMetadata } from "@/lib/seo";

const TITLE = "Terms of Service";

const DESCRIPTION =
  "The terms that govern the use of IronKey: plans, subscriptions, renewal, cancellation, acceptable use, liability and governing law.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/terms",
  },
  ...buildSocialMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: "/terms",
  }),
  robots: {
    index: true,
    follow: true,
  },
};

const UPDATED = "November 19, 2026";

const sections = [
  {
    heading: "1. Agreement and who you are contracting with",
    paragraphs: [
      "These Terms of Service (\"Terms\") govern your use of IronKey, a web-based password generator and password vault (the \"Service\"). By creating an account or subscribing to a paid plan you agree to these Terms. If you do not agree with them, do not use the Service.",
      "The Service is operated by Ronaldo Pérez Lezama. We are the party that provides the Service, supports it and issues refunds under our Refund Policy.",
      "Payments are collected by third-party payment providers, which act as merchant of record for the payment transaction: they collect the money, issue the receipt for it and apply their own terms to the payment step. We never receive or store your card number.",
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
        , who is the party that provides the Service, supports it and issues
        refunds under our Refund Policy. You can reach us at{" "}
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
    heading: "2. The Service and the plans",
    paragraphs: [
      "The Service lets you generate passwords, store them in a personal vault, copy them to your clipboard and manage your saved entries.",
      "We offer a Free plan and paid plans with a higher number of saved passwords and additional features. The limits and features of each plan are shown on the Pricing page. We may adjust them, and we will not reduce the limits of a plan you are paying for without notice.",
      "A password manager is a tool, not a guarantee. We do not warrant that a generated password cannot be guessed, and we do not warrant that the Service is suitable for storing your most critical credentials. The Privacy Policy describes exactly how encryption works in this Service.",
    ],
  },
  {
    heading: "3. Accounts",
    bullets: [
      "You need an account to store passwords. You are responsible for the accuracy of your email address, for keeping your account password confidential, and for everything that happens through your account.",
      "One account per person. You may not share, resell, rent or lend an account, and you may not use the Service on behalf of somebody else without a written agreement with us.",
      "You must be at least 18 years old, or the age of majority where you live, and legally able to enter into this agreement.",
    ],
  },
  {
    heading: "4. Subscriptions, billing and renewal",
    bullets: [
      "Paid plans are monthly subscriptions. The price shown on the Pricing page is charged every month until you cancel.",
      "The subscription renews automatically at the end of each billing period. If the price changes, we notify you by email before the renewal.",
      "You can cancel at any time from your payment provider's portal, or by emailing us. Cancelling stops future renewals; it does not entitle you to a refund of the period you have already paid for — see the Refund Policy.",
      "Taxes, if applicable, are calculated and collected by the payment processor. Prices are shown in the currency we display, and the processor may convert them at its own rate.",
    ],
  },
  {
    heading: "5. What happens when you cancel",
    bullets: [
      "Your plan stays active until the end of the period you have already paid for.",
      "After that period your account goes back to the Free plan. Your stored passwords remain in your account and remain readable — cancelling does not delete your vault.",
      "On the Free plan you can still read and delete your saved passwords, but the number of passwords you can save is limited to the Free limit shown on the Pricing page.",
      "Your account and your data stay with us until you ask us to delete them. See the Refund Policy and the Privacy Policy.",
    ],
  },
  {
    heading: "6. Refunds",
    paragraphs: [
      "Paid plans are digital services that are available as soon as your payment clears. We do not offer a general refund window and we do not issue partial refunds, except where a charge was duplicated, failed or was taken in error, or where consumer protection law requires a refund. See the Refund Policy, which forms part of these Terms.",
    ],
  },
  {
    heading: "7. Acceptable use",
    bullets: [
      "Do not use the Service for anything unlawful, or to store or distribute content that is illegal or infringes the rights of others.",
      "Do not attack, probe, overload or interfere with the Service or its infrastructure, and do not try to access accounts or data that are not yours.",
      "Do not scrape, resell, redistribute or commercially exploit the Service, including reselling generated passwords in bulk.",
      "Do not use the password generator to build phishing pages, malware, spam or credential-stuffing lists.",
      "Do not resell access to the Service, or include it in a product or service that you resell.",
    ],
    paragraphs: [
      "We may suspend or terminate an account that breaches this section, and we will tell you why. Where the breach is serious, we may act without notice.",
    ],
  },
  {
    heading: "8. Availability and changes to the Service",
    paragraphs: [
      "We work to keep the Service available and your data safe, but we do not guarantee uninterrupted availability, and we may occasionally suspend access for maintenance, for security reasons, or for reasons outside our control.",
      "We may add, change or remove features. We will give reasonable notice before a material change that reduces the functionality of a plan you are paying for, and we will offer a refund of the unused portion of the paid period.",
      "We may discontinue the Service entirely. In that case we will give at least 30 days' notice by email and refund the unused portion of the period you have already paid for.",
    ],
  },
  {
    heading: "9. Our intellectual property",
    paragraphs: [
      "The Service, including its name, logo, interface, design and code, belongs to us and our licensors. You get a limited, revocable, non-exclusive, non-transferable licence to use it for your own personal or internal use.",
      "Do not use our name, logo or branding commercially, or in a way that suggests we endorse your product, without our written permission.",
    ],
  },
  {
    heading: "10. Third-party services",
    paragraphs: [
      "The Service relies on third-party providers for hosting, database storage, email delivery and payment processing. Their services are governed by their own terms and we do not control them. Links to third-party sites are provided for convenience.",
    ],
  },
  {
    heading: "11. Disclaimer and limitation of liability",
    bullets: [
      "The Service is provided \"as is\" and \"as available\", without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose and non-infringement.",
      "To the maximum extent permitted by law, we are not liable for indirect, incidental, special, consequential or punitive damages, or for loss of profits, data or goodwill, arising from your use of the Service, including a lost password or a compromised account.",
      "To the maximum extent permitted by law, our total liability to you for any claim relating to the Service is limited to the amount you actually paid us in the twelve (12) months before the event giving rise to the claim.",
      "Nothing in these Terms excludes liability that cannot be excluded by law.",
    ],
  },
  {
    heading: "12. Indemnity",
    paragraphs: [
      "You agree to indemnify us against claims, losses and liabilities arising from your use of the Service in breach of these Terms or of applicable law.",
    ],
  },
  {
    heading: "13. Governing law",
    paragraphs: [
      "These Terms are governed by the laws of Colombia, without regard to its conflict-of-law rules. The courts of Colombia have exclusive jurisdiction over any dispute arising from these Terms.",
    ],
  },
  {
    heading: "14. Changes to these Terms",
    paragraphs: [
      "We may update these Terms. The date at the top of this page shows the current version. If a change materially affects your rights, we will notify you by email at least 15 days before it takes effect. Continuing to use the Service after that date means you accept the updated Terms.",
    ],
  },
  {
    heading: "15. Contact",
    paragraphs: [
      <span key="contact">
        Questions about these Terms:{" "}
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
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      updated={UPDATED}
      intro="These Terms explain what you get when you use IronKey, what it costs, how a subscription ends and what our respective responsibilities are. They are written to be read."
      sections={sections}
    />
  );
}
