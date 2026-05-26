# ROAR MMA Management System - API Documentation

## Base URL
```
http://localhost:3001/api
```

## Authentication

All endpoints (except public unsubscribe) require JWT authentication.

**Login:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@roarmma.com.au",
  "password": "password"
}

Response:
{
  "token": "eyJhbGc...",
  "user": { "id": 1, "name": "Admin", "role": "admin" }
}
```

**Use token in headers:**
```http
Authorization: Bearer eyJhbGc...
```

---

## 1. Members

### List Members
```http
GET /api/members
```

### Get Member
```http
GET /api/members/:id
```

### Create Member
```http
POST /api/members
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Smith",
  "email": "john@email.com",
  "phone": "0412345678",
  "date_of_birth": "1990-01-01",
  "membership_type": "unlimited",
  "status": "active"
}
```

---

## 2. Leads

### List Leads
```http
GET /api/leads?stage=new&source=website
```

### Create Lead
```http
POST /api/leads
Content-Type: application/json

{
  "first_name": "Jane",
  "last_name": "Doe",
  "phone": "0498765432",
  "email": "jane@email.com",
  "source": "website",
  "interest_level": "high"
}
```

### Update Lead
```http
PUT /api/leads/:id
Content-Type: application/json

{
  "stage": "trial_booked",
  "trial_date": "2026-05-10",
  "trial_interest_level": "very_interested"
}
```

### Schedule Trial Follow-ups
```http
POST /api/leads/:id/schedule-trial-followups
Content-Type: application/json

{
  "trial_date": "2026-05-10T10:00:00Z"
}
```

### Get Lead Score
```http
GET /api/lead-scoring/score-breakdown/:leadId

Response:
{
  "lead_id": 1,
  "total_score": 85,
  "breakdown": {
    "source_score": 30,
    "stage_score": 25,
    "interest_score": 20,
    "experience_score": 10
  },
  "priority": "high"
}
```

### Get High Priority Leads
```http
GET /api/lead-scoring/high-priority

Response: [
  {
    "id": 1,
    "name": "Jane Doe",
    "score": 85,
    "stage": "trial_booked"
  }
]
```

---

## 3. Trial Analytics

### Get Conversion Stats
```http
GET /api/trial-analytics/conversion-stats?date_from=2026-05-01&date_to=2026-05-31

Response:
{
  "by_interest": [
    { "interest_level": "very_interested", "total": 10, "converted": 8, "rate": 80 }
  ],
  "by_experience": [...],
  "by_class_type": [...]
}
```

---

## 4. Staff Tasks

### List Tasks
```http
GET /api/staff-tasks?status=pending&assigned_to=1
```

### Create Task
```http
POST /api/staff-tasks
Content-Type: application/json

{
  "task_type": "call_hot_lead",
  "lead_id": 1,
  "assigned_to": 2,
  "due_date": "2026-05-10",
  "priority": "high",
  "description": "Call hot lead - score 85"
}
```

### Complete Task
```http
POST /api/staff-tasks/:id/complete
Content-Type: application/json

{
  "completion_notes": "Called and booked trial for Friday"
}
```

---

## 5. PT Sessions

### List PT Sessions
```http
GET /api/pt-sessions?coach_id=1&status=scheduled
```

### Book PT Session
```http
POST /api/pt-sessions
Content-Type: application/json

{
  "member_id": 1,
  "coach_id": 2,
  "session_date": "2026-05-10",
  "session_time": "14:00",
  "duration_minutes": 60,
  "session_type": "pt",
  "amount": 80.00,
  "package_id": 1
}
```

### Complete PT Session
```http
POST /api/pt-sessions/:id/complete
Content-Type: application/json

{
  "notes": "Great session, worked on technique"
}

Response includes auto-calculated commission
```

### Get Coach Stats
```http
GET /api/pt-sessions/coach-stats/:coachId?date_from=2026-05-01&date_to=2026-05-31

Response:
{
  "sessions_completed": 20,
  "total_revenue": 1600,
  "commission_earned": 800,
  "completion_rate": 95,
  "avg_session_value": 80
}
```

---

## 6. Staff Performance

### Get Staff Performance
```http
GET /api/staff-performance/:staffId?date_from=2026-05-01&date_to=2026-05-31

