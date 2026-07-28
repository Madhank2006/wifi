import { useEffect, useState } from 'react';
import { BookOpen, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';

interface SubjectRow {
  id: string;
  code: string;
  name: string;
  credits: number;
  department_id: string | null;
  departments?: { name: string } | null;
}

export function FacultyClasses() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SubjectRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: prof } = await supabase.from('faculty').select('id').eq('user_id', user.id).maybeSingle();
      if (!prof) { setLoading(false); return; }
      const { data } = await supabase.from('subjects').select('id, code, name, credits, department_id, departments(name)').eq('faculty_id', prof.id).order('name');
      const subs = (data ?? []) as unknown as SubjectRow[];
      setRows(subs);
      const c: Record<string, number> = {};
      await Promise.all(subs.map(async (s) => {
        const { count } = await supabase.from('attendance').select('student_id', { count: 'exact', head: true }).eq('subject_id', s.id);
        c[s.id] = count ?? 0;
      }));
      setCounts(c);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div>
      <PageHeader title="My Classes" description="Subjects assigned to you and student counts." />
      <DataTable
        columns={[
          { key: 'name', label: 'Subject', render: (r: SubjectRow) => (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent))] flex items-center justify-center"><BookOpen size={16} /></div>
              <div><p className="font-medium">{r.name}</p><p className="text-xs text-[rgb(var(--text-muted))]">{r.code}</p></div>
            </div>
          )},
          { key: 'dept', label: 'Department', render: (r: SubjectRow) => <span className="text-[rgb(var(--text-muted))]">{r.departments?.name ?? '—'}</span> },
          { key: 'credits', label: 'Credits', render: (r: SubjectRow) => <span className="px-2 py-0.5 rounded-md bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))] text-xs font-medium">{r.credits}</span> },
          { key: 'records', label: 'Attendance Records', render: (r: SubjectRow) => (
            <span className="flex items-center gap-1.5 text-[rgb(var(--text-muted))]"><Users size={13} />{counts[r.id] ?? 0}</span>
          )},
        ]}
        rows={rows}
        loading={loading}
        rowKey={(r) => r.id}
        emptyMessage="No subjects assigned yet."
      />
    </div>
  );
}
