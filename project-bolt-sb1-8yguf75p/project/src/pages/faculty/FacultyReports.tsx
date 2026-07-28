import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';

interface AttRow {
  date: string;
  status: string;
  method: string;
  students?: { name: string; register_number: string } | null;
  subjects?: { name: string; code: string } | null;
}

export function FacultyReports() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AttRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: prof } = await supabase.from('faculty').select('id').eq('user_id', user.id).maybeSingle();
      if (!prof) { setLoading(false); return; }
      const { data: subs } = await supabase.from('subjects').select('id').eq('faculty_id', prof.id);
      const ids = (subs ?? []).map((s) => s.id);
      const { data } = await supabase
        .from('attendance')
        .select('date, status, method, students(name, register_number), subjects(name, code)')
        .in('subject_id', ids.length ? ids : ['00000000'])
        .order('date', { ascending: false })
        .limit(1000);
      setRows((data ?? []) as unknown as AttRow[]);
      setLoading(false);
    })();
  }, [user]);

  const exportCSV = () => {
    if (rows.length === 0) return;
    const headers = ['Date', 'Student', 'Register No', 'Subject', 'Status', 'Method'];
    const csv = [headers.join(','), ...rows.map((r) => [r.date, r.students?.name ?? '', r.students?.register_number ?? '', r.subjects?.name ?? '', r.status, r.method].join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `faculty-report-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Attendance Reports" description="Download attendance for your subjects." action={<button onClick={exportCSV} className="btn-ghost flex items-center gap-2"><Download size={15} /> Export CSV</button>} />
      {loading ? (
        <div className="card p-8 animate-pulse h-64" />
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center"><FileText size={32} className="mx-auto text-[rgb(var(--text-muted))] mb-3" /><p className="text-sm text-[rgb(var(--text-muted))]">No attendance records to report.</p></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[rgb(var(--bg-elev))]">
                <tr className="border-b border-[rgb(var(--border))]">
                  {['Date', 'Student', 'Register No', 'Subject', 'Status', 'Method'].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-[rgb(var(--border))] last:border-0 hover:bg-[rgb(var(--text)/0.03)]">
                    <td className="px-4 py-3 text-[rgb(var(--text-muted))]">{r.date}</td>
                    <td className="px-4 py-3 font-medium text-[rgb(var(--text))]">{r.students?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-[rgb(var(--text-muted))]">{r.students?.register_number ?? ''}</td>
                    <td className="px-4 py-3 text-[rgb(var(--text-muted))]">{r.subjects?.name ?? '—'}</td>
                    <td className="px-4 py-3"><span className="capitalize">{r.status}</span></td>
                    <td className="px-4 py-3 text-[rgb(var(--text-muted))]">{r.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