Response:
{
  "trials_booked": 15,
  "signups": 8,
  "pt_sessions_sold": 12,
  "pt_revenue": 960,
  "tasks_completed": 45,
  "avg_response_time_hours": 0.5,
  "trial_conversion_rate": 53
}
```

### Get Leaderboard
```http
GET /api/staff-performance/leaderboard/signups?date_from=2026-05-01

Response: [
  {
    "rank": 1,
    "staff_id": 2,
    "staff_name": "Sarah Coach",
    "metrics": { "signups": 12 }
  }
]
```

### Get Staff Achievements
```http
GET /api/staff-performance/:staffId/achievements

Response: [
  {
    "badge": "🏆",
    "title": "Signup Champion",
    "description": "12 signups this period"
  }
]
```

---

## 7. Retention

### Create Cancellation Request
```http
POST /api/retention/cancellation-requests
Content-Type: application/json

{
  "member_id": 1,
  "cancellation_reason": "Moving to another city",
  "reason_category": "moving"
}

Response includes auto-generated retention offers
```

### Get Cancellation Request
```http
GET /api/retention/cancellation-requests/:id

Response:
{
  "id": 1,
  "member_id": 1,
  "reason_category": "moving",
  "status": "pending",
  "offers": [
    {
      "offer_type": "pause",
      "pause_months": 12,
      "status": "pending"
    }
  ]
}
```

### Accept Retention Offer
```http
POST /api/retention/retention-offers/:offerId/accept
Content-Type: application/json

{
  "member_id": 1
}

Auto-applies offer (pause, discount, etc.)
```

### Process Final Cancellation
```http
POST /api/retention/cancellation-requests/:id/process

Creates win-back campaign automatically
```

### Get Win-back Campaigns
```http
GET /api/retention/winback-campaigns

Response: [
  {
    "member_id": 1,
    "campaign_type": "immediate",
    "status": "active",
    "messages_sent": 1,
    "special_offer": { "type": "discount", "value": 25 }
  }
]
```

### Get Retention Analytics
```http
GET /api/retention/analytics?date_from=2026-05-01

Response:
{
  "total_requests": 10,
  "retained_count": 3,
  "cancelled_count": 7,
  "retention_rate": 30,
  "offer_acceptance_rate": 60,
  "reasons": [...]
}
```

---

## 8. Phone Calls

### List Recent Calls
```http
GET /api/phone/calls?limit=50
```

### Get Call with Transcript
```http
GET /api/phone/calls/:id

Response:
{
  "id": 1,
  "from_number": "+61412345678",
  "status": "completed",
  "duration": 180,
  "call_type": "trial_inquiry",
  "transcript": [
    { "speaker": "caller", "message": "I want to try a class" },
    { "speaker": "ai", "message": "Great! What's your name?" }
  ]
}
```

### Get Calls Requiring Followup
```http
GET /api/phone/calls/followup/pending
```

### Get Call Analytics
```http
GET /api/phone/analytics?date_from=2026-05-01

Response:
{
  "total_calls": 50,
  "ai_handled": 35,
  "staff_handled": 15,
  "trials_booked": 8,
  "leads_created": 12,
  "avg_duration_seconds": 180
}
```

---

## 9. Messaging

### Get Messaging Stats
```http
GET /api/messaging/stats?date_from=2026-05-01

Response:
{
  "sms_sent": 150,
  "sms_cost": 12.00,
  "email_sent": 300,
  "email_cost": 0,
  "total_cost": 12.00
}
```

### Get Deliveries
```http
GET /api/messaging/deliveries?status=failed&limit=50
```

### Get Unsubscribes
```http
GET /api/messaging/unsubscribes
```

### Add to Unsubscribe List
```http
POST /api/messaging/unsubscribes
Content-Type: application/json

{
  "contact_value": "0412345678",
  "contact_type": "phone",
  "channel": "sms",
  "reason": "User requested"
}
```

### Test SMS
```http
POST /api/messaging/test/sms
Content-Type: application/json

{
  "phone": "0412345678",
  "message": "Test message"
}
```

### Test Email
```http
POST /api/messaging/test/email
Content-Type: application/json

