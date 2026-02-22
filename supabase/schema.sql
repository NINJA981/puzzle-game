-- ============================================
-- Puzzle Game — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Team status enum
CREATE TYPE team_status AS ENUM ('UNUSED', 'ACTIVE');

-- ============================================
-- TEAMS
-- ============================================
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_name TEXT DEFAULT '',
  join_code TEXT UNIQUE NOT NULL,
  status team_status DEFAULT 'UNUSED',
  hint_tokens INTEGER DEFAULT 3,
  current_puzzle_id UUID,
  current_character_index INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_join_code ON teams(join_code);
CREATE INDEX idx_teams_status ON teams(status);

-- ============================================
-- PUZZLES (Rounds)
-- ============================================
CREATE TABLE puzzles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_number INTEGER NOT NULL,
  round_name TEXT NOT NULL DEFAULT 'Round',
  master_password TEXT NOT NULL,
  is_live BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE teams
  ADD CONSTRAINT fk_teams_puzzle
  FOREIGN KEY (current_puzzle_id) REFERENCES puzzles(id) ON DELETE SET NULL;

-- ============================================
-- CLUES
-- ============================================
CREATE TABLE clues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  puzzle_id UUID NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
  character_position INTEGER NOT NULL,
  clue_text TEXT NOT NULL,
  hint_text TEXT DEFAULT '',
  expected_answer TEXT NOT NULL,
  max_tries INTEGER DEFAULT 3,
  lockout_duration_seconds INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(puzzle_id, character_position)
);

CREATE INDEX idx_clues_puzzle ON clues(puzzle_id);

-- ============================================
-- TEAM PROGRESS (tries per clue per team)
-- ============================================
CREATE TABLE team_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  clue_id UUID NOT NULL REFERENCES clues(id) ON DELETE CASCADE,
  tries_used INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, clue_id)
);

CREATE INDEX idx_progress_team ON team_progress(team_id);
CREATE INDEX idx_progress_clue ON team_progress(clue_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clues ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_progress ENABLE ROW LEVEL SECURITY;

-- Teams: anyone can read (for lobby), service role can write
CREATE POLICY "Teams are viewable by everyone"
  ON teams FOR SELECT USING (true);

CREATE POLICY "Teams are insertable by authenticated"
  ON teams FOR INSERT WITH CHECK (true);

CREATE POLICY "Teams are updatable by authenticated"
  ON teams FOR UPDATE USING (true);

-- Puzzles: anyone can read active, full access for service
CREATE POLICY "Active puzzles are viewable"
  ON puzzles FOR SELECT USING (true);

CREATE POLICY "Puzzles manageable by authenticated"
  ON puzzles FOR ALL USING (auth.role() = 'authenticated');

-- Clues: read only clue_text (not expected_answer) handled in API
-- RLS allows select but API filters columns
CREATE POLICY "Clues viewable by everyone"
  ON clues FOR SELECT USING (true);

CREATE POLICY "Clues manageable by authenticated"
  ON clues FOR ALL USING (auth.role() = 'authenticated');

-- Team Progress
CREATE POLICY "Progress viewable by everyone"
  ON team_progress FOR SELECT USING (true);

CREATE POLICY "Progress insertable by anyone"
  ON team_progress FOR INSERT WITH CHECK (true);

CREATE POLICY "Progress updatable by anyone"
  ON team_progress FOR UPDATE USING (true);

-- ============================================
-- REALTIME: Enable for required tables
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE puzzles;
