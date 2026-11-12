import { supabase } from "@/integrations/supabase/client";

export type TutorTurn = { id: string; role: "user" | "assistant"; content: string };
export type TutorStatus = { enabled: boolean; limit: number; used: number };
export type TutorErrorCode = "daily_limit" | "not_configured" | "busy" | "forbidden" | "offline" | "server_error";

export class TutorError extends Error {
  constructor(public code: TutorErrorCode, public limit?: number) {
    super(code);
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

/** Whether the tutor is switched on for this deployment, and today's usage. */
export async function fetchTutorStatus(): Promise<TutorStatus> {
  try {
    const response = await fetch("/api/tutor", { headers: await authHeader() });
    if (!response.ok) return { enabled: false, limit: 0, used: 0 };
    const body = await response.json();
    return { enabled: Boolean(body.enabled), limit: Number(body.limit) || 0, used: Number(body.used) || 0 };
  } catch {
    return { enabled: false, limit: 0, used: 0 };
  }
}

/** The learner's earlier conversation on this lesson. */
export async function fetchTutorHistory(userId: string, lessonId: string): Promise<TutorTurn[]> {
  const { data, error } = await supabase.from("tutor_messages")
    .select("id, role, content").eq("user_id", userId).eq("lesson_id", lessonId)
    .order("created_at", { ascending: false }).limit(40);
  if (error) return [];
  return (data || []).reverse();
}

/**
 * Sends a question and streams the answer. `onText` receives the answer so
 * far each time more of it arrives. Resolves with today's usage.
 */
export async function askTutor(
  input: { lessonId: string; message: string; language: string },
  onText: (answerSoFar: string) => void,
): Promise<{ limit: number; used: number }> {
  let response: Response;
  try {
    response = await fetch("/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(input),
    });
  } catch {
    throw new TutorError("offline");
  }

  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => ({}));
    const known: TutorErrorCode[] = ["daily_limit", "not_configured", "busy", "forbidden"];
    throw new TutorError(known.includes(body.code) ? body.code : "server_error", body.limit);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let answer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      answer += decoder.decode(value, { stream: true });
      onText(answer);
    }
  } catch {
    // The connection dropped part-way: keep what arrived.
    if (!answer) throw new TutorError("offline");
  }
  answer += decoder.decode();
  if (answer) onText(answer);
  return {
    limit: Number(response.headers.get("X-Tutor-Limit")) || 0,
    used: Number(response.headers.get("X-Tutor-Used")) || 0,
  };
}
