import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, DoorOpen, Wifi } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';

interface Classroom {
  id: string;
  name: string;
  building: string | null;
  floor: string | null;
  capacity: number;
  wifi_ap_id: string | null;
  wifi_access_points?: { ssid: string } | null;
}

export function Classrooms() {
  const [rows, setRows] = useState<Classroom[]>([]);
  const [aps, setAps] = useState<{ id: string; ssid: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [form, setForm] = useState({ name: '', building: '', floor: '', capacity: 60, wifi_ap_id: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('classrooms').select('id, name, building, floor, capacity, wifi_ap_id, wifi_access_points(ssid)').order('name');
    setRows((data ?? []) as unknown as Classroom[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from('wifi_access_points').select('id, ssid').order('ssid').then(({ data }) => setAps(data ?? []));
  }, []);

  const openNew = () => { setEditing(null); setForm({ name: '', building: '', floor: '', capacity: 60, wifi_ap_id: '' }); setModalOpen(true); };
  const openEdit = (c: Classroom) => { setEditing(c); setForm({ name: c.name, building: c.building ?? '', floor: c.floor ?? '', capacity: c.capacity, wifi_ap_id: c.wifi_ap_id ?? '' }); setModalOpen(true); };

  const save = async () => {
    setSaving(true);
    const payload = { name: form.name, building: form.building || null, floor: form.floor || null, capacity: Number(form.capacity), wifi_ap_id: form.wifi_ap_id || null };
    if (editing) await supabase.from('classrooms').update(payload).eq('id', editing.id);
    else await supabase.from('classrooms').insert(payload);
    setSaving(false); setModalOpen(false); load();
  };

  const remove = async (c: Classroom) => {
    if (!confirm(`Delete classroom "${c.name}"?`)) return;
    await supabase.from('classrooms').delete().eq('id', c.id);
    load();
  };

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Classroom Management"
        description="Manage rooms, buildings, capacity and Wi-Fi AP mapping."
        action={<button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Classroom</button>}
      />
      <DataTable
        columns={[
          { key: 'name', label: 'Classroom', render: (r: Classroom) => (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))] flex items-center justify-center"><DoorOpen size={16} /></div>
              <span className="font-medium">{r.name}</span>
            </div>
          )},
          { key: 'building', label: 'Building', render: (r: Classroom) => <span className="text-[rgb(var(--text-muted))]">{r.building ?? '—'}</span> },
          { key: 'floor', label: 'Floor', render: (r: Classroom) => <span className="text-[rgb(var(--text-muted))]">{r.floor ?? '—'}</span> },
          { key: 'capacity', label: 'Capacity', render: (r: Classroom) => <span className="px-2 py-0.5 rounded-md bg-[rgb(var(--accent)/0.1)] text-[rgb(var(--accent))] text-xs font-medium">{r.capacity}</span> },
          { key: 'wifi', label: 'Wi-Fi AP', render: (r: Classroom) => (
            <span className="flex items-center gap-1.5 text-[rgb(var(--text-muted))]"><Wifi size={13} />{r.wifi_access_points?.ssid ?? '—'}</span>
          )},
        ]}
        rows={filtered}
        loading={loading}
        search={search}
        searchPlaceholder="Search classrooms…"
        onSearchChange={setSearch}
        rowKey={(r) => r.id}
        actions={(r: Classroom) => (
          <div className="flex justify-end gap-1.5">
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]" title="Edit"><Pencil size={15} /></button>
            <button onClick={() => remove(r)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--error)/0.1)] text-[rgb(var(--error))]" title="Delete"><Trash2 size={15} /></button>
          </div>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Classroom' : 'Add Classroom'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Classroom Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. CS-101" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Building</label>
              <input className="input" value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} placeholder="Block A" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Floor</label>
              <input className="input" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="Ground" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Capacity</label>
            <input type="number" min={1} className="input" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Wi-Fi Access Point</label>
            <select className="input" value={form.wifi_ap_id} onChange={(e) => setForm({ ...form, wifi_ap_id: e.target.value })}>
              <option value="">— None —</option>
              {aps.map((a) => <option key={a.id} value={a.id}>{a.ssid}</option>)}
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
