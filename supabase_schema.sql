-- Neural Nexus: Supabase Database Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

-- 1. Profiles table (stores user progression)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Lifelong Learner',
  synapses INTEGER NOT NULL DEFAULT 0,
  mastery_cores INTEGER NOT NULL DEFAULT 0,
  player_level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Saved Levels table (stores completed game levels)
CREATE TABLE IF NOT EXISTS saved_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  game_type TEXT NOT NULL,
  level_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_saved_levels_user ON saved_levels(user_id);

-- 3. Row Level Security (RLS) - users can only access their own data
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_levels ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read and update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Saved Levels: users can CRUD their own saved levels
CREATE POLICY "Users can view own levels"
  ON saved_levels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own levels"
  ON saved_levels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own levels"
  ON saved_levels FOR DELETE
  USING (auth.uid() = user_id);
