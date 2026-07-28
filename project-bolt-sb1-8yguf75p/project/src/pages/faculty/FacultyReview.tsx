import { useEffect, useState } from 'react';
import { Check, X, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';

interface FlaggedRow {
  id: string;
  date: string;
  status: string;
  proxy_flag: boolean;
  multiple_device_flag: boolean;
  risk_score: number;
  notes: string | null;
  students?: { name: string; register_number: string } | null;
  subjects?: { name: string; code: string } | null;
}

export function FacultyReview() {
  const { user } = useAuth();
  const [rows, setRows] = useState<FlaggedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data: prof } = await supabase.from('faculty').select('id').eq('user_id', user.id).maybeSingle();
    if (!prof) { setLoading(false); return; }
    const { data: subs } = await supabase.from('subjects').select('id').eq('faculty_id', prof.id);
    const ids = (subs ?? []).map((s) => s.id);
    const { data } = await supabase
      .from('attendance')
      .select('id, date, status, proxy_flag, multiple_device_flag, risk_score, notes, students(name, register_number), subjects(name, code)')
      .or('proxy_flag.eq.true,multiple_device_flag.eq.true')
      .in('subject_id', ids.length ? ids : ['00000000'])
      .order('date', { ascending: false })
      .limit(100);
    setRows((data ?? []) as unknown as FlaggedRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const review = async (r: FlaggedRow, approved: boolean) => {
    setActioning(r.id);
    await supabase.from('attendance').update({
      proxy_flag: approved ? false : r.proxy_flag,
      multiple_device_flag: approved ? false : r.multiple_device_flag,
      notes: approved ? 'Verified by faculty' : 'Rejected by faculty',
    }).eq('id', r.id);
    setActioning(null);
    load();
  };

  return (
    <div>
      <PageHeader title="Review Suspicious Attendance" description="Approve or reject attendance flagged by the AI system." />

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-4 h-20 animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center">
          <ShieldAlert size={32} className="mx-auto text-[rgb(var(--success))] mb-3" />
          <p className="text-sm text-[rgb(var(--text-muted))]">No suspicious attendance to review. Everything looks clean.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="card p-4 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-[rgb(var(--error)/0.12)] text-[rgb(var(--error))] shrink-0"><ShieldAlert size={18} /></div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[rgb(var(--text))]">{r.students?.name ?? '—'} <span className="text-[rgb(var(--text-muted))] font-normal">· {r.students?.register_number ?? ''}</span></p>
                <p className="text-xs text-[rgb(var(--text-muted))]">{r.subjects?.name ?? '—'} · {r.date}</p>
                <div className="flex gap-1.5 mt-1.5">
                  {r.proxy_flag && <span className="px-1.5 py-0.5 rounded text-[10px] bg-[rgb(var(--error)/0.12)] text-[rgb(var(--error))]">Proxy</span>}
                  {r.multiple_device_flag && <span className="px-1.5 py-0.5 rounded text-[10px] bg-[rgb(var(--warning)/0.12)] text-[rgb(var(--warning))]">Multi-device</span>}
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]">Risk {r.risk_score}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => review(r, true)} disabled={actioning === r.id} className="btn-primary px-3 py-2 flex items-center gap-1.5 text-xs"><Check size={14} /> Approve</button>
                <button onClick={() => review(r, false)} disabled={actioning === r.id} className="btn-danger flex items-center gap-1.5"><X size={14} /> Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
