// The school's fixed class sessions. A group picks its sessions instead of free times; the schedule is derived from them.
// Kids: 1 session a week, weekend only. Adults: 2 sessions a week on different days (any pair).
// Copy of eltc-api/src/constants/sessions.js — keep both in sync.
export const SESSIONS = [
  { key: 'sat_am', label: 'Saturday Morning', day: 6, startTime: '08:00', endTime: '11:00', audiences: ['adults', 'children'] },
  { key: 'sat_mid', label: 'Saturday Midday', day: 6, startTime: '11:00', endTime: '14:00', audiences: ['children'] },
  { key: 'sat_pm', label: 'Saturday Afternoon', day: 6, startTime: '14:00', endTime: '17:00', audiences: ['adults', 'children'] },
  { key: 'eve_sun', label: 'Evening Sun', day: 0, startTime: '17:00', endTime: '19:00', audiences: ['adults'] },
  { key: 'eve_tue', label: 'Evening Tue', day: 2, startTime: '17:00', endTime: '19:00', audiences: ['adults'] },
  { key: 'eve_thu', label: 'Evening Thu', day: 4, startTime: '17:00', endTime: '19:00', audiences: ['adults'] },
  { key: 'fri_am', label: 'Friday Morning', day: 5, startTime: '08:30', endTime: '11:30', audiences: ['adults', 'children'] },
  { key: 'fri_pm', label: 'Friday Afternoon', day: 5, startTime: '14:30', endTime: '17:30', audiences: ['adults', 'children'] },
];
export const SESSION_KEYS = SESSIONS.map((s) => s.key);
export const SESSIONS_PER_WEEK = { adults: 2, children: 1 };

export const sessionsFor = (audience) => SESSIONS.filter((s) => s.audiences.includes(audience));

// Sessions in week order (the list above starts on Saturday), e.g. "Saturday Morning + Evening Tue".
export const sortSessions = (keys = []) => SESSION_KEYS.filter((k) => keys.includes(k));
export const sessionsLabel = (keys = []) => sortSessions(keys).map((k) => SESSIONS.find((s) => s.key === k).label).join(' + ');

// Returns an error message, or null when the choice is valid for this audience.
export const checkSessions = (keys = [], audience = 'adults') => {
  const allowed = sessionsFor(audience).map((s) => s.key);
  const need = SESSIONS_PER_WEEK[audience] ?? 1;
  const who = audience === 'children' ? 'Kids' : 'Adults';
  if (keys.length !== need) return `${who} groups have ${need} session${need > 1 ? 's' : ''} a week`;
  if (keys.some((k) => !allowed.includes(k))) return `This session is not available for ${who.toLowerCase()}`;
  const days = keys.map((k) => SESSIONS.find((s) => s.key === k).day);
  if (new Set(days).size !== days.length) return 'Pick sessions on different days';
  return null;
};

export const scheduleFromSessions = (keys = []) =>
  sortSessions(keys).map((k) => {
    const { day, startTime, endTime } = SESSIONS.find((s) => s.key === k);
    return { day, startTime, endTime };
  });
