-- Win-back campaign message templates
-- DEPENDENCY: Requires message_templates table created by 001_add_trial_tracking.sql
-- with trigger_event constraint expanded by 004_add_retention_system.sql.
-- ORDERING: Must be applied AFTER migration 004_add_retention_system.sql.
-- VARIABLE CONVENTION: All templates use {{first_name}} (not {{first_name}}).

-- Immediate win-back (within 7 days of cancellation)
INSERT INTO message_templates (
  name, type, trigger_event, subject, body, active
) VALUES (
  'Win-back - Immediate SMS',
  'sms',
  'winback_immediate',
  NULL,
  'Hey {{first_name}}, we''re sorry to see you go! We''d love to have you back. {{offer}} Reply YES if interested or call us at {{gym_phone}}',
  1
);

INSERT INTO message_templates (
  name, type, trigger_event, subject, body, active
) VALUES (
  'Win-back - Immediate Email',
  'email',
  'winback_immediate',
  'We Miss You at ROAR MMA',
  'Hi {{first_name}},

We noticed you recently cancelled your membership and wanted to reach out personally.

Your progress and dedication meant a lot to our community, and we''d love to welcome you back.

**Special Comeback Offer:**
{{offer}}

This offer is available for the next 7 days. No pressure - just wanted you to know the door is always open.

Reply to this email or call us at {{gym_phone}} if you''d like to discuss.

Best regards,
The ROAR Team',
  1
);

-- 30-day win-back
INSERT INTO message_templates (
  name, type, trigger_event, subject, body, active
) VALUES (
  '30-Day Win-back SMS',
  'sms',
  'winback_30day',
  NULL,
  'Hi {{first_name}}, it''s been a month since we last saw you at ROAR. We''ve got a special offer just for you: {{offer}} Ready to come back? {{gym_phone}}',
  1
);

INSERT INTO message_templates (
  name, type, trigger_event, subject, body, active
) VALUES (
  '30-Day Win-back Email',
  'email',
  'winback_30day',
  'Your Spot is Still Here at ROAR',
  'Hi {{first_name}},

It''s been about a month since you left ROAR MMA, and we wanted to check in.

A lot can change in 30 days - maybe your schedule has opened up, or you''re ready to get back into training.

**Exclusive Return Offer:**
{{offer}}

We''ve kept your spot warm. Several members have asked about you, and we''d love to see you back on the mats.

Let us know if you''re interested - just reply to this email or give us a call at {{gym_phone}}.

Hope to see you soon,
ROAR Team',
  1
);

-- 90-day win-back
INSERT INTO message_templates (
  name, type, trigger_event, subject, body, active
) VALUES (
  '90-Day Win-back SMS',
  'sms',
  'winback_90day',
  NULL,
  '{{first_name}}, we haven''t forgotten about you! Ready to restart your MMA journey? {{offer}} Text back or call {{gym_phone}}',
  1
);

INSERT INTO message_templates (
  name, type, trigger_event, subject, body, active
) VALUES (
  '90-Day Win-back Email',
  'email',
  'winback_90day',
  'Time to Get Back in the Fight?',
  'Hi {{first_name}},

Three months have passed since you trained with us. Whether life got busy or priorities shifted, we understand.

But if you''ve been thinking about getting back into martial arts, now''s the perfect time.

**90-Day Comeback Special:**
{{offer}}

No judgment, no pressure. Just a genuine invitation to rejoin a community that valued having you as a member.

We''re here when you''re ready.

Reply or call {{gym_phone}},
ROAR MMA',
  1
);

-- 6-month win-back (final attempt)
INSERT INTO message_templates (
  name, type, trigger_event, subject, body, active
) VALUES (
  '6-Month Win-back SMS',
  'sms',
  'winback_6month',
  NULL,
  'Final message from ROAR - {{first_name}}, if you ever want to come back, we''re here. {{offer}} available this month only. {{gym_phone}}',
  1
);

INSERT INTO message_templates (
  name, type, trigger_event, subject, body, active
) VALUES (
  '6-Month Win-back Email',
  'email',
  'winback_6month',
  'One Last Invitation from ROAR MMA',
  'Hi {{first_name}},

This will be our last message. It''s been 6 months since you left, and we wanted to reach out one final time.

If martial arts is still something you''re interested in, we''d genuinely love to have you back.

**Final Comeback Offer:**
{{offer}}

This is available for this month only. After that, we''ll stop reaching out - but you''re always welcome to return on your own terms.

If you''d prefer not to receive any future messages, just reply "STOP" and we''ll remove you from our list.

Thanks for being part of ROAR, even if just for a while.

Best wishes,
The ROAR Team

P.S. Call {{gym_phone}} if you want to talk.',
  1
);
