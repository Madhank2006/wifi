import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, Wifi, Power } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';

interface WifiAp {
  id: string;
  ssid: string;
  mac_address: string;
  building: string | null;
  floor: string | null;
  classroom_id: string | null;
  enabled: boolean;
  classrooms?: { name: string } | null;
}

export function WifiAps() {
  const [rows, setRows] = useState<WifiAp[]>([]);
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WifiAp | null>(null);
  const [form, setForm] = useState({ ssid: '', mac_address: '', building: '', floor: '', classroom_id: '', enabled: true });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('wifi_access_points').select('id, ssid, mac_address, building, floor, classroom_id, enabled, classrooms(name)').order('ssid');
    setRows((data ?? []) as unknown as WifiAp[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from('classrooms').select('id, name').order('name').then(({ data }) => setRooms(data ?? []));
  }, []);

  const openNew = () => { setEditing(null); setForm({ ssid: '', mac_address: '', building: '', floor: '', classroom_id: '', enabled: true }); setModalOpen(true); };
  const openEdit = (w: WifiAp) => { setEditing(w); setForm({ ssid: w.ssid, mac_address: w.mac_address, building: w.building ?? '', floor: w.floor ?? '', classroom_id: w.classroom_id ?? '', enabled: w.enabled }); setModalOpen(true); };

  const save = async () => {
    setSaving(true);
    const payload = { ssid: form.ssid, mac_address: form.mac_address, building: form.building || null, floor: form.floor || null, classroom_id: form.classroom_id || null, enabled: form.enabled };
    if (editing) await supabase.from('wifi_access_points').update(payload).eq('id', editing.id);
    else await supabase.from('wifi_access_points').insert(payload);
    setSaving(false); setModalOpen(false); load();
  };

  const remove = async (w: WifiAp) => {
    if (!confirm(`Delete Wi-Fi AP "${w.ssid}"?`)) return;
    await supabase.from('wifi_access_points').delete().eq('id', w.id);
    load();
  };

  const toggleEnabled = async (w: WifiAp) => {
    await supabase.from('wifi_access_points').update({ enabled: !w.enabled }).eq('id', w.id);
    load();
  };

  const filtered = rows.filter((r) => r.ssid.toLowerCase().includes(search.toLowerCase()) || r.mac_address.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Wi-Fi Access Point Management"
        description="Configure access points that authorize attendance capture."
        action={<button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Access Point</button>}
      />
      <DataTable
        columns={[
          { key: 'ssid', label: 'SSID', render: (r: WifiAp) => (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent))] flex items-center justify-center"><Wifi size={16} /></div>
              <span className="font-medium">{r.ssid}</span>
            </div>
          )},
          { key: 'mac', label: 'MAC Address', render: (r: WifiAp) => <code className="text-xs px-2 py-0.5 rounded bg-[rgb(var(--text)/0.05)] text-[rgb(var(--text-muted))]">{r.mac_address}</code> },
          { key: 'building', label: 'Building', render: (r: WifiAp) => <span className="text-[rgb(var(--text-muted))]">{r.building ?? '—'}</span> },
          { key: 'floor', label: 'Floor', render: (r: WifiAp) => <span className="text-[rgb(var(--text-muted))]">{r.floor ?? '—'}</span> },
          { key: 'classroom', label: 'Classroom', render: (r: WifiAp) => <span className="text-[rgb(var(--text-muted))]">{r.classrooms?.name ?? '—'}</span> },
          { key: 'enabled', label: 'Status', render: (r: WifiAp) => (
            <button onClick={() => toggleEnabled(r)} className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${r.enabled ? 'bg-[rgb(var(--success)/0.12)] text-[rgb(var(--success))]' : 'bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${r.enabled ? 'bg-[rgb(var(--success))]' : 'bg-[rgb(var(--text-muted))]'}`} />
              {r.enabled ? 'Active' : 'Disabled'}
            </button>
          )},
        ]}
        rows={filtered}
        loading={loading}
        search={search}
        searchPlaceholder="Search by SSID or MAC…"
        onSearchChange={setSearch}
        rowKey={(r) => r.id}
        actions={(r: WifiAp) => (
          <div className="flex justify-end gap-1.5">
            <button onClick={() => toggleEnabled(r)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]" title="Toggle"><Power size={15} /></button>
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]" title="Edit"><Pencil size={15} /></button>
            <button onClick={() => remove(r)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--error)/0.1)] text-[rgb(var(--error))]" title="Delete"><Trash2 size={15} /></button>
          </div>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Wi-Fi Access Point' : 'Add Wi-Fi Access Point'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">SSID</label>
            <input className="input" value={form.ssid} onChange={(e) => setForm({ ...form, ssid: e.target.value })} placeholder="Northgate-CS-WiFi" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">MAC Address</label>
            <input className="input" value={form.mac_address} onChange={(e) => setForm({ ...form, mac_address: e.target.value })} placeholder="00:1A:2B:3C:4D:01" />
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
            <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Classroom Mapping</label>
            <select className="input" value={form.classroom_id} onChange={(e) => setForm({ ...form, classroom_id: e.target.value })}>
              <option value="">— None —</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="w-4 h-4 rounded accent-[rgb(var(--primary))]" />
            <span className="text-sm text-[rgb(var(--text))]">Access point enabled</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={save} disabled={saving || !form.ssid || !form.mac_address} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
