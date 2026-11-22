import dayjs from 'dayjs';

// Copy of eltc-api/src/services/databaseApi/Invoice/buildMonthlyPlan.js (the API creates the real invoices) — keep both in sync.
// A level's fee is split by its length in months (4 weeks = 1 month), paid at the start of each month.
// A student who joins late only pays the months that haven't ended yet.
const day = (d) => new Date(`${dayjs(d).format('YYYY-MM-DD')}T00:00:00.000Z`);

export const buildMonthlyPlan = ({ total, weeks, startDate, joinDate = new Date() }) => {
  const months = Math.max(weeks > 0 ? weeks / 4 : 1, 0.5);
  const count = Math.ceil(months);
  const start = day(startDate ?? joinDate);
  const joined = day(joinDate);
  const courseEnd = dayjs(start).add(weeks > 0 ? weeks * 7 : 30, 'day').toDate();
  const perMonth = total / months;

  const months_ = [];
  for (let i = 0; i < count; i++) {
    const monthStart = dayjs(start).add(i, 'month').toDate();
    const monthEnd = i === count - 1 ? courseEnd : dayjs(start).add(i + 1, 'month').toDate();
    const share = Math.min(1, months - i);
    months_.push({ index: i + 1, count, share, monthStart, skipped: joined >= monthEnd, dueDate: monthStart > joined ? monthStart : joined });
  }
  const charged = months_.filter((m) => !m.skipped);
  let left = Math.round(perMonth * charged.reduce((s, m) => s + m.share, 0));
  charged.forEach((m, i) => {
    m.amount = i === charged.length - 1 ? left : Math.round(perMonth * m.share);
    left -= m.amount;
  });
  return { months, perMonth: Math.round(perMonth), plan: months_ };
};
