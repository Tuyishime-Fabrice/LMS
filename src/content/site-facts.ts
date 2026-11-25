/**
 * Single source of truth for facts shown on the public site: names,
 * contact details, figures, social accounts and organisations.
 *
 * Rule: a value is filled in only when DATA+ has confirmed it. Anything
 * left null or empty hides the part of the page that needs it (see
 * <ContentTodo> for what is still missing). Never put an estimate here.
 */
export type SocialLink = { network: "LinkedIn" | "X" | "Instagram" | "Facebook" | "YouTube"; url: string };

export const siteFacts = {
  brand: {
    name: "DATA+ Academy",
    parent: "DATA+ Rwanda",
    parentUrl: "https://dataplusrwanda.com",
    legalName: "DATA+ Consultant Ltd",
    siteUrl: "https://dataplusacademy.com",
    // Brand intro (docs/product/DESIGN_SYSTEM.md). The poster is in public/brand/intro; the two
    // videos have not been supplied yet. Set `ready` to true once both files are in that folder.
    intro: {
      ready: false,
      webm: "/brand/intro/dataplus-academy-intro.webm",
      mp4: "/brand/intro/dataplus-academy-intro.mp4",
      poster: "/brand/intro/intro-poster.jpg",
    },
  },
  contact: {
    // Confirmed in the 2026-11 brief (matches dataplusrwanda.com).
    address: "KG 5 Kimihurura, Kigali, Rwanda",
    phone: "+250 784 857 317",
    email: "info@dataplusrwanda.com",
    // Not yet confirmed: the two sites disagree. Leave null until DATA+ confirms.
    whatsapp: null as string | null,
    hours: null as { en: string; fr: string } | null,
  },
  // Only accounts DATA+ has confirmed. Candidates seen so far, unconfirmed:
  // linkedin.com/company/data-consultant-ltd, x.com/dataplusco (metadata said
  // @dataplus_learn), instagram.com/dataplus_rwanda.
  social: [] as SocialLink[],
  // Headline figures, e.g. people trained. All null until confirmed: the
  // Academy and dataplusrwanda.com published conflicting numbers.
  figures: {
    peopleTrained: null as number | null,
    countries: null as number | null,
    trainedLastYear: null as { year: number; count: number } | null,
  },
  // Organisations DATA+ has trained or worked with, as DATA+ agrees to show them.
  organisations: [] as { name: string; logo?: string }[],
} as const;

/** True when at least one headline figure has been confirmed. */
export const hasConfirmedFigures = () => Object.values(siteFacts.figures).some((value) => value !== null);
