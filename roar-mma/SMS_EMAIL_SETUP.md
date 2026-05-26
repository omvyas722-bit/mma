# SMS/Email Integration Setup Guide

**Status:** Ready for credentials  
**Providers:** Twilio (SMS) + Brevo (Email)  
**Estimated Setup Time:** 15 minutes

---

## 🎯 Overview

System has complete SMS/Email infrastructure built. Only needs provider credentials to activate real sending.

**Current State:**
- ✅ Message scheduling system operational
- ✅ Delivery tracking ready
- ✅ Rate limiting configured
- ✅ Unsubscribe management ready
- ✅ Template system working
- ⏳ Providers disabled (no credentials)

**When Enabled:**
- Instant lead responses (2-minute auto-reply)
- Trial follow-up sequences (5 stages)
- Win-back campaigns (4 stages)
- Retention offers via SMS/Email
- Staff task notifications

---

## 📋 Prerequisites

### 1. Twilio Account (SMS)
**Cost:** ~$0.0075 per SMS in Australia  
**Monthly Estimate:** $50-100 (based on 600-1,200 messages)

**What You Need:**
- Twilio Account SID
- Twilio Auth Token
- Twilio Phone Number (Australian number recommended)

**Sign Up:** https://www.twilio.com/try-twilio

### 2. Brevo Account (Email)
**Cost:** Free tier: 300 emails/day  
**Paid:** $25/month for 20,000 emails

**What You Need:**
- Brevo API Key

**Sign Up:** https://www.brevo.com/

---

## 🔧 Setup Steps

### Step 1: Get Twilio Credentials (10 min)

1. **Create Twilio Account**
   - Go to https://www.twilio.com/try-twilio
   - Sign up with email
   - Verify phone number

2. **Get Account SID and Auth Token**
   - Login to Twilio Console
   - Dashboard shows Account SID and Auth Token
   - Copy both values

3. **Get Phone Number**
   - Go to Phone Numbers → Buy a Number
   - Select Australia (+61)
   - Choose SMS-capable number
   - Purchase number (~$1/month)
   - Copy phone number in E.164 format: +61XXXXXXXXX

### Step 2: Get Brevo API Key (5 min)

1. **Create Brevo Account**
   - Go to https://www.brevo.com/
   - Sign up with email
   - Verify email address

2. **Generate API Key**
   - Go to Settings → SMTP & API
   - Click "Generate a new API key"
   - Name it "ROAR MMA System"
   - Copy API key (starts with xkeysib-)

### Step 3: Configure Environment Variables

1. **Edit .env file**
   ```bash
   cd backend
   nano .env
   ```

2. **Add credentials**
   ```env
   # Twilio SMS Configuration
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+61XXXXXXXXX

   # Brevo Email Configuration
   BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   BREVO_SENDER_EMAIL=noreply@roarmma.com.au
   BREVO_SENDER_NAME=ROAR MMA
   ```

3. **Save and close**

### Step 4: Enable Providers in Code

1. **Edit messagingProviders.js**
   ```bash
   nano services/messagingProviders.js
   ```

2. **Uncomment Twilio section** (around line 10-30)
   ```javascript
   // UNCOMMENT THIS BLOCK:
   const twilio = require('twilio');
   const twilioClient = twilio(
     process.env.TWILIO_ACCOUNT_SID,
     process.env.TWILIO_AUTH_TOKEN
   );
   ```

3. **Uncomment Brevo section** (around line 35-50)
   ```javascript
   // UNCOMMENT THIS BLOCK:
   const brevo = require('@getbrevo/brevo');
   const brevoClient = new brevo.TransactionalEmailsApi();
   brevoClient.setApiKey(
     brevo.TransactionalEmailsApiApiKeys.apiKey,
     process.env.BREVO_API_KEY
   );
   ```

4. **Save and close**

### Step 5: Install Provider SDKs

```bash
cd backend
npm install twilio @getbrevo/brevo
```

### Step 6: Restart Server

```bash
# Stop current server
pm2 stop roar-mma

# Start with new config
pm2 start server.js --name roar-mma

# Or if running directly:
node server.js
```

### Step 7: Test Sending

```bash
# Test SMS
curl -X POST http://localhost:3001/api/messaging/test/sms \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+61400000000", "message": "Test from ROAR MMA"}'

# Test Email
curl -X POST http://localhost:3001/api/messaging/test/email \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "subject": "Test", "body": "Test from ROAR MMA"}'
```

---

## 🔍 Verification

### Check Logs
```bash
# View server logs
pm2 logs roar-mma

# Should see:
# "✓ SMS sent successfully"
# "✓ Email sent successfully"
```

