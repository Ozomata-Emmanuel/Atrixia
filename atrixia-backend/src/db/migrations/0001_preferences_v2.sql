-- Migration: preferences v2
-- Removes budget_min, budget_max columns
-- Adds preferred_marketplaces jsonb column
-- Changes prioritize_price default to false, prioritize_quality default to true

ALTER TABLE "preferences"
  DROP COLUMN IF EXISTS "budget_min",
  DROP COLUMN IF EXISTS "budget_max",
  ADD COLUMN IF NOT EXISTS "preferred_marketplaces" jsonb DEFAULT '[]'::jsonb;

-- Update defaults on existing columns
ALTER TABLE "preferences"
  ALTER COLUMN "prioritize_price" SET DEFAULT false,
  ALTER COLUMN "prioritize_quality" SET DEFAULT true;

-- Backfill existing rows: flip the defaults to match new logic
UPDATE "preferences"
  SET "prioritize_quality" = true,
      "prioritize_price"   = false
  WHERE "prioritize_quality" = false
    AND "prioritize_price" = true;
