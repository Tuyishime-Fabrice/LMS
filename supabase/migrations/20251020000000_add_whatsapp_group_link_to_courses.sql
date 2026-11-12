-- Add WhatsApp group link column to courses table
-- This allows teachers to link WhatsApp groups to their courses

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS whatsapp_group_link TEXT;

-- Add comment to document the column
COMMENT ON COLUMN public.courses.whatsapp_group_link IS 'WhatsApp group invitation link for course communication';
