-- Default message templates for trial follow-up automation

-- SMS: 2 hours after trial
INSERT INTO message_templates (name, type, trigger_event, body) VALUES (
    'Trial Follow-up - 2 Hours',
    'sms',
    'trial_2hr',
    'Hi {{first_name}}! Thanks for trying {{class_type}} at ROAR MMA today. How was your experience? Any questions? Reply YES if you''d like to book your next session. - ROAR Team'
);

-- Email: Next day after trial
INSERT INTO message_templates (name, type, trigger_event, subject, body) VALUES (
    'Trial Follow-up - Next Day',
    'email',
    'trial_next_day',
    'Great seeing you at ROAR MMA, {{first_name}}!',
    'Hi {{first_name}},

Thanks for joining us for {{class_type}} yesterday! We hope you enjoyed the session with Coach {{coach_name}}.

We''d love to see you back on the mats. Here''s what happens next:

✓ Try another class free (different style if you want!)
✓ Meet more of our coaches and community
✓ Get a personalized training plan

Your next step: Book your second trial class here: {{booking_link}}

Questions? Just reply to this email or call us at {{gym_phone}}.

See you soon!
{{staff_name}}
ROAR MMA'
);

-- SMS: Day 3 after trial
INSERT INTO message_templates (name, type, trigger_event, body) VALUES (
    'Trial Follow-up - Day 3',
    'sms',
    'trial_day3',
    '{{first_name}}, still thinking about joining ROAR MMA? We have a special offer ending soon. Reply INFO for details or BOOK to schedule your next class. - {{staff_name}}'
);

-- Email: Day 7 after trial
INSERT INTO message_templates (name, type, trigger_event, subject, body) VALUES (
    'Trial Follow-up - Day 7',
    'email',
    'trial_day7',
    'Don''t let your momentum stop, {{first_name}}',
    'Hi {{first_name}},

It''s been a week since your trial at ROAR MMA. We noticed you haven''t been back yet.

Here''s what you''re missing:
• Structured training that gets results
• Supportive community that pushes you forward
• Expert coaching in {{class_type}} and more

Special offer for you: {{offer_details}}

This offer expires in 3 days. Ready to commit to your goals?

Book your spot: {{booking_link}}
Or call us: {{gym_phone}}

Let''s get you started!
{{staff_name}}
ROAR MMA'
);

-- SMS: Day 14 - Final follow-up
INSERT INTO message_templates (name, type, trigger_event, body) VALUES (
    'Trial Follow-up - Day 14',
    'sms',
    'trial_day14',
    'Last chance {{first_name}}! Your trial offer at ROAR MMA expires today. Ready to start your journey? Call {{gym_phone}} or reply START. - {{staff_name}}'
);

-- SMS: New lead response (within 5 minutes)
INSERT INTO message_templates (name, type, trigger_event, body) VALUES (
    'New Lead - Instant Response',
    'sms',
    'lead_new',
    'Hi {{first_name}}! Thanks for your interest in ROAR MMA. We''d love to get you started with a FREE trial class. When works best for you? Reply with a day/time or call {{gym_phone}}. - {{staff_name}}'
);

-- Email: New lead welcome
INSERT INTO message_templates (name, type, trigger_event, subject, body) VALUES (
    'New Lead - Welcome Email',
    'email',
    'lead_new',
    'Welcome to ROAR MMA, {{first_name}}!',
    'Hi {{first_name}},

Thanks for reaching out! We''re excited to help you start your martial arts journey.

Here''s what you can expect:

🥋 FREE Trial Class
Try any of our classes risk-free. No experience needed.

👊 Expert Coaching
Learn from experienced instructors in BJJ, Muay Thai, MMA, and more.

💪 Supportive Community
Train with people who will push you to be your best.

📍 Convenient Locations
{{location}} - Full schedule: {{schedule_link}}

Ready to book your trial? Click here: {{booking_link}}

Questions? Call us at {{gym_phone}} or reply to this email.

See you on the mats!
{{staff_name}}
ROAR MMA'
);

-- SMS: No response after 3 days
INSERT INTO message_templates (name, type, trigger_event, body) VALUES (
    'Lead No Response - Day 3',
    'sms',
    'lead_no_response',
    'Hi {{first_name}}, just checking in! Still interested in trying a FREE class at ROAR MMA? We have spots available this week. Reply YES or call {{gym_phone}}. - {{staff_name}}'
);
