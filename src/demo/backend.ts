/**
 * In-browser stand-in for Supabase, used only in demo mode
 * (VITE_DEMO_MODE=true). It answers the requests supabase-js makes (auth,
 * PostgREST tables, RPC functions, storage) from the sample data in
 * seed.ts, and keeps changes in this browser's storage so the demo feels
 * real. Nothing leaves the browser.
 */
import { createSeed, DEMO_PASSWORD, type Row, type Tables } from "./seed";

const STORE_KEY = "dataplus-demo-db-v1";
const AUTH_KEY = "dataplus-demo-auth-v1";
export const DEMO_SUPABASE_URL = "https://demo.dataplus.invalid";

type AuthUser = { id: string; email: string; password: string };

let db: Tables | null = null;
let authUsers: AuthUser[] = [];
const memoryStore = new Map<string, string>();
/** Files uploaded during this visit, by storage path. */
const uploads = new Map<string, string>();

function readStore(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return memoryStore.get(key) ?? null; }
}
function writeStore(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { memoryStore.set(key, value); }
}

function assetBase() {
  return new URL(import.meta.env.BASE_URL || "/", window.location.href).href;
}

function load(): Tables {
  if (db) return db;
  const saved = readStore(STORE_KEY);
  try { db = saved ? JSON.parse(saved) : null; } catch { db = null; }
  if (!db) db = createSeed(assetBase());
  const savedAuth = readStore(AUTH_KEY);
  try { authUsers = savedAuth ? JSON.parse(savedAuth) : []; } catch { authUsers = []; }
  return db;
}

let saveTimer: number | undefined;
function save() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    writeStore(STORE_KEY, JSON.stringify(db));
    writeStore(AUTH_KEY, JSON.stringify(authUsers));
  }, 150);
}

/** Puts the demo back to its starting data and signs everyone out. */
export function resetDemo() {
  try {
    window.localStorage.removeItem(STORE_KEY);
    window.localStorage.removeItem(AUTH_KEY);
    Object.keys(window.localStorage).filter((key) => key.startsWith("sb-")).forEach((key) => window.localStorage.removeItem(key));
  } catch { memoryStore.clear(); }
  db = null;
}

export function demoFileUrl(path: string): string {
  const clean = path.replace(/^\/+/, "").replace(/^lesson-files\//, "");
  return uploads.get(clean) || new URL("demo/cleaning-data-notes.pdf", assetBase()).href;
}

const table = (name: string): Row[] => {
  const tables = load();
  if (!tables[name]) tables[name] = [];
  return tables[name];
};
const nowIso = () => new Date().toISOString();
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `d${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`);

/* ------------------------------------------------------------------------ */
/* Responses                                                                 */
/* ------------------------------------------------------------------------ */

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}
function pgError(status: number, code: string, message: string, details: string | null = null) {
  return json({ code, message, details, hint: null }, status);
}

/* ------------------------------------------------------------------------ */
/* Auth                                                                      */
/* ------------------------------------------------------------------------ */

