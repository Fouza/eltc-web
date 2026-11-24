// Copy of eltc-api/src/services/databaseApi/Invoice/buildMonthlyPlan.js (the API creates the real invoices) — keep both in sync.
// A level is paid in blocks of 4 weeks from the group's start date: each block is due on its first day and overdue on the
// first day of the next one. A student who joins late pays only the weeks left (joining in week 3 → weeks 3–4).
const DAY = 24 * 3600 * 1000;
const WEEKS_PER_BLOCK = 4;
const day = (d) => {
  const x = new Date(d);
  return new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()));
};
const addDays = (d, n) => new Date(d.getTime() + n * DAY);

export const buildMonthlyPlan = ({ total, weeks, startDate, joinDate = new Date() }) => {
  const totalWeeks = weeks > 0 ? weeks : WEEKS_PER_BLOCK;
  const count = Math.ceil(totalWeeks / WEEKS_PER_BLOCK);
  const start = day(startDate ?? joinDate);
  const joined = day(joinDate);
  const perWeek = total / totalWeeks;
  const joinWeek = joined <= start ? 1 : Math.floor((joined - start) / DAY / 7) + 1;

  const plan = [];
  for (let i = 0; i < count; i++) {
    const firstWeek = i * WEEKS_PER_BLOCK + 1;
    const lastWeek = Math.min(firstWeek + WEEKS_PER_BLOCK - 1, totalWeeks);
    const skipped = joinWeek > lastWeek;
    const fromWeek = skipped ? firstWeek : Math.max(firstWeek, joinWeek);
    const blockStart = addDays(start, (firstWeek - 1) * 7);
    plan.push({
      index: i + 1, count, fromWeek, toWeek: lastWeek, skipped,
      weeks: lastWeek - fromWeek + 1,
      dueDate: blockStart > joined ? blockStart : joined,
      overdueAt: addDays(start, lastWeek * 7),
    });
  }
  const charged = plan.filter((b) => !b.skipped);
  let left = Math.round(perWeek * charged.reduce((s, b) => s + b.weeks, 0));
  charged.forEach((b, i) => {
    b.amount = i === charged.length - 1 ? left : Math.round(perWeek * b.weeks);
    left -= b.amount;
  });
  return { weeks: totalWeeks, blocks: count, perBlock: Math.round(perWeek * WEEKS_PER_BLOCK), plan };
};

// "Weeks 5–8", "Week 9"
export const weeksLabel = (b) => (b.fromWeek === b.toWeek ? `Week ${b.fromWeek}` : `Weeks ${b.fromWeek}–${b.toWeek}`);