{
  "email": "test@email.com",
  "subject": "Test Email",
  "body": "This is a test"
}
```

---

## 10. Analytics

### Get Complete Dashboard
```http
GET /api/analytics/dashboard?date_from=2026-05-01&date_to=2026-05-31

Response:
{
  "revenue": { "total_revenue": 45000, "mrr": 15000, ... },
  "leads": { "total_leads": 50, "conversion_rate": 30, ... },
  "trials": { "trials_booked": 25, "trial_conversion_rate": 60, ... },
  "retention": { "retention_rate": 30, ... },
  "staff": { "totals": {...}, "top_by_signups": [...] },
  "phone": { "total_calls": 50, ... },
  "messaging": { "sms_sent": 150, ... },
  "forecast": { "current_mrr": 15000, "forecast": [...] }
}
```

### Get Revenue Metrics
```http
GET /api/analytics/revenue?date_from=2026-05-01
```

### Get Conversion Funnel
```http
GET /api/analytics/funnel?date_from=2026-05-01

Response:
{
  "leads_created": 100,
  "trials_booked": 40,
  "trials_completed": 35,
  "converted": 21,
  "lead_to_trial_rate": 40,
  "trial_to_conversion_rate": 60,
  "overall_conversion_rate": 21
}
```

### Get Time Series
```http
GET /api/analytics/timeseries/revenue?date_from=2026-05-01&interval=day

Response: [
  { "period": "2026-05-01", "value": 1500 },
  { "period": "2026-05-02", "value": 1800 }
]

Metrics: leads, signups, revenue, trials
Intervals: day, week, month
```

---

## 11. Stock/Merchandise

### List Products
```http
GET /api/stock/products?category=apparel&low_stock=true
```

### Create Product
```http
POST /api/stock/products
Content-Type: application/json

{
  "name": "ROAR T-Shirt",
  "category": "apparel",
  "sku": "TSHIRT-BLK-XL",
  "cost_price": 15.00,
  "sell_price": 35.00,
  "stock_quantity": 20,
  "min_stock_level": 10,
  "size": "XL",
  "color": "Black"
}
```

### Record Sale
```http
POST /api/stock/sales
Content-Type: application/json

{
  "product_id": 1,
  "quantity": 2,
  "unit_price": 35.00,
  "member_id": 1,
  "payment_method": "card"
}

Auto-deducts stock and checks for low stock alerts
```

### Stock Adjustment
```http
POST /api/stock/adjustments
Content-Type: application/json

{
  "product_id": 1,
  "adjustment_type": "add",
  "quantity": 10,
  "reason": "New stock received"
}
```

### Get Stock Alerts
```http
GET /api/stock/alerts

Response: [
  {
    "product_id": 1,
    "product_name": "Boxing Gloves",
    "alert_type": "low_stock",
    "current_quantity": 3,
    "min_quantity": 5
  }
]
```

### Get Stock Analytics
```http
GET /api/stock/analytics?date_from=2026-05-01

Response:
{
  "total_sales_revenue": 2500,
  "total_units_sold": 75,
  "top_products": [...],
  "low_stock_count": 3,
  "inventory_value_cost": 5000,
  "inventory_value_sell": 12000
}
```

---

## 12. Belt Grading

### List Belt Levels
```http
GET /api/grading/belts

Response: [
  {
    "id": 1,
    "name": "White",
    "rank_order": 1,
    "min_time_months": 0,
    "min_classes_attended": 0
  }
]
```

### Get Belt Requirements
```http
GET /api/grading/belts/:beltId/requirements

Response: [
  {
    "category": "striking",
    "technique_name": "Jab",
    "description": "Basic straight punch",
    "required": 1
  }
]
```

### Get Member Progress
```http
GET /api/grading/members/:memberId/progress

Response:
{
  "member_id": 1,
  "current_belt_id": 1,
  "belt_name": "White",
  "current_stripes": 2,
  "belt_awarded_date": "2026-01-01",
  "next_grading_eligible_date": "2026-07-01",
  "classes_attended_since_belt": 25
}
```

### Check Grading Eligibility
```http
GET /api/grading/members/:memberId/eligibility

