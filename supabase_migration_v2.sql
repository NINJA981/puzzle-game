-- DECODE v2 Migration
-- Run this in Supabase Dashboard → SQL Editor

-- ============================================
-- 1. ALTER teams table
-- ============================================
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_eliminated boolean DEFAULT false;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS eliminated_at timestamptz;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS round_start_time timestamptz;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS hints_used_total int DEFAULT 0;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS final_answer_submitted boolean DEFAULT false;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS selected_powerups text[] DEFAULT '{}';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS current_round int DEFAULT 1;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_qualified boolean DEFAULT true;

-- ============================================
-- 2. ALTER clues table
-- ============================================
ALTER TABLE clues ADD COLUMN IF NOT EXISTS hint_1 text DEFAULT '';
ALTER TABLE clues ADD COLUMN IF NOT EXISTS hint_2 text DEFAULT '';
ALTER TABLE clues ADD COLUMN IF NOT EXISTS hint_3 text DEFAULT '';
ALTER TABLE clues ADD COLUMN IF NOT EXISTS image_url text DEFAULT '';

-- Migrate existing hint_text data to hint_1
UPDATE clues SET hint_1 = hint_text WHERE hint_text IS NOT NULL AND hint_text != '' AND (hint_1 IS NULL OR hint_1 = '');

-- ============================================
-- 3. ALTER puzzles table
-- ============================================
ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS time_limit_seconds int DEFAULT 0;
ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS session_id uuid;

-- ============================================
-- 4. CREATE game_sessions table
-- ============================================
CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text DEFAULT 'SETUP',
  current_round int DEFAULT 0,
  total_rounds int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 5. CREATE powerups table
-- ============================================
CREATE TABLE IF NOT EXISTS powerups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL,
  icon text DEFAULT '⚡',
  effect jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 6. CREATE team_powerups table
-- ============================================
CREATE TABLE IF NOT EXISTS team_powerups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  powerup_id uuid REFERENCES powerups(id),
  puzzle_id uuid REFERENCES puzzles(id),
  is_used boolean DEFAULT false,
  used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, powerup_id, puzzle_id)
);

-- ============================================
-- 7. CREATE leaderboard table
-- ============================================
CREATE TABLE IF NOT EXISTS leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  puzzle_id uuid REFERENCES puzzles(id),
  time_seconds int DEFAULT 0,
  hints_used int DEFAULT 0,
  score numeric DEFAULT 0,
  rank int,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, puzzle_id)
);

-- ============================================
-- 8. Seed default powerups
-- ============================================
INSERT INTO powerups (name, slug, description, icon, effect) VALUES
  ('X-Ray', 'xray', 'Reveals one character answer for free', '🔍', '{"type": "reveal_answer"}'),
  ('Time Freeze', 'time_freeze', 'Pauses your timer for 60 seconds', '⏳', '{"type": "pause_timer", "duration": 60}'),
  ('Retry Shield', 'retry_shield', 'Get +1 extra guess on one character', '🔄', '{"type": "extra_try", "amount": 1}'),
  ('Free Hint', 'free_hint', 'Unlock one clue without spending a token', '💡', '{"type": "free_hint"}'),
  ('Speed Boost', 'speed_boost', 'Auto-reveal Clue 1 for all characters', '🏃', '{"type": "auto_reveal_clue1"}'),
  ('Anti-Eliminate', 'anti_eliminate', 'Survive one elimination (auto-revive)', '🛡️', '{"type": "survive_elimination"}'),
  ('Shuffle', 'shuffle', 'Randomize character order for a fresh perspective', '🔀', '{"type": "shuffle_order"}')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 9. Enable RLS policies for new tables
-- ============================================
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE powerups ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_powerups ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Public read for powerups and leaderboard
CREATE POLICY "Public read powerups" ON powerups FOR SELECT USING (true);
CREATE POLICY "Public read leaderboard" ON leaderboard FOR SELECT USING (true);
CREATE POLICY "Public read game_sessions" ON game_sessions FOR SELECT USING (true);
CREATE POLICY "Public read team_powerups" ON team_powerups FOR SELECT USING (true);

-- Service role has full access (via service key in API routes)
