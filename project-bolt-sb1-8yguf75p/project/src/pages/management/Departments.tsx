import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, Network } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';

interface Department {
  id: string;
  name: string;
  hod_name: string | null;
  college_id: string | null;
  colleges?: { name: string } | null;
}

export function Departments() {
  const [rows, setRows] = useState<Department[]>([]);
  const [colleges, setColleges] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', hod_name: '', college_id: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('departments')
      .select('id, name, hod_name, college_id, colleges(name)')
      .order('name');
    setRows((data ?? []) as unknown as Department[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from('colleges').select('id, name').order('name').then(({ data }) => setColleges(data ?? []));
  }, []);

  const openNew = () => { setEditing(null); setForm({ name: '', hod_name: '', college_id: colleges[0]?.id ?? '' }); setModalOpen(true); };
  const openEdit = (d: Department) => { setEditing(d); setForm({ name: d.name, hod_name: d.hod_name ?? '', college_id: d.college_id ?? '' }); setModalOpen(true); };

  const save = async () => {
    setSaving(true);
    const payload = { name: form.name, hod_name: form.hod_name || null, college_id: form.college_id || null };
    if (editing) await supabase.from('departments').update(payload).eq('id', editing.id);
    else await supabase.from('departments').insert(payload);
    setSaving(false); setModalOpen(false); load();
  };

  const remove = async (d: Department) => {
    if (!confirm(`Delete department "${d.name}"?`)) return;
    await supabase.from('departments').delete().eq('id', d.id);
    load();
  };

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Department Management"
        description="Add departments, assign HODs, and link to colleges."
        action={<button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Department</button>}
      />
      <DataTable
        columns={[
          { key: 'name', label: 'Department', render: (r: Department) => (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent))] flex items-center justify-center"><Network size={16} /></div>
              <span className="font-medium">{r.name}</span>
            </div>
          )},
          { key: 'college', label: 'College', render: (r: Department) => <span className="text-[rgb(var(--text-muted))]">{r.colleges?.name ?? '—'}</span> },
          { key: 'hod_name', label: 'HOD', render: (r: Department) => <span className="text-[rgb(var(--text-muted))]">{r.hod_name ?? '—'}</span> },
        ]}
        rows={filtered}
        loading={loading}
        search={search}
        searchPlaceholder="Search departments…"
        onSearchChange={setSearch}
        rowKey={(r) => r.id}
        actions={(r: Department) => (
          <div className="flex justify-end gap-1.5">
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]" title="Edit"><Pencil size={15} /></button>
            <button onClick={() => remove(r)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--error)/0.1)] text-[rgb(var(--error))]" title="Delete"><Trash2 size={15} /></button>
          </div>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Department' : 'Add Department'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Department Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Computer Science & Engineering" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">HOD Name</label>
            <input className="input" value={form.hod_name} onChange={(e) => setForm({ ...form, hod_name: e.target.value })} placeholder="Dr. Alan Pierce" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">College</label>
            <select className="input" value={form.college_id} onChange={(e) => setForm({ ...form, college_id: e.target.value })}>
              <option value="">— Select college —</option>
              {colleges.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
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