Response:
{
  "eligible": false,
  "reasons": [
    "Time requirement not met (45 days remaining)",
    "Attendance requirement not met (23 classes remaining)"
  ],
  "next_belt": { "name": "Blue" },
  "classes_attended": 25,
  "classes_required": 48,
  "techniques_mastered": 6,
  "techniques_required": 9
}
```

### Assign Belt
```http
POST /api/grading/members/:memberId/assign-belt
Content-Type: application/json

{
  "belt_level_id": 2,
  "stripes": 0,
  "awarded_date": "2026-05-10"
}

Auto-calculates next grading date, logs history
```

### Award Stripe
```http
POST /api/grading/members/:memberId/award-stripe

Increments stripe count, logs in history
```

### Update Technique Progress
```http
POST /api/grading/members/:memberId/techniques
Content-Type: application/json

{
  "requirement_id": 1,
  "proficiency_level": "proficient",
  "notes": "Good form, needs more practice"
}
```

### Get Member Techniques
```http
GET /api/grading/members/:memberId/techniques?belt_level_id=2

Response: [
  {
    "technique_name": "Armbar",
    "proficiency_level": "proficient",
    "last_practiced_date": "2026-05-08",
    "assessed_by_name": "Coach Sarah"
  }
]
```

### Create Grading Session
```http
POST /api/grading/sessions
Content-Type: application/json

{
  "session_date": "2026-05-15",
  "session_time": "18:00",
  "location": "Main gym",
  "notes": "Blue belt grading"
}
```

### Add Participant to Grading
```http
POST /api/grading/sessions/:sessionId/participants
Content-Type: application/json

{
  "member_id": 1,
  "testing_for_belt_id": 2
}
```

### Record Grading Result
```http
POST /api/grading/participants/:participantId/result
Content-Type: application/json

{
  "result": "passed",
  "score": 85,
  "feedback": "Excellent technique, ready for blue belt",
  "awarded_stripes": 0
}

Auto-assigns belt if passed
```

### Get Grading History
```http
GET /api/grading/members/:memberId/history

Response: [
  {
    "from_belt_name": "White",
    "to_belt_name": "Blue",
    "grading_date": "2026-05-10",
    "graded_by_name": "Coach John",
    "stripes_awarded": 0
  }
]
```

---

## WebSocket Events

Connect to: `ws://localhost:3001`

**Events broadcasted:**
- `stock_adjustment` - Stock adjusted
- `product_sale` - Product sold
- `belt_awarded` - Member promoted
- `stripe_awarded` - Stripe given
- `grading_passed` - Member passed grading
- `cancellation_request_created` - Cancellation requested
- `retention_offer_accepted` - Offer accepted
- `member_cancelled` - Member cancelled

**Example:**
```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event:', data.type, data.data);
};
```

---

## Error Responses

All errors return:
```json
{
  "error": "Error message here"
}
```

**Status codes:**
- 200: Success
- 201: Created
- 400: Bad request
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Server error

---

## Rate Limits

**Messaging:**
- SMS: 5 per contact per day
- Email: 10 per contact per day

**API:**
- No rate limits currently (add in production)

---

## Notes

1. All dates in ISO 8601 format: `2026-05-10` or `2026-05-10T14:00:00Z`
2. All monetary amounts in dollars (e.g., 35.00)
3. Phone numbers: Australian format `0412345678` or international `+61412345678`
4. Permissions checked on all endpoints (requires appropriate role)
5. WebSocket broadcasts real-time updates to all connected clients
6. Message scheduler runs every 60 seconds
7. Stock alerts auto-generate when quantity ≤ min_stock_level
8. Belt grading eligibility auto-calculated based on time/attendance/techniques

---

## Quick Start

1. Start backend: `cd backend && node server.js`
2. Login to get token: `POST /api/auth/login`
3. Use token in Authorization header for all requests
4. Check health: `GET /api/health`
5. Explore endpoints with Postman or similar tool

---

## Production Checklist

- [ ] Add Twilio credentials to messaging_provider_settings
- [ ] Add Brevo API key to messaging_provider_settings
- [ ] Uncomment real provider code in `services/messagingProviders.js`
- [ ] Set up SSL certificates
- [ ] Configure production database
- [ ] Set environment variables
- [ ] Enable CORS for production domain
- [ ] Add API rate limiting
- [ ] Set up monitoring/logging
- [ ] Configure backups
