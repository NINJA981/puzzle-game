-- DECODE v3 Migration — Per-round powerup & hint limits
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS max_powerups int DEFAULT 3;
ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS max_hints int DEFAULT 3;
