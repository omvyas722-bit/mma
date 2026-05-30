#!/usr/bin/env python3
"""
Roar MMA Email Automation System
Sends personalized sales emails to martial arts gyms from CSV data
"""

import csv
import smtplib
import time
import os
import sys
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import re

# ============================================================================
# CONFIGURATION - Override via environment variables
# ============================================================================

GMAIL_ADDRESS = os.environ.get("GMAIL_ADDRESS")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD")

if not GMAIL_ADDRESS or not GMAIL_APP_PASSWORD:
    print("FATAL: GMAIL_ADDRESS and GMAIL_APP_PASSWORD environment variables must be set.")
    print("Set them before running, e.g.:")
    print("  $env:GMAIL_ADDRESS='your-email@gmail.com'")
    print("  $env:GMAIL_APP_PASSWORD='your-app-password'")
    sys.exit(1)
YOUR_NAME = os.environ.get("YOUR_NAME", "Your Name")
YOUR_PHONE = os.environ.get("YOUR_PHONE", "")  # Optional

# SMTP provider configuration (override via environment variables)
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USE_SSL = os.environ.get("SMTP_USE_SSL", "true").lower() == "true"

# Email sending settings
DELAY_BETWEEN_EMAILS = 30  # Seconds between emails (avoid spam filters)
import os
DRY_RUN = os.environ.get('EMAIL_DRY_RUN', 'true').lower() == 'true'
TEST_MODE = os.environ.get('EMAIL_TEST_MODE', 'true').lower() == 'true'
TEST_EMAIL = os.environ.get('EMAIL_TEST_ADDRESS', 'your-email@gmail.com')

# ============================================================================
# PERSONALIZATION LOGIC
# ============================================================================

