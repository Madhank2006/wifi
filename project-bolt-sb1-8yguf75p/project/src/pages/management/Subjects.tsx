import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, GraduationCap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';

interface Subject {
  id: string;
  code: string;
  name: string;
  credits: number;
  faculty_id: string | null;
  department_id: string | null;
  faculty?: { name: string } | null;
  departments?: { name: string } | null;
}

export function Subjects() {
  const [rows, setRows] = useState<Subject[]>([]);
  const [faculty, setFaculty] = useState<{ id: string; name: string }[]>([]);
  const [depts, setDepts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState({ code: '', name: '', credits: 4, faculty_id: '', department_id: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('subjects').select('id, code, name, credits, faculty_id, department_id, faculty(name), departments(name)').order('name');
    setRows((data ?? []) as unknown as Subject[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from('faculty').select('id, name').order('name').then(({ data }) => setFaculty(data ?? []));
    supabase.from('departments').select('id, name').order('name').then(({ data }) => setDepts(data ?? []));
  }, []);

  const openNew = () => { setEditing(null); setForm({ code: '', name: '', credits: 4, faculty_id: '', department_id: '' }); setModalOpen(true); };
  const openEdit = (s: Subject) => { setEditing(s); setForm({ code: s.code, name: s.name, credits: s.credits, faculty_id: s.faculty_id ?? '', department_id: s.department_id ?? '' }); setModalOpen(true); };

  const save = async () => {
    setSaving(true);
    const payload = { code: form.code, name: form.name, credits: Number(form.credits), faculty_id: form.faculty_id || null, department_id: form.department_id || null };
    if (editing) await supabase.from('subjects').update(payload).eq('id', editing.id);
    else await supabase.from('subjects').insert(payload);
    setSaving(false); setModalOpen(false); load();
  };

  const remove = async (s: Subject) => {
    if (!confirm(`Delete subject "${s.name}"?`)) return;
    await supabase.from('subjects').delete().eq('id', s.id);
    load();
  };

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Subject Management"
        description="Manage subjects, credits and faculty assignments."
        action={<button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Subject</button>}
      />
      <DataTable
        columns={[
          { key: 'name', label: 'Subject', render: (r: Subject) => (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent))] flex items-center justify-center"><GraduationCap size={16} /></div>
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-[rgb(var(--text-muted))]">{r.code}</p>
              </div>
            </div>
          )},
          { key: 'dept', label: 'Department', render: (r: Subject) => <span className="text-[rgb(var(--text-muted))]">{r.departments?.name ?? '—'}</span> },
          { key: 'faculty', label: 'Faculty', render: (r: Subject) => <span className="text-[rgb(var(--text-muted))]">{r.faculty?.name ?? '—'}</span> },
          { key: 'credits', label: 'Credits', render: (r: Subject) => <span className="px-2 py-0.5 rounded-md bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))] text-xs font-medium">{r.credits}</span> },
        ]}
        rows={filtered}
        loading={loading}
        search={search}
        searchPlaceholder="Search subjects…"
        onSearchChange={setSearch}
        rowKey={(r) => r.id}
        actions={(r: Subject) => (
          <div className="flex justify-end gap-1.5">
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]" title="Edit"><Pencil size={15} /></button>
            <button onClick={() => remove(r)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--error)/0.1)] text-[rgb(var(--error))]" title="Delete"><Trash2 size={15} /></button>
          </div>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Subject' : 'Add Subject'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Subject Code</label>
              <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CS301" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Credits</label>
              <input type="number" min={1} max={8} className="input" value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Subject Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Data Structures & Algorithms" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Department</label>
            <select className="input" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
              <option value="">— Select department —</option>
              {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Assigned Faculty</label>
            <select className="input" value={form.faculty_id} onChange={(e) => setForm({ ...form, faculty_id: e.target.value })}>
              <option value="">— Select faculty —</option>
              {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={save} disabled={saving || !form.name || !form.code} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
