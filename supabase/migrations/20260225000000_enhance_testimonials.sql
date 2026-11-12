-- Add new columns to testimonials table for enhanced testimonial design
-- Fields: profession/position, programs participated in, career impact

ALTER TABLE testimonials
  ADD COLUMN IF NOT EXISTS profession TEXT,
  ADD COLUMN IF NOT EXISTS programs_participated TEXT,
  ADD COLUMN IF NOT EXISTS career_impact TEXT;

-- Update existing testimonials to use testimonial_text as career_impact if needed
-- (no data migration needed as these are optional fields)
