feat: final gap closure — pixel tracking UI + notification system + bulk ops + kids waiver + receipt printing

COMPREHENSIVE CHANGE LOG

NEW: Pixel Tracking Management UI (frontend + backend)
- Added PixelTrackingSettings component in Settings.jsx with create/list/expand/analytics/copy-snippet
- Added migration 034_pixel_config.sql (stores created_by, name, timestamps)
- Added GET /api/pixel/list and POST /api/pixel/create backend endpoints
- Added "Tracking" tab to Settings sidebar navigation

NEW: Kids Waiver Auto-Sign Flow
- Added SEND_PARENT_WAIVER to zeusAgent AGENT_ROUTES, routed to 'messaging'
- Added event processor in messagingAgent.js - generates pending sig tokens, sends email
- Added GET /api/waivers/member/:memberId/pending-parent and resend endpoint
- Updated Waivers.jsx with pending status banners, resend, auto-prompt for minors
- Auto-triggered on member UPDATE when DOB changed to under-18

NEW: Receipt Printing with Email
- Updated POST /api/stock/pos-sale to return transaction_id, member_name, member_email
- ReceiptPreview in POS.jsx shows member name + "Email Receipt" button

NEW: Unified Notification System
- Migration 033 with notifications + notification_preferences tables
- notificationService.js with send/broadcast/markRead/dismiss + email/SMS fallback
- Rewrote routes/notifications.js with pagination, preferences, WebSocket push
- Wired triggers on member create and lead create

NEW: Bulk Operations (Backend + Frontend)
- POST /api/members/bulk-delete, POST /api/members/bulk-update, POST /api/leads/bulk-update
- Leads.jsx bulk selection mode with toggle/checkboxes/action bar (Export/Stage/Delete)

AGENTS.md Updated
- Moved 18 closed gaps to "Gaps Closed by Prior Commits" section
- Full audit: all modules verified, only 3 open items remain
