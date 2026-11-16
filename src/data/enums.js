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
export const AUDIENCES = { adults: 'Adults', teens: 'Teens', children: 'Children' };
export const CAMPUS_STATUS = {
  active: { label: 'Open', tone: 'green' },
  opening: { label: 'Opening soon', tone: 'purple' },
  closed: { label: 'Closed', tone: 'gray' },
};
export const NOTIFICATION_TYPES = {
  payment_overdue: 'Overdue payment',
  payments_due_soon: 'Payments due soon',
  low_attendance: 'Low attendance',
  exam_not_graded: 'Results missing',
  group_almost_full: 'Group almost full',
  group_ended: 'Group ended',
};
export const SOURCES = ['Facebook', 'Instagram', 'Friend', 'Walk-in', 'Google', 'Former student', 'Other'];
