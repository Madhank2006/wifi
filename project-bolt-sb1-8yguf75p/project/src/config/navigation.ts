import {
  LayoutDashboard, BookOpen, CalendarDays, ClipboardCheck, Bell,
  UserCircle, Smartphone, FileEdit, Radio, CheckCircle2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Role } from '@/lib/constants';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  group: string;
}

const ADMIN_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck, group: 'Overview' },
  { id: 'analytics', label: 'Analytics', icon: LayoutDashboard, group: 'Overview' },
  { id: 'att-controls', label: 'Attendance Controls', icon: Radio, group: 'Overview' },

  { id: 'colleges', label: 'Colleges', icon: BookOpen, group: 'Management' },
  { id: 'departments', label: 'Departments', icon: BookOpen, group: 'Management' },
  { id: 'courses', label: 'Courses', icon: BookOpen, group: 'Management' },
  { id: 'classrooms', label: 'Classrooms', icon: BookOpen, group: 'Management' },
  { id: 'wifi', label: 'Wi-Fi Access Points', icon: Radio, group: 'Management' },
  { id: 'faculty', label: 'Faculty', icon: UserCircle, group: 'Management' },
  { id: 'subjects', label: 'Subjects', icon: BookOpen, group: 'Management' },
  { id: 'students', label: 'Students', icon: UserCircle, group: 'Management' },
  { id: 'timetables', label: 'Timetables', icon: CalendarDays, group: 'Management' },

  { id: 'reports', label: 'Reports', icon: FileEdit, group: 'System' },
  { id: 'notifications', label: 'Notifications', icon: Bell, group: 'System' },
  { id: 'audit', label: 'Audit Logs', icon: ClipboardCheck, group: 'System' },
];

const FACULTY_NAV: NavItem[] = [
  { id: 'f-dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
  { id: 'f-classes', label: 'My Classes', icon: BookOpen, group: 'Teaching' },
  { id: 'f-attendance', label: 'Live Attendance', icon: ClipboardCheck, group: 'Teaching' },
  { id: 'f-review', label: 'Review Suspicious', icon: ClipboardCheck, group: 'Teaching' },
  { id: 'f-verify', label: 'Verify Attendance', icon: CheckCircle2, group: 'Teaching' },
  { id: 'f-timetable', label: 'My Timetable', icon: CalendarDays, group: 'Teaching' },
  { id: 'f-reports', label: 'Reports', icon: FileEdit, group: 'Reports' },
  { id: 'f-notifications', label: 'Notifications', icon: Bell, group: 'Account' },
];

const STUDENT_NAV: NavItem[] = [
  { id: 's-dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
  { id: 's-mark', label: 'Mark Attendance', icon: Radio, group: 'Attendance' },
  { id: 's-attendance', label: 'Attendance History', icon: ClipboardCheck, group: 'Attendance' },
  { id: 's-corrections', label: 'Correction Requests', icon: FileEdit, group: 'Attendance' },
  { id: 's-profile', label: 'My Profile', icon: UserCircle, group: 'Account' },
  { id: 's-device', label: 'My Device', icon: Smartphone, group: 'Account' },
  { id: 's-timetable', label: 'Timetable', icon: CalendarDays, group: 'Schedule' },
  { id: 's-notifications', label: 'Notifications', icon: Bell, group: 'Account' },
];

export function getNavItems(role: Role | null): NavItem[] {
  if (role === 'faculty') return FACULTY_NAV;
  if (role === 'student') return STUDENT_NAV;
  return ADMIN_NAV;
}

export const ADMIN_NAV_ITEMS = ADMIN_NAV;
