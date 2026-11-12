/**
 * Demo stand-ins for the server routes in /api: Mobile Money checkout,
 * coupons and the AI tutor. No money moves and no AI model is called.
 */
import { demoDb } from "./backend";
import type { Row } from "./seed";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

/** Seconds a demo MoMo payment stays "waiting for approval" before it succeeds. */
const CONFIRM_AFTER_MS = 4000;

function priceOf(type: string, itemId: string, track: string): { amount: number; currency: string } {
  if (type === "bundle") {
    const bundle = demoDb.table("course_bundles").find((row) => row.id === itemId);
    return { amount: Number(bundle?.bundle_price) || 0, currency: String(bundle?.currency || "RWF") };
  }
  const course = demoDb.table("courses").find((row) => row.id === itemId);
  if (!course || course.is_free) return { amount: 0, currency: "RWF" };
  const now = new Date().toISOString();
  const earlyBird = course.early_bird_price && String(course.early_bird_start) <= now && now <= String(course.early_bird_end);
  const full = Number(earlyBird ? course.early_bird_price : course.price) || 0;
  return { amount: track === "instalment" ? Math.round(full / 2) : full, currency: String(course.currency || "RWF") };
}

function couponDiscount(code: string | undefined, amount: number, itemId: string) {
  if (!code) return { coupon: null as Row | null, discount: 0 };
  const coupon = demoDb.table("coupons").find((row) => String(row.code).toUpperCase() === code.trim().toUpperCase() && row.is_active);
  if (!coupon || (coupon.course_id && coupon.course_id !== itemId)) return { coupon: null, discount: 0 };
  const discount = coupon.discount_type === "percent" ? Math.round((amount * Number(coupon.discount_value)) / 100) : Number(coupon.discount_value);
  return { coupon, discount: Math.min(discount, amount) };
}

async function paymentInitiate(request: Request) {
  const userId = demoDb.userIdFrom(request);
  if (!userId) return json({ success: false, error: "Please sign in" }, 401);
  const body = await request.json().catch(() => ({}));
  // The real request names the item as courseId or bundleId.
  body.type = body.bundleId ? "bundle" : "course";
  body.itemId = body.bundleId || body.courseId;
  if (!body.itemId && !body.instalmentScheduleId) return json({ success: false, error: "Missing course" }, 400);
  if (body.paymentMethod === "card") {
    return json({ success: false, error: "Card payments are switched off in the demo. Choose Mobile Money to see the checkout." });
  }

  // Paying a pending instalment.
  if (body.instalmentScheduleId) {
    const schedule = demoDb.table("instalment_schedules").find((row) => row.id === body.instalmentScheduleId);
    if (!schedule) return json({ success: false, error: "Instalment not found" }, 404);
    return createPayment(userId, body, Number(schedule.amount), "RWF", { instalment_schedule_id: schedule.id, payment_track: "instalment" });
  }

  const track = body.paymentTrack === "instalment" ? "instalment" : "full";
  const { amount, currency } = priceOf(body.type, body.itemId, track);
  const { coupon, discount } = couponDiscount(body.couponCode, amount, body.itemId);
  if (amount - discount <= 0) {
    enrolFor(userId, body.type, body.itemId, body.cohortId);
    demoDb.save();
    return json({ success: true, freeCheckout: true, gateway: "free", referenceId: `FREE-${Date.now()}` });
  }
  return createPayment(userId, body, amount - discount, currency, {
    original_amount: amount, discount_amount: discount, coupon_id: coupon?.id ?? null, payment_track: track,
  });
}

function createPayment(userId: string, body: Row, amount: number, currency: string, extra: Row) {
  const referenceId = `DP-DEMO-${Date.now().toString(36).toUpperCase()}`;
  demoDb.table("payments").push({
    id: demoDb.uuid(), student_id: userId, amount, currency, status: "pending", reference_id: referenceId,
    course_id: body.type === "bundle" ? null : body.itemId, bundle_id: body.type === "bundle" ? body.itemId : null,
    payment_method: "MTN_MOMO_RWA", payment_provider: "xentripay", payer_phone: body.phone || null, cohort_id: body.cohortId || null,
    original_amount: amount, discount_amount: 0, created_at: demoDb.nowIso(), updated_at: demoDb.nowIso(), ...extra,
  });
  demoDb.save();
  return json({
    success: true, status: "awaiting_confirmation", gateway: "xentripay", referenceId,
    confirmationMessage: "Demo: no real money moves. In the live academy the learner approves a MoMo prompt on their phone; here the payment confirms itself in a few seconds.",
  });
}

function enrolFor(userId: string, type: string, itemId: string, cohortId?: string) {
  const cohort = cohortId ? demoDb.table("cohorts").find((row) => row.id === cohortId) : null;
  const extra = cohort ? { cohort_id: cohort.id, cohort_name: cohort.name } : {};
  if (type === "bundle") {
    demoDb.table("bundle_courses").filter((row) => row.bundle_id === itemId).forEach((row) => demoDb.enrol(userId, row.course_id));
  } else {
    demoDb.enrol(userId, itemId, extra);
  }
}

