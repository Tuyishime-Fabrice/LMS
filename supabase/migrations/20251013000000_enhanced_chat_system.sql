-- Enhanced Chat System Migration
-- This migration creates a comprehensive chat system with group management,
-- member tracking, message reactions, read receipts, and file attachments

-- Drop existing group_chats and chat_messages tables to recreate with better structure
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.group_chats CASCADE;

-- Create enhanced group_chats table (independent of courses)
CREATE TABLE public.group_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL,
  description TEXT,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  whatsapp_link TEXT,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create group_members table for tracking who's in each group
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_chat_id UUID NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_chat_id, user_id)
);

-- Create enhanced chat_messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_chat_id UUID NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'announcement')),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  reply_to_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create message_reactions table for emoji reactions
CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create message_read_receipts table
CREATE TABLE public.message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_chats
CREATE POLICY "Teachers can view their own groups"
  ON public.group_chats FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Group members can view their groups"
  ON public.group_chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_chat_id = group_chats.id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can create groups"
  ON public.group_chats FOR INSERT
  WITH CHECK (
    auth.uid() = teacher_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
  );

CREATE POLICY "Teachers can update their own groups"
  ON public.group_chats FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own groups"
  ON public.group_chats FOR DELETE
  USING (auth.uid() = teacher_id);

-- RLS Policies for group_members
CREATE POLICY "Group members can view members of their groups"
  ON public.group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_chat_id = group_members.group_chat_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can add members to their groups"
  ON public.group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_chats
      WHERE id = group_chat_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can remove members from their groups"
  ON public.group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_chats
      WHERE id = group_chat_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Members can update their own membership (last_read_at)"
  ON public.group_members FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for chat_messages
CREATE POLICY "Group members can view messages in their groups"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_chat_id = chat_messages.group_chat_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_chat_id = chat_messages.group_chat_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Senders can update their own messages"
  ON public.chat_messages FOR UPDATE
  USING (auth.uid() = sender_id);

CREATE POLICY "Teachers can update messages in their groups (for resolving)"
  ON public.chat_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_chats
      WHERE id = group_chat_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Senders can delete their own messages"
  ON public.chat_messages FOR DELETE
  USING (auth.uid() = sender_id);

-- RLS Policies for message_reactions
CREATE POLICY "Group members can view reactions"
  ON public.message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.group_members gm ON cm.group_chat_id = gm.group_chat_id
      WHERE cm.id = message_reactions.message_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can add reactions"
  ON public.message_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.group_members gm ON cm.group_chat_id = gm.group_chat_id
      WHERE cm.id = message_reactions.message_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own reactions"
  ON public.message_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for message_read_receipts
CREATE POLICY "Group members can view read receipts"
  ON public.message_read_receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.group_members gm ON cm.group_chat_id = gm.group_chat_id
      WHERE cm.id = message_read_receipts.message_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own read receipts"
  ON public.message_read_receipts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_group_chats_teacher_id ON public.group_chats(teacher_id);
CREATE INDEX idx_group_chats_created_at ON public.group_chats(created_at DESC);
CREATE INDEX idx_group_members_group_chat_id ON public.group_members(group_chat_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX idx_chat_messages_group_chat_id ON public.chat_messages(group_chat_id);
CREATE INDEX idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX idx_message_read_receipts_message_id ON public.message_read_receipts(message_id);

-- Add triggers for updated_at
CREATE TRIGGER update_group_chats_updated_at
  BEFORE UPDATE ON public.group_chats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically add teacher as admin when creating group
CREATE OR REPLACE FUNCTION public.add_teacher_as_group_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.group_members (group_chat_id, user_id, role)
  VALUES (NEW.id, NEW.teacher_id, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER add_teacher_as_admin_trigger
  AFTER INSERT ON public.group_chats
  FOR EACH ROW
  EXECUTE FUNCTION public.add_teacher_as_group_admin();

-- Create function to update group updated_at when new message is sent
CREATE OR REPLACE FUNCTION public.update_group_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.group_chats
  SET updated_at = NOW()
  WHERE id = NEW.group_chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_group_on_message_trigger
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_group_on_new_message();

-- Create view for group chat with member count and last message
CREATE OR REPLACE VIEW public.group_chats_with_stats AS
SELECT 
  gc.*,
  COUNT(DISTINCT gm.user_id) as member_count,
  (
    SELECT cm.message_text
    FROM public.chat_messages cm
    WHERE cm.group_chat_id = gc.id
    ORDER BY cm.created_at DESC
    LIMIT 1
  ) as last_message,
  (
    SELECT cm.created_at
    FROM public.chat_messages cm
    WHERE cm.group_chat_id = gc.id
    ORDER BY cm.created_at DESC
    LIMIT 1
  ) as last_message_at
FROM public.group_chats gc
LEFT JOIN public.group_members gm ON gc.id = gm.group_chat_id
GROUP BY gc.id;
