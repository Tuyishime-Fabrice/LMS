-- Create testimonials table for admin-managed student testimonials
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  student_image_url TEXT,
  testimonial_text TEXT NOT NULL,
  rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  course_name TEXT,
  is_featured BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON testimonials(is_featured);
CREATE INDEX IF NOT EXISTS idx_testimonials_order ON testimonials(display_order);

-- Enable RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view testimonials
CREATE POLICY "Anyone can view testimonials"
  ON testimonials FOR SELECT
  USING (true);

-- Policy: Only admins can insert testimonials
CREATE POLICY "Admins can insert testimonials"
  ON testimonials FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can update testimonials
CREATE POLICY "Admins can update testimonials"
  ON testimonials FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can delete testimonials
CREATE POLICY "Admins can delete testimonials"
  ON testimonials FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create storage bucket for testimonial images if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('testimonial-images', 'testimonial-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for testimonial images
CREATE POLICY "Anyone can view testimonial images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'testimonial-images');

CREATE POLICY "Admins can upload testimonial images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'testimonial-images'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete testimonial images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'testimonial-images'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_testimonials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_testimonials_updated_at ON testimonials;
CREATE TRIGGER trigger_update_testimonials_updated_at
  BEFORE UPDATE ON testimonials
  FOR EACH ROW
  EXECUTE FUNCTION update_testimonials_updated_at();
