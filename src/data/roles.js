// Copy of eltc-api/src/constants/roles.js — keep both in sync.
export const ROLES = { ADMIN: 'admin', SECRETARY: 'secretary', ACCOUNTANT: 'accountant', COORDINATOR: 'coordinator' };
export const ALL_ROLES = Object.values(ROLES);

export const ROLE_LABELS = {
  admin: 'Admin (manager)',
  secretary: 'Secretary',
  accountant: 'Accountant',
  coordinator: 'Pedagogical coordinator',
};

export const CAN = {
  manageUsers: [ROLES.ADMIN],
  manageSettings: [ROLES.ADMIN],
  manageCampuses: [ROLES.ADMIN],
  managePrograms: [ROLES.ADMIN, ROLES.COORDINATOR],
  manageTeachers: [ROLES.ADMIN, ROLES.COORDINATOR, ROLES.SECRETARY],
  manageGroups: [ROLES.ADMIN, ROLES.COORDINATOR, ROLES.SECRETARY],
  manageStudents: [ROLES.ADMIN, ROLES.SECRETARY, ROLES.COORDINATOR],
  deleteStudents: [ROLES.ADMIN],
  manageEnrollments: [ROLES.ADMIN, ROLES.SECRETARY, ROLES.COORDINATOR],
  recordAttendance: [ROLES.ADMIN, ROLES.SECRETARY, ROLES.COORDINATOR],
  manageExams: [ROLES.ADMIN, ROLES.SECRETARY, ROLES.COORDINATOR],
  manageInvoices: [ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.SECRETARY],
  recordPayments: [ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.SECRETARY],
  deletePayments: [ROLES.ADMIN, ROLES.ACCOUNTANT],
  viewFinance: [ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.SECRETARY],
};
