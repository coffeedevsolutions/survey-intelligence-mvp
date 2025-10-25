-- Add slug column to solutions table for unique URLs
ALTER TABLE solutions ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_solutions_slug ON solutions (slug);

-- Generate slugs for existing solutions
UPDATE solutions 
SET slug = 'solution-' || id 
WHERE slug IS NULL;

-- Add constraint to ensure slug is not null for new solutions
ALTER TABLE solutions ALTER COLUMN slug SET NOT NULL;
