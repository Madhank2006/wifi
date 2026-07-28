import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, KeyRound, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PhotoUpload } from '@/components/ui/PhotoUpload';
import { callAccountFunction } from '@/lib/accounts';

interface Faculty {
  id: string;
  employee_id: string;
  name: string;
  photo_url: string | null;
  mobile_number: string | null;
  email: string | null;
  qualification: string | null;
  department_id: string | null;
  user_id: string | null;
  departments?: { name: string } | null;
}

export function Faculty() {
  const [rows, setRows] = useState<Faculty[]>([]);
  const [depts, setDepts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Faculty | null>(null);
  const [form, setForm] = useState({ employee_id: '', name: '', photo_url: '', mobile_number: '', email: '', qualification: '', department_id: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('faculty').select('id, employee_id, name, photo_url, mobile_number, email, qualification, department_id, user_id, departments(name)').order('name');
    setRows((data ?? []) as unknown as Faculty[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from('departments').select('id, name').order('name').then(({ data }) => setDepts(data ?? []));
  }, []);

  const openNew = () => { setEditing(null); setForm({ employee_id: '', name: '', photo_url: '', mobile_number: '', email: '', qualification: '', department_id: depts[0]?.id ?? '', password: '' }); setError(null); setModalOpen(true); };
  const openEdit = (f: Faculty) => { setEditing(f); setForm({ employee_id: f.employee_id, name: f.name, photo_url: f.photo_url ?? '', mobile_number: f.mobile_number ?? '', email: f.email ?? '', qualification: f.qualification ?? '', department_id: f.department_id ?? '', password: '' }); setError(null); setModalOpen(true); };

  const save = async () => {
    setSaving(true);
    setError(null);
    const payload = {
      employee_id: form.employee_id, name: form.name, photo_url: form.photo_url || null,
      mobile_number: form.mobile_number || null, email: form.email || null,
      qualification: form.qualification || null, department_id: form.department_id || null,
    };
    try {
      if (editing) {
        await supabase.from('faculty').update(payload).eq('id', editing.id);
        // Create login account if requested and none exists
        if (form.password && !editing.user_id && form.email) {
          await callAccountFunction({
            action: 'create-account', email: form.email, password: form.password, role: 'faculty', name: form.name,
            profile: { employee_id: form.employee_id, department_id: form.department_id || null, mobile_number: form.mobile_number || null, qualification: form.qualification || null },
          });
        }
      } else {
        const { data: inserted } = await supabase.from('faculty').insert(payload).select('id').single();
        // Create login account if email + password provided
        if (form.email && form.password && inserted) {
          await callAccountFunction({
            action: 'create-account', email: form.email, password: form.password, role: 'faculty', name: form.name,
            profile: { employee_id: form.employee_id, department_id: form.department_id || null, mobile_number: form.mobile_number || null, qualification: form.qualification || null },
          });
        }
      }
      setSaving(false); setModalOpen(false); load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
      setSaving(false);
    }
  };

  const remove = async (f: Faculty) => {
    if (!confirm(`Delete faculty "${f.name}"?`)) return;
    await supabase.from('faculty').delete().eq('id', f.id);
    load();
  };

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.employee_id.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Faculty Management"
        description="Create faculty profiles and login accounts. Admin creates all accounts."
        action={<button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Faculty</button>}
      />
      <DataTable
        columns={[
          { key: 'name', label: 'Faculty', render: (r: Faculty) => (
            <div className="flex items-center gap-3">
              {r.photo_url ? <img src={r.photo_url} alt={r.name} className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))] flex items-center justify-center text-xs font-semibold">{r.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</div>}
              <div>
                <p className="font-medium flex items-center gap-1.5">{r.name} {r.user_id && <CheckCircle2 size={12} className="text-[rgb(var(--success))]" />}</p>
                <p className="text-xs text-[rgb(var(--text-muted))]">{r.employee_id}</p>
              </div>
            </div>
          )},
          { key: 'dept', label: 'Department', render: (r: Faculty) => <span className="text-[rgb(var(--text-muted))]">{r.departments?.name ?? '—'}</span> },
          { key: 'email', label: 'Email', render: (r: Faculty) => <span className="text-[rgb(var(--text-muted))]">{r.email ?? '—'}</span> },
          { key: 'mobile', label: 'Mobile', render: (r: Faculty) => <span className="text-[rgb(var(--text-muted))]">{r.mobile_number ?? '—'}</span> },
          { key: 'account', label: 'Login', render: (r: Faculty) => r.user_id ? <span className="px-2 py-0.5 rounded-md bg-[rgb(var(--success)/0.1)] text-[rgb(var(--success))] text-xs font-medium">Active</span> : <span className="text-xs text-[rgb(var(--text-muted))]">No account</span> },
        ]}
        rows={filtered}
        loading={loading}
        search={search}
        searchPlaceholder="Search faculty…"
        onSearchChange={setSearch}
        rowKey={(r) => r.id}
        actions={(r: Faculty) => (
          <div className="flex justify-end gap-1.5">
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]" title="Edit"><Pencil size={15} /></button>
            <button onClick={() => remove(r)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--error)/0.1)] text-[rgb(var(--error))]" title="Delete"><Trash2 size={15} /></button>
          </div>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Faculty' : 'Add Faculty'} size="lg">
        <div className="space-y-4">
          <div className="flex justify-center">
            <PhotoUpload value={form.photo_url} onChange={(url) => setForm({ ...form, photo_url: url })} folder="faculty" label="Faculty Photo" shape="circle" size={96} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Employee ID</label>
              <input className="input" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} placeholder="FAC-007" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Full Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Alan Pierce" />
            </div>
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
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Mobile</label>
              <input className="input" value={form.mobile_number} onChange={(e) => setForm({ ...form, mobile_number: e.target.value })} placeholder="+1-555-0201" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Email</label>
              <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@northgate.edu" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Qualification</label>
            <input className="input" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="Ph.D. Computer Science" />
          </div>

          {/* Login account section */}
          <div className="p-3 rounded-xl bg-[rgb(var(--primary)/0.06)] border border-[rgb(var(--primary)/0.12)] space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound size={14} className="text-[rgb(var(--primary))]" />
              <p className="text-xs font-semibold text-[rgb(var(--text))]">Login Account</p>
            </div>
            {editing?.user_id ? (
              <p className="text-xs text-[rgb(var(--success))] flex items-center gap-1.5"><CheckCircle2 size={13} /> Login account already created. Set a new password to reset.</p>
            ) : (
              <p className="text-xs text-[rgb(var(--text-muted))]">Enter an email and password to create a faculty login account. Leave password blank to skip.</p>
            )}
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Password {editing?.user_id ? '(reset)' : '(new account)'}</label>
              <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing?.user_id ? 'New password (optional)' : 'Set initial password'} />
            </div>
          </div>

          {error && <p className="text-xs text-[rgb(var(--error))] bg-[rgb(var(--error)/0.08)] px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={save} disabled={saving || !form.name || !form.employee_id} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
