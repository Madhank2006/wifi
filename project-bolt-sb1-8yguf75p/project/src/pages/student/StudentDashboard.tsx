import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, TrendingUp, AlertTriangle, Download, CalendarDays, BookOpen } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { useTheme } from '@/context/ThemeContext';

interface StudentProfile {
  id: string;
  name: string;
  register_number: string;
  departments?: { name: string } | null;
  courses?: { name: string } | null;
  semester: number;
  section: string | null;
}

interface AttRow {
  id: string;
  date: string;
  status: string;
  subjects?: { name: string; code: string } | null;
}

export function StudentDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [allAttendance, setAllAttendance] = useState<AttRow[]>([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, pct: 0, low: false, todayCount: 0 });
  const [absentSubjects, setAbsentSubjects] = useState<string[]>([]);
  const [trend, setTrend] = useState<{ date: string; pct: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: prof } = await supabase
        .from('students')
        .select('id, name, register_number, semester, section, departments(name), courses(name)')
        .eq('user_id', user.id)
        .maybeSingle();
      const p = prof as unknown as StudentProfile | null;
      setProfile(p);
      if (!p) { setLoading(false); return; }

      const { data: att } = await supabase
        .from('attendance')
        .select('id, date, status, subjects(name, code)')
        .eq('student_id', p.id)
        .order('date', { ascending: false })
        .limit(500);
      const attRows = (att ?? []) as unknown as AttRow[];
      setAllAttendance(attRows);

      const present = attRows.filter((a) => a.status === 'present' || a.status === 'late').length;
      const absent = attRows.filter((a) => a.status === 'absent').length;
      const total = present + absent;
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;

      const today = new Date().toISOString().slice(0, 10);
      const todayCount = attRows.filter((a) => a.date === today && (a.status === 'present' || a.status === 'late')).length;

      // Absent subjects
      const absentSubs = attRows.filter((a) => a.status === 'absent').map((a) => a.subjects?.name ?? 'Unknown');
      setAbsentSubjects(Array.from(new Set(absentSubs)));

      // Trend
      const map = new Map<string, { p: number; a: number }>();
      attRows.forEach((r) => {
        if (!map.has(r.date)) map.set(r.date, { p: 0, a: 0 });
        const e = map.get(r.date)!;
        if (r.status === 'absent') e.a += 1; else e.p += 1;
      });
      setTrend(Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-14).map(([date, v]) => ({ date: date.slice(5), pct: v.p + v.a > 0 ? Math.round((v.p / (v.p + v.a)) * 100) : 0 })));

      setStats({ present, absent, pct, low: pct < 75, todayCount });
      setLoading(false);
    })();
  }, [user]);

  const grid = theme === 'dark' ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.2)';
  const primary = theme === 'dark' ? '#40a9dc' : '#107ac8';

  const downloadPDF = () => {
    if (!profile) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const rows = allAttendance.map((r) => `<tr><td>${r.date}</td><td>${r.subjects?.name ?? '—'}</td><td>${r.subjects?.code ?? ''}</td><td style="text-transform:capitalize">${r.status}</td></tr>`).join('');
    win.document.write(`<html><head><title>Attendance Report - ${profile.name}</title><style>body{font-family:Arial,sans-serif;padding:40px} h1{color:#107ac8} table{width:100%;border-collapse:collapse;margin-top:20px} th,td{border:1px solid #ddd;padding:8px;text-align:left} th{background:#f5f5f5} .info{margin:10px 0} .stat{display:inline-block;margin-right:30px;padding:10px 20px;background:#f0f7ff;border-radius:8px}</style></head><body>
      <h1>Attendance Report</h1>
      <div class="info"><strong>Name:</strong> ${profile.name} | <strong>Reg No:</strong> ${profile.register_number} | <strong>Dept:</strong> ${profile.departments?.name ?? '—'} | <strong>Sem:</strong> ${profile.semester}</div>
      <div class="stat"><strong>Overall:</strong> ${stats.pct}%</div><div class="stat"><strong>Present:</strong> ${stats.present}</div><div class="stat"><strong>Absent:</strong> ${stats.absent}</div>
      <table><thead><tr><th>Date</th><th>Subject</th><th>Code</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="margin-top:20px;color:#888;font-size:12px">Generated on ${new Date().toLocaleString()}</p>
      </body></html>`);
    win.document.close();
    win.print();
  };

  if (loading) return <div className="card p-8 animate-pulse h-64" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${profile?.name ?? 'Student'}`}
        description={`${profile?.register_number ?? ''} · ${profile?.departments?.name ?? ''} · Sem ${profile?.semester ?? ''}`}
        action={<button onClick={downloadPDF} className="btn-ghost flex items-center gap-2"><Download size={16} /> Download PDF</button>}
      />

      {stats.low && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-4 flex items-center gap-3 border-l-2 border-l-[rgb(var(--warning))]">
          <AlertTriangle size={20} className="text-[rgb(var(--warning))]" />
          <p className="text-sm text-[rgb(var(--text))]">Your attendance is below 75%. Please maintain regular attendance to avoid academic penalties.</p>
        </motion.div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Attendance %" value={`${stats.pct}%`} icon={<TrendingUp size={20} />} tone={stats.pct >= 75 ? 'success' : 'warning'} delay={0} />
        <StatCard label="Present" value={stats.present} icon={<CheckCircle2 size={20} />} tone="success" delay={0.05} />
        <StatCard label="Absent" value={stats.absent} icon={<XCircle size={20} />} tone="error" delay={0.1} />
        <StatCard label="Today" value={stats.todayCount} icon={<CalendarDays size={20} />} tone="primary" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-[rgb(var(--text))] mb-1">Attendance Trend</h3>
          <p className="text-xs text-[rgb(var(--text-muted))] mb-3">Last 14 days</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="stuPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primary} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgb(148 163 184)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'rgb(148 163 184)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'rgb(var(--bg-elev))', border: '1px solid rgb(var(--border))', borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="pct" stroke={primary} strokeWidth={2} fill="url(#stuPresent)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card p-5">
          <h3 className="font-semibold text-[rgb(var(--text))] mb-3 flex items-center gap-2"><BookOpen size={16} className="text-[rgb(var(--error))]" /> Absent Subjects</h3>
          {absentSubjects.length === 0 ? (
            <p className="text-sm text-[rgb(var(--text-muted))] py-4 text-center">No absences recorded.</p>
          ) : (
            <div className="space-y-2">
              {absentSubjects.map((s) => (
                <div key={s} className="flex items-center gap-2 p-2 rounded-lg bg-[rgb(var(--error)/0.06)]">
                  <XCircle size={14} className="text-[rgb(var(--error))]" />
                  <span className="text-sm text-[rgb(var(--text))]">{s}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
