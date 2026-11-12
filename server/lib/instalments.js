/**
 * Resolve payment for a specific instalment schedule row.
 */

export async function resolveInstalmentSchedulePayment(supabase, { scheduleId, studentId }) {
    const { data: schedule, error } = await supabase
        .from('instalment_schedules')
        .select(
            `
            id,
            amount,
            status,
            instalment_number,
            due_date,
            enrollment:enrollment_id (
                id,
                student_id,
                course_id,
                currency,
                status,
                cohort_id,
                courses:course_id ( title, is_free )
            )
        `,
        )
        .eq('id', scheduleId)
        .maybeSingle();

    if (error || !schedule?.enrollment) {
        throw new Error('Instalment not found');
    }

    const enrollment = schedule.enrollment;
    if (enrollment.student_id !== studentId) {
        throw new Error('Access denied');
    }

    if (enrollment.status !== 'active') {
        throw new Error('Instalment plan is no longer active');
    }

    if (!['pending', 'overdue'].includes(schedule.status)) {
        throw new Error('This instalment has already been paid');
    }

    const amount = Number(schedule.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Invalid instalment amount');
    }

    return {
        amount,
        currency: enrollment.currency || 'RWF',
        courseId: enrollment.course_id,
        cohortId: enrollment.cohort_id || null,
        title: enrollment.courses?.title || 'Course',
        instalmentEnrollmentId: enrollment.id,
        instalmentScheduleId: schedule.id,
        instalmentNumber: schedule.instalment_number,
        paymentTrack: 'instalment',
    };
}
