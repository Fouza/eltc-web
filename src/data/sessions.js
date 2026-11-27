// The school's fixed class sessions. A group picks its sessions instead of free times; the schedule is derived from them.
// Kids: 1 weekend session a week. Adults: one of 3 schedules with the same hours (6 h a week):
// Weekend Morning (Fri + Sat mornings), Weekend Afternoon (Fri + Sat afternoons) or Evening (Sun, Tue, Thu).
// Copy of eltc-api/src/constants/sessions.js — keep both in sync.
export const SESSIONS = [
  { key: 'sat_am', label: 'Saturday Morning', day: 6, startTime: '08:00', endTime: '11:00', audiences: ['adults', 'children'] },
  { key: 'sat_mid', label: 'Saturday Midday', day: 6, startTime: '11:00', endTime: '14:00', audiences: ['children'] },
  { key: 'sat_pm', label: 'Saturday Afternoon', day: 6, startTime: '14:00', endTime: '17:00', audiences: ['adults', 'children'] },
  { key: 'eve_sun', label: 'Evening Sun', day: 0, startTime: '17:00', endTime: '19:00', audiences: ['adults'] },
  { key: 'tue_pm', label: 'Tuesday Afternoon', day: 2, startTime: '13:30', endTime: '16:30', audiences: ['children'] },
  { key: 'eve_tue', label: 'Evening Tue', day: 2, startTime: '17:00', endTime: '19:00', audiences: ['adults'] },
  { key: 'eve_thu', label: 'Evening Thu', day: 4, startTime: '17:00', endTime: '19:00', audiences: ['adults'] },
  { key: 'fri_am', label: 'Friday Morning', day: 5, startTime: '08:30', endTime: '11:30', audiences: ['adults', 'children'] },
  { key: 'fri_pm', label: 'Friday Afternoon', day: 5, startTime: '14:30', endTime: '17:30', audiences: ['adults', 'children'] },
];
export const SESSION_KEYS = SESSIONS.map((s) => s.key);

// Adults choose a whole schedule, not single sessions.
export const ADULT_SCHEDULES = [
  { key: 'weekend_am', label: 'Weekend Morning', sessions: ['sat_am', 'fri_am'] },
  { key: 'weekend_pm', label: 'Weekend Afternoon', sessions: ['sat_pm', 'fri_pm'] },
  { key: 'evening', label: 'Evening', sessions: ['eve_sun', 'eve_tue', 'eve_thu'] },
];

export const sessionsFor = (audience) => SESSIONS.filter((s) => s.audiences.includes(audience));

// Sessions in week order (the list above starts on Saturday).
export const sortSessions = (keys = []) => SESSION_KEYS.filter((k) => keys.includes(k));

// The adult schedule these sessions make up, if any.
export const adultScheduleOf = (keys = []) => {
  const sorted = sortSessions(keys).join();
  return ADULT_SCHEDULES.find((p) => sortSessions(p.sessions).join() === sorted) ?? null;
};

// "Weekend Morning", "Evening" (adults) or "Saturday Midday" (kids).
export const sessionsLabel = (keys = []) =>
  adultScheduleOf(keys)?.label ?? sortSessions(keys).map((k) => SESSIONS.find((s) => s.key === k).label).join(' + ');

// Returns an error message, or null when the choice is valid for this audience.
export const checkSessions = (keys = [], audience = 'adults') => {
  if (audience === 'children') {
    if (keys.length !== 1) return 'Kids groups have 1 session a week';
    if (!sessionsFor('children').some((s) => s.key === keys[0])) return 'This session is not available for kids';
    return null;
  }
  return adultScheduleOf(keys) ? null : 'Adults groups follow one schedule: Weekend Morning, Weekend Afternoon or Evening';
};

export const scheduleFromSessions = (keys = []) =>
  sortSessions(keys).map((k) => {
    const { day, startTime, endTime } = SESSIONS.find((s) => s.key === k);
    return { day, startTime, endTime };
  });

// Waiting list: the time a student asks for. Kids: one session (sat_am…). Adults: one schedule (weekend_am, weekend_pm, evening).
// Empty = any time.
export const PREFERRED_TIME_KEYS = [...sessionsFor('children').map((s) => s.key), ...ADULT_SCHEDULES.map((p) => p.key)];

export const preferredTimesFor = (audience) =>
  audience === 'children'
    ? sessionsFor('children').map((s) => ({ key: s.key, label: s.label, detail: `${s.startTime}–${s.endTime}` }))
    : ADULT_SCHEDULES.map((p) => ({
      key: p.key,
      label: p.label,
      detail: p.sessions.map((k) => SESSIONS.find((s) => s.key === k)).map((s) => `${s.label.replace(/^Evening /, '')} ${s.startTime}–${s.endTime}`).join(' · '),
    }));

export const preferredTimeLabel = (key) => ADULT_SCHEDULES.find((p) => p.key === key)?.label ?? SESSIONS.find((s) => s.key === key)?.label ?? null;

// The group sessions matching a preferred time (to open a group from the waiting list).
export const sessionsOfPreferredTime = (key) => ADULT_SCHEDULES.find((p) => p.key === key)?.sessions ?? (SESSION_KEYS.includes(key) ? [key] : []);
