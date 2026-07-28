import { useEffect, useState } from 'react';
import { FileText, Download, FileSpreadsheet, FileBarChart, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';

interface ReportConfig {
  id: string;
  title: string;
  description: string;
  icon: typeof FileText;
}

const REPORTS: ReportConfig[] = [
  { id: 'daily', title: 'Daily Report', description: 'Attendance for a specific day across all departments.', icon: Calendar },
  { id: 'weekly', title: 'Weekly Report', description: 'Rolling 7-day attendance summary.', icon: FileText },
  { id: 'monthly', title: 'Monthly Report', description: 'Full month attendance breakdown.', icon: FileBarChart },
  { id: 'semester', title: 'Semester Report', description: 'Semester-long attendance per student.', icon: FileText },
  { id: 'department', title: 'Department Report', description: 'Department-wise attendance comparison.', icon: FileBarChart },
  { id: 'subject', title: 'Subject Report', description: 'Subject-wise attendance analysis.', icon: FileText },
  { id: 'student', title: 'Student Report', description: 'Individual student attendance history.', icon: FileText },
];

type PreviewRow = Record<string, string | number>;

export function Reports() {
  const [open, setOpen] = useState<ReportConfig | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [studentId, setStudentId] = useState('');

  useEffect(() => {
    supabase.from('students').select('id, name').order('name').then(({ data }) => {
      setStudents(data ?? []);
      setStudentId(data?.[0]?.id ?? '');
    });
  }, []);

  const generate = async (r: ReportConfig) => {
    setLoading(true);
    let rows: Record<string, string | number>[] = [];
    if (r.id === 'student' && studentId) {
      const { data } = await supabase.from('attendance').select('date, status, method, subjects(name, code)').eq('student_id', studentId).order('date', { ascending: false });
      rows = (data ?? []).map((d) => {
        const subj = (d as unknown as { subjects?: { name: string; code: string } }).subjects;
        return { Date: d.date, Student: '—', 'Register No': '—', Subject: subj?.name ?? '—', Status: d.status, Method: d.method };
      });
    } else {
      let qb = supabase.from('attendance').select('date, status, method, students(name, register_number), subjects(name, code)').order('date', { ascending: false }).limit(2000);
      if (r.id === 'daily') qb = qb.eq('date', date);
      const { data } = await qb;
      rows = (data ?? []).map((d) => {
        const s = (d as unknown as { students?: { name: string; register_number: string } }).students;
        const subj = (d as unknown as { subjects?: { name: string; code: string } }).subjects;
        return { Date: d.date, Student: s?.name ?? '—', 'Register No': s?.register_number ?? '—', Subject: subj?.name ?? '—', Status: d.status, Method: d.method };
      });
    }
    setPreview(rows);
    setLoading(false);
  };

  const exportCSV = () => {
    if (preview.length === 0) return;
    const headers = Object.keys(preview[0]);
    const csv = [headers.join(','), ...preview.map((r) => headers.map((h) => `"${String(r[h]).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${open?.id ?? 'report'}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = (format: 'excel' | 'pdf') => {
    if (preview.length === 0) return;
    if (format === 'excel') {
      exportCSV();
      return;
    }
    const win = window.open('', '_blank');
    if (!win) return;
    const headers = Object.keys(preview[0]);
    win.document.write(`<html><head><title>${open?.title ?? 'Report'}</title><style>body{font-family:Inter,sans-serif;padding:32px}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f5f5f5}</style></head><body>`);
    win.document.write(`<h1>${open?.title ?? 'Attendance Report'}</h1><p>Generated ${new Date().toLocaleString()}</p>`);
    win.document.write('<table><tr>' + headers.map((h) => `<th>${h}</th>`).join('') + '</tr>');
    preview.forEach((r) => { win.document.write('<tr>' + headers.map((h) => `<td>${r[h]}</td>`).join('') + '</tr>'); });
    win.document.write('</table></body></html>');
    win.document.close();
    win.print();
  };

  return (
    <div>
      <PageHeader title="Reports" description="Generate and export attendance reports in PDF, Excel or CSV." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((r, i) => {
          const Icon = r.icon;
          return (
            <button
              key={r.id}
              onClick={() => { setOpen(r); setPreview([]); }}
              className="card card-hover p-5 text-left"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]"><Icon size={20} /></div>
                <div>
                  <h3 className="font-semibold text-[rgb(var(--text))]">{r.title}</h3>
                  <p className="text-sm text-[rgb(var(--text-muted))] mt-0.5">{r.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title ?? 'Report'} description={open?.description} size="lg">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            {open?.id === 'daily' && (
              <div>
                <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
              </div>
            )}
            {open?.id === 'student' && (
              <div>
                <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Student</label>
                <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="input min-w-[200px]">
                  {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <button onClick={() => open && generate(open)} disabled={loading} className="btn-primary">
              {loading ? 'Generating…' : 'Generate Preview'}
            </button>
          </div>

          {preview.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => exportJSON('pdf')} className="btn-ghost flex items-center gap-2"><FileText size={15} /> PDF</button>
                <button onClick={() => exportJSON('excel')} className="btn-ghost flex items-center gap-2"><FileSpreadsheet size={15} /> Excel</button>
                <button onClick={exportCSV} className="btn-ghost flex items-center gap-2"><Download size={15} /> CSV</button>
                <span className="ml-auto text-xs text-[rgb(var(--text-muted))] self-center">{preview.length} records</span>
              </div>
              <div className="max-h-80 overflow-auto rounded-xl border border-[rgb(var(--border))]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[rgb(var(--bg-elev))]">
                    <tr className="border-b border-[rgb(var(--border))]">
                      {Object.keys(preview[0]).map((h) => <th key={h} className="text-left px-3 py-2 font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wide">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 100).map((r, i) => (
                      <tr key={i} className="border-b border-[rgb(var(--border))] last:border-0">
                        {Object.values(r).map((v, j) => <td key={j} className="px-3 py-2 text-[rgb(var(--text))]">{v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