def analyze_gym_description(description, gym_name, styles, address=None):
    """
    Deeply analyze gym description and create truly personalized insights
    """
    desc_lower = description.lower()

    insights = {
        'personalized_opener': '',
        'specific_observation': '',
        'pain_point': '',
        'relevant_solution': ''
    }

    # Extract specific details and create unique openers for each gym

    # Champions Gym
    if 'family owned since 2012' in desc_lower and 'three perth locations' in desc_lower:
        insights['personalized_opener'] = f"I noticed you're running three locations now - Highgate, Myaree, and Joondalup. That's solid growth for a family business since 2012."
        insights['specific_observation'] = "Between Boxing, Muay Thai, your fundamentals classes, and the teen programs, you've got a lot of moving parts across those sites."
        insights['pain_point'] = "keeping track of bookings, attendance, and billing across all three locations"
        insights['relevant_solution'] = "We built Roar MMA specifically for multi-location gyms. Single dashboard for all three sites, centralized member database, automated billing. The gyms we work with typically cut their admin time in half."

    # Aus Wing Chun
    elif 'wing chun' in desc_lower and 'scientific principles' in desc_lower:
        insights['personalized_opener'] = f"Your 5-session intro and 10-week programs caught my eye - structured onboarding like that is smart, especially for Wing Chun where the fundamentals really matter."
        insights['specific_observation'] = "Running classes at both Mount Lawley and Joondalup means you're managing two separate schedules and student rosters."
        insights['pain_point'] = "tracking students through your intro programs and managing the transition to regular classes"
        insights['relevant_solution'] = "Roar MMA handles the progression tracking automatically - students move through intro to regular classes, reminders go out before sessions, and you get attendance records without the spreadsheet juggling."

    # Aikido School of Perth
    elif 'iwama ryu' in desc_lower and 'traditional japanese weapons' in desc_lower:
        insights['personalized_opener'] = f"Running Iwama Ryu classes at Loftus plus the early morning park training at Lake Jualbup is a nice setup. Traditional weapons training doesn't get enough attention in Perth."
        insights['specific_observation'] = "With kids classes (6-11) and adult classes, plus the different training locations, there's a fair bit of coordination involved."
        insights['pain_point'] = "managing attendance across the dojo and park sessions, plus coordinating the different age groups"
        insights['relevant_solution'] = "Roar MMA tracks attendance across multiple locations automatically, sends class reminders, and handles member communications. Means Peter can focus on teaching instead of admin."

    # First Taekwondo
    elif 'traditional, non-competitive' in desc_lower and 'multiple centers throughout perth' in desc_lower:
        insights['personalized_opener'] = f"Multiple training centers across Perth and WA Country is a big operation. Your traditional, non-competitive approach is refreshing - not everything needs to be about tournaments."
        insights['specific_observation'] = "Keeping standards consistent across that many locations while managing all the member data and billing must be a challenge."
        insights['pain_point'] = "maintaining consistency across all your centers and managing the distributed operations"
        insights['relevant_solution'] = "Roar MMA centralizes everything - one member database, standardized scheduling across all centers, automated billing that works everywhere. You get real-time visibility into what's happening at each location."

    # Dynamic Martial Arts
    elif 'family-operated' in desc_lower and 'chris malloy' in desc_lower and '40 years' in desc_lower:
        insights['personalized_opener'] = f"40+ years of experience with Chris is rare. Family-operated since 2000 and still going strong in the Forest Hill area."
        insights['specific_observation'] = "Running preschool karate, adult classes, Gracie Jiu-Jitsu, and group fitness means you're juggling quite a few different programs and age groups."
        insights['pain_point'] = "managing the different programs, tracking progression across disciplines, and handling all the admin"
        insights['relevant_solution'] = "Roar MMA handles multi-program management - separate schedules for each discipline, progression tracking, digital waivers for new students, automated billing. The family can focus on teaching instead of paperwork."

    # Budokan Academy
    elif 'iaido' in desc_lower and 'jodo' in desc_lower and 'classical martial arts' in desc_lower:
        insights['personalized_opener'] = f"Iaido and Jodo in Thornlie - you don't see many schools teaching classical Japanese weapons arts. It's specialized work."
        insights['specific_observation'] = "Students doing traditional swordsmanship and staff arts are usually pretty committed, which is good for retention."
        insights['pain_point'] = "tracking progression through kata and forms, managing attendance, and handling the admin side"
        insights['relevant_solution'] = "Roar MMA automates attendance, member management, and billing so you can focus on teaching the classical arts instead of spreadsheets."

    # Stirling Karate Club
    elif 'jka' in desc_lower and 'karin prinsloo' in desc_lower and '6th dan' in desc_lower:
        insights['personalized_opener'] = f"JKA affiliation with Karin (6th Dan) and Graz (4th Dan) leading - solid credentials for Karrinyup."
        insights['specific_observation'] = "From Dinky Karate (3-5 year olds) through to Senior Class, you're covering the full age range. Balancing traditional and sports karate keeps it interesting."
        insights['pain_point'] = "managing progression through the age groups, tracking belt gradings, and coordinating trial lessons"
        insights['relevant_solution'] = "Roar MMA tracks grading eligibility automatically, manages class transitions as kids age up, handles trial lesson follow-ups, and streamlines billing. You maintain JKA standards without the admin headache."

    # Perth Martial Arts Centre
    elif 'fifo program' in desc_lower and 'world-champion competitors' in desc_lower:
        insights['personalized_opener'] = f"The FIFO program is smart - Perth's mining workforce needs flexible training options. Not many gyms think about that."
        insights['specific_observation'] = "Two locations (Malaga and Ellenbrook), BJJ for kids and adults, Capoeira, Muay Thai, plus world-champion instructors - you're running a serious operation."
        insights['pain_point'] = "managing FIFO members' irregular schedules, coordinating across two locations, and tracking progression for multiple disciplines"
        insights['relevant_solution'] = "Roar MMA handles the complexity - flexible scheduling for FIFO members, separate tracking for kids and adults, automated billing that accommodates irregular attendance, centralized management across both locations."

    # WA Krav Maga
    elif 'trauma-informed' in desc_lower and 'lgbtqia+' in desc_lower and 'first female kmg-certified' in desc_lower:
        insights['personalized_opener'] = f"Perth's first female KMG-certified instructor doing trauma-informed training for women, non-binary, and LGBTQIA+ students - that's important work and there's clearly demand for it."
        insights['specific_observation'] = "Your 2-hour workshops, private sessions, and the Women Krav Maga Classes starting in May show you're building something specialized."
        insights['pain_point'] = "managing workshop bookings, coordinating private sessions, and handling member communications carefully"
        insights['relevant_solution'] = "Roar MMA handles workshop and private session scheduling, automates member communications (with the right tone), manages digital waivers, and streamlines billing. You can focus on creating that safe training environment."

    # WA Kendo
    elif 'squad training' in desc_lower and 'grading workshops' in desc_lower and 'australian kendo championships' in desc_lower:
        insights['personalized_opener'] = f"Monthly Squad Training, Grading Workshops, and Australian Kendo Championships prep - you're clearly focused on competitive excellence."
        insights['specific_observation'] = "Specialized workshops in Jodan and Nito styles, plus the WAKR membership and bogu requirements, means you're working with serious practitioners."
        insights['pain_point'] = "managing monthly squad attendance, coordinating workshops, tracking competition prep, and handling WAKR membership requirements"
        insights['relevant_solution'] = "Roar MMA automates workshop and squad training attendance, manages member eligibility (WAKR membership, bogu experience), handles competition prep scheduling. Bernard can focus on coaching instead of admin."

    # Default fallback
    else:
        insights['personalized_opener'] = f"I came across your {styles} program in Perth."
        insights['specific_observation'] = "Running a martial arts gym means juggling a lot of admin work."
        insights['pain_point'] = "managing members, schedules, attendance, and billing manually"
        insights['relevant_solution'] = "Roar MMA automates gym operations - member management, class booking, attendance tracking, billing. You focus on teaching."

    return insights


