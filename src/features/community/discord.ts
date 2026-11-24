/**
 * Cohort discussion happens on Discord, not inside DATA+ Academy.
 * Only Discord invite or channel links are shown to learners; anything
 * else (a typo, a look-alike host, a javascript: URL) is ignored.
 * The database enforces the same rule (courses/cohorts.discord_url).
 */
const DISCORD_HOSTS = new Set(["discord.gg", "discord.com", "www.discord.com"]);

export function safeDiscordUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !DISCORD_HOSTS.has(url.hostname)) return null;
  if (url.username || url.password || url.port) return null;
  if (!/^\/[A-Za-z0-9/_-]+$/.test(url.pathname)) return null;
  return `https://${url.hostname}${url.pathname}`;
}

/** The link a learner should use: the cohort's own channel wins over the course server. */
export function pickCommunityUrl(cohortUrl: string | null | undefined, courseUrl: string | null | undefined): { url: string; scope: "cohort" | "course" } | null {
  const cohort = safeDiscordUrl(cohortUrl);
  if (cohort) return { url: cohort, scope: "cohort" };
  const course = safeDiscordUrl(courseUrl);
  if (course) return { url: course, scope: "course" };
  return null;
}
