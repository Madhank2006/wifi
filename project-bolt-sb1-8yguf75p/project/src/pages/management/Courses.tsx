import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';

interface Course {
  id: string;
  name: string;
  duration_years: number;
  total_semesters: number;
  department_id: string | null;
  departments?: { name: string } | null;
}

export function Courses() {
  const [rows, setRows] = useState<Course[]>([]);
  const [depts, setDepts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState({ name: '', duration_years: 4, total_semesters: 8, department_id: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('courses').select('id, name, duration_years, total_semesters, department_id, departments(name)').order('name');
    setRows((data ?? []) as unknown as Course[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from('departments').select('id, name').order('name').then(({ data }) => setDepts(data ?? []));
  }, []);

  const openNew = () => { setEditing(null); setForm({ name: '', duration_years: 4, total_semesters: 8, department_id: depts[0]?.id ?? '' }); setModalOpen(true); };
  const openEdit = (c: Course) => { setEditing(c); setForm({ name: c.name, duration_years: c.duration_years, total_semesters: c.total_semesters, department_id: c.department_id ?? '' }); setModalOpen(true); };

  const save = async () => {
    setSaving(true);
    const payload = { name: form.name, duration_years: Number(form.duration_years), total_semesters: Number(form.total_semesters), department_id: form.department_id || null };
    if (editing) await supabase.from('courses').update(payload).eq('id', editing.id);
    else await supabase.from('courses').insert(payload);
    setSaving(false); setModalOpen(false); load();
  };

  const remove = async (c: Course) => {
    if (!confirm(`Delete course "${c.name}"?`)) return;
    await supabase.from('courses').delete().eq('id', c.id);
    load();
  };

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Course Management"
        description="Configure courses, durations and semester structure."
        action={<button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Course</button>}
      />
      <DataTable
        columns={[
          { key: 'name', label: 'Course', render: (r: Course) => (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))] flex items-center justify-center"><BookOpen size={16} /></div>
              <span className="font-medium">{r.name}</span>
            </div>
          )},
          { key: 'dept', label: 'Department', render: (r: Course) => <span className="text-[rgb(var(--text-muted))]">{r.departments?.name ?? '—'}</span> },
          { key: 'duration', label: 'Duration', render: (r: Course) => <span>{r.duration_years} years</span> },
          { key: 'sem', label: 'Semesters', render: (r: Course) => <span className="px-2 py-0.5 rounded-md bg-[rgb(var(--accent)/0.1)] text-[rgb(var(--accent))] text-xs font-medium">{r.total_semesters}</span> },
        ]}
        rows={filtered}
        loading={loading}
        search={search}
        searchPlaceholder="Search courses…"
        onSearchChange={setSearch}
        rowKey={(r) => r.id}
        actions={(r: Course) => (
          <div className="flex justify-end gap-1.5">
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]" title="Edit"><Pencil size={15} /></button>
            <button onClick={() => remove(r)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--error)/0.1)] text-[rgb(var(--error))]" title="Delete"><Trash2 size={15} /></button>
          </div>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Course' : 'Add Course'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Course Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. B.Tech Computer Science" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Department</label>
            <select className="input" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
              <option value="">— Select department —</option>
              {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Duration (years)</label>
              <input type="number" min={1} max={6} className="input" value={form.duration_years} onChange={(e) => setForm({ ...form, duration_years: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Total Semesters</label>
              <input type="number" min={1} max={12} className="input" value={form.total_semesters} onChange={(e) => setForm({ ...form, total_semesters: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={save} disabled={saving || !form.name} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
