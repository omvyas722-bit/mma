# Roar MMA Email Automation - Setup Instructions

## Prerequisites

1. **Python 3.7+** installed on your system
2. **Gmail account** with 2-Factor Authentication enabled
3. **Gmail App Password** (not your regular Gmail password)

## Step 1: Generate Gmail App Password

Since you'll be using Gmail SMTP, you need an App Password:

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification** (enable if not already)
3. Scroll down to **App passwords**
4. Select app: **Mail**
5. Select device: **Other (Custom name)** → Enter "Roar MMA Automation"
6. Click **Generate**
7. Copy the 16-character password (format: xxxx xxxx xxxx xxxx)

## Step 2: Configure the Script

Open `gym_email_automation.py` and update these lines:

```python
GMAIL_ADDRESS = "your-email@gmail.com"  # Your Gmail address
GMAIL_APP_PASSWORD = "xxxx xxxx xxxx xxxx"  # The app password from Step 1
YOUR_NAME = "Your Name"  # Your name for signature
YOUR_PHONE = "+61 XXX XXX XXX"  # Optional
```

## Step 3: Test with Dry Run

First, test without sending real emails:

```bash
python gym_email_automation.py
```

This will show you what emails would be sent without actually sending them.

Review the output to ensure:
- Personalization looks good
- Email addresses are correct
- Subject lines are appropriate

## Step 4: Send Real Emails

Once you're satisfied with the dry run:

1. Open `gym_email_automation.py`
2. Change `DRY_RUN = True` to `DRY_RUN = False`
3. Run the script:

```bash
python gym_email_automation.py
```

4. Confirm when prompted

## Important Notes

### Email Sending Limits

- Gmail has sending limits: ~500 emails/day for regular accounts
- The script includes a 30-second delay between emails to avoid spam filters
- For this CSV (11 gyms), it will take ~5-6 minutes to complete

### Spam Prevention

The script is designed to avoid spam filters:
- 30-second delay between emails
- Personalized content for each gym
- Professional formatting
- No attachments in first email

### Tracking

The script will output:
- Which emails were sent successfully
- Which gyms were skipped (no email address)
- Any failures with error messages

### Follow-up Strategy

Based on the research:
- Wait 3-4 days before following up
- Send follow-ups Tuesday-Thursday, 8-10am local time
- Keep follow-ups even shorter than initial email

## Troubleshooting

### "Authentication failed"
- Double-check your Gmail App Password (not regular password)
- Ensure 2-Factor Authentication is enabled
- Make sure you copied the password correctly (no spaces)

### "Connection refused"
- Check your internet connection
- Verify Gmail SMTP is not blocked by firewall
- Try using port 587 with STARTTLS instead (modify script)

### Emails going to spam
- Send from a warmed-up email address
- Reduce sending rate (increase DELAY_BETWEEN_EMAILS)
- Ensure your Gmail account has good reputation
- Add SPF/DKIM records if using custom domain

## Customization

### Change Email Template

Edit the `generate_email_body()` function in the script to modify:
- Email structure
- Tone and language
- Call-to-action
- Signature

### Adjust Personalization Logic

Edit the `analyze_gym_description()` function to:
- Add new keyword detection
- Change pain point mapping
- Modify feature recommendations

### Change Subject Lines

Edit the `generate_subject_line()` function to test different subject lines.

## Legal Compliance

⚠️ **Important**: Ensure compliance with:
- **Australian Spam Act 2003**
- Include unsubscribe mechanism if sending bulk
- Only send to businesses (B2B exemption applies)
- Keep records of consent if applicable

## Support

For issues with:
- **Script functionality**: Check Python version, dependencies
- **Gmail authentication**: Review Google Account security settings
- **Email deliverability**: Consider using professional email service (SendGrid, Mailgun)

## Next Steps After Sending

1. **Track responses** in a spreadsheet
2. **Follow up** with non-responders after 3-4 days
3. **Refine template** based on response rates
4. **A/B test** different subject lines
5. **Schedule calls** with interested gyms