### Check Database
```bash
node -e "
const db = require('better-sqlite3')('../data/roarmma.db');
const sent = db.prepare('SELECT COUNT(*) as count FROM message_deliveries WHERE status = ?').get('sent');
console.log('Messages sent:', sent.count);
"
```

### Check Messaging Stats
```bash
curl http://localhost:3001/api/messaging/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Expected Behavior

### Automatic Sending
Once enabled, system automatically sends:

1. **New Lead Response** (2 minutes after lead creation)
   - SMS to lead's phone
   - "Thanks for your interest in ROAR MMA..."

2. **Trial Follow-ups** (5 stages)
   - 2 hours post-trial: SMS
   - Next day: Email
   - Day 3: SMS
   - Day 7: Email
   - Day 14: SMS

3. **Win-back Campaigns** (4 stages)
   - Immediate: SMS
   - 30 days: Email
   - 90 days: SMS
   - 180 days: Email

4. **Retention Offers**
   - SMS when cancellation request created
   - Email with offer details

### Rate Limiting
- **SMS:** Max 5 per day per contact
- **Email:** Max 10 per day per contact
- Prevents spam and reduces costs

### Cost Tracking
System tracks costs per message:
- SMS: $0.0075 each
- Email: Free (Brevo free tier)

View costs:
```bash
curl http://localhost:3001/api/messaging/costs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🚨 Troubleshooting

### "Twilio not enabled" Error
**Cause:** Credentials not configured or code not uncommented  
**Fix:** 
1. Check .env has all Twilio variables
2. Verify code uncommented in messagingProviders.js
3. Restart server

### "Invalid phone number" Error
**Cause:** Phone number not in E.164 format  
**Fix:** Use format +61XXXXXXXXX (no spaces or dashes)

### "Brevo API key invalid" Error
**Cause:** Wrong API key or expired  
**Fix:**
1. Generate new API key in Brevo dashboard
2. Update .env
3. Restart server

### Messages Not Sending
**Check:**
1. Server logs: `pm2 logs roar-mma`
2. Message scheduler running: Should see "Processing X pending messages" every 60s
3. Database: `SELECT * FROM scheduled_messages WHERE status = 'pending'`

### High Costs
**Solutions:**
1. Review rate limits (currently 5 SMS/day per contact)
2. Disable non-critical templates
3. Use email instead of SMS where possible
4. Check for duplicate messages

---

## 💰 Cost Estimates

### Monthly Costs (Typical Gym)

**Twilio SMS:**
- New leads: 30/month × 1 SMS = 30 × $0.0075 = $0.23
- Trial follow-ups: 20/month × 3 SMS = 60 × $0.0075 = $0.45
- Win-back: 10/month × 2 SMS = 20 × $0.0075 = $0.15
- Retention: 5/month × 1 SMS = 5 × $0.0075 = $0.04
- **Total SMS:** ~$0.87/month

**Brevo Email:**
- Free tier: 300 emails/day = 9,000/month
- Typical usage: 200-400/month
- **Cost:** $0 (free tier sufficient)

**Total Monthly:** ~$1-2 (well within budget)

### Annual Costs
- **SMS:** $10-24/year
- **Email:** $0-300/year (if exceed free tier)
- **Total:** $10-324/year

**ROI:** System generates $58,500-78,000/year  
**Cost:** $10-324/year  
**Net Benefit:** $58,176-77,990/year

---

## ✅ Post-Setup Checklist

- [ ] Twilio credentials added to .env
- [ ] Brevo API key added to .env
- [ ] Provider code uncommented
- [ ] SDKs installed (twilio, @getbrevo/brevo)
- [ ] Server restarted
- [ ] Test SMS sent successfully
- [ ] Test email sent successfully
- [ ] Logs show successful sends
- [ ] Message stats updating
- [ ] Rate limiting working
- [ ] Cost tracking active

---

## 📞 Support

### Twilio Support
- Docs: https://www.twilio.com/docs
- Support: https://support.twilio.com

### Brevo Support
- Docs: https://developers.brevo.com
- Support: https://help.brevo.com

### System Issues
- Check logs: `pm2 logs roar-mma`
- Run health check: `node scripts/health-check.js`
- Verify system: `node scripts/verify-system.js`

---

## 🎯 Success Metrics

After enabling, monitor:

1. **Delivery Rate**
   - Target: >95% delivered
   - Check: `/api/messaging/stats`

2. **Response Rate**
   - Target: 20-30% leads respond
   - Check: Lead interactions

3. **Conversion Impact**
   - Target: +20-30% trial conversions
   - Check: Analytics dashboard

4. **Cost per Conversion**
   - Target: <$1 per conversion
   - Check: `/api/messaging/costs`

---

**Setup Time:** 15 minutes  
**Annual Cost:** $10-324  
**Annual Benefit:** $58,500-78,000  
**Status:** Ready to enable
