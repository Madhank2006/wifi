import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, X, UserX, Search, Users, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';

interface AttRow {
  id: string;
  date: string;
  marked_at: string;
  status: string;
  wifi_ssid: string | null;
  device_id: string | null;
  location_verified: boolean;
  faculty_verified: boolean;
  students?: { name: string; register_number: string } | null;
  subjects?: { name: string; code: string } | null;
}

export function FacultyVerify() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AttRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified' | 'absent'>('all');
  const [actioning, setActioning] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data: prof } = await supabase.from('faculty').select('id').eq('user_id', user.id).maybeSingle();
    if (!prof) { setLoading(false); return; }
    const { data: subs } = await supabase.from('subjects').select('id').eq('faculty_id', prof.id);
    const ids = (subs ?? []).map((s) => s.id);
    const { data } = await supabase
      .from('attendance')
      .select('id, date, marked_at, status, wifi_ssid, device_id, location_verified, faculty_verified, students(name, register_number), subjects(name, code)')
      .in('subject_id', ids.length ? ids : ['00000000'])
      .order('date', { ascending: false })
      .order('marked_at', { ascending: false })
      .limit(200);
    setRows((data ?? []) as unknown as AttRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const approve = async (r: AttRow) => {
    setActioning(r.id);
    await supabase.from('attendance').update({ faculty_verified: true, status: 'present' }).eq('id', r.id);
    setActioning(null); load();
  };

  const reject = async (r: AttRow) => {
    setActioning(r.id);
    await supabase.from('attendance').update({ faculty_verified: false, status: 'absent', notes: 'Rejected by faculty' }).eq('id', r.id);
    setActioning(null); load();
  };

  const markAbsent = async (r: AttRow) => {
    setActioning(r.id);
    await supabase.from('attendance').update({ status: 'absent', notes: 'Marked absent by faculty - misuse detected' }).eq('id', r.id);
    setActioning(null); load();
  };

  const filtered = useMemo(() => rows.filter((r) => {
    if (filter === 'verified' && !r.faculty_verified) return false;
    if (filter === 'unverified' && r.faculty_verified) return false;
    if (filter === 'absent' && r.status !== 'absent') return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(r.students?.name ?? '').toLowerCase().includes(q) && !(r.students?.register_number ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [rows, filter, search]);

  const stats = useMemo(() => ({
    total: rows.length,
    verified: rows.filter((r) => r.faculty_verified).length,
    pending: rows.filter((r) => !r.faculty_verified && r.status === 'present').length,
    absent: rows.filter((r) => r.status === 'absent').length,
  }), [rows]);

  return (
    <div>
      <PageHeader title="Verify Attendance" description="View, approve, reject, or mark students absent for your classes." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="card p-3 flex items-center gap-2"><Users size={16} className="text-[rgb(var(--primary))]" /><div><p className="text-lg font-semibold">{stats.total}</p><p className="text-xs text-[rgb(var(--text-muted))]">Total</p></div></div>
        <div className="card p-3 flex items-center gap-2"><CheckCircle2 size={16} className="text-[rgb(var(--success))]" /><div><p className="text-lg font-semibold">{stats.verified}</p><p className="text-xs text-[rgb(var(--text-muted))]">Verified</p></div></div>
        <div className="card p-3 flex items-center gap-2"><Clock size={16} className="text-[rgb(var(--warning))]" /><div><p className="text-lg font-semibold">{stats.pending}</p><p className="text-xs text-[rgb(var(--text-muted))]">Pending</p></div></div>
        <div className="card p-3 flex items-center gap-2"><UserX size={16} className="text-[rgb(var(--error))]" /><div><p className="text-lg font-semibold">{stats.absent}</p><p className="text-xs text-[rgb(var(--text-muted))]">Absent</p></div></div>
      </div>

      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student…" className="input pl-9 py-2" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="input py-2 w-auto">
          <option value="all">All</option>
          <option value="unverified">Pending</option>
          <option value="verified">Verified</option>
          <option value="absent">Absent</option>
        </select>
      </div>

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-4 h-16 animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center text-sm text-[rgb(var(--text-muted))]">No attendance records to verify.</div>
        ) : (
          filtered.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.2) }} className="card p-3.5 flex items-center gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${r.status === 'present' ? 'bg-[rgb(var(--success)/0.12)] text-[rgb(var(--success))]' : 'bg-[rgb(var(--error)/0.12)] text-[rgb(var(--error))]'}`}>
                {r.status === 'present' ? <CheckCircle2 size={18} /> : <UserX size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[rgb(var(--text))]">{r.students?.name ?? '—'} <span className="text-[rgb(var(--text-muted))] font-normal text-xs">· {r.students?.register_number ?? ''}</span></p>
                <p className="text-xs text-[rgb(var(--text-muted))]">{r.subjects?.name ?? '—'} · {r.date} · {r.marked_at?.slice(11, 16) ?? ''}</p>
                <div className="flex gap-1.5 mt-1">
                  {r.faculty_verified && <span className="px-1.5 py-0.5 rounded text-[10px] bg-[rgb(var(--success)/0.12)] text-[rgb(var(--success))]">Verified</span>}
                  {r.location_verified && <span className="px-1.5 py-0.5 rounded text-[10px] bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]">Location OK</span>}
                  {r.wifi_ssid && <span className="px-1.5 py-0.5 rounded text-[10px] bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]">{r.wifi_ssid}</span>}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => approve(r)} disabled={actioning === r.id} className="btn-primary px-2.5 py-1.5 flex items-center gap-1 text-xs"><Check size={13} /> Approve</button>
                <button onClick={() => reject(r)} disabled={actioning === r.id} className="btn-danger px-2.5 py-1.5 flex items-center gap-1 text-xs"><X size={13} /> Reject</button>
                <button onClick={() => markAbsent(r)} disabled={actioning === r.id} className="px-2.5 py-1.5 rounded-lg text-xs bg-[rgb(var(--error)/0.08)] text-[rgb(var(--error))] hover:bg-[rgb(var(--error)/0.12)] flex items-center gap-1"><UserX size={13} /> Absent</button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
