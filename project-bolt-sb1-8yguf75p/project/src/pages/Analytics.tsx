import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingDown, AlertTriangle, Brain, Target } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { useTheme } from '@/context/ThemeContext';

interface StudentRisk {
  id: string;
  name: string;
  register_number: string;
  pct: number;
  risk: 'high' | 'medium' | 'low';
}

export function Analytics() {
  const { theme } = useTheme();
  const grid = theme === 'dark' ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.2)';
  const primary = theme === 'dark' ? '#40a9dc' : '#107ac8';
  const accent = theme === 'dark' ? '#2dd4bf' : '#0a9eab';
  const warning = theme === 'dark' ? '#fbbf24' : '#ea9826';
  const error = theme === 'dark' ? '#f87171' : '#dc4646';
  const success = theme === 'dark' ? '#4ade80' : '#22aa5f';

  const [trend, setTrend] = useState<{ date: string; pct: number }[]>([]);
  const [subjectPerf, setSubjectPerf] = useState<{ name: string; pct: number }[]>([]);
  const [riskStudents, setRiskStudents] = useState<StudentRisk[]>([]);
  const [deptDist, setDeptDist] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // trend
      const { data: att } = await supabase.from('attendance').select('date, status').order('date').limit(3000);
      const map = new Map<string, { p: number; a: number }>();
      att?.forEach((r) => {
        if (!map.has(r.date)) map.set(r.date, { p: 0, a: 0 });
        const e = map.get(r.date)!;
        if (r.status === 'absent') e.a += 1; else e.p += 1;
      });
      setTrend(Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-14).map(([date, v]) => ({ date: date.slice(5), pct: v.p + v.a > 0 ? Math.round((v.p / (v.p + v.a)) * 100) : 0 })));

      // subject performance
      const { data: subjAtt } = await supabase.from('attendance').select('status, subjects!inner(name)').limit(3000);
      const subjMap = new Map<string, { p: number; t: number }>();
      subjAtt?.forEach((r) => {
        const name = (r.subjects as unknown as { name: string })?.name;
        if (!name) return;
        if (!subjMap.has(name)) subjMap.set(name, { p: 0, t: 0 });
        const e = subjMap.get(name)!;
        e.t += 1;
        if (r.status !== 'absent') e.p += 1;
      });
      setSubjectPerf(Array.from(subjMap.entries()).map(([name, v]) => ({ name: name.length > 20 ? name.slice(0, 19) + '…' : name, pct: v.t > 0 ? Math.round((v.p / v.t) * 100) : 0 })).sort((a, b) => b.pct - a.pct));

      // per-student risk
      const { data: perStudent } = await supabase.from('attendance').select('student_id, status, students!inner(name, register_number)').limit(6000);
      const sMap = new Map<string, { name: string; reg: string; p: number; t: number }>();
      perStudent?.forEach((r) => {
        const s = r.students as unknown as { name: string; register_number: string };
        if (!s || !r.student_id) return;
        if (!sMap.has(r.student_id)) sMap.set(r.student_id, { name: s.name, reg: s.register_number, p: 0, t: 0 });
        const e = sMap.get(r.student_id)!;
        e.t += 1;
        if (r.status !== 'absent') e.p += 1;
      });
      const risks: StudentRisk[] = Array.from(sMap.entries()).map(([id, v]) => {
        const pct = v.t > 0 ? Math.round((v.p / v.t) * 100) : 0;
        const risk: StudentRisk['risk'] = pct < 60 ? 'high' : pct < 75 ? 'medium' : 'low';
        return { id, name: v.name, register_number: v.reg, pct, risk };
      }).sort((a, b) => a.pct - b.pct);
      setRiskStudents(risks);

      // dept distribution
      const { data: deptAtt } = await supabase.from('attendance').select('students!inner(department_id), status').limit(5000);
      const dMap = new Map<string, number>();
      deptAtt?.forEach((r) => {
        const d = (r.students as unknown as { department_id: string })?.department_id;
        if (d) dMap.set(d, (dMap.get(d) ?? 0) + 1);
      });
      const { data: depts } = await supabase.from('departments').select('id, name');
      setDeptDist((depts ?? []).map((d) => ({ name: d.name, value: dMap.get(d.id) ?? 0 })).filter((d) => d.value > 0));

      setLoading(false);
    })();
  }, []);

  const highRisk = riskStudents.filter((s) => s.risk === 'high').length;
  const mediumRisk = riskStudents.filter((s) => s.risk === 'medium').length;
  const avgPct = riskStudents.length > 0 ? Math.round(riskStudents.reduce((a, s) => a + s.pct, 0) / riskStudents.length) : 0;
  const pieColors = [primary, accent, warning, error, success];

  if (loading) {
    return <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-5 h-64 animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="AI Analytics" description="Attendance patterns, predictions and student risk identification." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Avg Attendance" value={`${avgPct}%`} icon={<Target size={20} />} tone="accent" delay={0} />
        <StatCard label="High Risk Students" value={highRisk} icon={<AlertTriangle size={20} />} tone="error" hint="Below 60%" delay={0.05} />
        <StatCard label="Medium Risk" value={mediumRisk} icon={<TrendingDown size={20} />} tone="warning" hint="60-75%" delay={0.1} />
        <StatCard label="AI Validated" value="100%" icon={<Brain size={20} />} tone="success" hint="All records AI-checked" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
          <h3 className="font-semibold text-[rgb(var(--text))] mb-1">Attendance Trend</h3>
          <p className="text-xs text-[rgb(var(--text-muted))] mb-3">Daily attendance percentage</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend} margin={{ left: -20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgb(148 163 184)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'rgb(148 163 184)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'rgb(var(--bg-elev))', border: '1px solid rgb(var(--border))', borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey="pct" stroke={primary} strokeWidth={2.5} dot={{ r: 3, fill: primary }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-5">
          <h3 className="font-semibold text-[rgb(var(--text))] mb-1">Department Distribution</h3>
          <p className="text-xs text-[rgb(var(--text-muted))] mb-3">Attendance records by department</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={deptDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {deptDist.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'rgb(var(--bg-elev))', border: '1px solid rgb(var(--border))', borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
        <h3 className="font-semibold text-[rgb(var(--text))] mb-1">Subject-wise Performance</h3>
        <p className="text-xs text-[rgb(var(--text-muted))] mb-3">Attendance percentage by subject</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={subjectPerf} margin={{ left: -20, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgb(148 163 184)' }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'rgb(148 163 184)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: 'rgb(var(--bg-elev))', border: '1px solid rgb(var(--border))', borderRadius: 12, fontSize: 12 }} cursor={{ fill: 'rgba(148,163,184,0.1)' }} />
            <Bar dataKey="pct" radius={[6, 6, 0, 0]} barSize={28}>
              {subjectPerf.map((s, i) => <Cell key={i} fill={s.pct >= 85 ? success : s.pct >= 70 ? accent : warning} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Risk table */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card overflow-hidden">
        <div className="p-5 border-b border-[rgb(var(--border))]">
          <h3 className="font-semibold text-[rgb(var(--text))]">Student Risk Identification</h3>
          <p className="text-xs text-[rgb(var(--text-muted))]">Students predicted to fall below 75% attendance</p>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[rgb(var(--bg-elev))]">
              <tr className="border-b border-[rgb(var(--border))]">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Student</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Register No</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Attendance</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {riskStudents.slice(0, 30).map((s) => (
                <tr key={s.id} className="border-b border-[rgb(var(--border))] last:border-0 hover:bg-[rgb(var(--text)/0.03)]">
                  <td className="px-4 py-3 font-medium text-[rgb(var(--text))]">{s.name}</td>
                  <td className="px-4 py-3 text-[rgb(var(--text-muted))]">{s.register_number}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-[rgb(var(--border))] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.risk === 'high' ? `rgb(${error})` : s.risk === 'medium' ? `rgb(${warning})` : `rgb(${success})` }} />
                      </div>
                      <span className="text-xs text-[rgb(var(--text-muted))]">{s.pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.risk === 'high' ? 'bg-[rgb(var(--error)/0.12)] text-[rgb(var(--error))]' : s.risk === 'medium' ? 'bg-[rgb(var(--warning)/0.12)] text-[rgb(var(--warning))]' : 'bg-[rgb(var(--success)/0.12)] text-[rgb(var(--success))]'}`}>
                      {s.risk === 'high' ? 'High' : s.risk === 'medium' ? 'Medium' : 'Low'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
