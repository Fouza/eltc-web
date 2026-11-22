import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { DAYS_SHORT } from '@data/days';
import { defaultLevelNames } from '@data/enums';

dayjs.extend(relativeTime);

let currency = 'DZD';
let locale = 'fr-FR';
// Called once the school settings are loaded.
export const setFormatSettings = (s) => {
  if (s?.currency) currency = s.currency;
  if (s?.locale) locale = s.locale;
};

// Narrow no-break spaces (fr-FR thousands separator) are swapped for regular ones: not every font has the glyph.
const fmt = (n, opts) => new Intl.NumberFormat(locale, opts).format(n).replace(/\u202F/g, '\u00A0');

export const money = (n, { withCurrency = true } = {}) => {
  const v = Number(n) || 0;
  const value = fmt(v, { maximumFractionDigits: Math.abs(v) >= 1000 ? 0 : 2 });
  return withCurrency ? `${value} ${currency}` : value;
};
export const number = (n) => fmt(Number(n) || 0);
export const currencyCode = () => currency;

// Display formats: "14 Oct 2026", "14 Oct 2026, 18:30", "14 Oct" (no year), "Oct 2026" (month only).
// Date inputs keep the browser's own format (see toInputDate).
export const formatDate = (d) => (d ? dayjs(d).format('D MMM YYYY') : '—');
export const formatDateTime = (d) => (d ? dayjs(d).format('D MMM YYYY, HH:mm') : '—');
export const formatDay = (d) => (d ? dayjs(d).format('D MMM') : '—');
export const formatMonth = (d) => (d ? dayjs(d).format('MMM YYYY') : '—');
export const fromNow = (d) => (d ? dayjs(d).fromNow() : '—');
export const toInputDate = (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '');
export const todayInput = () => dayjs().format('YYYY-MM-DD');

export const age = (birthDate) => (birthDate ? dayjs().diff(birthDate, 'year') : null);
export const fullName = (p) => [p?.firstName, p?.lastName].filter(Boolean).join(' ');
export const initials = (p) => `${p?.firstName?.[0] ?? ''}${p?.lastName?.[0] ?? ''}`.toUpperCase() || '?';

export const scheduleLabel = (schedule = []) =>
  schedule.map((s) => `${DAYS_SHORT[s.day]} ${s.startTime}–${s.endTime}`).join(' · ') || 'No schedule';

// Level name: the program's own name when its levels are loaded, else the default for its audience (A1… or Bounce 1…).
export const levelName = (number, program) =>
  program?.levels?.find((l) => l.number === Number(number))?.name ?? defaultLevelNames(program?.audience)[Number(number) - 1] ?? `Level ${number}`;

export const percent = (n) => (n === null || n === undefined ? '—' : `${n}%`);

// Stable colour from a string (avatars).
const AVATAR_COLORS = ['#064CA5', '#7B3FE4', '#0EA5A4', '#EC4899', '#F59E0B', '#12B76A', '#3B82F6', '#A855F7'];
export const colorFor = (s = '') => AVATAR_COLORS[[...s].reduce((h, c) => h + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