def generate_subject_line(gym_name, insights):
    """Generate personalized subject line"""
    subjects = [
        f"Quick question about {gym_name}'s operations",
        f"Saving 15 hours/week on admin - {gym_name}",
        f"{gym_name} - Automate your gym management?"
    ]
    return subjects[0]  # Using the softest approach


def generate_email_body(gym_name, contact_name, insights):
    """Generate personalized email body"""

    # Extract first name if possible
    first_name = contact_name if contact_name else "there"

    phone_line = f"\n{YOUR_PHONE}" if YOUR_PHONE else ""

    email_body = f"""Hi {first_name},

{insights['personalized_opener']}

{insights['specific_observation']} I'm guessing {insights['pain_point']} eats up more time than it should.

{insights['relevant_solution']}

Happy to jump on a quick call if you want to see how it works - 15 minutes, no pressure. I can walk you through exactly what it would look like for {gym_name}.

Cheers,
{YOUR_NAME}{phone_line}

P.S. The system has AI-powered comms built in - payment reminders, class notifications, trial follow-ups all happen automatically. Most gyms we work with get back 10-15 hours a week."""

    return email_body


# ============================================================================
# EMAIL SENDING FUNCTIONS
# ============================================================================

def send_email(to_email, subject, body, gym_name):
    """Send email via configurable SMTP"""

    if DRY_RUN:
        print(f"\n{'='*80}")
        print(f"[DRY RUN] Would send to: {to_email}")
        print(f"Gym: {gym_name}")
        print(f"Subject: {subject}")
        print(f"\n{body}")
        print(f"{'='*80}\n")
        return True

    # Override recipient in test mode
    original_email = to_email
    if TEST_MODE:
        to_email = TEST_EMAIL
        subject = f"[TEST - {gym_name}] {subject}"

    # Create message
    msg = MIMEMultipart('alternative')
    msg['From'] = GMAIL_ADDRESS
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        if SMTP_USE_SSL:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
                server.send_message(msg)

        if TEST_MODE:
            print(f"[OK] Test email sent for {gym_name} (to {to_email}, originally {original_email})")
        else:
            print(f"[OK] Email sent to {gym_name} ({to_email})")
        return True

    except smtplib.SMTPAuthenticationError:
        print(f"[FAIL] SMTP authentication failed for {gym_name} ({to_email}): check GMAIL_ADDRESS and GMAIL_APP_PASSWORD")
        return False
    except smtplib.SMTPRecipientsRefused:
        print(f"[FAIL] Recipient refused for {gym_name} ({to_email})")
        return False
    except (smtplib.SMTPServerDisconnected, ConnectionRefusedError, TimeoutError) as e:
        print(f"[FAIL] Cannot connect to SMTP server {SMTP_HOST}:{SMTP_PORT} - {e}")
        return False
    except smtplib.SMTPException as e:
        print(f"[FAIL] SMTP error sending to {gym_name} ({to_email}): {e}")
        return False
    except OSError as e:
        print(f"[FAIL] Network error sending to {gym_name} ({to_email}): {e}")
        return False


