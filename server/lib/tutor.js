/**
 * AI Tutor helpers: configuration, input checks and the prompt.
 * Kept free of network calls so they can be unit-tested.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MAX_QUESTION_CHARS = 2000;
/** Earlier turns sent back to the model with each question. */
export const HISTORY_TURNS = 12;

/** Models that accept the server-side refusal fallback. */
const FALLBACK_MODELS = new Set([
    'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5',
    'claude-fable-5-2', 'claude-fable-5-1',
]);

export function tutorConfig(env = process.env) {
    const limit = Number.parseInt(env.TUTOR_DAILY_LIMIT || '', 10);
    const model = (env.TUTOR_MODEL || '').trim() || 'claude-opus-5-5';
    return {
        enabled: Boolean(env.ANTHROPIC_API_KEY),
        model,
        dailyLimit: Number.isFinite(limit) && limit > 0 ? limit : 30,
        useFallbacks: FALLBACK_MODELS.has(model),
    };
}

export function isUuid(value) {
    return typeof value === 'string' && UUID.test(value);
}

/** Returns the trimmed question, or null when it is empty or too long. */
export function cleanQuestion(value) {
    if (typeof value !== 'string') return null;
    const text = value.replace(/\u0000/g, '').trim();
    if (!text || text.length > MAX_QUESTION_CHARS) return null;
    return text;
}

export function normalizeLanguage(value) {
    return typeof value === 'string' && value.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

/**
 * Turns stored rows (oldest first) plus the new question into the message
 * list for the API: the last HISTORY_TURNS rows, starting on a learner turn,
 * with consecutive same-role rows merged (an answer can be missing if a
 * request was cut off).
 */
export function buildMessages(history, question) {
    const recent = (history || []).filter((row) => row && (row.role === 'user' || row.role === 'assistant') && row.content)
        .slice(-HISTORY_TURNS);
    while (recent.length && recent[0].role !== 'user') recent.shift();
    const messages = [];
    for (const row of [...recent, { role: 'user', content: question }]) {
        const last = messages[messages.length - 1];
        if (last && last.role === row.role) last.content += `\n\n${row.content}`;
        else messages.push({ role: row.role, content: row.content });
    }
    return messages;
}

/**
 * What the tutor is, who it is talking to and how to behave. This part is
 * the same for every learner and lesson, so it comes first and can be cached.
 */
export const TUTOR_INSTRUCTIONS = `You are the AI tutor inside DataPlus Academy, an online academy that teaches practical data skills (spreadsheets, data analysis, visualisation, SQL, Python, statistics, reporting) to learners in Rwanda and across Francophone Africa.

Who you are talking to: a learner who is inside a lesson and has opened the help panel. Many learners are working adults or students, often on a phone with a slow or expensive connection, and English or French may be their second or third language. They are capable people who are new to this subject.

What you can see: the course, module and lesson titles, the lesson description and objectives when the instructor wrote them, and this conversation. You cannot see the lesson video, the PDF, the quiz questions or the learner's files. When a question depends on exactly what the video or document says, say that you cannot see it, then either explain the underlying idea or ask the learner to paste the part they are stuck on.

How to help:
- Start from what the learner asked. Explain the idea in plain words, then show one small worked example with concrete numbers. A single clear example teaches more than a long explanation.
- Keep answers short enough to read comfortably on a phone, usually a few short paragraphs. If the topic is large, give the core idea and offer to go deeper.
- Examples from everyday life in the region (a shop's sales, mobile money transactions, harvest yields, school fees, a clinic's patient counts) often land better than abstract ones. Use them when they fit and do not force them.
- When the learner seems confused, check one thing at a time with a short question instead of repeating the same explanation.
- If you are not sure of something, say so. Do not invent facts about this course, such as dates, rules, prices or what the instructor said.

Graded work: quizzes, assignments and the capstone project are graded and count toward the learner's certificate, so the work handed in has to be their own. When a question is about graded work, teach instead of answering: explain the concept, work through a similar example with different data, give a hint for the next step, or review reasoning the learner shows you. Do not write the answer or the deliverable for them. If they ask why, tell them plainly.

Outside your role: you have no access to grades, deadlines, payments, certificates or account details. For those, point the learner to their instructor (the Messages page) or to the Academy. If a request has nothing to do with learning data skills or studying, say briefly that you are here for the course and offer to help with the lesson.

Language: answer in the language the learner writes in, whether English, French or another language you can write well. If their message does not make the language clear, use the interface language given below. Use simple, correct wording and avoid idioms that do not translate.

Format: the chat shows plain text. Do not use Markdown headings, bold, tables or code fences. Short paragraphs, simple numbered steps and "- " lists are fine. Put a formula or a line of code on its own line.`;

const lessonTypeLabels = {
    video: 'video', pdf: 'PDF reading', document: 'document', url: 'web resource',
    quiz: 'graded quiz', assignment: 'graded assignment',
};

/** The part of the prompt that changes with the lesson and the learner. */
export function buildLessonContext({ course, chapter, lesson, siblings, learnerName, language }) {
    const lines = [
        'Where the learner is right now:',
        `Course: ${course?.title || 'unknown'}`,
    ];
    if (chapter?.title) lines.push(`Module: ${chapter.title}`);
    if (lesson?.title) {
        const type = lessonTypeLabels[lesson.content_type] || lesson.content_type || 'lesson';
        lines.push(`Lesson: ${lesson.title} (${type})`);
    }
    if (lesson?.description) lines.push(`Lesson description: ${String(lesson.description).slice(0, 1500)}`);
    const objectives = (lesson?.learning_objectives || []).filter(Boolean);
    if (objectives.length) lines.push(`Lesson objectives: ${objectives.join('; ')}`);
    const outcomes = (course?.learning_outcomes || []).filter(Boolean);
    if (outcomes.length) lines.push(`Course outcomes: ${outcomes.join('; ')}`);
    const titles = (siblings || []).map((item) => item.title).filter(Boolean);
    if (titles.length > 1) lines.push(`Lessons in this module, in order: ${titles.join(' | ')}`);
    if (lesson?.content_type === 'quiz' || lesson?.content_type === 'assignment') {
        lines.push('This lesson is graded work, so teach the idea and do not give the answer to hand in.');
    }
    if (learnerName) lines.push(`Learner's first name: ${learnerName}`);
    lines.push(`Interface language: ${language === 'fr' ? 'French' : 'English'}`);
    return lines.join('\n');
}

/** Shown when the model declines to answer. */
export function declinedMessage(language) {
    return language === 'fr'
        ? "Je ne peux pas vous aider sur ce point. Posez-moi une question sur la leçon, ou écrivez à votre formateur depuis la page Messages."
        : 'I can\'t help with that one. Ask me about the lesson, or write to your instructor from the Messages page.';
}
