-- Create partner_requests table for partnership inquiries
CREATE TABLE IF NOT EXISTS partner_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  organization TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_partner_requests_status ON partner_requests(status);
CREATE INDEX IF NOT EXISTS idx_partner_requests_created ON partner_requests(created_at DESC);

-- Enable RLS
ALTER TABLE partner_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert partner requests (public form)
CREATE POLICY "Anyone can submit partner requests"
  ON partner_requests FOR INSERT
  WITH CHECK (true);

-- Policy: Only admins can view partner requests
CREATE POLICY "Admins can view partner requests"
  ON partner_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can update partner requests
CREATE POLICY "Admins can update partner requests"
  ON partner_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can delete partner requests
CREATE POLICY "Admins can delete partner requests"
  ON partner_requests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_partner_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_partner_requests_updated_at ON partner_requests;
CREATE TRIGGER trigger_update_partner_requests_updated_at
  BEFORE UPDATE ON partner_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_partner_requests_updated_at();
