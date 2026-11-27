// Plain API functions per domain (Rangewell's modules/Actions). No Redux here.
import { api } from './client';

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/me'),
  updateMe: (data) => api.put('/me', data),
  changePassword: (currentPassword, newPassword) => api.put('/me/password', { currentPassword, newPassword }),
};

export const usersApi = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  resetPassword: (id, password) => api.put(`/users/${id}/password`, { password }),
};

const crud = (path) => ({
  list: (params) => api.get(path, params),
  get: (id) => api.get(`${path}/${id}`),
  create: (data) => api.post(path, data),
  update: (id, data) => api.put(`${path}/${id}`, data),
  remove: (id) => api.delete(`${path}/${id}`),
});

export const campusesApi = crud('/campuses');
export const languagesApi = crud('/languages');
export const programsApi = crud('/programs');
export const booksApi = {
  ...crud('/books'),
  stock: (id, data) => api.post(`/books/${id}/stock`, data),
};
export const teachersApi = crud('/teachers');
export const certificatesApi = {
  list: (params) => api.get('/certificates', params),
  candidates: (params) => api.get('/certificates/candidates', params),
  stats: (params) => api.get('/certificates/stats', params),
  forPrint: (ids) => api.get('/certificates/print', { ids: ids.join(',') }),
  issue: (enrollmentIds) => api.post('/certificates', { enrollmentIds }),
  printed: (ids) => api.post('/certificates/printed', { ids }),
  handover: (id, data) => api.post(`/certificates/${id}/handover`, data),
  undoHandover: (id) => api.delete(`/certificates/${id}/handover`),
  revoke: (id, reason) => api.post(`/certificates/${id}/revoke`, { reason }),
  verify: (code) => api.get(`/verify/${encodeURIComponent(code)}`), // public, no login
};

export const groupsApi = {
  ...crud('/groups'),
  attendance: (id) => api.get(`/groups/${id}/attendance`),
  promote: (id, data) => api.post(`/groups/${id}/promote`, data),
  cancelSession: (id, data) => api.post(`/groups/${id}/cancellations`, data),
  restoreSession: (id, date) => api.delete(`/groups/${id}/cancellations/${date}`),
};

export const studentsApi = {
  ...crud('/students'),
  waitingList: (params) => api.get('/students/waiting-list', params),
  import: (data) => api.post('/students/import', data),
};

export const enrollmentsApi = {
  create: (data) => api.post('/enrollments', data),
  update: (id, data) => api.put(`/enrollments/${id}`, data),
  transfer: (id, groupId) => api.post(`/enrollments/${id}/transfer`, { groupId }),
};

export const attendanceApi = {
  sheet: (groupId, date) => api.get('/attendance/sheet', { groupId, date }),
  save: (data) => api.put('/attendance/sheet', data),
  remove: (id) => api.delete(`/attendance/${id}`),
  alerts: (params) => api.get('/attendance/alerts', params),
};

export const examsApi = {
  ...crud('/exams'),
  saveResults: (id, results) => api.put(`/exams/${id}/results`, { results }),
};

export const invoicesApi = {
  list: (params) => api.get('/invoices', params),
  get: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  cancel: (id) => api.post(`/invoices/${id}/cancel`),
  handover: (id, handedOver) => api.post(`/invoices/${id}/handover`, { handedOver }),
};

export const paymentsApi = {
  list: (params) => api.get('/payments', params),
  get: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  remove: (id) => api.delete(`/payments/${id}`),
};

export const notificationsApi = {
  list: (params) => api.get('/notifications', params),
  read: (id) => api.put(`/notifications/${id}/read`),
  readAll: () => api.put('/notifications/read-all'),
};

export const dashboardApi = { get: (params) => api.get('/dashboard', params) };
export const searchApi = { search: (q) => api.get('/search', { q }) };
export const settingsApi = { get: () => api.get('/settings'), update: (data) => api.put('/settings', data) };
