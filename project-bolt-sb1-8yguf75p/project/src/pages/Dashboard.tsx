import { motion } from 'framer-motion';
import {
  Building2, Network, Users, GraduationCap, BookOpen, DoorOpen, Wifi,
  CheckCircle2, XCircle, TrendingUp, AlertTriangle, Activity,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis, Cell,
} from 'recharts';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { StatCard } from '@/components/ui/StatCard';
import { useTheme } from '@/context/ThemeContext';

const axisColor = () => 'rgb(148 163 184)';

export function Dashboard() {
  const { stats, loading } = useDashboardStats();
  const { theme } = useTheme();
  const grid = theme === 'dark' ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.2)';
  const primary = theme === 'dark' ? '#40a9dc' : '#107ac8';
  const accent = theme === 'dark' ? '#2dd4bf' : '#0a9eab';
  const error = theme === 'dark' ? '#f87171' : '#dc4646';

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card p-5 animate-pulse h-28">
            <div className="h-3 w-20 bg-[rgb(var(--border))] rounded mb-3" />
            <div className="h-6 w-16 bg-[rgb(var(--border))] rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[rgb(var(--text))]">Dashboard</h1>
        <p className="text-sm text-[rgb(var(--text-muted))] mt-1">
          Real-time overview of attendance across all colleges and departments.
        </p>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={stats.students} icon={<Users size={20} />} tone="primary" delay={0} />
        <StatCard label="Today's Attendance" value={`${stats.attendancePct}%`} icon={<Activity size={20} />} tone="accent" hint={`${stats.todayPresent} present · ${stats.todayAbsent} absent`} delay={0.05} />
        <StatCard label="Present Today" value={stats.todayPresent} icon={<CheckCircle2 size={20} />} tone="success" delay={0.1} />
        <StatCard label="Absent Today" value={stats.todayAbsent} icon={<XCircle size={20} />} tone="error" delay={0.15} />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Colleges" value={stats.colleges} icon={<Building2 size={18} />} tone="primary" delay={0} />
        <StatCard label="Departments" value={stats.departments} icon={<Network size={18} />} tone="primary" delay={0.05} />
        <StatCard label="Faculty" value={stats.faculty} icon={<Users size={18} />} tone="primary" delay={0.1} />
        <StatCard label="Subjects" value={stats.subjects} icon={<BookOpen size={18} />} tone="primary" delay={0.15} />
        <StatCard label="Classrooms" value={stats.classrooms} icon={<DoorOpen size={18} />} tone="primary" delay={0.2} />
        <StatCard label="Wi-Fi APs" value={stats.activeAps} icon={<Wifi size={18} />} tone="success" hint={`${stats.wifiAps} total`} delay={0.25} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-[rgb(var(--text))]">Attendance Trend</h3>
              <p className="text-xs text-[rgb(var(--text-muted))]">Last 14 days</p>
            </div>
            <TrendingUp size={18} className="text-[rgb(var(--accent))]" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={stats.trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primary} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={error} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={error} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: axisColor() }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: axisColor() }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(var(--bg-elev))',
                  border: '1px solid rgb(var(--border))',
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: 'rgb(var(--text))' }}
              />
              <Area type="monotone" dataKey="present" stroke={primary} strokeWidth={2} fill="url(#presentGrad)" />
              <Area type="monotone" dataKey="absent" stroke={error} strokeWidth={2} fill="url(#absentGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card p-5"
        >
          <h3 className="font-semibold text-[rgb(var(--text))] mb-1">Today's Rate</h3>
          <p className="text-xs text-[rgb(var(--text-muted))] mb-2">Overall attendance percentage</p>
          <ResponsiveContainer width="100%" height={220}>
            <RadialBarChart innerRadius="65%" outerRadius="100%" data={[{ pct: stats.attendancePct }]} startAngle={90} endAngle={-270}>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar background={{ fill: grid }} dataKey="pct" cornerRadius={20} fill={primary} />
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="rgb(var(--text))" fontSize="28" fontWeight="600">
                {stats.attendancePct}%
              </text>
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="flex justify-around text-xs text-center mt-1">
            <div>
              <p className="font-semibold text-[rgb(var(--success))]">{stats.todayPresent}</p>
              <p className="text-[rgb(var(--text-muted))]">Present</p>
            </div>
            <div>
              <p className="font-semibold text-[rgb(var(--error))]">{stats.todayAbsent}</p>
              <p className="text-[rgb(var(--text-muted))]">Absent</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-5"
        >
          <h3 className="font-semibold text-[rgb(var(--text))] mb-1">Department-wise Attendance</h3>
          <p className="text-xs text-[rgb(var(--text-muted))] mb-3">Comparison across departments</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.deptAttendance} layout="vertical" margin={{ left: 20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: axisColor() }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: axisColor() }}
                axisLine={false}
                tickLine={false}
                width={120}
                tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 17) + '…' : v)}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgb(var(--bg-elev))', border: '1px solid rgb(var(--border))', borderRadius: 12, fontSize: 12 }}
                cursor={{ fill: 'rgba(148,163,184,0.1)' }}
              />
              <Bar dataKey="pct" radius={[0, 6, 6, 0]} barSize={20}>
                {stats.deptAttendance.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? accent : primary} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card p-5"
        >
          <h3 className="font-semibold text-[rgb(var(--text))] mb-1">Monthly Analytics</h3>
          <p className="text-xs text-[rgb(var(--text-muted))] mb-3">Attendance percentage by month</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.monthly} margin={{ left: -20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: axisColor() }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: axisColor() }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgb(var(--bg-elev))', border: '1px solid rgb(var(--border))', borderRadius: 12, fontSize: 12 }}
                cursor={{ fill: 'rgba(148,163,184,0.1)' }}
              />
              <Bar dataKey="pct" radius={[6, 6, 0, 0]} barSize={28} fill={accent} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-5 flex items-center gap-4"
      >
        <div className="p-3 rounded-xl bg-[rgb(var(--warning)/0.12)] text-[rgb(var(--warning))]">
          <AlertTriangle size={22} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-[rgb(var(--text))]">Low Attendance Students</h3>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            {stats.lowAttendanceCount} student{stats.lowAttendanceCount === 1 ? '' : 's'} currently below the 75% threshold.
          </p>
        </div>
        <GraduationCap size={20} className="text-[rgb(var(--text-muted))]" />
      </motion.div>
    </div>
  );
}
