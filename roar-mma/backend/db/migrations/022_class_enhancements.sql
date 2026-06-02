-- Phase 22: Class enhancements + UTM fields
ALTER TABLE classes ADD COLUMN min_belt TEXT;
ALTER TABLE classes ADD COLUMN fighter_only INTEGER DEFAULT 0;
ALTER TABLE class_instances ADD COLUMN class_notes TEXT;
ALTER TABLE leads ADD COLUMN utm_source TEXT;
ALTER TABLE leads ADD COLUMN utm_medium TEXT;
ALTER TABLE leads ADD COLUMN utm_campaign TEXT;
