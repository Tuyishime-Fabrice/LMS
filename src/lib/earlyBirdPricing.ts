const GRACE_MS = 30 * 60 * 1000;

export interface EarlyBirdCourseFields {
  price?: number | null;
  early_bird_price?: number | null;
  early_bird_start?: string | null;
  early_bird_end?: string | null;
  early_bird_max_seats?: number | null;
  early_bird_seats_used?: number | null;
}

export interface EarlyBirdState {
  active: boolean;
  price: number;
  regularPrice: number;
  endsAt: string;
  seatsLeft: number | null;
  inGrace: boolean;
  savings: number;
}

export function resolveEarlyBirdPricing(
  course: EarlyBirdCourseFields,
  checkoutStartedAt?: string | null,
): EarlyBirdState | null {
  if (!course.early_bird_price || !course.early_bird_start || !course.early_bird_end) {
    return null;
  }

  const price = Number(course.early_bird_price);
  const regularPrice = Number(course.price ?? 0);
  if (!Number.isFinite(price) || price < 0) {
    return null;
  }

  const now = Date.now();
  const start = new Date(course.early_bird_start).getTime();
  const end = new Date(course.early_bird_end).getTime();
  const checkoutStart = checkoutStartedAt ? new Date(checkoutStartedAt).getTime() : null;

  const inWindow = now >= start && now <= end;
  const inGrace =
    checkoutStart != null &&
    Number.isFinite(checkoutStart) &&
    checkoutStart >= start &&
    checkoutStart <= end &&
    checkoutStart + GRACE_MS >= now;

  if (!inWindow && !inGrace) {
    return null;
  }

  const maxSeats = course.early_bird_max_seats;
  const used = Number(course.early_bird_seats_used ?? 0);
  if (maxSeats != null && used >= maxSeats) {
    return null;
  }

  return {
    active: true,
    price,
    regularPrice,
    endsAt: course.early_bird_end,
    seatsLeft: maxSeats != null ? maxSeats - used : null,
    inGrace: !inWindow && inGrace,
    savings: Math.max(0, regularPrice - price),
  };
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "Ended";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}
