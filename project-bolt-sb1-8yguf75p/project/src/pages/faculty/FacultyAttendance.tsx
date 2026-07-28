import { useEffect, useState, useMemo } from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';

interface AttRow {
  id: string;
  date: string;
  marked_at: string;
  status: string;
  method: string;
  proxy_flag: boolean;
  multiple_device_flag: boolean;
  risk_score: number;
  device_verified: boolean;
  notes: string | null;
  students?: { name: string; register_number: string } | null;
  subjects?: { name: string; code: string } | null;
}

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  present: { label: 'Present', bg: 'bg-[rgb(var(--success)/0.12)]', text: 'text-[rgb(var(--success))]' },
  late: { label: 'Late', bg: 'bg-[rgb(var(--warning)/0.12)]', text: 'text-[rgb(var(--warning))]' },
  absent: { label: 'Absent', bg: 'bg-[rgb(var(--error)/0.12)]', text: 'text-[rgb(var(--error))]' },
  manual_correction: { label: 'Corrected', bg: 'bg-[rgb(var(--primary)/0.12)]', text: 'text-[rgb(var(--primary))]' },
};

export function FacultyAttendance() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AttRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'flagged'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: prof } = await supabase.from('faculty').select('id').eq('user_id', user.id).maybeSingle();
      if (!prof) { setLoading(false); return; }
      const { data: subs } = await supabase.from('subjects').select('id').eq('faculty_id', prof.id);
      const ids = (subs ?? []).map((s) => s.id);
      const { data } = await supabase
        .from('attendance')
        .select('id, date, marked_at, status, method, proxy_flag, multiple_device_flag, risk_score, device_verified, notes, students(name, register_number), subjects(name, code)')
        .in('subject_id', ids.length ? ids : ['00000000'])
        .order('date', { ascending: false })
        .limit(300);
      setRows((data ?? []) as unknown as AttRow[]);
      setLoading(false);
    })();
  }, [user]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (filter === 'flagged' && !r.proxy_flag && !r.multiple_device_flag) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(r.students?.name ?? '').toLowerCase().includes(q) && !(r.students?.register_number ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [rows, filter, search]);

  return (
    <div>
      <PageHeader title="Live Attendance" description="Real-time attendance for your subjects." />

      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student…" className="input flex-1 min-w-[180px] py-2" />
        <div className="flex gap-2">
          <button onClick={() => setFilter('all')} className={`px-3 py-2 rounded-lg text-xs font-medium ${filter === 'all' ? 'bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]' : 'btn-ghost'}`}>All</button>
          <button onClick={() => setFilter('flagged')} className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 ${filter === 'flagged' ? 'bg-[rgb(var(--error)/0.12)] text-[rgb(var(--error))]' : 'btn-ghost'}`}><ShieldAlert size={13} /> Flagged</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgb(var(--border))]">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Student</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Subject</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Flags</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Risk</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[rgb(var(--border))] last:border-0">
                    {Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3.5"><div className="h-3.5 w-20 bg-[rgb(var(--border))] rounded animate-pulse" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[rgb(var(--text-muted))]">No attendance records.</td></tr>
              ) : (
                filtered.map((r) => {
                  const st = STATUS_STYLES[r.status] ?? STATUS_STYLES.present;
                  return (
                    <tr key={r.id} className="border-b border-[rgb(var(--border))] last:border-0 hover:bg-[rgb(var(--text)/0.03)]">
                      <td className="px-4 py-3"><p className="font-medium">{r.students?.name ?? '—'}</p><p className="text-xs text-[rgb(var(--text-muted))]">{r.students?.register_number ?? ''}</p></td>
                      <td className="px-4 py-3 text-[rgb(var(--text-muted))]">{r.subjects?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-[rgb(var(--text-muted))]">{r.date}</td>
                      <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>{st.label}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {r.proxy_flag && <span className="px-1.5 py-0.5 rounded text-[10px] bg-[rgb(var(--error)/0.12)] text-[rgb(var(--error))]">Proxy</span>}
                          {r.multiple_device_flag && <span className="px-1.5 py-0.5 rounded text-[10px] bg-[rgb(var(--warning)/0.12)] text-[rgb(var(--warning))]">Multi</span>}
                          {!r.proxy_flag && !r.multiple_device_flag && <span className="text-xs text-[rgb(var(--text-muted))]">Clean</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-[rgb(var(--border))] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(r.risk_score, 100)}%`, backgroundColor: r.risk_score >= 50 ? 'rgb(var(--error))' : r.risk_score >= 25 ? 'rgb(var(--warning))' : 'rgb(var(--success))' }} />
                          </div>
                          <span className="text-xs text-[rgb(var(--text-muted))]">{r.risk_score}</span>
                        </div>
                      </td>
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
