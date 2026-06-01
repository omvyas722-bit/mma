-- Phase 16: Kiosk mode enhancements - guardian signing for minors

ALTER TABLE member_waivers ADD COLUMN guardian_name TEXT;
ALTER TABLE member_waivers ADD COLUMN guardian_relation TEXT;

CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_member_waivers_signed_at ON member_waivers(signed_at);
