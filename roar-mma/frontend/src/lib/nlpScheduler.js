const CLASS_TYPES = ['bjj', 'muay thai', 'mma', 'boxing', 'wrestling', 'fitness', 'kids', 'yoga', 'pilates', 'hiit', 'spinning'];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DAY_MAP = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

const LOCATION_ALIASES = {
  rockingham: 'rockingham',
  'bibra lake': 'bibra_lake',
  bibra: 'bibra_lake',
  '247': '247_gym',
  '24/7': '247_gym',
  gym: '247_gym',
};

function to24h(hours, minutes, meridiem) {
  let h = parseInt(hours, 10);
  const m = minutes ? parseInt(minutes, 10) : 0;
  if (meridiem) {
    const pm = meridiem.toLowerCase() === 'pm';
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getNextWeekday(targetDay) {
  const today = new Date();
  const currentDay = today.getDay();
  let diff = targetDay - currentDay;
  if (diff <= 0) diff += 7;
  const d = new Date(today);
  d.setDate(today.getDate() + diff);
  return d;
}

function parseDateFromText(lower) {
  if (lower.includes('today')) return new Date();

  if (lower.includes('tomorrow')) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }

  const nextDayMatch = lower.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
  if (nextDayMatch) return getNextWeekday(DAY_MAP[nextDayMatch[1]]);

  const thisDayMatch = lower.match(/this\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
  if (thisDayMatch) {
    const targetDay = DAY_MAP[thisDayMatch[1]];
    const today = new Date();
    const currentDay = today.getDay();
    let diff = targetDay - currentDay;
    if (diff < 0) diff += 7;
    const d = new Date(today);
    d.setDate(today.getDate() + diff);
    return d;
  }

  if (/\bnext\s+week\b/.test(lower)) {
    const today = new Date();
    const d = new Date(today);
    const currentDay = today.getDay();
    const diff = currentDay === 0 ? 1 : 8 - currentDay;
    d.setDate(today.getDate() + diff);
    return d;
  }

  const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december',
    'jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const monthDayRegex = new RegExp(`(?:starting|on|from)\\s+(${monthNames.join('|')})\\s+(\\d{1,2})(?:st|nd|rd|th)?`, 'i');
  const monthDayMatch = lower.match(monthDayRegex);
  if (monthDayMatch) {
    const monthIdx = monthNames.indexOf(monthDayMatch[1].toLowerCase());
    const actualMonth = monthIdx < 12 ? monthIdx : monthIdx - 12;
    const day = parseInt(monthDayMatch[2], 10);
    const d = new Date();
    d.setMonth(actualMonth);
    d.setDate(day);
    if (d < new Date()) d.setFullYear(d.getFullYear() + 1);
    return d;
  }

  const bareMonthDayRegex = new RegExp(`\\b(${monthNames.join('|')})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i');
  const bareMonthDayMatch = lower.match(bareMonthDayRegex);
  if (bareMonthDayMatch) {
    const monthIdx = monthNames.indexOf(bareMonthDayMatch[1].toLowerCase());
    const actualMonth = monthIdx < 12 ? monthIdx : monthIdx - 12;
    const day = parseInt(bareMonthDayMatch[2], 10);
    const d = new Date();
    d.setMonth(actualMonth);
    d.setDate(day);
    if (d < new Date()) d.setFullYear(d.getFullYear() + 1);
    return d;
  }

  return null;
}

export function parseNaturalLanguage(input) {
  const lower = input.toLowerCase().trim();

  let classType = null;
  let dayOfWeek = null;
  let time = null;
  let location = null;
  let dateStr = null;
  let recurring = false;
  let name = null;

  recurring = /\b(every|each|recurring|repeat|weekly)\b/i.test(lower);

  for (const ct of CLASS_TYPES) {
    const escaped = ct.replace(/ /g, '\\s+');
    if (new RegExp('\\b' + escaped + '\\b', 'i').test(lower)) {
      classType = ct.replace(/\s+/g, '_');
      break;
    }
  }

  for (const day of DAYS) {
    if (lower.includes(day)) {
      dayOfWeek = DAY_MAP[day];
      break;
    }
  }

  for (const [alias, id] of Object.entries(LOCATION_ALIASES)) {
    if (lower.includes(alias)) {
      location = id;
      break;
    }
  }

  const time12Regex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i;
  const time24Regex = /\b(\d{1,2}):(\d{2})(?!\s*(?:am|pm))/i;
  const time12Match = lower.match(time12Regex);
  if (time12Match) {
    time = to24h(time12Match[1], time12Match[2], time12Match[3]);
  } else {
    const time24Match = lower.match(time24Regex);
    if (time24Match) {
      const h = parseInt(time24Match[1], 10);
      if (h >= 0 && h <= 23) {
        time = `${String(h).padStart(2, '0')}:${time24Match[2]}`;
      }
    }
  }

  const parsedDate = parseDateFromText(lower);
  if (parsedDate) {
    const y = parsedDate.getFullYear();
    const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const d = String(parsedDate.getDate()).padStart(2, '0');
    dateStr = `${y}-${m}-${d}`;
  }

  if (classType) {
    name = classType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  return { classType, dayOfWeek, time, location, date: dateStr, recurring, name };
}
