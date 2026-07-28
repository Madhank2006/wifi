import { useEffect, useState, useMemo } from 'react';
import { CheckCircle2, XCircle, Clock, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';

interface AttRow {
  id: string;
  date: string;
  marked_at: string;
  status: string;
  method: string;
  subjects?: { name: string; code: string } | null;
}

const STATUS_STYLES: Record<string, { icon: typeof CheckCircle2; bg: string; text: string; label: string }> = {
  present: { icon: CheckCircle2, bg: 'bg-[rgb(var(--success)/0.12)]', text: 'text-[rgb(var(--success))]', label: 'Present' },
  late: { icon: Clock, bg: 'bg-[rgb(var(--warning)/0.12)]', text: 'text-[rgb(var(--warning))]', label: 'Late' },
  absent: { icon: XCircle, bg: 'bg-[rgb(var(--error)/0.12)]', text: 'text-[rgb(var(--error))]', label: 'Absent' },
  manual_correction: { icon: CheckCircle2, bg: 'bg-[rgb(var(--primary)/0.12)]', text: 'text-[rgb(var(--primary))]', label: 'Corrected' },
};

export function StudentAttendance() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AttRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: prof } = await supabase.from('students').select('id').eq('user_id', user.id).maybeSingle();
      if (!prof) { setLoading(false); return; }
      const { data } = await supabase
        .from('attendance')
        .select('id, date, marked_at, status, method, subjects(name, code)')
        .eq('student_id', prof.id)
        .order('date', { ascending: false })
        .limit(500);
      setRows((data ?? []) as unknown as AttRow[]);
      setLoading(false);
    })();
  }, [user]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search && !(r.subjects?.name ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [rows, statusFilter, search]);

  const present = rows.filter((r) => r.status === 'present' || r.status === 'late').length;
  const pct = rows.length > 0 ? Math.round((present / rows.length) * 100) : 0;

  return (
    <div>
      <PageHeader title="My Attendance" description={`Overall: ${pct}% · ${present} present of ${rows.length} records`} />

      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subject…" className="input pl-9 py-2" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input py-2 w-auto">
          <option value="all">All Status</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgb(var(--border))]">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Subject</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Method</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[rgb(var(--border))] last:border-0">
                    {Array.from({ length: 4 }).map((_, j) => <td key={j} className="px-4 py-3.5"><div className="h-3.5 w-20 bg-[rgb(var(--border))] rounded animate-pulse" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-[rgb(var(--text-muted))]">No attendance records.</td></tr>
              ) : (
                filtered.map((r) => {
                  const st = STATUS_STYLES[r.status] ?? STATUS_STYLES.present;
                  const Icon = st.icon;
                  return (
                    <tr key={r.id} className="border-b border-[rgb(var(--border))] last:border-0 hover:bg-[rgb(var(--text)/0.03)]">
                      <td className="px-4 py-3 text-[rgb(var(--text-muted))]">{r.date}</td>
                      <td className="px-4 py-3"><p className="font-medium text-[rgb(var(--text))]">{r.subjects?.name ?? '—'}</p><p className="text-xs text-[rgb(var(--text-muted))]">{r.subjects?.code ?? ''}</p></td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.bg} ${st.text}`}><Icon size={13} /> {st.label}</span></td>
                      <td className="px-4 py-3 text-[rgb(var(--text-muted))] capitalize">{r.method}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
