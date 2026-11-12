# User Suspension Feature

## Overview
Implemented a complete user suspension system where admins can suspend/unsuspend users, and suspended users see a popup explaining why they're suspended.

## What Was Added

### 1. Database Functions (`20250205000002_suspension_functions.sql`)
- `suspend_user(user_id, reason)` - Suspends a user with a reason
- `unsuspend_user(user_id)` - Unsuspends a user
- Both functions are admin-only and use `SECURITY DEFINER` to bypass RLS
- Prevents suspending admin accounts
- Logs all suspension activities

### 2. Suspension Dialog Component (`SuspensionDialog.tsx`)
- Shows automatically when a suspended user logs in
- Displays the suspension reason in a clear, user-friendly dialog
- Forces user to sign out
- Cannot be dismissed (modal)

### 3. Updated App.tsx
- Added `<SuspensionDialog />` component globally
- Checks suspension status on every page load

### 4. Updated AdminUsers Page
- Added "Suspend" button for active users
- Added "Unsuspend" button for suspended users
- Suspend dialog requires admin to provide a reason
- Cannot suspend admin accounts
- Uses RPC functions for proper permission handling

## How to Use

### For Admins:

1. **Suspend a User:**
   - Go to Admin Panel → Users
   - Find the user you want to suspend
   - Click "Suspend" button
   - Enter a clear reason for suspension
   - Click "Suspend User"

2. **Unsuspend a User:**
   - Go to Admin Panel → Users
   - Find the suspended user (has red "Suspended" badge)
   - Click "Unsuspend" button
   - User can immediately log in again

### For Suspended Users:

1. When they try to log in or use the platform:
   - A popup appears automatically
   - Shows "Account Suspended" message
   - Displays the suspension reason
   - Only option is to sign out

## Database Setup

Run this migration in Supabase SQL Editor:

```sql
-- Copy content from: tutor-space/supabase/migrations/20250205000002_suspension_functions.sql
```

## Features

✅ Admin can suspend any user (except other admins)
✅ Admin must provide a suspension reason
✅ Suspended users see popup with reason
✅ Admin can unsuspend users
✅ All actions are logged in activity_logs
✅ Uses RPC functions to bypass RLS policies
✅ Prevents suspending admin accounts

## Security

- Only admins can suspend/unsuspend users
- Admin accounts cannot be suspended
- All suspension actions are logged
- RPC functions use `SECURITY DEFINER` for proper permissions
- Suspension check happens on every page load
