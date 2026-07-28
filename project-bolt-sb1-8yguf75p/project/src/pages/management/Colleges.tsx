import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';

interface College {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  academic_year: string | null;
}

export function Colleges() {
  const [rows, setRows] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<College | null>(null);
  const [form, setForm] = useState({ name: '', logo_url: '', address: '', contact_email: '', contact_phone: '', academic_year: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('colleges').select('*').order('name');
    setRows((data ?? []) as College[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', logo_url: '', address: '', contact_email: '', contact_phone: '', academic_year: '' });
    setModalOpen(true);
  };

  const openEdit = (c: College) => {
    setEditing(c);
    setForm({
      name: c.name, logo_url: c.logo_url ?? '', address: c.address ?? '',
      contact_email: c.contact_email ?? '', contact_phone: c.contact_phone ?? '', academic_year: c.academic_year ?? '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const payload = { ...form, logo_url: form.logo_url || null, address: form.address || null, contact_email: form.contact_email || null, contact_phone: form.contact_phone || null, academic_year: form.academic_year || null };
    if (editing) {
      await supabase.from('colleges').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('colleges').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const remove = async (c: College) => {
    if (!confirm(`Delete college "${c.name}"? This also deletes its departments.`)) return;
    await supabase.from('colleges').delete().eq('id', c.id);
    load();
  };

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="College Management"
        description="Manage colleges, logos, contact details and academic years."
        action={<button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add College</button>}
      />
      <DataTable
        columns={[
          { key: 'name', label: 'College', render: (r: College) => (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))] flex items-center justify-center"><Building2 size={16} /></div>
              <span className="font-medium">{r.name}</span>
            </div>
          )},
          { key: 'address', label: 'Address', render: (r: College) => <span className="text-[rgb(var(--text-muted))]">{r.address ?? '—'}</span> },
          { key: 'contact_email', label: 'Email', render: (r: College) => <span className="text-[rgb(var(--text-muted))]">{r.contact_email ?? '—'}</span> },
          { key: 'contact_phone', label: 'Phone', render: (r: College) => <span className="text-[rgb(var(--text-muted))]">{r.contact_phone ?? '—'}</span> },
          { key: 'academic_year', label: 'Academic Year', render: (r: College) => <span className="px-2 py-0.5 rounded-md bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))] text-xs font-medium">{r.academic_year ?? '—'}</span> },
        ]}
        rows={filtered}
        loading={loading}
        search={search}
        searchPlaceholder="Search colleges…"
        onSearchChange={setSearch}
        rowKey={(r) => r.id}
        actions={(r: College) => (
          <div className="flex justify-end gap-1.5">
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]" title="Edit"><Pencil size={15} /></button>
            <button onClick={() => remove(r)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--error)/0.1)] text-[rgb(var(--error))]" title="Delete"><Trash2 size={15} /></button>
          </div>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit College' : 'Add College'} description="College details and branding.">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">College Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Northgate Institute of Technology" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Logo URL</label>
            <input className="input" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Address</label>
            <textarea className="input min-h-[72px]" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Contact Email</label>
              <input className="input" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="info@college.edu" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Contact Phone</label>
              <input className="input" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="+1-555-0100" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Academic Year</label>
            <input className="input" value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} placeholder="2025-2026" />
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
