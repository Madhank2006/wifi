import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Clock, Power, Save, Download, Users, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';

interface TimetableSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subjects?: { name: string; code: string } | null;
  classrooms?: { name: string } | null;
  faculty?: { name: string } | null;
  attendance_settings?: { enabled: boolean; window_open_minutes: number; window_close_minutes: number } | null;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AttendanceControls() {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, enabled: 0, disabled: 0, marked: 0 });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('timetables')
      .select('id, day_of_week, start_time, end_time, subjects(name, code), classrooms(name), faculty(name), attendance_settings(enabled, window_open_minutes, window_close_minutes)')
      .order('day_of_week')
      .order('start_time');
    setSlots((data ?? []) as unknown as TimetableSlot[]);

    const { count: marked } = await supabase.from('attendance').select('id', { count: 'exact', head: true });
    const enabledCount = ((data ?? []) as unknown as TimetableSlot[]).filter((s) => s.attendance_settings?.enabled ?? true).length;
    setStats({ total: (data ?? []).length, enabled: enabledCount, disabled: (data ?? []).length - enabledCount, marked: marked ?? 0 });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateSetting = async (slot: TimetableSlot, enabled: boolean, openMin: number, closeMin: number) => {
    setSaving(slot.id);
    const existing = slot.attendance_settings;
    if (existing) {
      await supabase.from('attendance_settings').update({
        enabled, window_open_minutes: openMin, window_close_minutes: closeMin, updated_at: new Date().toISOString(),
      }).eq('timetable_id', slot.id);
    } else {
      await supabase.from('attendance_settings').insert({
        timetable_id: slot.id, enabled, window_open_minutes: openMin, window_close_minutes: closeMin,
      });
    }
    setSaving(null);
    load();
  };

  const exportReport = () => {
    if (slots.length === 0) return;
    const headers = ['Day', 'Time', 'Subject', 'Code', 'Classroom', 'Faculty', 'Enabled', 'Window Open (min)', 'Window Close (min)'];
    const csv = [headers.join(','), ...slots.map((s) => [
      DAYS[s.day_of_week], `${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}`,
      s.subjects?.name ?? '', s.subjects?.code ?? '', s.classrooms?.name ?? '', s.faculty?.name ?? '',
      s.attendance_settings?.enabled ?? true ? 'Yes' : 'No',
      s.attendance_settings?.window_open_minutes ?? 10,
      s.attendance_settings?.window_close_minutes ?? 20,
    ].join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `attendance-controls-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const slotsByDay = (d: number) => slots.filter((s) => s.day_of_week === d);

  return (
    <div>
      <PageHeader
        title="Attendance Controls"
        description="Enable/disable attendance per class, configure time windows, and export reports."
        action={<button onClick={exportReport} className="btn-ghost flex items-center gap-2"><Download size={16} /> Export CSV</button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="card p-4 flex items-center gap-3"><Radio size={18} className="text-[rgb(var(--primary))]" /><div><p className="text-lg font-semibold">{stats.total}</p><p className="text-xs text-[rgb(var(--text-muted))]">Total Classes</p></div></div>
        <div className="card p-4 flex items-center gap-3"><Power size={18} className="text-[rgb(var(--success))]" /><div><p className="text-lg font-semibold">{stats.enabled}</p><p className="text-xs text-[rgb(var(--text-muted))]">Enabled</p></div></div>
        <div className="card p-4 flex items-center gap-3"><XCircle size={18} className="text-[rgb(var(--error))]" /><div><p className="text-lg font-semibold">{stats.disabled}</p><p className="text-xs text-[rgb(var(--text-muted))]">Disabled</p></div></div>
        <div className="card p-4 flex items-center gap-3"><Users size={18} className="text-[rgb(var(--accent))]" /><div><p className="text-lg font-semibold">{stats.marked}</p><p className="text-xs text-[rgb(var(--text-muted))]">Records Marked</p></div></div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-4 h-20 animate-pulse" />)}</div>
      ) : (
        <div className="space-y-5">
          {DAYS.map((day, di) => {
            const daySlots = slotsByDay(di);
            if (daySlots.length === 0) return null;
            return (
              <div key={di}>
                <h3 className="text-sm font-semibold text-[rgb(var(--text))] mb-2 px-1">{day}</h3>
                <div className="space-y-2">
                  {daySlots.map((s) => {
                    const enabled = s.attendance_settings?.enabled ?? true;
                    const openMin = s.attendance_settings?.window_open_minutes ?? 10;
                    const closeMin = s.attendance_settings?.window_close_minutes ?? 20;
                    return (
                      <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-4 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                          <div className={`p-2 rounded-lg ${enabled ? 'bg-[rgb(var(--success)/0.12)] text-[rgb(var(--success))]' : 'bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]'}`}>
                            <Radio size={16} />
                          </div>
                          <div>
                            <p className="font-medium text-[rgb(var(--text))]">{s.subjects?.name ?? '—'}</p>
                            <p className="text-xs text-[rgb(var(--text-muted))]">{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} · {s.classrooms?.name ?? '—'} · {s.faculty?.name ?? '—'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
                            <Clock size={13} /> Open
                            <input type="number" defaultValue={openMin} min={0} max={60} className="input py-1 w-16 text-center" onChange={(e) => {
                              const v = Number(e.target.value);
                              updateSetting(s, enabled, v, closeMin);
                            }} />
                            min
                          </label>
                          <label className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
                            Close
                            <input type="number" defaultValue={closeMin} min={0} max={120} className="input py-1 w-16 text-center" onChange={(e) => {
                              const v = Number(e.target.value);
                              updateSetting(s, enabled, openMin, v);
                            }} />
                            min
                          </label>
                        </div>

                        <button
                          onClick={() => updateSetting(s, !enabled, openMin, closeMin)}
                          disabled={saving === s.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                            enabled
                              ? 'bg-[rgb(var(--error)/0.08)] text-[rgb(var(--error))] hover:bg-[rgb(var(--error)/0.12)]'
                              : 'bg-[rgb(var(--success)/0.08)] text-[rgb(var(--success))] hover:bg-[rgb(var(--success)/0.12)]'
                          }`}
                        >
                          {saving === s.id ? <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : enabled ? <XCircle size={13} /> : <Power size={13} />}
                          {enabled ? 'Disable' : 'Enable'}
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
