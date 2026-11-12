-- Add onboarding fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS organization TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS job_role TEXT,
ADD COLUMN IF NOT EXISTS interests TEXT[],
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add comment to explain the columns
COMMENT ON COLUMN profiles.phone IS 'User phone number';
COMMENT ON COLUMN profiles.organization IS 'User organization name';
COMMENT ON COLUMN profiles.industry IS 'User industry sector';
COMMENT ON COLUMN profiles.job_role IS 'User job role or position';
COMMENT ON COLUMN profiles.interests IS 'Array of user learning interests';
COMMENT ON COLUMN profiles.onboarding_completed IS 'Whether user has completed onboarding';
