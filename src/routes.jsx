import { lazy } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useSelector } from 'react-redux';
import AppLayout from '@layouts/AppLayout/AppLayout';
import PublicLayout from '@layouts/PublicLayout/PublicLayout';
import { Loader } from '@components';
import { hasRole } from '@helpers/auth';
import { CAN } from '@data/roles';
import Unauthorized from '@pages/Errors/Unauthorized';
import NotFound from '@pages/Errors/NotFound';

const page = (loader) => lazy(loader);
const Login = page(() => import('@pages/Login/Login'));

// Same idea as Rangewell's route config: each route declares `auth` and optional `roles`.
export const routeConfig = [
  {
    path: '/login',
    layout: PublicLayout,
    guestOnly: true,
    children: [{ index: true, page: Login }],
  },
  {
    path: '/',
    layout: AppLayout,
    auth: true,
    children: [
      { index: true, page: page(() => import('@pages/Dashboard/Dashboard')) },
      { path: 'notifications', page: page(() => import('@pages/Notifications/Notifications')) },
      { path: 'students', page: page(() => import('@pages/Students/StudentsList')) },
      { path: 'students/new', page: page(() => import('@pages/Students/StudentForm')), roles: CAN.manageStudents },
      { path: 'students/:id', page: page(() => import('@pages/Students/StudentProfile')) },
      { path: 'students/:id/edit', page: page(() => import('@pages/Students/StudentForm')), roles: CAN.manageStudents },
      { path: 'waiting-list', page: page(() => import('@pages/WaitingList/WaitingList')) },
      { path: 'groups', page: page(() => import('@pages/Groups/GroupsList')) },
      { path: 'groups/:id', page: page(() => import('@pages/Groups/GroupDetail')) },
      { path: 'timetable', page: page(() => import('@pages/Timetable/Timetable')) },
      { path: 'attendance', page: page(() => import('@pages/Attendance/AttendanceEntry')) },
      { path: 'exams', page: page(() => import('@pages/Exams/ExamsList')) },
      { path: 'exams/:id', page: page(() => import('@pages/Exams/ExamDetail')) },
      { path: 'payments', page: page(() => import('@pages/Payments/Payments')), roles: CAN.viewFinance },
      { path: 'payments/:id/receipt', page: page(() => import('@pages/Payments/Receipt')), roles: CAN.viewFinance },
      { path: 'programs', page: page(() => import('@pages/Programs/Programs')) },
      { path: 'teachers', page: page(() => import('@pages/Teachers/Teachers')) },
      { path: 'settings', page: page(() => import('@pages/Settings/Settings')), roles: CAN.manageSettings },
      { path: 'account', page: page(() => import('@pages/Account/Account')) },
      { path: '*', page: NotFound },
    ],
  },
];

// Redirects to /login when the route needs auth, shows Unauthorized when the role is missing.
const Guard = ({ auth, roles, guestOnly, children }) => {
  const { user, status } = useSelector((s) => s.auth);
  const location = useLocation();
  if (status === 'loading') return <Loader full />;
  if (guestOnly && user) return <Navigate to={new URLSearchParams(location.search).get('next') ?? '/'} replace />;
  if (auth && !user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (roles && !hasRole(user, roles)) return <Unauthorized />;
  return children;
};

// routeConfig → React Router 7 route objects.
const toRoute = ({ layout: Layout, page: Page, children, auth, roles, guestOnly, ...rest }) => {
  const Element = Layout ?? Page;
  return {
    ...rest,
    element: (
      <Guard auth={auth} roles={roles} guestOnly={guestOnly}>
        <Element />
      </Guard>
    ),
    ...(children ? { children: children.map(toRoute) } : {}),
  };
};

export const routes = routeConfig.map(toRoute);
