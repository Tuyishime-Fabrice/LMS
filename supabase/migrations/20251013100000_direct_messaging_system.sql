-- Direct Messaging System Migration
-- This creates a 1-on-1 chat system between students and teachers

-- Drop ALL existing chat-related tables
DROP TABLE IF EXISTS public.message_read_receipts CASCADE;
DROP TABLE IF EXISTS public.message_reactions CASCADE;
DROP TABLE IF EXISTS public.direct_messages CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.group_chats CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;

-- Add whatsapp_link to courses table if it doesn't exist
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS whatsapp_link TEXT;

-- Create conversations table (represents a chat between student and teacher)
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, teacher_id)
);

-- Create direct_messages table
CREATE TABLE public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = student_id OR auth.uid() = teacher_id);

CREATE POLICY "Students can create conversations with their teachers"
  ON public.conversations FOR INSERT
  WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (
      SELECT 1 FROM public.course_enrollments ce
      JOIN public.courses c ON ce.course_id = c.id
      WHERE ce.student_id = auth.uid()
      AND c.teacher_id = conversations.teacher_id
    )
  );

-- RLS Policies for direct_messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.direct_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id
      AND (student_id = auth.uid() OR teacher_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON public.direct_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id
      AND (student_id = auth.uid() OR teacher_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.direct_messages FOR UPDATE
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages"
  ON public.direct_messages FOR DELETE
  USING (auth.uid() = sender_id);

-- Create indexes
CREATE INDEX idx_conversations_student_id ON public.conversations(student_id);
CREATE INDEX idx_conversations_teacher_id ON public.conversations(teacher_id);
CREATE INDEX idx_conversations_updated_at ON public.conversations(updated_at DESC);
CREATE INDEX idx_direct_messages_conversation_id ON public.direct_messages(conversation_id);
CREATE INDEX idx_direct_messages_sender_id ON public.direct_messages(sender_id);
CREATE INDEX idx_direct_messages_created_at ON public.direct_messages(created_at DESC);
CREATE INDEX idx_direct_messages_is_read ON public.direct_messages(is_read);

-- Trigger to update conversation updated_at
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update conversation when new message is sent
CREATE OR REPLACE FUNCTION public.update_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_message_trigger
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_on_new_message();

-- View for conversations with last message and unread count
CREATE OR REPLACE VIEW public.conversations_with_details AS
SELECT 
  c.*,
  sp.full_name as student_name,
  sp.avatar_url as student_avatar,
  tp.full_name as teacher_name,
  tp.avatar_url as teacher_avatar,
  (
    SELECT dm.message_text
    FROM public.direct_messages dm
    WHERE dm.conversation_id = c.id
    ORDER BY dm.created_at DESC
    LIMIT 1
  ) as last_message,
  (
    SELECT dm.created_at
    FROM public.direct_messages dm
    WHERE dm.conversation_id = c.id
    ORDER BY dm.created_at DESC
    LIMIT 1
  ) as last_message_at,
  (
    SELECT COUNT(*)
    FROM public.direct_messages dm
    WHERE dm.conversation_id = c.id
    AND dm.is_read = false
    AND dm.sender_id != auth.uid()
  ) as unread_count
FROM public.conversations c
JOIN public.profiles sp ON c.student_id = sp.id
JOIN public.profiles tp ON c.teacher_id = tp.id;

-- View for students to see their teachers with WhatsApp links
CREATE OR REPLACE VIEW public.student_teachers_with_whatsapp AS
SELECT DISTINCT
  p.id as teacher_id,
  p.full_name as teacher_name,
  p.avatar_url as teacher_avatar,
  c.id as course_id,
  c.title as course_name,
  c.whatsapp_link,
  ce.student_id
FROM public.profiles p
JOIN public.courses c ON p.id = c.teacher_id
JOIN public.course_enrollments ce ON c.id = ce.course_id
WHERE p.role = 'teacher';
