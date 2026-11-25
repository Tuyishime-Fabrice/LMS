import type { ReactNode } from "react";
import { PlusMotif } from "@/components/brand/PlusMotif";

/** Title band under the site header on public pages: deep green, stepped plus accent, one heading. */
export function PageBand({ title, body, children }: { eyebrow?: string; title: string; body?: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-forest text-cream">
      <div className="relative mx-auto max-w-site px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <PlusMotif variant="stepped" size={28} tone="dark" className="mb-5" />
        <h1 className="text-poster text-4xl sm:text-5xl">{title}</h1>
        {body && <p className="mt-4 max-w-2xl text-base leading-7 text-cream/80 sm:text-lg">{body}</p>}
        {children}
      </div>
    </section>
  );
}
