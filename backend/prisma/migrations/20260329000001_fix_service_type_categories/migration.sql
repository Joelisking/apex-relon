-- Move Right-of-Way Engineering, LCRS, and Easement Preparation
-- from Engineering to Surveying project type category.

UPDATE service_types
SET "categoryId" = (
  SELECT id FROM service_categories WHERE name = 'Surveying'
)
WHERE name IN ('Right-of-Way Engineering', 'LCRS', 'Easement Preparation');
