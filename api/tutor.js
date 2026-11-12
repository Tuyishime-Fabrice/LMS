/**
 * AI Tutor.
 *
 * GET  /api/tutor            → { enabled, limit, used } for the signed-in user
 * POST /api/tutor            → streams the tutor's answer as plain text
 *   body: { lessonId, message, language }
 *
 * The conversation is stored in public.tutor_messages (server writes only).
 * History is read from there, never from the browser, and the daily limit
 * per learner is counted from the same table.
 */

import Anthropic from '@anthropic-ai/sdk';
import { verifyAuthUser } from '../server/lib/auth.js';
import { getSupabaseAdmin } from '../server/lib/supabase-payments.js';
import {
    HISTORY_TURNS, TUTOR_INSTRUCTIONS, buildLessonContext, buildMessages, cleanQuestion,
    declinedMessage, isUuid, normalizeLanguage, tutorConfig,
} from '../server/lib/tutor.js';

export const config = { maxDuration: 60 };

const DAY_MS = 24 * 60 * 60 * 1000;

async function questionsToday(supabase, userId) {
    const since = new Date(Date.now() - DAY_MS).toISOString();
    const { count, error } = await supabase.from('tutor_messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId).eq('role', 'user').gte('created_at', since);
    if (error) throw error;
    return count || 0;
}

/** Lesson with its module and course. Objective columns are optional (newer migration). */
async function loadLesson(supabase, lessonId) {
    const query = (lessonColumns, courseColumns) => supabase.from('course_lessons')
        .select(`${lessonColumns}, course_chapters ( id, title, course_id, courses ( ${courseColumns} ) )`)
        .eq('id', lessonId).maybeSingle();
    let result = await query(
        'id, title, description, content_type, chapter_id, learning_objectives',
        'id, title, teacher_id, learning_outcomes',
    );
    if (result.error) {
        result = await query('id, title, description, content_type, chapter_id', 'id, title, teacher_id');
    }
    if (result.error) throw result.error;
    return result.data;
}

async function canUseLesson(supabase, userId, course) {
    if (course.teacher_id === userId) return true;
    const [enrolment, profile] = await Promise.all([
        supabase.from('course_enrollments').select('id').eq('student_id', userId).eq('course_id', course.id).maybeSingle(),
        supabase.from('profiles').select('role, is_suspended').eq('id', userId).maybeSingle(),
    ]);
    if (profile.data?.is_suspended) return false;
    return Boolean(enrolment.data) || profile.data?.role === 'admin';
}

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const settings = tutorConfig();
    const userId = await verifyAuthUser(req);
    if (!userId) return res.status(401).json({ code: 'unauthorized' });

    const supabase = getSupabaseAdmin();
    if (!settings.enabled || !supabase) {
        // No API key (or no database access) on this deployment: the tutor is switched off.
        return req.method === 'GET'
            ? res.status(200).json({ enabled: false, limit: settings.dailyLimit, used: 0 })
            : res.status(503).json({ code: 'not_configured' });
    }

    let used;
    try {
        used = await questionsToday(supabase, userId);
    } catch (error) {
        // The tutor_messages table arrives with its own migration.
        console.error('[tutor] usage lookup failed:', error.message);
        return req.method === 'GET'
            ? res.status(200).json({ enabled: false, limit: settings.dailyLimit, used: 0 })
            : res.status(503).json({ code: 'not_configured' });
    }

    if (req.method === 'GET') {
        return res.status(200).json({ enabled: true, limit: settings.dailyLimit, used });
    }

    const { lessonId, message, language: rawLanguage } = req.body || {};
    const language = normalizeLanguage(rawLanguage);
    const question = cleanQuestion(message);
    if (!isUuid(lessonId) || !question) return res.status(400).json({ code: 'invalid_request' });
    if (used >= settings.dailyLimit) {
        return res.status(429).json({ code: 'daily_limit', limit: settings.dailyLimit });
    }

    let lesson;
    try {
        lesson = await loadLesson(supabase, lessonId);
    } catch (error) {
        console.error('[tutor] lesson lookup failed:', error.message);
        return res.status(500).json({ code: 'server_error' });
    }
    const chapter = lesson?.course_chapters;
    const course = chapter?.courses;
    if (!lesson || !course) return res.status(404).json({ code: 'not_found' });
    if (!(await canUseLesson(supabase, userId, course))) return res.status(403).json({ code: 'forbidden' });

    const [historyResult, siblingsResult, profileResult] = await Promise.all([
        supabase.from('tutor_messages').select('role, content')
            .eq('user_id', userId).eq('lesson_id', lessonId)
            .order('created_at', { ascending: false }).limit(HISTORY_TURNS),
        supabase.from('course_lessons').select('title, order_index').eq('chapter_id', lesson.chapter_id).order('order_index'),
        supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
    ]);
    const history = (historyResult.data || []).reverse();

    // Stored first, so a question counts toward the daily limit even if the answer is cut off.
    const stored = await supabase.from('tutor_messages')
        .insert({ user_id: userId, course_id: course.id, lesson_id: lessonId, role: 'user', content: question })
        .select('id').single();
    if (stored.error) {
        console.error('[tutor] could not store question:', stored.error.message);
        return res.status(500).json({ code: 'server_error' });
    }

    const client = new Anthropic();
    let answer = '';
    let started = false;
    const begin = () => {
        if (started) return;
        started = true;
        res.status(200);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('X-Tutor-Limit', String(settings.dailyLimit));
        res.setHeader('X-Tutor-Used', String(used + 1));
    };

    try {
        const stream = client.beta.messages.stream({
            model: settings.model,
            max_tokens: 8000,
            // Short teaching answers: low effort keeps them quick and inexpensive.
            output_config: { effort: 'low' },
            system: [
                { type: 'text', text: TUTOR_INSTRUCTIONS, cache_control: { type: 'ephemeral' } },
                {
                    type: 'text',
                    text: buildLessonContext({
                        course, chapter, lesson,
                        siblings: siblingsResult.data || [],
                        learnerName: (profileResult.data?.full_name || '').trim().split(/\s+/)[0] || '',
                        language,
                    }),
                },
            ],
            messages: buildMessages(history, question),
            // If a safety classifier declines the request, the API retries it on a fallback model.
            ...(settings.useFallbacks ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}),
        });

        for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                begin();
                answer += event.delta.text;
                res.write(event.delta.text);
            }
        }

        const final = await stream.finalMessage();
        if (final.stop_reason === 'refusal' && !answer.trim()) {
            begin();
            answer = declinedMessage(language);
            res.write(answer);
        }
        begin();

        // Saved before the response closes: serverless functions may be paused once it ends.
        if (answer.trim()) {
            const saved = await supabase.from('tutor_messages').insert({
                user_id: userId, course_id: course.id, lesson_id: lessonId, role: 'assistant', content: answer,
                model: final.model, input_tokens: final.usage?.input_tokens ?? null, output_tokens: final.usage?.output_tokens ?? null,
            });
            if (saved.error) console.error('[tutor] could not store answer:', saved.error.message);
        }
        res.end();
    } catch (error) {
        console.error('[tutor] request failed:', error?.status || '', error?.message || error);
        if (started) {
            // Part of the answer is already on the learner's screen; keep what was written.
            if (answer.trim()) {
                await supabase.from('tutor_messages').insert({
                    user_id: userId, course_id: course.id, lesson_id: lessonId, role: 'assistant', content: answer, model: settings.model,
                });
            }
            res.end();
            return;
        }
        // Nothing was answered, so the question does not count toward today's limit.
        await supabase.from('tutor_messages').delete().eq('id', stored.data.id);
        if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
            return res.status(503).json({ code: 'not_configured' });
        }
        if (error instanceof Anthropic.RateLimitError || (error instanceof Anthropic.APIError && error.status >= 500)) {
            return res.status(503).json({ code: 'busy' });
        }
        if (error instanceof Anthropic.APIConnectionError) {
            return res.status(503).json({ code: 'busy' });
        }
        return res.status(502).json({ code: 'server_error' });
    }
}
