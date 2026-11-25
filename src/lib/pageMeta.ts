import { useEffect } from "react";
import { siteFacts } from "@/content/site-facts";

/**
 * Per-page title, description, canonical URL and optional JSON-LD.
 * Titles read "<page> | DATA+ Academy". Search engines that run JavaScript
 * see these; pre-rendering the public pages would serve them to the rest.
 */
type Meta = { title?: string; description?: string; path?: string; jsonLd?: Record<string, unknown> | null; noindex?: boolean };

function setMeta(selector: string, attr: "name" | "property", key: string, value: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", value);
}

export function usePageMeta({ title, description, path, jsonLd, noindex }: Meta) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : "";
  useEffect(() => {
    const fullTitle = title ? `${title} | ${siteFacts.brand.name}` : `${siteFacts.brand.name}: data, M&E and AI courses by ${siteFacts.brand.parent}`;
    document.title = fullTitle;
    setMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);
    if (description) {
      setMeta('meta[name="description"]', "name", "description", description);
      setMeta('meta[property="og:description"]', "property", "og:description", description);
      setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    }
    setMeta('meta[name="robots"]', "name", "robots", noindex ? "noindex, nofollow" : "index, follow");
    if (path !== undefined) {
      const url = `${siteFacts.brand.siteUrl}${path}`;
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
      link.href = url;
      setMeta('meta[property="og:url"]', "property", "og:url", url);
    }
    const id = "page-jsonld";
    document.getElementById(id)?.remove();
    if (ld) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = id;
      script.textContent = ld;
      document.head.appendChild(script);
    }
  }, [title, description, path, ld, noindex]);
}

/** Course structured data from what the course page actually shows. */
export function courseJsonLd(course: { id: string; title: string; description?: string | null; language?: string | null; price?: number | null; currency?: string | null; isFree?: boolean }) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description || undefined,
    url: `${siteFacts.brand.siteUrl}/course/${course.id}`,
    inLanguage: course.language || undefined,
    provider: { "@type": "Organization", name: siteFacts.brand.name, url: siteFacts.brand.siteUrl },
    offers: course.isFree
      ? { "@type": "Offer", price: 0, priceCurrency: course.currency || "RWF", category: "Free" }
      : course.price ? { "@type": "Offer", price: course.price, priceCurrency: course.currency || "RWF", category: "Paid" } : undefined,
  };
}
