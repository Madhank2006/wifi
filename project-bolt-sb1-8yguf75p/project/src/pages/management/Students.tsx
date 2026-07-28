import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, QrCode, Smartphone, X, KeyRound, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PhotoUpload } from '@/components/ui/PhotoUpload';
import { callAccountFunction } from '@/lib/accounts';

interface Student {
  id: string;
  register_number: string;
  name: string;
  photo_url: string | null;
  department_id: string | null;
  course_id: string | null;
  semester: number;
  section: string | null;
  mobile_number: string | null;
  email: string | null;
  parent_name: string | null;
  parent_mobile: string | null;
  registered_device: string | null;
  device_fingerprint: string | null;
  qr_code: string | null;
  user_id: string | null;
  departments?: { name: string } | null;
  courses?: { name: string } | null;
}

export function Students() {
  const [rows, setRows] = useState<Student[]>([]);
  const [depts, setDepts] = useState<{ id: string; name: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [detail, setDetail] = useState<Student | null>(null);
  const [form, setForm] = useState({
    register_number: '', name: '', photo_url: '', department_id: '', course_id: '',
    semester: 1, section: '', mobile_number: '', email: '', parent_name: '', parent_mobile: '',
    registered_device: '', device_fingerprint: '', password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('students').select('id, register_number, name, photo_url, department_id, course_id, semester, section, mobile_number, email, parent_name, parent_mobile, registered_device, device_fingerprint, qr_code, user_id, departments(name), courses(name)').order('name');
    setRows((data ?? []) as unknown as Student[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from('departments').select('id, name').order('name').then(({ data }) => setDepts(data ?? []));
    supabase.from('courses').select('id, name').order('name').then(({ data }) => setCourses(data ?? []));
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ register_number: '', name: '', photo_url: '', department_id: depts[0]?.id ?? '', course_id: courses[0]?.id ?? '', semester: 1, section: 'A', mobile_number: '', email: '', parent_name: '', parent_mobile: '', registered_device: '', device_fingerprint: '', password: '' });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (s: Student) => {
    setEditing(s);
    setForm({
      register_number: s.register_number, name: s.name, photo_url: s.photo_url ?? '',
      department_id: s.department_id ?? '', course_id: s.course_id ?? '',
      semester: s.semester, section: s.section ?? '', mobile_number: s.mobile_number ?? '',
      email: s.email ?? '', parent_name: s.parent_name ?? '', parent_mobile: s.parent_mobile ?? '',
      registered_device: s.registered_device ?? '', device_fingerprint: s.device_fingerprint ?? '', password: '',
    });
    setError(null);
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const qr = form.register_number;
    const payload = {
      register_number: form.register_number, name: form.name, photo_url: form.photo_url || null,
      department_id: form.department_id || null, course_id: form.course_id || null,
      semester: Number(form.semester), section: form.section || null,
      mobile_number: form.mobile_number || null, email: form.email || null,
      parent_name: form.parent_name || null, parent_mobile: form.parent_mobile || null,
      registered_device: form.registered_device || null,
      device_fingerprint: form.device_fingerprint || md5(form.registered_device + form.register_number),
      qr_code: qr,
    };
    try {
      if (editing) {
        await supabase.from('students').update(payload).eq('id', editing.id);
        if (form.password && !editing.user_id && form.email) {
          await callAccountFunction({
            action: 'create-account', email: form.email, password: form.password, role: 'student', name: form.name,
            profile: { register_number: form.register_number, department_id: form.department_id || null, course_id: form.course_id || null, semester: Number(form.semester), section: form.section || null, mobile_number: form.mobile_number || null, parent_name: form.parent_name || null, parent_mobile: form.parent_mobile || null, registered_device: form.registered_device || null, device_fingerprint: payload.device_fingerprint },
          });
        }
      } else {
        const { data: inserted } = await supabase.from('students').insert(payload).select('id').single();
        if (form.email && form.password && inserted) {
          await callAccountFunction({
            action: 'create-account', email: form.email, password: form.password, role: 'student', name: form.name,
            profile: { register_number: form.register_number, department_id: form.department_id || null, course_id: form.course_id || null, semester: Number(form.semester), section: form.section || null, mobile_number: form.mobile_number || null, parent_name: form.parent_name || null, parent_mobile: form.parent_mobile || null, registered_device: form.registered_device || null, device_fingerprint: payload.device_fingerprint },
          });
        }
      }
      setSaving(false); setModalOpen(false); load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
      setSaving(false);
    }
  };

  const remove = async (s: Student) => {
    if (!confirm(`Delete student "${s.name}" (${s.register_number})?`)) return;
    await supabase.from('students').delete().eq('id', s.id);
    load();
  };

  const filtered = rows.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.register_number.toLowerCase().includes(search.toLowerCase()) ||
    (r.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Student Management"
        description="Register students, devices, parent details, QR codes and login accounts."
        action={<button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Student</button>}
      />
      <DataTable
        columns={[
          { key: 'name', label: 'Student', render: (r: Student) => (
            <div className="flex items-center gap-3">
              {r.photo_url ? (
                <img src={r.photo_url} alt={r.name} className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))] flex items-center justify-center text-xs font-semibold">{r.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</div>
              )}
              <div>
                <button onClick={() => setDetail(r)} className="font-medium hover:text-[rgb(var(--primary))] flex items-center gap-1.5">{r.name} {r.user_id && <CheckCircle2 size={12} className="text-[rgb(var(--success))]" />}</button>
                <p className="text-xs text-[rgb(var(--text-muted))]">{r.register_number}</p>
              </div>
            </div>
          )},
          { key: 'dept', label: 'Department', render: (r: Student) => <span className="text-[rgb(var(--text-muted))]">{r.departments?.name ?? '—'}</span> },
          { key: 'course', label: 'Course', render: (r: Student) => <span className="text-[rgb(var(--text-muted))]">{r.courses?.name ?? '—'}</span> },
          { key: 'sem', label: 'Sem', render: (r: Student) => <span className="px-2 py-0.5 rounded-md bg-[rgb(var(--accent)/0.1)] text-[rgb(var(--accent))] text-xs font-medium">Sem {r.semester}</span> },
          { key: 'device', label: 'Device', render: (r: Student) => (
            <span className="flex items-center gap-1.5 text-[rgb(var(--text-muted))] text-xs"><Smartphone size={13} />{r.registered_device ?? '—'}</span>
          )},
          { key: 'account', label: 'Login', render: (r: Student) => r.user_id ? <span className="px-2 py-0.5 rounded-md bg-[rgb(var(--success)/0.1)] text-[rgb(var(--success))] text-xs font-medium">Active</span> : <span className="text-xs text-[rgb(var(--text-muted))]">No account</span> },
        ]}
        rows={filtered}
        loading={loading}
        search={search}
        searchPlaceholder="Search by name, register no, email…"
        onSearchChange={setSearch}
        rowKey={(r) => r.id}
        actions={(r: Student) => (
          <div className="flex justify-end gap-1.5">
            <button onClick={() => setDetail(r)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]" title="View"><QrCode size={15} /></button>
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]" title="Edit"><Pencil size={15} /></button>
            <button onClick={() => remove(r)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--error)/0.1)] text-[rgb(var(--error))]" title="Delete"><Trash2 size={15} /></button>
          </div>
        )}
      />

      {/* Detail drawer */}
      <AnimatePresence>
        {detail && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setDetail(null)}
            />
            <motion.div
              initial={{ x: 380 }} animate={{ x: 0 }} exit={{ x: 380 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm glass-strong overflow-y-auto"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-[rgb(var(--text))]">Student Details</h3>
                  <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]"><X size={18} /></button>
                </div>
                <div className="flex flex-col items-center text-center mb-5">
                  {detail.photo_url ? (
                    <img src={detail.photo_url} alt={detail.name} className="w-20 h-20 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))] flex items-center justify-center text-2xl font-semibold">{detail.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</div>
                  )}
                  <h4 className="font-semibold text-[rgb(var(--text))] mt-3">{detail.name}</h4>
                  <p className="text-sm text-[rgb(var(--text-muted))]">{detail.register_number}</p>
                  {detail.user_id && <span className="mt-2 px-2 py-0.5 rounded-md bg-[rgb(var(--success)/0.1)] text-[rgb(var(--success))] text-xs font-medium">Login active</span>}
                </div>

                <div className="flex flex-col items-center mb-5 p-4 rounded-xl bg-[rgb(var(--text)/0.03)]">
                  <div className="w-36 h-36 bg-white rounded-xl p-2 flex items-center justify-center">
                    <QrPlaceholder value={detail.qr_code ?? detail.register_number} />
                  </div>
                  <p className="text-xs text-[rgb(var(--text-muted))] mt-2">Student QR Code</p>
                </div>

                <dl className="space-y-2.5 text-sm">
                  <DetailRow label="Department" value={detail.departments?.name} />
                  <DetailRow label="Course" value={detail.courses?.name} />
                  <DetailRow label="Semester" value={`Semester ${detail.semester}`} />
                  <DetailRow label="Section" value={detail.section ?? '—'} />
                  <DetailRow label="Mobile" value={detail.mobile_number} />
                  <DetailRow label="Email" value={detail.email} />
                  <DetailRow label="Parent" value={detail.parent_name} />
                  <DetailRow label="Parent Mobile" value={detail.parent_mobile} />
                  <DetailRow label="Registered Device" value={detail.registered_device} />
                  <DetailRow label="Device Fingerprint" value={detail.device_fingerprint ? detail.device_fingerprint.slice(0, 16) + '…' : '—'} mono />
                </dl>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Student' : 'Add Student'} size="lg">
        <div className="space-y-4">
          <div className="flex justify-center">
            <PhotoUpload value={form.photo_url} onChange={(url) => setForm({ ...form, photo_url: url })} folder="students" label="Student Photo" shape="circle" size={96} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Register Number</label>
              <input className="input" value={form.register_number} onChange={(e) => setForm({ ...form, register_number: e.target.value })} placeholder="CS024" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Full Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Department</label>
              <select className="input" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                <option value="">— Select —</option>
                {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Course</label>
              <select className="input" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}>
                <option value="">— Select —</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Semester</label>
              <input type="number" min={1} max={12} className="input" value={form.semester} onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Section</label>
              <input className="input" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="A" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Mobile</label>
              <input className="input" value={form.mobile_number} onChange={(e) => setForm({ ...form, mobile_number: e.target.value })} placeholder="+1-555-0100" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Email</label>
            <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="student@college.edu" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Parent Name</label>
              <input className="input" value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Parent Mobile</label>
              <input className="input" value={form.parent_mobile} onChange={(e) => setForm({ ...form, parent_mobile: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Registered Device (MAC)</label>
              <input className="input" value={form.registered_device} onChange={(e) => setForm({ ...form, registered_device: e.target.value })} placeholder="00:1A:2B:3C:4D:01" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Device Fingerprint</label>
              <input className="input" value={form.device_fingerprint} onChange={(e) => setForm({ ...form, device_fingerprint: e.target.value })} placeholder="Auto-generated if empty" />
            </div>
          </div>

          {/* Login account section */}
          <div className="p-3 rounded-xl bg-[rgb(var(--primary)/0.06)] border border-[rgb(var(--primary)/0.12)] space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound size={14} className="text-[rgb(var(--primary))]" />
              <p className="text-xs font-semibold text-[rgb(var(--text))]">Student Login Account</p>
            </div>
            {editing?.user_id ? (
              <p className="text-xs text-[rgb(var(--success))] flex items-center gap-1.5"><CheckCircle2 size={13} /> Login account already created. Set a new password to reset.</p>
            ) : (
              <p className="text-xs text-[rgb(var(--text-muted))]">Enter a password to create a student login account. Leave blank to skip.</p>
            )}
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Password {editing?.user_id ? '(reset)' : '(new account)'}</label>
              <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing?.user_id ? 'New password (optional)' : 'Set initial password'} />
            </div>
          </div>

          {error && <p className="text-xs text-[rgb(var(--error))] bg-[rgb(var(--error)/0.08)] px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={save} disabled={saving || !form.name || !form.register_number} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[rgb(var(--text-muted))] shrink-0">{label}</dt>
      <dd className={`text-right text-[rgb(var(--text))] ${mono ? 'font-mono text-xs' : ''}`}>{value ?? '—'}</dd>
    </div>
  );
}

function QrPlaceholder({ value }: { value: string }) {
  const size = 21;
  const cells: boolean[] = [];
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  for (let i = 0; i < size * size; i++) {
    hash = (hash * 1103515245 + 12345) >>> 0;
    cells.push((hash >> 16) % 2 === 0);
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
      {cells.map((on, i) => on ? <rect key={i} x={i % size} y={Math.floor(i / size)} width={1} height={1} fill="#000" /> : null)}
      <rect x={0} y={0} width={7} height={7} fill="#000" />
      <rect x={1} y={1} width={5} height={5} fill="#fff" />
      <rect x={2} y={2} width={3} height={3} fill="#000" />
      <rect x={size - 7} y={0} width={7} height={7} fill="#000" />
      <rect x={size - 6} y={1} width={5} height={5} fill="#fff" />
      <rect x={size - 5} y={2} width={3} height={3} fill="#000" />
      <rect x={0} y={size - 7} width={7} height={7} fill="#000" />
      <rect x={1} y={size - 6} width={5} height={5} fill="#fff" />
      <rect x={2} y={size - 5} width={3} height={3} fill="#000" />
    </svg>
  );
}

function md5(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).padStart(8, '0') + (h >>> 8).toString(16).padStart(8, '0');
}
