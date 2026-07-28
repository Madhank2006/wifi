import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Layout } from '@/components/Layout';
import { Login } from '@/pages/Login';

// Admin pages
import { Dashboard } from '@/pages/Dashboard';
import { Attendance } from '@/pages/Attendance';
import { Analytics } from '@/pages/Analytics';
import { Colleges } from '@/pages/management/Colleges';
import { Departments } from '@/pages/management/Departments';
import { Courses } from '@/pages/management/Courses';
import { Classrooms } from '@/pages/management/Classrooms';
import { WifiAps } from '@/pages/management/WifiAps';
import { Faculty } from '@/pages/management/Faculty';
import { Subjects } from '@/pages/management/Subjects';
import { Students } from '@/pages/management/Students';
import { Timetables } from '@/pages/management/Timetables';
import { Reports } from '@/pages/Reports';
import { Notifications } from '@/pages/Notifications';
import { AuditLogs } from '@/pages/AuditLogs';
import { AttendanceControls } from '@/pages/management/AttendanceControls';

// Faculty pages
import { FacultyDashboard } from '@/pages/faculty/FacultyDashboard';
import { FacultyClasses } from '@/pages/faculty/FacultyClasses';
import { FacultyAttendance } from '@/pages/faculty/FacultyAttendance';
import { FacultyReview } from '@/pages/faculty/FacultyReview';
import { FacultyTimetable } from '@/pages/faculty/FacultyTimetable';
import { FacultyReports } from '@/pages/faculty/FacultyReports';
import { FacultyVerify } from '@/pages/faculty/FacultyVerify';

// Student pages
import { StudentDashboard } from '@/pages/student/StudentDashboard';
import { StudentProfilePage } from '@/pages/student/StudentProfile';
import { StudentDevice } from '@/pages/student/StudentDevice';
import { StudentAttendance } from '@/pages/student/StudentAttendance';
import { StudentCorrections } from '@/pages/student/StudentCorrections';
import { StudentTimetable } from '@/pages/student/StudentTimetable';
import { StudentMarkAttendance } from '@/pages/student/StudentMarkAttendance';

// Shared
import { RoleNotifications } from '@/pages/shared/RoleNotifications';

function AppContent() {
  const { session, loading, role } = useAuth();
  const [page, setPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[rgb(var(--primary)/0.3)] border-t-[rgb(var(--primary))] rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  const renderAdminPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'attendance': return <Attendance />;
      case 'analytics': return <Analytics />;
      case 'colleges': return <Colleges />;
      case 'departments': return <Departments />;
      case 'courses': return <Courses />;
      case 'classrooms': return <Classrooms />;
      case 'wifi': return <WifiAps />;
      case 'faculty': return <Faculty />;
      case 'subjects': return <Subjects />;
      case 'students': return <Students />;
      case 'timetables': return <Timetables />;
      case 'reports': return <Reports />;
      case 'notifications': return <Notifications />;
      case 'audit': return <AuditLogs />;
      case 'att-controls': return <AttendanceControls />;
      default: return <Dashboard />;
    }
  };

  const renderFacultyPage = () => {
    switch (page) {
      case 'f-dashboard': return <FacultyDashboard />;
      case 'f-classes': return <FacultyClasses />;
      case 'f-attendance': return <FacultyAttendance />;
      case 'f-review': return <FacultyReview />;
      case 'f-verify': return <FacultyVerify />;
      case 'f-timetable': return <FacultyTimetable />;
      case 'f-reports': return <FacultyReports />;
      case 'f-notifications': return <RoleNotifications />;
      default: return <FacultyDashboard />;
    }
  };

  const renderStudentPage = () => {
    switch (page) {
      case 's-dashboard': return <StudentDashboard />;
      case 's-profile': return <StudentProfilePage />;
      case 's-device': return <StudentDevice />;
      case 's-mark': return <StudentMarkAttendance />;
      case 's-attendance': return <StudentAttendance />;
      case 's-corrections': return <StudentCorrections />;
      case 's-timetable': return <StudentTimetable />;
      case 's-notifications': return <RoleNotifications />;
      default: return <StudentDashboard />;
    }
  };

  const renderPage = () => {
    if (role === 'faculty') return renderFacultyPage();
    if (role === 'student') return renderStudentPage();
    return renderAdminPage();
  };

  const defaultPage = role === 'faculty' ? 'f-dashboard' : role === 'student' ? 's-dashboard' : 'dashboard';
  const activePage = page.startsWith(role === 'faculty' ? 'f-' : role === 'student' ? 's-' : '') ? page : defaultPage;

  return (
    <Layout active={activePage} onNavigate={setPage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
