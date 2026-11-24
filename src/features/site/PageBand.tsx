import type { ReactNode } from "react";

/** Navy title band under the site header on public pages. */
export function PageBand({ eyebrow, title, body, children }: { eyebrow?: string; title: string; body?: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-forest text-white">
      <div className="relative mx-auto max-w-site px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-flame">{eyebrow}</p>}
        <h1 className="text-poster text-5xl sm:text-6xl">{title}</h1>
        {body && <p className="mt-4 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">{body}</p>}
        {children}
      </div>
    </section>
  );
}