def extract_email_from_field(email_field):
    """Extract email address from field (handles 'Contact via website' cases)"""
    if not email_field or email_field.lower() == 'contact via website':
        return None

    # Use regex to find email pattern
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    match = re.search(email_pattern, email_field)

    return match.group(0) if match else None


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """Main execution function"""

    print("="*80)
    print("ROAR MMA EMAIL AUTOMATION SYSTEM")
    print("="*80)
    if DRY_RUN:
        print(f"Mode: DRY RUN (no emails sent)")
    elif TEST_MODE:
        print(f"Mode: TEST MODE (all emails sent to {TEST_EMAIL})")
    else:
        print(f"Mode: LIVE (emails will be sent to actual gyms)")
    print(f"Delay between emails: {DELAY_BETWEEN_EMAILS} seconds")
    print("="*80)

    if not DRY_RUN:
        if sys.stdin.isatty():
            if TEST_MODE:
                confirm = input(f"\n[TEST MODE] All emails will be sent to {TEST_EMAIL}. Continue? (yes/no): ")
            else:
                confirm = input("\n[WARNING] You are in LIVE mode. Emails will be sent to actual gyms. Continue? (yes/no): ")
            if confirm.lower() != 'yes':
                print("Aborted.")
                return
        elif '--confirm' not in sys.argv:
            print("[ABORTED] Non-interactive shell detected. Use --confirm flag to force execution.")
            return

    # Read CSV file (accept as command-line argument or use default)
    csv_file = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('EMAIL_CSV_FILE', 'perth_martial_arts_gyms.csv')
    csv_file = os.path.normpath(csv_file)
    if not os.path.isfile(csv_file):
        print(f"Error: File not found: {csv_file}")
        return

    try:
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            gyms = list(reader)
    except FileNotFoundError:
        print(f"Error: Could not find {csv_file}")
        return

    print(f"\nLoaded {len(gyms)} gyms from CSV\n")

    # Statistics
    sent_count = 0
    skipped_count = 0
    failed_count = 0

    # Process each gym
    for idx, gym in enumerate(gyms, 1):
        gym_name = gym.get('Gym Name', '').strip()
        email_field = gym.get('Email', '').strip()
        description = gym.get('Description', '').strip()
        styles = gym.get('Martial Arts Styles', '').strip()
        address = gym.get('Address', '').strip()

        # Skip if no gym name
        if not gym_name:
            continue

        # Extract email
        email = extract_email_from_field(email_field)

        if not email:
            print(f"[{idx}/{len(gyms)}] - Skipping {gym_name} - No email address")
            skipped_count += 1
            continue

        # Generate personalized content
        insights = analyze_gym_description(description, gym_name, styles, address)
        subject = generate_subject_line(gym_name, insights)
        body = generate_email_body(gym_name, "", insights)  # No contact name in CSV

        # Send email
        print(f"[{idx}/{len(gyms)}] Processing {gym_name}...")
        success = send_email(email, subject, body, gym_name)

        if success:
            sent_count += 1
        else:
            failed_count += 1

        # Delay between emails (except for last one)
        if idx < len(gyms) and not DRY_RUN:
            time.sleep(DELAY_BETWEEN_EMAILS)

    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Total gyms: {len(gyms)}")
    print(f"Emails sent: {sent_count}")
    print(f"Skipped (no email): {skipped_count}")
    print(f"Failed: {failed_count}")
    print("="*80)

    if DRY_RUN:
        print("\n[INFO] This was a DRY RUN. Set DRY_RUN = False to actually send emails.")
        print("[INFO] Make sure to configure your Gmail credentials first!")


if __name__ == "__main__":
    main()
