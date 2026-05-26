# Roar MMA Email Automation System

Automated, personalized email outreach system for pitching Roar MMA software to martial arts gyms in Perth.

## Overview

This system reads gym data from `perth_martial_arts_gyms.csv` and sends personalized sales emails via Gmail SMTP. Each email is customized based on:
- Gym characteristics (family-owned, multiple locations, kids programs, etc.)
- Martial arts styles offered
- Business focus (competition, traditional, community, etc.)

## Features

- **Smart Personalization**: Analyzes gym descriptions to customize pain points and value propositions
- **Email Validation**: Automatically skips gyms without valid email addresses
- **Spam Prevention**: 30-second delays between emails to avoid triggering spam filters
- **Dry Run Mode**: Test emails without sending them
- **Detailed Logging**: Track which emails were sent, skipped, or failed
- **Gmail Integration**: Uses secure Gmail App Password authentication

## Quick Start

### 1. Install Python

Ensure Python 3.7+ is installed:
```bash
python --version
```

### 2. Set Up Gmail App Password

1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account → Security → App passwords
3. Generate an app password for "Mail"
4. Copy the 16-character password

### 3. Configure the Script

Open `gym_email_automation.py` and update:

```python
GMAIL_ADDRESS = "your-email@gmail.com"
GMAIL_APP_PASSWORD = "xxxx xxxx xxxx xxxx"
YOUR_NAME = "Your Name"
YOUR_PHONE = "+61 XXX XXX XXX"  # Optional
```

### 4. Test with Dry Run

```bash
python gym_email_automation.py
```

Review the output to ensure emails look good.

### 5. Send Real Emails

1. Change `DRY_RUN = True` to `DRY_RUN = False` in the script
2. Run: `python gym_email_automation.py`
3. Confirm when prompted

## Email Personalization Logic

The system analyzes each gym's description and customizes:

### Personalized Openers
- **Family-owned gyms**: "I noticed [Gym] is family-owned - that community-focused approach really stands out."
- **Multiple locations**: "Managing multiple locations for [Gym] must keep you incredibly busy."
- **Competition-focused**: "I can see [Gym] has a strong competition focus - impressive track record."

### Pain Points
- **Multiple locations**: "keeping operations consistent across multiple locations"
- **Family-owned/growing**: "scaling operations without losing that personal touch"
- **Kids programs**: "managing parent communications, waivers, and attendance"
- **Default**: "juggling member management, billing, and class scheduling manually"

### Relevant Features
- **Multiple locations**: Centralized dashboard, unified database, location-specific reporting
- **Kids programs**: Automated parent communications, digital waivers, attendance tracking
- **Competition-focused**: Attendance tracking, performance analytics, automated billing
- **Default**: Automated billing, class booking system, lead management CRM

## Current Results (Perth Gyms)

From the CSV of 11 gyms:
- **5 gyms** have valid email addresses (will receive emails)
- **6 gyms** have "Contact via website" (skipped automatically)

### Gyms That Will Receive Emails:
1. First Taekwondo - info@firsttkd.com
2. Dynamic Martial Arts - info@dynamicmartialarts.com.au
3. Perth Martial Arts Centre - info@perthmartialartscentre.com.au
4. WA Krav Maga - info@wakravmaga.com.au
5. WA Kendo - Contact@WAKendo.com.au

## Email Template Structure

```
Subject: Quick question about [Gym Name]'s operations

Hi [Name],

[Personalized opener based on gym characteristics]

I'm reaching out because most martial arts gym owners I work with 
struggle with [specific pain point] - especially as they grow.

Roar MMA automates your [relevant features], which typically saves 
gym owners 10-15 hours per week and reduces billing issues by 80%. 
Our AI-powered system handles member communications, payment 
follow-ups, and lead nurturing automatically.

Would you be open to a quick 15-minute call to see if Roar MMA 
could work for [Gym Name]? I can show you exactly how it would 
look for your setup.

Best regards,
[Your Name]

P.S. The system is built specifically for martial arts gyms and 
includes features like digital waivers, grading management, and 
POS integration - happy to show you a demo tailored to your needs.
```

## Configuration Options

