const GRACE_MS = 30 * 60 * 1000;

/**
 * Resolve early-bird pricing for a course row (server-side).
 * Returns null when early bird does not apply.
 */
export function resolveEarlyBirdPricing(course, { checkoutStartedAt } = {}) {
    if (!course?.early_bird_price || !course?.early_bird_start || !course?.early_bird_end) {
        return null;
    }

    const price = Number(course.early_bird_price);
    if (!Number.isFinite(price) || price < 0) {
        return null;
    }

    const now = Date.now();
    const start = new Date(course.early_bird_start).getTime();
    const end = new Date(course.early_bird_end).getTime();

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
        return null;
    }

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
        price,
        regularPrice: Number(course.price),
        active: true,
        inGrace: !inWindow && inGrace,
        endsAt: course.early_bird_end,
        seatsLeft: maxSeats != null ? maxSeats - used : null,
    };
}
