import {
  LayoutDashboard, Users, Hourglass, Layers, CalendarDays, ClipboardCheck, GraduationCap, Award, Wallet, BookOpen, BookCopy, UserSquare2, Settings, Bell,
} from 'lucide-react';
import { CAN } from '@data/roles';

// Sidebar entries. `roles` hides the entry (the route itself is also guarded in routes.jsx).
export const NAV = [
  { section: 'Overview' },
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, roles: CAN.viewDashboard },
  { to: '/notifications', label: 'Notifications', icon: Bell, badge: 'notifications' },
  { section: 'Students' },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/waiting-list', label: 'Waiting list', icon: Hourglass },
  { section: 'Teaching' },
  { to: '/groups', label: 'Groups', icon: Layers },
  { to: '/timetable', label: 'Timetable', icon: CalendarDays },
  { to: '/attendance', label: 'Attendance', icon: ClipboardCheck },
  { to: '/exams', label: 'Exams & grades', icon: GraduationCap },
  { to: '/certificates', label: 'Certificates', icon: Award, roles: CAN.manageCertificates },
  { section: 'Finance', roles: CAN.viewFinance },
  { to: '/payments', label: 'Payments', icon: Wallet, roles: CAN.viewFinance },
  { section: 'School' },
  { to: '/programs', label: 'Programs & levels', icon: BookOpen },
  { to: '/books', label: 'Books', icon: BookCopy },
  { to: '/teachers', label: 'Teachers', icon: UserSquare2 },
  { to: '/settings', label: 'Settings', icon: Settings, roles: CAN.manageSettings },
];
