import type { ReactNode } from "react";

export type LegalSection = {
  heading: string;
  paragraphs?: (string | ReactNode)[];
  bullets?: (string | ReactNode)[];
};

type LegalDocumentProps = {
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
};

export function LegalDocument({ title, updated, intro, sections }: LegalDocumentProps) {
  return (
    <article lang="en" className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">Last updated: {updated}</p>
      </header>

      {intro ? (
        <p className="text-muted-foreground leading-relaxed">{intro}</p>
      ) : null}

      {sections.map((section) => (
        <section key={section.heading} className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">{section.heading}</h2>

          {section.paragraphs?.map((paragraph, index) => (
            <p key={index} className="text-sm leading-relaxed text-muted-foreground">
              {paragraph}
            </p>
          ))}

          {section.bullets ? (
            <ul className="list-disc pl-5 space-y-1.5">
              {section.bullets.map((bullet, index) => (
                <li key={index} className="text-sm leading-relaxed text-muted-foreground">
                  {bullet}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </article>
  );
}
