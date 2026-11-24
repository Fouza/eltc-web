// Labels and badge tones for every enum coming from the API.
export const STUDENT_STATUS = {
  prospect: { label: 'Waiting list', tone: 'amber' },
  active: { label: 'Active', tone: 'green' },
  inactive: { label: 'Inactive', tone: 'gray' },
  graduated: { label: 'Graduated', tone: 'purple' },
};
export const GROUP_STATUS = {
  planned: { label: 'Planned', tone: 'cyan' },
  ongoing: { label: 'Ongoing', tone: 'green' },
  completed: { label: 'Completed', tone: 'gray' },
  cancelled: { label: 'Cancelled', tone: 'red' },
};
export const ENROLLMENT_STATUS = {
  active: { label: 'In class', tone: 'green' },
  completed: { label: 'Completed', tone: 'blue' },
  dropped: { label: 'Left', tone: 'red' },
  transferred: { label: 'Transferred', tone: 'gray' },
};
export const FINAL_RESULTS = {
  pending: { label: 'Pending', tone: 'gray' },
  passed: { label: 'Passed', tone: 'green' },
  failed: { label: 'Failed', tone: 'red' },
};
export const INVOICE_STATUS = {
  unpaid: { label: 'Unpaid', tone: 'amber' },
  partial: { label: 'Partly paid', tone: 'cyan' },
  paid: { label: 'Paid', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'gray' },
  overdue: { label: 'Overdue', tone: 'red' },
};
export const ATTENDANCE_STATUS = {
  present: { label: 'Present', short: 'P', tone: 'green' },
  absent: { label: 'Absent', short: 'A', tone: 'red' },
  late: { label: 'Late', short: 'L', tone: 'amber' },
  excused: { label: 'Excused', short: 'E', tone: 'blue' },
};
export const EXAM_TYPES = {
  placement: { label: 'Placement test', tone: 'cyan' },
  quiz: { label: 'Quiz', tone: 'blue' },
  midterm: { label: 'Midterm', tone: 'purple' },
  final: { label: 'Final exam', tone: 'pink' },
  oral: { label: 'Oral', tone: 'amber' },
};
export const PAYMENT_METHODS = { cash: 'Cash', card: 'Card', transfer: 'Bank transfer', cheque: 'Cheque' };
export const AUDIENCES = { adults: 'Adults', children: 'Children' };
// Default level names of a new program (same as eltc-api/src/constants/enums.js). Names stay editable.
// Adults: A1, A2, B1, B1+, B2, C1. Children: Bounce 1 → Bounce 6.
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B1+', 'B2', 'C1'];
export const CHILDREN_LEVELS = ['Bounce 1', 'Bounce 2', 'Bounce 3', 'Bounce 4', 'Bounce 5', 'Bounce 6'];
export const DEFAULT_LEVELS = { adults: CEFR_LEVELS, children: CHILDREN_LEVELS };
export const defaultLevelNames = (audience) => DEFAULT_LEVELS[audience] ?? CEFR_LEVELS;
export const CAMPUS_STATUS = {
  active: { label: 'Open', tone: 'green' },
  opening: { label: 'Opening soon', tone: 'purple' },
  closed: { label: 'Closed', tone: 'gray' },
};
export const NOTIFICATION_TYPES = {
  payment_overdue: 'Overdue payment',
  payments_due_soon: 'Payments due soon',
  low_attendance: 'Low attendance',
  low_book_stock: 'Books running low',
  exam_not_graded: 'Results missing',
  group_almost_full: 'Group almost full',
  group_ended: 'Group ended',
};
export const SOURCES = ['Facebook', 'Instagram', 'Friend', 'Walk-in', 'Google', 'Former student', 'Other'];

// Certificates (copy of eltc-api/src/constants/enums.js MENTIONS — keep in sync).
export const CERTIFICATE_STATUS = {
  ready: { label: 'Ready to collect', tone: 'amber' },
  handed: { label: 'Handed over', tone: 'green' },
  revoked: { label: 'Revoked', tone: 'red' },
};
export const CERTIFICATE_RECEIVERS = { student: 'The student', guardian: 'Parent / guardian', other: 'Someone else' };
export const MENTIONS = [
  { min: 80, label: 'Very good' },
  { min: 70, label: 'Good' },
  { min: 60, label: 'Fairly good' },
  { min: 0, label: 'Pass' },
];
export const mentionFor = (score) => (typeof score === 'number' ? MENTIONS.find((m) => score >= m.min).label : null);