function paymentStatus(url: URL) {
  const payment = demoDb.table("payments").find((row) => row.reference_id === url.searchParams.get("ref"));
  if (!payment) return json({ success: false, status: "failed" }, 404);
  if (payment.status === "pending" && Date.now() - new Date(String(payment.created_at)).getTime() > CONFIRM_AFTER_MS) {
    Object.assign(payment, { status: "success", transaction_id: `MP${Date.now()}`, updated_at: demoDb.nowIso() });
    if (payment.instalment_schedule_id) {
      const schedule = demoDb.table("instalment_schedules").find((row) => row.id === payment.instalment_schedule_id);
      if (schedule) Object.assign(schedule, { status: "paid", paid_at: demoDb.nowIso(), payment_id: payment.id });
    } else {
      enrolFor(String(payment.student_id), payment.bundle_id ? "bundle" : "course", String(payment.bundle_id || payment.course_id), payment.cohort_id as string | undefined);
    }
    demoDb.notify(payment.student_id, "payment_received", "Payment received", `${payment.amount} ${payment.currency}`, "/student/payments");
    demoDb.save();
  }
  return json({ success: true, status: payment.status, reference_id: payment.reference_id });
}

async function couponValidate(request: Request) {
  const body = await request.json().catch(() => ({}));
  const type = body.bundleId ? "bundle" : "course";
  const itemId = body.bundleId || body.courseId;
  const { amount, currency } = priceOf(type, itemId, body.paymentTrack || "full");
  const { coupon, discount } = couponDiscount(body.code, amount, itemId);
  if (!coupon) return json({ success: true, valid: false, error: "This code is not valid for this course" });
  return json({
    success: true, valid: true, code: coupon.code, discountType: coupon.discount_type, discountValue: coupon.discount_value,
    originalAmount: amount, discountAmount: discount, finalAmount: amount - discount, currency,
  });
}

/* ------------------------------------------------------------------------ */
/* AI tutor                                                                  */
/* ------------------------------------------------------------------------ */

const TUTOR_LIMIT = 30;

function tutorUsedToday(userId: string) {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  return demoDb.table("tutor_messages").filter((row) => row.user_id === userId && row.role === "user" && String(row.created_at) > since).length;
}

function sampleAnswer(lessonTitle: string, graded: boolean, french: boolean) {
  if (french) {
    return [
      `(Réponse de démonstration : en production, le tuteur IA répond à votre vraie question grâce à Claude.)`,
      "",
      `Pour « ${lessonTitle} », partons d'un exemple concret. Une boutique de Kigali enregistre 5 ventes, mais la vente du mardi a été saisie deux fois : le total affiche 62 000 RWF au lieu de 50 000 RWF.`,
      "",
      graded
        ? "Comme ce travail est noté, je ne donne pas la réponse, mais voici la démarche :\n1. Repérez les lignes identiques\n2. Vérifiez-les avec le reçu\n3. Recalculez le total et comparez"
        : "1. Repérez les lignes identiques\n2. Supprimez la ligne en trop\n3. Recalculez le total et comparez",
      "",
      "Voulez-vous essayer avec vos propres chiffres ?",
    ].join("\n");
  }
  return [
    "(Demo answer: in the live academy, the AI tutor answers your actual question using Claude.)",
    "",
    `For "${lessonTitle}", let's start from a concrete example. A Kigali shop records 5 sales, but Tuesday's sale was typed twice, so the total shows RWF 62,000 instead of RWF 50,000.`,
    "",
    graded
      ? "Because this is graded work, I won't give you the answer, but here is the approach:\n1. Find rows that are exactly the same\n2. Check them against the receipt\n3. Recalculate the total and compare"
      : "1. Find rows that are exactly the same\n2. Remove the extra row\n3. Recalculate the total and compare",
    "",
    "Would you like to try it with your own numbers?",
  ].join("\n");
}

async function tutor(request: Request) {
  const userId = demoDb.userIdFrom(request);
  if (!userId) return json({ code: "unauthorized" }, 401);
  const used = tutorUsedToday(userId);
  if (request.method === "GET") return json({ enabled: true, limit: TUTOR_LIMIT, used });
  if (used >= TUTOR_LIMIT) return json({ code: "daily_limit", limit: TUTOR_LIMIT }, 429);

  const body = await request.json().catch(() => ({}));
  const lesson = demoDb.table("course_lessons").find((row) => row.id === body.lessonId);
  const chapter = lesson && demoDb.table("course_chapters").find((row) => row.id === lesson.chapter_id);
  const graded = lesson?.content_type === "quiz" || lesson?.content_type === "assignment";
  const answer = sampleAnswer(String(lesson?.title || "this lesson"), graded, String(body.language || "").startsWith("fr"));
  const base = { user_id: userId, course_id: chapter?.course_id ?? null, lesson_id: body.lessonId };
  demoDb.table("tutor_messages").push({ id: demoDb.uuid(), ...base, role: "user", content: String(body.message || ""), created_at: demoDb.nowIso() });
  demoDb.table("tutor_messages").push({ id: demoDb.uuid(), ...base, role: "assistant", content: answer, model: "demo", created_at: new Date(Date.now() + 1).toISOString() });
  demoDb.save();

  // Stream it word by word, as the real tutor does.
  const words = answer.split(/(\s+)/);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < words.length; i += 3) {
        controller.enqueue(encoder.encode(words.slice(i, i + 3).join("")));
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Tutor-Limit": String(TUTOR_LIMIT), "X-Tutor-Used": String(used + 1) },
  });
}

/** Sends /api/* requests to the demo handlers; everything else goes to the network. */
export function installDemoApi() {
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url, window.location.href);
    if (url.origin !== window.location.origin || !/\/api\//.test(url.pathname)) return original(input, init);
    const route = url.pathname.slice(url.pathname.indexOf("/api/"));
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (route === "/api/payment-initiate") return paymentInitiate(request);
    if (route === "/api/payment-status") return paymentStatus(url);
    if (route === "/api/coupon-validate") return couponValidate(request);
    if (route === "/api/tutor") return tutor(request);
    return json({ error: "Not available in the demo" }, 404);
  };
}
