-- Create analytics_favorites table
CREATE TABLE IF NOT EXISTS analytics_favorites (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  org_id VARCHAR(255) NOT NULL,
  page_name VARCHAR(255) NOT NULL,
  page_title VARCHAR(255) NOT NULL,
  page_description TEXT,
  page_icon VARCHAR(100),
  page_category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, org_id, page_name)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_analytics_favorites_user_org ON analytics_favorites(user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_analytics_favorites_page ON analytics_favorites(page_name);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_analytics_favorites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_analytics_favorites_updated_at
  BEFORE UPDATE ON analytics_favorites
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_favorites_updated_at();
