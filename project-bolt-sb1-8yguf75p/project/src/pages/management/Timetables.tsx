import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, CalendarDays, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';

interface Timetable {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  semester: number;
  section: string | null;
  attendance_window_minutes: number;
  subject_id: string | null;
  faculty_id: string | null;
  classroom_id: string | null;
  department_id: string | null;
  subjects?: { name: string; code: string } | null;
  faculty?: { name: string } | null;
  classrooms?: { name: string } | null;
  departments?: { name: string } | null;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function Timetables() {
  const [rows, setRows] = useState<Timetable[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [faculty, setFaculty] = useState<{ id: string; name: string }[]>([]);
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [depts, setDepts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Timetable | null>(null);
  const [form, setForm] = useState({
    day_of_week: 1, start_time: '09:00', end_time: '10:00', semester: 3, section: 'A',
    attendance_window_minutes: 15, subject_id: '', faculty_id: '', classroom_id: '', department_id: '',
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('timetables').select('id, day_of_week, start_time, end_time, semester, section, attendance_window_minutes, subject_id, faculty_id, classroom_id, department_id, subjects(name, code), faculty(name), classrooms(name), departments(name)').order('day_of_week');
    setRows((data ?? []) as unknown as Timetable[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from('subjects').select('id, name').order('name').then(({ data }) => setSubjects(data ?? []));
    supabase.from('faculty').select('id, name').order('name').then(({ data }) => setFaculty(data ?? []));
    supabase.from('classrooms').select('id, name').order('name').then(({ data }) => setRooms(data ?? []));
    supabase.from('departments').select('id, name').order('name').then(({ data }) => setDepts(data ?? []));
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ day_of_week: 1, start_time: '09:00', end_time: '10:00', semester: 3, section: 'A', attendance_window_minutes: 15, subject_id: subjects[0]?.id ?? '', faculty_id: faculty[0]?.id ?? '', classroom_id: rooms[0]?.id ?? '', department_id: depts[0]?.id ?? '' });
    setModalOpen(true);
  };

  const openEdit = (t: Timetable) => {
    setEditing(t);
    setForm({
      day_of_week: t.day_of_week, start_time: t.start_time.slice(0, 5), end_time: t.end_time.slice(0, 5),
      semester: t.semester, section: t.section ?? 'A', attendance_window_minutes: t.attendance_window_minutes,
      subject_id: t.subject_id ?? '', faculty_id: t.faculty_id ?? '', classroom_id: t.classroom_id ?? '', department_id: t.department_id ?? '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      day_of_week: Number(form.day_of_week), start_time: form.start_time, end_time: form.end_time,
      semester: Number(form.semester), section: form.section || null,
      attendance_window_minutes: Number(form.attendance_window_minutes),
      subject_id: form.subject_id || null, faculty_id: form.faculty_id || null,
      classroom_id: form.classroom_id || null, department_id: form.department_id || null,
    };
    if (editing) await supabase.from('timetables').update(payload).eq('id', editing.id);
    else await supabase.from('timetables').insert(payload);
    setSaving(false); setModalOpen(false); load();
  };

  const remove = async (t: Timetable) => {
    if (!confirm('Delete this timetable entry?')) return;
    await supabase.from('timetables').delete().eq('id', t.id);
    load();
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return (r.subjects?.name ?? '').toLowerCase().includes(q) || (r.faculty?.name ?? '').toLowerCase().includes(q) || DAYS[r.day_of_week].toLowerCase().includes(q);
  });

  return (
    <div>
      <PageHeader
        title="Timetable Management"
        description="Create class schedules and set the attendance time window."
        action={<button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Timetable</button>}
      />
      <DataTable
        columns={[
          { key: 'day', label: 'Day', render: (r: Timetable) => <span className="px-2.5 py-1 rounded-md bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))] text-xs font-medium">{DAYS[r.day_of_week]}</span> },
          { key: 'time', label: 'Time', render: (r: Timetable) => (
            <span className="flex items-center gap-1.5 text-[rgb(var(--text-muted))]"><Clock size={13} />{r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)}</span>
          )},
          { key: 'subject', label: 'Subject', render: (r: Timetable) => (
            <div>
              <p className="font-medium">{r.subjects?.name ?? '—'}</p>
              <p className="text-xs text-[rgb(var(--text-muted))]">{r.subjects?.code ?? ''}</p>
            </div>
          )},
          { key: 'faculty', label: 'Faculty', render: (r: Timetable) => <span className="text-[rgb(var(--text-muted))]">{r.faculty?.name ?? '—'}</span> },
          { key: 'room', label: 'Classroom', render: (r: Timetable) => <span className="text-[rgb(var(--text-muted))]">{r.classrooms?.name ?? '—'}</span> },
          { key: 'window', label: 'Window', render: (r: Timetable) => <span className="px-2 py-0.5 rounded-md bg-[rgb(var(--warning)/0.1)] text-[rgb(var(--warning))] text-xs font-medium">±{r.attendance_window_minutes}m</span> },
        ]}
        rows={filtered}
        loading={loading}
        search={search}
        searchPlaceholder="Search by day, subject, faculty…"
        onSearchChange={setSearch}
        rowKey={(r) => r.id}
        actions={(r: Timetable) => (
          <div className="flex justify-end gap-1.5">
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]" title="Edit"><Pencil size={15} /></button>
            <button onClick={() => remove(r)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--error)/0.1)] text-[rgb(var(--error))]" title="Delete"><Trash2 size={15} /></button>
          </div>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Timetable' : 'Add Timetable'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Day</label>
              <select className="input" value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: Number(e.target.value) })}>
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Department</label>
              <select className="input" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                <option value="">— Select —</option>
                {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Start Time</label>
              <input type="time" className="input" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">End Time</label>
              <input type="time" className="input" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Semester</label>
              <input type="number" min={1} max={12} className="input" value={form.semester} onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Section</label>
              <input className="input" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Window (min)</label>
              <input type="number" min={1} max={60} className="input" value={form.attendance_window_minutes} onChange={(e) => setForm({ ...form, attendance_window_minutes: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Subject</label>
              <select className="input" value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}>
                <option value="">— Select —</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Faculty</label>
                <select className="input" value={form.faculty_id} onChange={(e) => setForm({ ...form, faculty_id: e.target.value })}>
                  <option value="">— Select —</option>
                  {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Classroom</label>
                <select className="input" value={form.classroom_id} onChange={(e) => setForm({ ...form, classroom_id: e.target.value })}>
                  <option value="">— Select —</option>
                  {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