### Adjust Sending Speed
```python
DELAY_BETWEEN_EMAILS = 30  # Seconds between emails
```

Recommended: 30-60 seconds to avoid spam filters

### Change Subject Line Strategy
Edit the `generate_subject_line()` function to test different approaches:
- Soft question: "Quick question about [Gym]'s operations"
- Value-focused: "Saving 15 hours/week on admin - [Gym]"
- Direct: "[Gym] - Automate your gym management?"

### Customize Email Body
Edit the `generate_email_body()` function to modify:
- Tone and language
- Statistics (10-15 hours/week, 80% reduction)
- Call-to-action
- P.S. message

## Best Practices

### Timing
- Send Tuesday-Thursday, 8-10am local time (Perth time)
- Avoid Mondays (too busy) and Fridays (weekend mode)

### Follow-up Strategy
- Wait 3-4 days before following up
- Keep follow-ups shorter than initial email
- Reference something specific from their website/social media

### Deliverability
- Warm up your email address (send to friends first)
- Keep sending rate low (5-10 emails per day initially)
- Monitor spam folder placement
- Use a professional email signature

## Troubleshooting

### "Authentication failed"
- Verify you're using App Password, not regular Gmail password
- Ensure 2-Factor Authentication is enabled
- Check for typos in credentials

### Emails going to spam
- Reduce sending rate (increase delay)
- Ensure your Gmail account has good reputation
- Add a professional email signature
- Avoid spam trigger words

### "Connection refused"
- Check internet connection
- Verify firewall isn't blocking SMTP
- Try port 587 with STARTTLS (modify script)

## Legal Compliance

⚠️ **Important**: This system is designed for B2B outreach, which has different rules than B2C:

- **Australian Spam Act 2003**: B2B emails are generally permitted
- **Best practice**: Include unsubscribe option in follow-ups
- **Keep records**: Track who you've contacted and responses
- **Respect opt-outs**: Immediately stop contacting anyone who asks

## Files in This System

- `gym_email_automation.py` - Main automation script
- `perth_martial_arts_gyms.csv` - Gym database
- `EMAIL_SETUP_INSTRUCTIONS.md` - Detailed setup guide
- `README_EMAIL_AUTOMATION.md` - This file

## Extending the System

### Add More Gyms
Simply add rows to `perth_martial_arts_gyms.csv` with the same column structure.

### Track Responses
Create a spreadsheet to track:
- Date sent
- Response received (yes/no)
- Meeting scheduled (yes/no)
- Outcome

### A/B Testing
Create multiple versions of the script with different:
- Subject lines
- Email body structure
- Call-to-action wording

Track response rates to optimize.

### Automated Follow-ups
Extend the script to:
- Track who hasn't responded
- Send follow-up emails after 3-4 days
- Use different messaging for follow-ups

## Support

For issues or questions:
1. Check `EMAIL_SETUP_INSTRUCTIONS.md` for detailed setup help
2. Review error messages carefully
3. Test with dry run mode first
4. Verify Gmail credentials are correct

## Success Metrics

Track these metrics to measure effectiveness:
- **Open rate**: 20-30% is typical for cold B2B emails
- **Response rate**: 5-10% is good for cold outreach
- **Meeting conversion**: 2-5% is realistic
- **Close rate**: 10-20% of meetings should convert

## Next Steps After Sending

1. **Monitor inbox** for responses (check spam folder too)
2. **Respond quickly** to interested gyms (within 24 hours)
3. **Schedule demos** using Calendly or similar tool
4. **Follow up** with non-responders after 3-4 days
5. **Refine template** based on response rates

## About Roar MMA Software

Roar MMA is a comprehensive gym management system featuring:
- Member management and CRM
- Class scheduling and booking
- Attendance tracking
- Automated billing and payment processing
- AI-powered communications (HERMES, MIDAS agents)
- Lead management with Kanban pipeline
- Digital waivers and grading management
- POS integration
- Real-time dashboard and analytics
- Staff management

Built specifically for martial arts gyms with a focus on automation and reducing administrative overhead.

---

**Version**: 1.0  
**Last Updated**: 2026-04-24  
**Author**: Roar MMA Team
