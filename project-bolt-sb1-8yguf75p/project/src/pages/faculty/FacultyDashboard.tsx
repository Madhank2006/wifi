import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, CheckCircle2, AlertTriangle, CalendarDays } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { useTheme } from '@/context/ThemeContext';

interface FacultyProfile {
  id: string;
  name: string;
  employee_id: string;
  department_id: string | null;
  departments?: { name: string } | null;
}

export function FacultyDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [profile, setProfile] = useState<FacultyProfile | null>(null);
  const [stats, setStats] = useState({ subjects: 0, students: 0, todayPresent: 0, flagged: 0 });
  const [trend, setTrend] = useState<{ date: string; pct: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: prof } = await supabase
        .from('faculty')
        .select('id, name, employee_id, department_id, departments(name)')
        .eq('user_id', user.id)
        .maybeSingle();
      const p = prof as unknown as FacultyProfile | null;
      setProfile(p);
      if (!p) { setLoading(false); return; }

      const { data: subjects } = await supabase.from('subjects').select('id, name, code').eq('faculty_id', p.id);
      const subjectIds = (subjects ?? []).map((s) => s.id);
      const { count: students } = await supabase.from('attendance').select('student_id', { count: 'exact', head: true }).in('subject_id', subjectIds.length ? subjectIds : ['00000000']);
      const today = new Date().toISOString().slice(0, 10);
      const { data: todayAtt } = await supabase.from('attendance').select('status').eq('date', today).in('subject_id', subjectIds.length ? subjectIds : ['00000000']);
      const present = todayAtt?.filter((a) => a.status === 'present' || a.status === 'late').length ?? 0;
      const { count: flagged } = await supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('proxy_flag', true).in('subject_id', subjectIds.length ? subjectIds : ['00000000']);

      const { data: att } = await supabase.from('attendance').select('date, status').in('subject_id', subjectIds.length ? subjectIds : ['00000000']).order('date').limit(2000);
      const map = new Map<string, { p: number; a: number }>();
      att?.forEach((r) => {
        if (!map.has(r.date)) map.set(r.date, { p: 0, a: 0 });
        const e = map.get(r.date)!;
        if (r.status === 'absent') e.a += 1; else e.p += 1;
      });
      setTrend(Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-14).map(([date, v]) => ({ date: date.slice(5), pct: v.p + v.a > 0 ? Math.round((v.p / (v.p + v.a)) * 100) : 0 })));

      setStats({ subjects: subjects?.length ?? 0, students: students ?? 0, todayPresent: present, flagged: flagged ?? 0 });
      setLoading(false);
    })();
  }, [user]);

  const grid = theme === 'dark' ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.2)';
  const primary = theme === 'dark' ? '#40a9dc' : '#107ac8';

  if (loading) return <div className="card p-8 animate-pulse h-64" />;

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${profile?.name ?? 'Faculty'}`} description={`${profile?.departments?.name ?? 'Department'} · ${profile?.employee_id ?? ''}`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Subjects" value={stats.subjects} icon={<BookOpen size={20} />} tone="primary" delay={0} />
        <StatCard label="Students" value={stats.students} icon={<Users size={20} />} tone="accent" delay={0.05} />
        <StatCard label="Present Today" value={stats.todayPresent} icon={<CheckCircle2 size={20} />} tone="success" delay={0.1} />
        <StatCard label="Flagged" value={stats.flagged} icon={<AlertTriangle size={20} />} tone="error" delay={0.15} />
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[rgb(var(--text))]">Attendance Trend</h3>
            <p className="text-xs text-[rgb(var(--text-muted))]">Your subjects · last 14 days</p>
          </div>
          <CalendarDays size={18} className="text-[rgb(var(--accent))]" />
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="facPresent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={primary} stopOpacity={0.35} />
                <stop offset="100%" stopColor={primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgb(148 163 184)' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'rgb(148 163 184)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: 'rgb(var(--bg-elev))', border: '1px solid rgb(var(--border))', borderRadius: 12, fontSize: 12 }} />
            <Area type="monotone" dataKey="pct" stroke={primary} strokeWidth={2} fill="url(#facPresent)" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
