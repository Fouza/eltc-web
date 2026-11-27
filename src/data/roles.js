// Copy of eltc-api/src/constants/roles.js — keep both in sync.
export const ROLES = { ADMIN: 'admin', SECRETARY: 'secretary' };
export const ALL_ROLES = Object.values(ROLES);

export const ROLE_LABELS = {
  admin: 'Admin (manager)',
  secretary: 'Secretary',
};

// Who may write what. Reading is open to every logged-in staff member.
const ADMIN_ONLY = [ROLES.ADMIN];
const STAFF = [ROLES.ADMIN, ROLES.SECRETARY];

export const CAN = {
  manageUsers: ADMIN_ONLY,
  manageSettings: ADMIN_ONLY,
  viewDashboard: ADMIN_ONLY, // school-wide figures (income, debts…): the manager only; others start on Students
  manageCampuses: ADMIN_ONLY,
  managePrograms: STAFF,
  manageBooks: STAFF,
  deleteBooks: ADMIN_ONLY,
  manageCertificates: STAFF,
  revokeCertificates: ADMIN_ONLY,
  manageTeachers: STAFF,
  manageGroups: STAFF,
  manageStudents: STAFF,
  deleteStudents: ADMIN_ONLY, // deletes are permanent: kept for the manager
  manageEnrollments: STAFF,
  recordAttendance: STAFF,
  manageExams: STAFF,
  manageInvoices: STAFF,
  recordPayments: STAFF,
  deletePayments: ADMIN_ONLY, // protects the cash: a recorded payment can only be removed by the manager
  viewFinance: STAFF,
};
