import dayjs from 'dayjs';

// Session days of a group, on 'YYYY-MM-DD' keys (the API stores days at 00:00 UTC, so the first 10 characters are the day).
export const dayKey = (d) => (typeof d === 'string' ? d.slice(0, 10) : dayjs(d).format('YYYY-MM-DD'));
const weekday = (key) => dayjs(key).day();

export const isClassDay = (group, key) => (group?.schedule ?? []).some((s) => s.day === weekday(key));
export const runsOn = (group, key) => (!group.startDate || key >= dayKey(group.startDate)) && (!group.endDate || key <= dayKey(group.endDate));
export const cancellationOn = (group, key) => (group?.cancelledSessions ?? []).find((c) => dayKey(c.date) === key) ?? null;

// Why there is no class for this group on this day (null = there is one). Same rules as the API (helpers/classDays.js).
export const sessionProblem = (group, key) => {
  if (!group || !key) return null;
  if (group.startDate && key < dayKey(group.startDate)) return `This group starts on ${dayjs(dayKey(group.startDate)).format('D MMM YYYY')}`;
  if (group.endDate && key > dayKey(group.endDate)) return `This group ended on ${dayjs(dayKey(group.endDate)).format('D MMM YYYY')}`;
  if (!isClassDay(group, key)) return `No class on ${dayjs(key).format('dddd')} for this group`;
  if (cancellationOn(group, key)) return 'This session was cancelled';
  return null;
};

// The group's previous / next class day from a day (stays inside the group's dates; null when there is none).
export const stepClassDay = (group, key, dir) => {
  let d = dayjs(key);
  for (let i = 0; i < 7; i++) {
    d = d.add(dir, 'day');
    const k = d.format('YYYY-MM-DD');
    if (isClassDay(group, k)) return runsOn(group, k) ? k : null;
  }
  return null;
};
