-- Fixtures for security_and_certificates.sql. Scratch databases only.
-- Run as the database owner after all migrations.
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.test',   '{"full_name":"Ada Admin","role":"admin"}'),
  ('00000000-0000-0000-0000-00000000000b', 'teacher@example.test', '{"full_name":"Theo Teacher","role":"teacher"}'),
  ('00000000-0000-0000-0000-00000000000c', 'student@example.test', '{"full_name":"Sam Student","role":"student"}'),
  ('00000000-0000-0000-0000-00000000000d', 'second@example.test',  '{"full_name":"Sia Second","role":"student"}');
UPDATE public.profiles SET onboarding_completed = true, teacher_approved = (role = 'teacher')
  WHERE id <> '00000000-0000-0000-0000-00000000000d';

INSERT INTO public.courses (id, title, description, teacher_id, is_free, price, approval_status) VALUES
  ('00000000-0000-0000-0000-0000000000c1', 'Data Analysis', 'Cohort course', '00000000-0000-0000-0000-00000000000b', false, 50000, 'approved'),
  ('00000000-0000-0000-0000-0000000000c2', 'Paid Course',   'Another paid course', '00000000-0000-0000-0000-00000000000b', false, 80000, 'approved'),
  ('00000000-0000-0000-0000-0000000000c3', 'Free Intro',    'Free course', '00000000-0000-0000-0000-00000000000b', true, 0, 'approved');
INSERT INTO public.course_chapters (id, course_id, title, order_index) VALUES
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'Module 1', 0);
INSERT INTO public.course_lessons (id, chapter_id, title, content_type, content_url, order_index) VALUES
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1', 'Welcome', 'video', 'https://youtu.be/x', 0),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000d1', 'Reading', 'pdf', 'https://example.test/a.pdf', 1),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000d1', 'Check', 'quiz', '', 2);
INSERT INTO public.lesson_quiz_questions (id, lesson_id, question_text, options, correct_answer, explanation, order_index, points) VALUES
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e3', 'Q1', '[{"id":"a","text":"A"},{"id":"b","text":"B"}]', 'a', 'Because A', 0, 1),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e3', 'Q2', '[{"id":"a","text":"A"},{"id":"b","text":"B"}]', 'b', 'Because B', 1, 1);
INSERT INTO public.capstone_projects (id, course_id, title, description, instructions) VALUES
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'Capstone', 'Final project', 'Build it');
INSERT INTO public.course_enrollments (student_id, course_id) VALUES
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-0000000000c1');
INSERT INTO public.conversations (id, student_id, teacher_id) VALUES
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b');
INSERT INTO public.direct_messages (conversation_id, sender_id, message_text) VALUES
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', 'Welcome to the course');
INSERT INTO public.cohorts (id, name, course_id, teacher_id) VALUES
  ('00000000-0000-0000-0000-0000000000a9', 'Cohort 1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000b');
INSERT INTO public.cohort_join_requests (cohort_id, student_id) VALUES
  ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-00000000000d');
