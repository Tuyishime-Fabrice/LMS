/**
 * Where the DATA+ Academy LMS ends and the corporate website begins.
 * The parent site is DATA+ Rwanda (dataplusrwanda.com, DATA+ Consultant Ltd).
 *
 * dataplusacademy.com (this app) owns the learning journey. Company
 * information (about, team, contact, partners, campaigns) lives on the
 * corporate WordPress site, configured with VITE_CORPORATE_SITE_URL.
 */
const DEFAULT_CORPORATE_SITE = "https://dataplusrwanda.com";

export const CORPORATE_SITE_URL = (import.meta.env.VITE_CORPORATE_SITE_URL as string | undefined)?.replace(/\/+$/, "")
  || DEFAULT_CORPORATE_SITE;

/** A page on the corporate site, e.g. corporateUrl("/contact"). */
export function corporateUrl(path = "/"): string {
  return `${CORPORATE_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
