# Onboarding System Setup Guide

## Overview
The onboarding system allows new users to complete their profile after signing up, including:
- Personal information (first name, last name, phone)
- Avatar selection from 14 available avatars
- Organization details (name, industry, role)
- Learning interests selection

## Database Migration

### Apply the Migration
Run the following SQL in your Supabase SQL Editor:

```sql
-- Add onboarding fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS organization TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS job_role TEXT,
ADD COLUMN IF NOT EXISTS interests TEXT[],
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
```

Or use the Supabase CLI:
```bash
supabase db push
```

## Features

### Step 1: Profile & Avatar
- First name and last name input
- Phone number input
- Avatar selection from 14 avatars in `/images/avators/`
- Visual feedback for selected avatar

### Step 2: Organization
- Organization name
- Industry selection (10 options)
- Job role/position

### Step 3: Interests
- Multiple selection of learning interests:
  - Data Analyst
  - AI
  - Programming
  - Marketing
  - Accounting
  - Startup Courses
  - Tax
  - Product Management
  - Business Management

## User Flow

1. User signs up via `/signup`
2. After successful signup, redirected to `/onboarding`
3. Complete 3-step onboarding process
4. Data saved to `profiles` table
5. Redirected to appropriate dashboard (student/teacher)

## Routes

- `/onboarding` - Main onboarding route
- `/student/onboarding` - Alternative route (same component)

## Data Storage

All onboarding data is stored in the `profiles` table:
- `full_name` - Combined first and last name
- `avatar_url` - Selected avatar path
- `phone` - Phone number
- `organization` - Organization name
- `industry` - Selected industry
- `job_role` - User's role
- `interests` - Array of selected interests
- `onboarding_completed` - Boolean flag

## Available Avatars

Located in `/images/avators/`:
1. 1.webp
2. 2.webp
3. 3.webp
4. 4 (1).webp
5. 5.webp
6. 6.webp
7. 7.webp
8. 8.webp
9. 9.webp
10. 10.webp
11. woman.webp
12. hacker.webp
13. 3d-rendering-zoom-call-avatar.webp
14. androgynous-avatar-non-binary-queer-person.webp

## Styling

- Green theme matching DataPlus Labs branding (#006d2c)
- Left sidebar with step indicators
- Responsive design
- Smooth transitions between steps
- Visual feedback for selections

## Future Enhancements

- Add more avatar options
- Allow custom avatar upload
- Add more interest categories
- Add skip option for optional fields
- Add progress persistence (save draft)
