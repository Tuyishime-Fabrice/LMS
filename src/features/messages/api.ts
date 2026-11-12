import { supabase } from "@/integrations/supabase/client";

export type MessageRole = "student" | "teacher";

export type Thread = {
  /** Null until the first message is sent. */
  conversationId: string | null;
  peerId: string;
  peerName: string;
  peerAvatar: string | null;
  /** Courses the two people share. */
  courses: string[];
  lastMessage: string | null;
  lastAt: string | null;
  lastFromMe: boolean;
  unread: number;
};

export type CourseGroup = { courseId: string; title: string; link: string };

export type Message = { id: string; senderId: string; text: string; createdAt: string };

export type Inbox = { threads: Thread[]; groups: CourseGroup[] };

/**
 * Everyone the user can write to (instructors of their courses, or learners in
 * the courses they teach), with the latest message of each conversation.
 */
export async function fetchInbox(userId: string, role: MessageRole): Promise<Inbox> {
  const mine = role === "student" ? "student_id" : "teacher_id";
  const theirs = role === "student" ? "teacher_id" : "student_id";
  const sharedCourses = new Map<string, Set<string>>();
  const groups: CourseGroup[] = [];
  const share = (peerId: string | null | undefined, title: string) => {
    if (!peerId || peerId === userId) return;
    if (!sharedCourses.has(peerId)) sharedCourses.set(peerId, new Set());
    sharedCourses.get(peerId)!.add(title);
  };

  if (role === "student") {
    const { data, error } = await supabase.from("course_enrollments")
      .select("courses ( id, title, teacher_id, whatsapp_group_link )").eq("student_id", userId);
    if (error) throw error;
    (data || []).forEach((row) => {
      const course = row.courses as { id: string; title: string; teacher_id: string; whatsapp_group_link: string | null } | null;
      if (!course) return;
      share(course.teacher_id, course.title);
      if (course.whatsapp_group_link) groups.push({ courseId: course.id, title: course.title, link: course.whatsapp_group_link });
    });
  } else {
    const { data: courses, error } = await supabase.from("courses").select("id, title").eq("teacher_id", userId);
    if (error) throw error;
    const titles = new Map((courses || []).map((course) => [course.id, course.title]));
    if (titles.size > 0) {
      const enrolments = await supabase.from("course_enrollments").select("student_id, course_id").in("course_id", [...titles.keys()]);
      if (enrolments.error) throw enrolments.error;
      (enrolments.data || []).forEach((row) => share(row.student_id, titles.get(row.course_id) || ""));
    }
  }

  const conversations = await supabase.from("conversations")
    .select("id, student_id, teacher_id, direct_messages ( message_text, created_at, is_read, sender_id )")
    .eq(mine, userId);
  if (conversations.error) throw conversations.error;

  const peerIds = new Set<string>(sharedCourses.keys());
  (conversations.data || []).forEach((row) => peerIds.add(row[theirs]));
  if (peerIds.size === 0) return { threads: [], groups };

  const profiles = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", [...peerIds]);
  if (profiles.error) throw profiles.error;
  const people = new Map((profiles.data || []).map((person) => [person.id, person]));

  const threads: Thread[] = [...peerIds].map((peerId) => {
    const conversation = (conversations.data || []).find((row) => row[theirs] === peerId);
    const messages = [...(conversation?.direct_messages || [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const last = messages[0];
    return {
      conversationId: conversation?.id || null,
      peerId,
      peerName: people.get(peerId)?.full_name || "",
      peerAvatar: people.get(peerId)?.avatar_url || null,
      courses: [...(sharedCourses.get(peerId) || [])].filter(Boolean),
      lastMessage: last?.message_text || null,
      lastAt: last?.created_at || null,
      lastFromMe: last?.sender_id === userId,
      unread: messages.filter((message) => !message.is_read && message.sender_id !== userId).length,
    };
  });

  // Unread first, then the most recent conversation, then people not yet written to.
  threads.sort((a, b) => {
    if (Boolean(a.unread) !== Boolean(b.unread)) return a.unread ? -1 : 1;
    if (a.lastAt && b.lastAt) return b.lastAt.localeCompare(a.lastAt);
    if (a.lastAt) return -1;
    if (b.lastAt) return 1;
    return a.peerName.localeCompare(b.peerName);
  });
  return { threads, groups };
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase.from("direct_messages")
    .select("id, sender_id, message_text, created_at")
    .eq("conversation_id", conversationId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => ({ id: row.id, senderId: row.sender_id, text: row.message_text, createdAt: row.created_at }));
}

/** Sends a message, opening the conversation first when it does not exist. Returns the conversation id. */
export async function sendMessage(thread: Thread, userId: string, role: MessageRole, text: string): Promise<string> {
  let conversationId = thread.conversationId;
  if (!conversationId) {
    const pair = role === "student"
      ? { student_id: userId, teacher_id: thread.peerId }
      : { student_id: thread.peerId, teacher_id: userId };
    const created = await supabase.from("conversations").insert(pair).select("id").single();
    if (created.error) {
      // The other person may have opened it a moment ago.
      const existing = await supabase.from("conversations").select("id")
        .eq("student_id", pair.student_id).eq("teacher_id", pair.teacher_id).maybeSingle();
      if (existing.error || !existing.data) throw created.error;
      conversationId = existing.data.id;
    } else {
      conversationId = created.data.id;
    }
  }
  const { error } = await supabase.from("direct_messages")
    .insert({ conversation_id: conversationId, sender_id: userId, message_text: text });
  if (error) throw error;
  return conversationId;
}

export async function markConversationRead(conversationId: string) {
  await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
}
