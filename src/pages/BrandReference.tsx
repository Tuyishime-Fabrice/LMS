import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PlusLevel, PlusLoader, PlusMark, PlusMotif } from "@/components/brand/PlusMotif";
import { Brand } from "@/components/shell/Brand";
import { CourseThumb } from "@/features/learning/CourseThumb";
import { BrandIntro } from "@/features/site/BrandIntro";
import { usePageMeta } from "@/lib/pageMeta";

/**
 * Design-system reference (development and demo builds only, never routed in production).
 * Shows every token, the type scale, the plus motif, generated covers and the intro, so a
 * reviewer can check the brand without hunting through pages. Copy here is internal.
 */
const SWATCHES = [
  ["action", "bg-action", "#C9501F"], ["brand-950", "bg-brand-950", "#00311B"], ["brand-900", "bg-brand-900", "#004225"],
  ["brand-800", "bg-brand-800", "#025129"], ["brand-700", "bg-brand-700", "#03722E"], ["brand-500 (motif only)", "bg-brand-500", "#1AB210"],
  ["olive-ink", "bg-olive-ink", "#3F4130"], ["olive", "bg-olive", "#4E5B35"], ["cream", "bg-cream", "#F7F4EA"], ["mint", "bg-mint", "#ECF7EC"],
] as const;

const COVERS = [
  { title: "Data analysis with Excel and Power BI", category: "Data & Analytics" },
  { title: "Monitoring and evaluation for project teams", category: "M&E" },
  { title: "AI for professionals", category: null },
  { title: "Writing research proposals", category: null },
  { title: "Mapping with QGIS", category: "GIS" },
];

export default function BrandReference() {
  const { t } = useTranslation();
  usePageMeta({ title: "Brand reference", path: "/brand", noindex: true });
  const [drawKey, setDrawKey] = useState(0);
  const [intro, setIntro] = useState(false);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-site space-y-16 px-4 py-12 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <Brand />
          <p className="text-sm text-muted-foreground">Design-system reference. Development and demo builds only.</p>
        </header>

        <section aria-labelledby="ref-colour" className="space-y-4">
          <h2 id="ref-colour" className="text-3xl font-bold text-forest">Colour</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {SWATCHES.map(([name, bg, hex]) => (
              <li key={name} className="overflow-hidden rounded-lg border bg-card">
                <div className={`h-16 ${bg}`} />
                <p className="px-3 pt-2 text-sm font-medium text-forest">{name}</p>
                <p className="tabular px-3 pb-2 text-xs text-muted-foreground">{hex}</p>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary button</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Text link</Button>
            <div className="w-48"><Progress value={64} aria-label="Progress example" /></div>
          </div>
        </section>

        <section aria-labelledby="ref-type" className="space-y-3">
          <h2 id="ref-type" className="text-3xl font-bold text-forest">Type</h2>
          <p className="font-display text-5xl font-bold leading-[1.05] text-forest">League Spartan 700, display</p>
          <p className="font-display text-3xl font-semibold text-forest">League Spartan 600, section heading</p>
          <p className="max-w-2xl text-lg leading-relaxed">Inter 400 at 18 px for body copy on public pages, with a line height of about 1.6. Numbers in prices and durations use tabular figures: <span className="tabular font-semibold">RWF 50,000 · 8 weeks</span>.</p>
          <p className="text-base">Inter 400 at 16 px for interface text.</p>
        </section>

        <section aria-labelledby="ref-logo" className="space-y-4">
          <h2 id="ref-logo" className="text-3xl font-bold text-forest">Logo</h2>
          <div className="flex flex-wrap gap-4">
            <div className="rounded-lg border bg-cream p-6"><Brand /></div>
            <div className="rounded-lg bg-brand-950 p-6"><Brand tone="light" /></div>
            <div className="rounded-lg border bg-card p-6"><Brand compact /></div>
          </div>
          <p className="text-sm text-muted-foreground">Cut from the intro poster frame until the official SVG arrives.</p>
        </section>

        <section aria-labelledby="ref-plus" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="ref-plus" className="text-3xl font-bold text-forest">Plus motif</h2>
            <Button variant="outline" onClick={() => setDrawKey((k) => k + 1)}>Replay draw</Button>
          </div>
          <div className="grid gap-6 md:grid-cols-3" key={drawKey}>
            {(["trail", "centred", "stepped"] as const).map((variant) => (
              <figure key={variant} className="space-y-3">
                <div className="flex h-56 items-center justify-center overflow-hidden rounded-lg border bg-card p-6">
                  <PlusMotif variant={variant} size={variant === "trail" ? 200 : 170} animate="once" />
                </div>
                <div className="flex h-56 items-center justify-center overflow-hidden rounded-lg bg-brand-950 p-6">
                  <PlusMotif variant={variant} size={variant === "trail" ? 200 : 170} tone="dark" animate="once" delay={300} />
                </div>
                <figcaption className="text-sm font-medium text-forest">{variant}</figcaption>
              </figure>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-8">
            <div>
              <p className="mb-2 text-sm font-medium text-forest">layersLit 0 to 3</p>
              <div className="flex items-center gap-3">
                {([0, 1, 2, 3] as const).map((n) => <PlusMotif key={n} variant="centred" size={48} layersLit={n} />)}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-forest">Course level</p>
              <ul className="space-y-1 text-sm">
                {(["beginner", "intermediate", "advanced"] as const).map((level) => (
                  <li key={level} className="flex items-center gap-2"><PlusLevel level={level} label="" size={20} />{t(`landing.level.${level}`, level)}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-forest">Loading</p>
              <PlusLoader label="Loading" />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-forest">Outcome list</p>
              <ul className="space-y-1.5 text-sm">
                <li className="flex items-center gap-2"><PlusMark />Clean a survey dataset</li>
                <li className="flex items-center gap-2"><PlusMark />Build a one-page dashboard</li>
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="ref-covers" className="space-y-4">
          <h2 id="ref-covers" className="text-3xl font-bold text-forest">Course covers</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {COVERS.map((course) => (
              <li key={course.title}><CourseThumb title={course.title} category={course.category} className="aspect-[16/10]" /></li>
            ))}
          </ul>
          <div className="flex gap-3">
            {COVERS.map((course) => <CourseThumb key={course.title} compact title={course.title} category={course.category} className="h-16 w-24" />)}
          </div>
        </section>

        <section aria-labelledby="ref-intro" className="space-y-3">
          <h2 id="ref-intro" className="text-3xl font-bold text-forest">Intro</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">Plays only when the two video files are in public/brand/intro and site-facts marks them ready. Without them this preview closes after 800 ms, as the live page would.</p>
          <Button variant="outline" onClick={() => setIntro(true)}>Preview the intro</Button>
          {intro && <BrandIntro force onEnd={() => setIntro(false)} />}
        </section>
      </div>
    </main>
  );
}
