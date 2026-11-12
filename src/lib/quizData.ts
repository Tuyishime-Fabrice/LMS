import { z } from "zod";

export const quizOptionsSchema = z.array(z.object({ id: z.string(), text: z.string() }));
export const lessonContentTypeSchema = z.enum(["video", "pdf", "document", "url", "quiz", "assignment"]);

export function parseQuizOptions(value: unknown): { id: string; text: string }[] {
  return quizOptionsSchema.parse(value).map(option => ({ id: option.id, text: option.text }));
}