const b64 = (value: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

function userObject(profile: Row) {
  return {
    id: profile.id, aud: "authenticated", role: "authenticated", email: profile.email,
    email_confirmed_at: profile.created_at, confirmed_at: profile.created_at, last_sign_in_at: nowIso(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: profile.full_name, role: profile.role },
    identities: [], created_at: profile.created_at, updated_at: nowIso(),
  };
}

function sessionFor(profile: Row) {
  const issued = Math.floor(Date.now() / 1000);
  const expires = issued + 7 * 24 * 3600;
  const access_token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({
    sub: profile.id, email: profile.email, role: "authenticated", aud: "authenticated", iat: issued, exp: expires, session_id: uuid(),
  })}.demo`;
  return { access_token, token_type: "bearer", expires_in: expires - issued, expires_at: expires, refresh_token: `demo-refresh.${profile.id}`, user: userObject(profile) };
}

function userIdFrom(request: Request): string | null {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const decoded = JSON.parse(decodeURIComponent(escape(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))));
    return typeof decoded.sub === "string" ? decoded.sub : null;
  } catch { return null; }
}

function credentialsMatch(email: string, password: string): Row | null {
  const profile = table("profiles").find((row) => String(row.email).toLowerCase() === email.toLowerCase());
  if (!profile) return null;
  const custom = authUsers.find((user) => user.id === profile.id);
  return (custom ? custom.password === password : password === DEMO_PASSWORD) ? profile : null;
}

async function handleAuth(request: Request, url: URL): Promise<Response> {
  const path = url.pathname.replace(/^\/auth\/v1/, "");
  const body = request.method === "GET" ? {} : await request.clone().json().catch(() => ({}));

  if (path === "/token") {
    if (url.searchParams.get("grant_type") === "refresh_token") {
      const userId = String(body.refresh_token || "").split(".")[1];
      const profile = table("profiles").find((row) => row.id === userId);
      return profile ? json(sessionFor(profile)) : json({ code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" }, 400);
    }
    const profile = credentialsMatch(String(body.email || ""), String(body.password || ""));
    if (!profile) return json({ code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" }, 400);
    profile.last_login = nowIso();
    save();
    return json(sessionFor(profile));
  }

  if (path === "/signup") {
    const email = String(body.email || "").trim();
    if (table("profiles").some((row) => String(row.email).toLowerCase() === email.toLowerCase())) {
      return json({ code: 422, error_code: "user_already_exists", msg: "User already registered" }, 422);
    }
    const meta = body.data || {};
    const role = meta.role === "teacher" ? "teacher" : "student";
    const profile: Row = {
      id: uuid(), email, full_name: meta.full_name || email.split("@")[0], role, avatar_url: null, phone: null,
      onboarding_completed: false, is_suspended: false, pricing_tier: "standard", teacher_approved: role === "teacher" ? false : null,
      teacher_approval_status: role === "teacher" ? "pending" : null, created_at: nowIso(), updated_at: nowIso(),
    };
    table("profiles").push(profile);
    authUsers.push({ id: String(profile.id), email, password: String(body.password || "") });
    save();
    return json(sessionFor(profile));
  }

  if (path === "/user") {
    const profile = table("profiles").find((row) => row.id === userIdFrom(request));
    if (!profile) return json({ code: 401, error_code: "no_authorization", msg: "Not signed in" }, 401);
    if (request.method === "PUT" && body.password) {
      const existing = authUsers.find((user) => user.id === profile.id);
      if (existing) existing.password = body.password;
      else authUsers.push({ id: String(profile.id), email: String(profile.email), password: body.password });
      save();
    }
    return json(userObject(profile));
  }

  if (path === "/logout") return new Response(null, { status: 204 });
  // Password reset, resend and magic-link emails: accepted, nothing is sent.
  return json({});
}

/* ------------------------------------------------------------------------ */
/* PostgREST                                                                 */
/* ------------------------------------------------------------------------ */

type Embed = { key: string; target: string; column?: string; inner: boolean; select: Embed[] };

const COLUMN_TABLE: Record<string, string> = {
  student_id: "profiles", teacher_id: "profiles", user_id: "profiles", sender_id: "profiles", created_by: "profiles",
  reviewed_by: "profiles", graded_by: "profiles", course_id: "courses", lesson_id: "course_lessons", chapter_id: "course_chapters",
  cohort_id: "cohorts", bundle_id: "course_bundles", conversation_id: "conversations", capstone_project_id: "capstone_projects",
};
const TABLE_FK: Record<string, string> = {
  courses: "course_id", course_lessons: "lesson_id", course_chapters: "chapter_id", cohorts: "cohort_id",
  course_bundles: "bundle_id", conversations: "conversation_id", capstone_projects: "capstone_project_id",
};

function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of text) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) { parts.push(current); current = ""; } else current += char;
  }
  if (current) parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

function parseSelect(select: string | null): Embed[] {
  if (!select) return [];
  return splitTopLevel(select).filter((part) => part.includes("(")).map((part) => {
    const open = part.indexOf("(");
    const head = part.slice(0, open).trim();
    const inner = part.slice(open + 1, part.lastIndexOf(")"));
    const [aliasOrName, maybeName] = head.includes(":") ? head.split(":") : [null, head];
    const [name, modifier] = (maybeName as string).split("!");
    const key = (aliasOrName as string | null) || name;
    let target = name;
    let column: string | undefined;
    if (name.endsWith("_id")) { column = name; target = COLUMN_TABLE[name] || name; }
    if (modifier && modifier !== "inner" && modifier !== "left") {
      const match = modifier.match(/_([a-z]+_id)_fkey$/);
      if (match) column = match[1];
    }
    return { key, target, column, inner: modifier === "inner", select: parseSelect(inner) };
  });
}

function embedRows(rows: Row[], sourceTable: string, embeds: Embed[], params: URLSearchParams, prefix = ""): Row[] {
  if (!embeds.length) return rows.map((row) => ({ ...row }));
  return rows.flatMap((row) => {
    const out: Row = { ...row };
    for (const embed of embeds) {
      const path = prefix + embed.key;
      let value: Row | Row[] | null;
      let column = embed.column;
      if (!column && embed.target === "profiles") {
        column = ["student_id", "teacher_id", "user_id", "sender_id", "created_by"].find((name) => name in row);
      } else if (!column && TABLE_FK[embed.target] && TABLE_FK[embed.target] in row) {
        column = TABLE_FK[embed.target];
      }
      if (column) {
        const match = table(embed.target).filter((candidate) => candidate.id === row[column!]);
        const filtered = applyFilters(embedRows(match, embed.target, embed.select, params, `${path}.`), params, `${path}.`);
        value = filtered[0] ?? null;
      } else {
        const fk = TABLE_FK[sourceTable] || `${sourceTable.replace(/s$/, "")}_id`;
        const children = table(embed.target).filter((candidate) => candidate[fk] === row.id);
        let list = applyFilters(embedRows(children, embed.target, embed.select, params, `${path}.`), params, `${path}.`);
        list = applyOrder(list, params.get(`${path}.order`));
        const limit = Number(params.get(`${path}.limit`));
        value = limit ? list.slice(0, limit) : list;
      }
      if (embed.inner && (value === null || (Array.isArray(value) && value.length === 0))) return [];
      out[embed.key] = value;
    }
    return [out];
  });
}

function compare(actual: unknown, op: string, raw: string): boolean {
  if (op === "is") {
    if (raw === "null") return actual === null || actual === undefined;
    if (raw === "true") return actual === true;
    if (raw === "false") return actual === false;
    return false;
  }
  if (op === "in") {
    const values = raw.replace(/^\(|\)$/g, "").split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
    return values.includes(String(actual));
  }
  if (op === "like" || op === "ilike") {
    const pattern = new RegExp(`^${raw.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/[%*]/g, ".*")}$`, op === "ilike" ? "i" : "");
    return pattern.test(String(actual ?? ""));
  }
  if (op === "cs") {
    const wanted = raw.replace(/^\{|\}$/g, "").split(",").filter(Boolean);
    return Array.isArray(actual) && wanted.every((value) => actual.map(String).includes(value));
  }
  if (actual === null || actual === undefined) return op === "neq";
  const a = String(actual);
  const numeric = a !== "" && raw !== "" && !Number.isNaN(Number(a)) && !Number.isNaN(Number(raw));
  const order = numeric ? Number(a) - Number(raw) : a < raw ? -1 : a > raw ? 1 : 0;
  switch (op) {
    case "eq": return numeric ? order === 0 : a === raw;
    case "neq": return numeric ? order !== 0 : a !== raw;
    case "gt": return order > 0;
    case "gte": return order >= 0;
    case "lt": return order < 0;
    case "lte": return order <= 0;
    default: return true;
  }
}

function test(row: Row, column: string, expression: string): boolean {
  let negate = false;
  let rest = expression;
  if (rest.startsWith("not.")) { negate = true; rest = rest.slice(4); }
  const dot = rest.indexOf(".");
  const op = rest.slice(0, dot);
  const raw = rest.slice(dot + 1);
  const result = compare(row[column], op, raw);
  return negate ? !result : result;
}

const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);

function applyFilters(rows: Row[], params: URLSearchParams, prefix = ""): Row[] {
  let out = rows;
  for (const [key, value] of params) {
    if (!key.startsWith(prefix)) continue;
    const local = key.slice(prefix.length);
    if (local.includes(".") || RESERVED.has(local)) continue;
    if (local === "or") {
      const clauses = splitTopLevel(value.replace(/^\(|\)$/g, ""));
      out = out.filter((row) => clauses.some((clause) => {
        const dot = clause.indexOf(".");
        return test(row, clause.slice(0, dot), clause.slice(dot + 1));
      }));
      continue;
    }
    out = out.filter((row) => test(row, local, value));
  }
  return out;
}

function applyOrder(rows: Row[], order: string | null): Row[] {
  if (!order) return rows;
  const keys = order.split(",").map((part) => {
    const [column, ...flags] = part.split(".");
    return { column, desc: flags.includes("desc"), nullsFirst: flags.includes("nullsfirst") };
  });
  return [...rows].sort((a, b) => {
    for (const key of keys) {
      const x = a[key.column];
      const y = b[key.column];
      if (x === y) continue;
      if (x === null || x === undefined) return key.nullsFirst ? -1 : 1;
      if (y === null || y === undefined) return key.nullsFirst ? 1 : -1;
      const numeric = typeof x === "number" && typeof y === "number";
      const diff = numeric ? (x as number) - (y as number) : String(x).localeCompare(String(y));
      if (diff !== 0) return key.desc ? -diff : diff;
    }
    return 0;
  });
}

/** Rows a signed-in person may see in tables where that matters for the demo. */
function scope(name: string, rows: Row[], userId: string | null): Row[] {
  if (["notifications", "tutor_messages", "notification_preferences", "announcement_reads"].includes(name)) {
    return rows.filter((row) => row.user_id === userId);
  }
  return rows;
}

const PRIMARY_KEYS: Record<string, string[]> = {
  notification_preferences: ["user_id"], course_certificate_rules: ["course_id"], system_settings: ["key"],
};
const UNIQUE: Record<string, string[]> = {
  course_enrollments: ["student_id", "course_id"], conversations: ["student_id", "teacher_id"],
  student_lesson_progress: ["student_id", "lesson_id"], assignment_submissions: ["lesson_id", "student_id"],
  capstone_submissions: ["capstone_project_id", "student_id"],
};
const DEFAULTS: Record<string, Row> = {
  direct_messages: { is_read: false, is_edited: false },
  course_enrollments: { progress_percentage: 0, completed: false, enrolled_at: null },
  courses: { approval_status: "pending", is_free: false, currency: "RWF", early_bird_seats_used: 0, scholarship_slots_used: 0 },
  teacher_announcements: { is_active: true },
  announcements: { is_active: true },
  cohorts: { is_active: true },
  scheduled_classes: { status: "scheduled", modality: "online" },
  student_lesson_progress: { is_completed: false, last_position: 0 },
};

function withDefaults(name: string, input: Row): Row {
  const row: Row = { ...(DEFAULTS[name] || {}), ...input };
  if (!PRIMARY_KEYS[name] && !row.id) row.id = uuid();
  for (const column of ["created_at", "updated_at", "submitted_at", "enrolled_at", "started_at"]) {
    if (column in row && !row[column]) row[column] = nowIso();
  }
  if (!row.created_at && name !== "student_lesson_progress") row.created_at = nowIso();
  if (name === "course_enrollments" && !row.enrolled_at) row.enrolled_at = nowIso();
  if ((name === "assignment_submissions" || name === "capstone_submissions") && !row.submitted_at) row.submitted_at = nowIso();
  return row;
}

async function handleRest(request: Request, url: URL): Promise<Response> {
  const name = url.pathname.replace(/^\/rest\/v1\//, "");
  if (name.startsWith("rpc/")) return handleRpc(request, name.slice(4));
  const params = url.searchParams;
  const prefer = request.headers.get("Prefer") || "";
  const wantsObject = (request.headers.get("Accept") || "").includes("vnd.pgrst.object");
  const userId = userIdFrom(request);
  const embeds = parseSelect(params.get("select"));
  const rows = table(name);

  const respond = (result: Row[], total = result.length, status = 200) => {
    const headers: Record<string, string> = {};
    if (/count=/.test(prefer)) headers["Content-Range"] = result.length ? `0-${result.length - 1}/${total}` : `*/${total}`;
    if (request.method === "HEAD") return new Response(null, { status, headers });
    if (wantsObject) {
      if (result.length !== 1) {
        return pgError(406, "PGRST116", "JSON object requested, multiple (or no) rows returned", `The result contains ${result.length} rows`);
      }
      return json(result[0], status, headers);
    }
    return json(result, status, headers);
  };

  if (request.method === "GET" || request.method === "HEAD") {
    let result = applyFilters(scope(name, rows, userId), params);
    result = embedRows(result, name, embeds, params);
    result = applyOrder(result, params.get("order"));
    const total = result.length;
    const offset = Number(params.get("offset")) || 0;
    const limit = Number(params.get("limit")) || undefined;
    result = result.slice(offset, limit ? offset + limit : undefined);
    return respond(result, total);
  }

  const representation = prefer.includes("return=representation");
  const body = await request.clone().json().catch(() => null);

  if (request.method === "POST") {
    const inputs: Row[] = Array.isArray(body) ? body : body ? [body] : [];
    const upsert = /resolution=(merge|ignore)-duplicates/.exec(prefer)?.[1];
    const conflictColumns = (params.get("on_conflict") || "").split(",").filter(Boolean);
    const keys = conflictColumns.length ? conflictColumns : PRIMARY_KEYS[name] || UNIQUE[name] || ["id"];
    const written: Row[] = [];
    for (const input of inputs) {
      const existing = rows.find((row) => keys.every((key) => input[key] !== undefined && row[key] === input[key]));
      if (existing && upsert === "merge") {
        Object.assign(existing, input, "updated_at" in existing ? { updated_at: nowIso() } : {});
        written.push(existing);
        continue;
      }
      if (existing && upsert === "ignore") continue;
      const unique = UNIQUE[name];
      if (unique && rows.some((row) => unique.every((key) => row[key] === input[key]))) {
        return pgError(409, "23505", "duplicate key value violates unique constraint", `Key (${unique.join(", ")}) already exists.`);
      }
      const row = withDefaults(name, input);
      rows.push(row);
      written.push(row);
    }
    written.forEach((row) => afterWrite(name, row, userId));
    save();
    if (!representation) return new Response(null, { status: 201 });
    return respond(embedRows(written, name, embeds, params), written.length, 201);
  }

  if (request.method === "PATCH") {
    const targets = applyFilters(rows, params);
    for (const row of targets) {
      Object.assign(row, body || {});
      if ("updated_at" in row) row.updated_at = nowIso();
      afterWrite(name, row, userId);
    }
    save();
    if (!representation) return new Response(null, { status: 204 });
    return respond(embedRows(targets, name, embeds, params));
  }

  if (request.method === "DELETE") {
    const targets = new Set(applyFilters(rows, params));
    const tables = load();
    tables[name] = rows.filter((row) => !targets.has(row));
    save();
    if (!representation) return new Response(null, { status: 204 });
    return respond([...targets]);
  }

  return pgError(405, "PGRST", "Method not allowed");
}

/* ------------------------------------------------------------------------ */
/* What database triggers would do                                           */
/* ------------------------------------------------------------------------ */

function courseOfLesson(lessonId: unknown): string | null {
  const lesson = table("course_lessons").find((row) => row.id === lessonId);
  const chapter = lesson && table("course_chapters").find((row) => row.id === lesson.chapter_id);
  return (chapter?.course_id as string) || null;
}

function refreshProgress(studentId: unknown, courseId: string | null) {
  if (!courseId) return;
  const chapterIds = new Set(table("course_chapters").filter((row) => row.course_id === courseId).map((row) => row.id));
  const lessonIds = new Set(table("course_lessons").filter((row) => chapterIds.has(row.chapter_id)).map((row) => row.id));
  const done = table("student_lesson_progress").filter((row) => row.student_id === studentId && row.is_completed && lessonIds.has(row.lesson_id)).length;
  const enrolment = table("course_enrollments").find((row) => row.student_id === studentId && row.course_id === courseId);
  if (!enrolment || lessonIds.size === 0) return;
  enrolment.progress_percentage = Math.round((done / lessonIds.size) * 100);
}

function notify(userId: unknown, type: string, title: string, body: string, link: string) {
  table("notifications").push({ id: uuid(), user_id: userId, type, title, body, link, data: {}, read_at: null, email_status: null, created_at: nowIso() });
}

function issueCertificate(studentId: unknown, courseId: unknown, grade: number) {
  if (table("certificates").some((row) => row.student_id === studentId && row.course_id === courseId && row.status === "approved")) return;
  const number = `DPA-${new Date().getFullYear()}-${String(200 + table("certificates").length).padStart(6, "0")}`;
  const code = Array.from({ length: 8 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
  table("certificates").push({
    id: uuid(), student_id: studentId, course_id: courseId, status: "approved", certificate_number: number, verification_code: code,
    issued_at: nowIso(), approved_at: nowIso(), completion_date: nowIso(), issue_source: "auto", capstone_grade: grade, grade: String(grade),
    certificate_url: null, created_at: nowIso(), updated_at: nowIso(),
  });
  const course = table("courses").find((row) => row.id === courseId);
  notify(studentId, "certificate_issued", "Your certificate is ready", String(course?.title || ""), "/student/certificates");
}

function afterWrite(name: string, row: Row, userId: string | null) {
  if (name === "student_lesson_progress") refreshProgress(row.student_id, courseOfLesson(row.lesson_id));
  if (name === "direct_messages") {
    const conversation = table("conversations").find((item) => item.id === row.conversation_id);
    if (conversation) conversation.updated_at = nowIso();
  }
  if (name === "assignment_submissions" && typeof row.grade === "number" && row.student_id !== userId) {
    const lesson = table("course_lessons").find((item) => item.id === row.lesson_id);
    notify(row.student_id, "submission_graded", "Your work was graded", `${lesson?.title || ""}: ${row.grade}/100`, "/student/assignments");
  }
  if (name === "capstone_submissions" && typeof row.grade === "number" && row.grade >= 65) {
    const capstone = table("capstone_projects").find((item) => item.id === row.capstone_project_id);
    if (capstone) issueCertificate(row.student_id, capstone.course_id, row.grade);
  }
}

/* ------------------------------------------------------------------------ */
/* RPC functions                                                             */
/* ------------------------------------------------------------------------ */

function profileName(id: unknown) {
  return String(table("profiles").find((row) => row.id === id)?.full_name || "");
}

function lessonCountFor(courseId: unknown) {
  const chapterIds = new Set(table("course_chapters").filter((row) => row.course_id === courseId).map((row) => row.id));
  return table("course_lessons").filter((row) => chapterIds.has(row.chapter_id));
}

function quizReview(lessonId: unknown, answers: Record<string, string>) {
  const questions = applyOrder(table("lesson_quiz_questions").filter((row) => row.lesson_id === lessonId), "order_index");
  let score = 0;
  let total = 0;
  const review = questions.map((question) => {
    const points = Number(question.points) || 1;
    total += points;
    const selected = answers[String(question.id)] ?? null;
    const correct = selected === question.correct_answer;
    if (correct) score += points;
    return { question_id: question.id, selected, correct_answer: question.correct_answer, is_correct: correct, explanation: question.explanation };
  });
  return { score, total, review };
}

async function handleRpc(request: Request, fn: string): Promise<Response> {
  const args = await request.clone().json().catch(() => ({}));
  const uid = userIdFrom(request);
  const me = table("profiles").find((row) => row.id === uid);
  const ok = (value: unknown) => json(value);
  const setProfile = (id: unknown, changes: Row) => {
    const profile = table("profiles").find((row) => row.id === id);
    if (profile) Object.assign(profile, changes, { updated_at: nowIso() });
    save();
  };

  switch (fn) {
    case "get_lesson_quiz":
      return ok(applyOrder(table("lesson_quiz_questions").filter((row) => row.lesson_id === args.p_lesson_id), "order_index")
        .map(({ id, question_text, options, points, order_index }) => ({ id, question_text, options, points, order_index })));

    case "submit_lesson_quiz": {
      if (me?.role !== "student") return pgError(403, "42501", "Only students can submit a quiz");
      const { score, total, review } = quizReview(args.p_lesson_id, args.p_answers || {});
      const passed = score >= Math.ceil(total * 0.6);
      const attempt = { id: uuid(), student_id: uid, lesson_id: args.p_lesson_id, answers: args.p_answers, score, total_points: total, passed, started_at: nowIso(), submitted_at: nowIso() };
      table("student_quiz_attempts").push(attempt);
      if (passed) {
        const progress = table("student_lesson_progress").find((row) => row.student_id === uid && row.lesson_id === args.p_lesson_id);
        if (progress) Object.assign(progress, { is_completed: true, completed_at: progress.completed_at || nowIso() });
        else table("student_lesson_progress").push({ id: uuid(), student_id: uid, lesson_id: args.p_lesson_id, is_completed: true, completed_at: nowIso(), started_at: nowIso(), last_position: 0 });
        refreshProgress(uid, courseOfLesson(args.p_lesson_id));
      }
      save();
      return ok({ attempt_id: attempt.id, score, total_points: total, passed, review });
    }

    case "get_lesson_quiz_review": {
      const last = applyOrder(table("student_quiz_attempts").filter((row) => row.student_id === uid && row.lesson_id === args.p_lesson_id), "submitted_at.desc")[0];
      if (!last) return ok(null);
      const { review } = quizReview(args.p_lesson_id, (last.answers as Record<string, string>) || {});
      return ok({ attempt_id: last.id, score: last.score, total_points: last.total_points, passed: last.passed, submitted_at: last.submitted_at, review });
    }

    case "record_lesson_visit": {
      const courseId = courseOfLesson(args.p_lesson_id);
      const enrolment = table("course_enrollments").find((row) => row.student_id === uid && row.course_id === courseId);
      if (!uid || !enrolment) return ok(null);
      const progress = table("student_lesson_progress").find((row) => row.student_id === uid && row.lesson_id === args.p_lesson_id);
      if (progress) { if (args.p_position != null) progress.last_position = args.p_position; }
      else table("student_lesson_progress").push({ id: uuid(), student_id: uid, lesson_id: args.p_lesson_id, is_completed: false, last_position: args.p_position ?? 0, started_at: nowIso(), completed_at: null });
      Object.assign(enrolment, { last_lesson_id: args.p_lesson_id, last_activity_at: nowIso() });
      save();
      return ok(null);
    }

    case "mark_conversation_read": {
      let count = 0;
      table("direct_messages").forEach((row) => {
        if (row.conversation_id === args.p_conversation_id && row.sender_id !== uid && !row.is_read) { row.is_read = true; count++; }
      });
      save();
      return ok(count);
    }

    case "mark_notifications_read": {
      const ids: string[] | null = args.p_ids || null;
      let count = 0;
      table("notifications").forEach((row) => {
        if (row.user_id === uid && !row.read_at && (!ids || ids.includes(String(row.id)))) { row.read_at = nowIso(); count++; }
      });
      save();
      return ok(count);
    }

    case "get_student_pending_instalments": {
      const studentId = args.p_student_id || uid;
      const enrolments = table("student_instalment_enrollments").filter((row) => row.student_id === studentId);
      return ok(enrolments.flatMap((enrolment) => table("instalment_schedules")
        .filter((row) => row.enrollment_id === enrolment.id && row.status !== "paid")
        .map((row) => ({
          schedule_id: row.id, enrollment_id: enrolment.id, course_id: enrolment.course_id,
          course_title: table("courses").find((course) => course.id === enrolment.course_id)?.title || "",
          instalment_number: row.instalment_number, amount: row.amount, currency: enrolment.currency,
          due_date: row.due_date, status: new Date(String(row.due_date)) < new Date() ? "overdue" : "pending",
        }))));
    }

    case "verify_certificate": {
      const code = String(args.p_code || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      const certificate = table("certificates").find((row) => String(row.verification_code) === code);
      if (!certificate) return ok([]);
      const course = table("courses").find((row) => row.id === certificate.course_id);
      return ok([{
        certificate_number: certificate.certificate_number, holder_name: profileName(certificate.student_id), course_title: course?.title || "",
        issued_at: certificate.issued_at, completion_date: certificate.completion_date, is_valid: certificate.status === "approved", status: certificate.status,
      }]);
    }

    case "get_all_profiles":
      return ok(table("profiles"));

    case "get_admin_dashboard_stats": {
      const profiles = table("profiles");
      const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const recent = new Date(Date.now() - 15 * 60_000).toISOString();
      const online = profiles.filter((row) => String(row.last_activity || "") > recent);
      return ok({
        totalUsers: profiles.length,
        totalStudents: profiles.filter((row) => row.role === "student").length,
        totalTeachers: profiles.filter((row) => row.role === "teacher").length,
        pendingTeachers: profiles.filter((row) => row.role === "teacher" && row.teacher_approval_status === "pending").length,
        totalCourses: table("courses").length,
        pendingCourses: table("courses").filter((row) => row.approval_status === "pending").length,
        activeThisWeek: profiles.filter((row) => String(row.last_activity || "") > weekAgo).length,
        suspendedUsers: profiles.filter((row) => row.is_suspended).length,
        onlineStudents: online.filter((row) => row.role === "student").length,
        onlineTeachers: online.filter((row) => row.role === "teacher").length,
        onlineUsers: online.length,
        totalEnrollments: table("course_enrollments").length,
        certificatesIssued: table("certificates").filter((row) => row.status === "approved").length,
      });
    }

    case "get_all_student_progress":
      return ok(table("course_enrollments").map((enrolment) => {
        const student = table("profiles").find((row) => row.id === enrolment.student_id);
        const course = table("courses").find((row) => row.id === enrolment.course_id);
        const lessons = lessonCountFor(enrolment.course_id);
        const ids = new Set(lessons.map((row) => row.id));
        const completed = table("student_lesson_progress").filter((row) => row.student_id === enrolment.student_id && row.is_completed && ids.has(row.lesson_id)).length;
        return {
          student_id: enrolment.student_id, student_name: student?.full_name, student_email: student?.email, student_phone: student?.phone,
          course_id: enrolment.course_id, course_title: course?.title, teacher_name: profileName(course?.teacher_id), enrolled_at: enrolment.enrolled_at,
          total_lessons: lessons.length, completed_lessons: completed,
          progress_percentage: lessons.length ? Math.round((completed / lessons.length) * 100) : 0, last_activity: enrolment.last_activity_at,
        };
      }));

    case "get_activity_logs":
      return ok(applyOrder(table("activity_logs"), "created_at.desc").map((row) => {
        const person = table("profiles").find((profile) => profile.id === row.user_id);
        return { ...row, user_full_name: person?.full_name || "", user_email: person?.email || "" };
      }));

    case "get_instalment_tracker":
      return ok(table("student_instalment_enrollments").map((enrolment) => {
        const schedules = table("instalment_schedules").filter((row) => row.enrollment_id === enrolment.id);
        const pending = schedules.filter((row) => row.status !== "paid");
        return {
          enrollment_id: enrolment.id, student_id: enrolment.student_id, student_name: profileName(enrolment.student_id),
          student_email: table("profiles").find((row) => row.id === enrolment.student_id)?.email,
          course_id: enrolment.course_id, course_title: table("courses").find((row) => row.id === enrolment.course_id)?.title,
          total_amount: enrolment.total_amount, currency: enrolment.currency, status: enrolment.status,
          paid_count: schedules.length - pending.length, pending_count: pending.length,
          overdue_count: pending.filter((row) => new Date(String(row.due_date)) < new Date()).length,
          next_due_date: pending[0]?.due_date ?? null, created_at: enrolment.created_at,
        };
      }));

    case "get_coupon_redemption_stats":
      return ok(table("coupons").map((coupon) => ({
        coupon_id: coupon.id, code: coupon.code, coupon_type: coupon.coupon_type, discount_type: coupon.discount_type,
        discount_value: coupon.discount_value, max_uses: coupon.max_uses, uses_count: coupon.uses_count,
        redemption_count: coupon.uses_count, total_discount: Number(coupon.uses_count) * (coupon.discount_type === "fixed" ? Number(coupon.discount_value) : 5000),
        is_active: coupon.is_active,
      })));

    case "suspend_user": setProfile(args.p_user_id, { is_suspended: true, suspension_reason: args.p_suspension_reason }); return ok(true);
    case "unsuspend_user": setProfile(args.p_user_id, { is_suspended: false, suspension_reason: null }); return ok(true);
    case "approve_teacher":
      setProfile(args.p_teacher_id, { teacher_approved: true, teacher_approval_status: "approved", teacher_approval_date: nowIso(), teacher_approved_by: uid });
      return ok(true);
    case "reject_teacher":
      setProfile(args.p_teacher_id, { teacher_approved: false, teacher_approval_status: "rejected", teacher_rejection_reason: args.p_rejection_reason });
      return ok(true);
    case "update_user_pricing_tier": setProfile(args.p_user_id, { pricing_tier: args.p_pricing_tier }); return ok({ success: true });

    case "approve_scholarship_application":
    case "reject_scholarship_application": {
      const application = table("scholarship_applications").find((row) => row.id === args.p_application_id);
      if (application) {
        const approved = fn === "approve_scholarship_application";
        Object.assign(application, {
          status: approved ? "approved" : "rejected", admin_notes: args.p_admin_notes ?? null, reviewed_at: nowIso(), reviewed_by: uid,
          scholarship_level: args.p_scholarship_level ?? null, discount_percent: args.p_discount_percent ?? null,
          generated_code: approved ? `SCH-${String(application.full_name).split(" ")[0].toUpperCase()}-${args.p_discount_percent || 50}` : null,
        });
        save();
      }
      return ok({ success: true, code: application?.generated_code ?? null });
    }

    case "admin_delete_course": {
      const tables = load();
      tables.courses = table("courses").filter((row) => row.id !== args.p_course_id);
      save();
      return ok(true);
    }

    case "log_activity":
      table("activity_logs").push({ id: uuid(), user_id: args.p_user_id ?? uid, action: args.p_action, entity_type: args.p_entity_type ?? null, entity_id: args.p_entity_id ?? null, details: args.p_details ?? {}, created_at: nowIso() });
      save();
      return ok(uuid());

    case "update_user_activity":
      if (me) { me.last_activity = nowIso(); save(); }
      return ok("ok");

    case "get_unread_announcements_count":
      return ok(table("announcements").filter((row) => row.is_active).length);

    default:
      return ok(null);
  }
}

/* ------------------------------------------------------------------------ */
/* Storage                                                                   */
/* ------------------------------------------------------------------------ */

async function handleStorage(request: Request, url: URL): Promise<Response> {
  const match = url.pathname.match(/^\/storage\/v1\/object\/(?:sign\/|public\/)?([^/]+)\/(.+)$/);
  const path = match ? decodeURIComponent(match[2]) : "";
  if (request.method === "POST" || request.method === "PUT") {
    if (!url.pathname.includes("/sign/")) {
      const blob = await request.blob().catch(() => null);
      if (blob) uploads.set(path, URL.createObjectURL(blob));
      return json({ Key: `${match?.[1]}/${path}`, Id: uuid(), path });
    }
    return json({ signedURL: `/object/public/demo/${path}` });
  }
  if (request.method === "DELETE") return json([]);
  return json({});
}

/* ------------------------------------------------------------------------ */
/* Entry point                                                               */
/* ------------------------------------------------------------------------ */

export async function demoFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = new Request(input, init);
  const url = new URL(request.url);
  // A short pause, so loading states behave as they would online.
  await new Promise((resolve) => setTimeout(resolve, 60 + Math.random() * 120));
  try {
    if (url.pathname.startsWith("/auth/v1")) return await handleAuth(request, url);
    if (url.pathname.startsWith("/rest/v1")) return await handleRest(request, url);
    if (url.pathname.startsWith("/storage/v1")) return await handleStorage(request, url);
    return json({});
  } catch (error) {
    console.error("[demo] request failed", request.method, url.pathname, error);
    return pgError(500, "DEMO", "Demo backend error");
  }
}

/* Helpers for the simulated /api routes (payments, tutor). */
export const demoDb = {
  table,
  save,
  uuid,
  nowIso,
  notify,
  userIdFrom,
  enrol(studentId: string, courseId: unknown, extra: Row = {}) {
    if (!courseId) return;
    const rows = table("course_enrollments");
    if (rows.some((row) => row.student_id === studentId && row.course_id === courseId)) return;
    rows.push(withDefaults("course_enrollments", { student_id: studentId, course_id: courseId, ...extra }));
  },
};
