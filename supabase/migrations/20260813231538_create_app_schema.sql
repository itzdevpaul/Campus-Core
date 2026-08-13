/*
# Create profiles, posts, and invites tables with RLS

## Overview
This migration creates the core schema for a multi-user app with:
- User profiles (auto-created on signup, store invite codes and premium status)
- Posts (user-generated content, owner-scoped CRUD)
- Invite tracking (records who invited whom, used for the "invite 10 to earn premium" feature)

## Tables

### profiles
- `id` (uuid, PK, references auth.users) — one row per user
- `username` (text, unique) — display name
- `invite_code` (text, unique) — unique 8-char code generated on signup
- `premium_until` (timestamptz, nullable) — if set and in the future, user has premium
- `invited_by` (text, nullable) — the invite code of the person who invited them
- `created_at` (timestamptz)

### posts
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid()) — owner of the post
- `title` (text, NOT NULL)
- `content` (text, NOT NULL)
- `created_at` (timestamptz)

### invites
- `id` (uuid, PK)
- `inviter_id` (uuid, NOT NULL, references profiles) — who sent the invite
- `invited_id` (uuid, NOT NULL, references profiles) — who was invited
- `created_at` (timestamptz)

## Security
- RLS enabled on all tables.
- profiles: users can read their own profile and update it; anyone authenticated can read profiles (to look up invite codes).
- posts: full CRUD scoped to owner (auth.uid() = user_id). SELECT is open to all authenticated users (posts are a shared feed).
- invites: users can read their own invite records (as inviter). Insert is done via a SECURITY DEFINER function to prevent fraud.

## Notes
1. A trigger auto-creates a profile row when a new auth user signs up.
2. The invite code is generated randomly and stored uniquely.
3. A SECURITY DEFINER function `process_invite` handles invite credit safely — it verifies the invite code, links the new user, and grants premium when 10 invites are reached.
*/

-- ===== PROFILES =====
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL DEFAULT 'Anonymous',
  invite_code text UNIQUE NOT NULL DEFAULT upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  premium_until timestamptz,
  invited_by text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read all profiles (needed to look up invite codes and display names)
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all"
ON profiles FOR SELECT
TO authenticated USING (true);

-- Users can update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ===== POSTS =====
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read posts (shared feed)
DROP POLICY IF EXISTS "posts_select_all" ON posts;
CREATE POLICY "posts_select_all"
ON posts FOR SELECT
TO authenticated USING (true);

-- Only owner can insert their own posts
DROP POLICY IF EXISTS "posts_insert_own" ON posts;
CREATE POLICY "posts_insert_own"
ON posts FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

-- Only owner can update their own posts
DROP POLICY IF EXISTS "posts_update_own" ON posts;
CREATE POLICY "posts_update_own"
ON posts FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Only owner can delete their own posts
DROP POLICY IF EXISTS "posts_delete_own" ON posts;
CREATE POLICY "posts_delete_own"
ON posts FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- ===== INVITES =====
CREATE TABLE IF NOT EXISTS invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (inviter_id, invited_id)
);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Users can read invites where they are the inviter
DROP POLICY IF EXISTS "invites_select_own" ON invites;
CREATE POLICY "invites_select_own"
ON invites FOR SELECT
TO authenticated USING (auth.uid() = inviter_id);

-- ===== SECURITY DEFINER: process_invite =====
-- Safely links a new user to their inviter and grants premium at 10 invites.
-- Runs as the DB owner so it can write to invites and update profiles.premium_until.
DROP FUNCTION IF EXISTS process_invite(text);

CREATE OR REPLACE FUNCTION process_invite(p_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inviter profiles%ROWTYPE;
  v_self_id uuid := auth.uid();
  v_self_profile profiles%ROWTYPE;
  v_count integer;
  v_already_invited boolean;
BEGIN
  -- Must be authenticated
  IF v_self_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Load own profile
  SELECT * INTO v_self_profile FROM profiles WHERE id = v_self_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;

  -- Can't use own invite code
  IF v_self_profile.invite_code = p_invite_code THEN
    RETURN jsonb_build_object('error', 'Cannot use your own invite code');
  END IF;

  -- Already linked to an inviter?
  IF v_self_profile.invited_by IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Already invited', 'invited_by', v_self_profile.invited_by);
  END IF;

  -- Find inviter by code
  SELECT * INTO v_inviter FROM profiles WHERE invite_code = p_invite_code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid invite code');
  END IF;

  -- Check not already in invites table
  SELECT EXISTS(SELECT 1 FROM invites WHERE inviter_id = v_inviter.id AND invited_id = v_self_id) INTO v_already_invited;
  IF v_already_invited THEN
    RETURN jsonb_build_object('error', 'Already linked to this inviter');
  END IF;

  -- Link the new user
  UPDATE profiles SET invited_by = p_invite_code WHERE id = v_self_id;

  -- Create invite record
  INSERT INTO invites (inviter_id, invited_id) VALUES (v_inviter.id, v_self_id);

  -- Count inviter's total invites
  SELECT count(*) INTO v_count FROM invites WHERE inviter_id = v_inviter.id;

  -- Grant premium for 1 week if 10 invites reached
  IF v_count >= 10 THEN
    UPDATE profiles
    SET premium_until = GREATEST(COALESCE(premium_until, now()), now()) + interval '7 days'
    WHERE id = v_inviter.id
    AND (premium_until IS NULL OR premium_until < now());
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'inviter', v_inviter.username,
    'invite_count', v_count,
    'premium_granted', v_count >= 10
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION process_invite(text) TO authenticated;

-- ===== TRIGGER: auto-create profile on signup =====
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'Anonymous'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_invites_inviter_id ON invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_profiles_invite_code ON profiles(invite_code);
