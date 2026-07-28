import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, ShieldAlert, Pencil, Smartphone, Wifi,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';

interface AttendanceRow {
  id: string;
  date: string;
  marked_at: string;
  status: string;
  method: string;
  device_verified: boolean;
  ai_validated: boolean;
  proxy_flag: boolean;
  multiple_device_flag: boolean;
  risk_score: number;
  notes: string | null;
  student_id: string;
  subject_id: string | null;
  students?: { name: string; register_number: string } | null;
  subjects?: { name: string; code: string } | null;
}

const STATUS_STYLES: Record<string, { icon: typeof CheckCircle2; bg: string; text: string; label: string }> = {
  present: { icon: CheckCircle2, bg: 'bg-[rgb(var(--success)/0.12)]', text: 'text-[rgb(var(--success))]', label: 'Present' },
  late: { icon: Clock, bg: 'bg-[rgb(var(--warning)/0.12)]', text: 'text-[rgb(var(--warning))]', label: 'Late' },
  absent: { icon: XCircle, bg: 'bg-[rgb(var(--error)/0.12)]', text: 'text-[rgb(var(--error))]', label: 'Absent' },
  manual_correction: { icon: Pencil, bg: 'bg-[rgb(var(--primary)/0.12)]', text: 'text-[rgb(var(--primary))]', label: 'Corrected' },
};

export function Attendance() {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [flagOnly, setFlagOnly] = useState(false);
  const [editing, setEditing] = useState<AttendanceRow | null>(null);
  const [editStatus, setEditStatus] = useState('present');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('attendance')
      .select('id, date, marked_at, status, method, device_verified, ai_validated, proxy_flag, multiple_device_flag, risk_score, notes, student_id, subject_id, students(name, register_number), subjects(name, code)')
      .order('date', { ascending: false })
      .order('marked_at', { ascending: false })
      .limit(500);
    setRows((data ?? []) as unknown as AttendanceRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (dateFilter && r.date !== dateFilter) return false;
      if (flagOnly && !r.proxy_flag && !r.multiple_device_flag) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(r.students?.name ?? '').toLowerCase().includes(q) && !(r.students?.register_number ?? '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, dateFilter, flagOnly, search]);

  const openEdit = (r: AttendanceRow) => {
    setEditing(r);
    setEditStatus(r.status);
    setEditNotes(r.notes ?? '');
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    await supabase.from('attendance').update({
      status: editStatus,
      method: 'manual',
      notes: editNotes || null,
    }).eq('id', editing.id);
    setSaving(false);
    setEditing(null);
    load();
  };

  const summary = useMemo(() => {
    const present = rows.filter((r) => r.status === 'present' || r.status === 'late').length;
    const absent = rows.filter((r) => r.status === 'absent').length;
    const flagged = rows.filter((r) => r.proxy_flag || r.multiple_device_flag).length;
    return { present, absent, flagged, total: rows.length };
  }, [rows]);

  return (
    <div>
      <PageHeader title="Attendance Records" description="Auto-marked attendance with AI validation and manual correction." />

      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <SummaryChip label="Total Records" value={summary.total} tone="primary" icon={<Wifi size={16} />} />
        <SummaryChip label="Present / Late" value={summary.present} tone="success" icon={<CheckCircle2 size={16} />} />
        <SummaryChip label="Absent" value={summary.absent} tone="error" icon={<XCircle size={16} />} />
        <SummaryChip label="AI Flagged" value={summary.flagged} tone="warning" icon={<ShieldAlert size={16} />} />
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or register no…"
            className="input flex-1 min-w-[200px] py-2"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input py-2 w-auto">
            <option value="all">All Status</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
            <option value="manual_correction">Corrected</option>
          </select>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="input py-2 w-auto" />
          <label className="flex items-center gap-2 cursor-pointer text-sm text-[rgb(var(--text-muted))]">
            <input type="checkbox" checked={flagOnly} onChange={(e) => setFlagOnly(e.target.checked)} className="w-4 h-4 rounded accent-[rgb(var(--primary))]" />
            AI flagged only
          </label>
          {(statusFilter !== 'all' || dateFilter || search || flagOnly) && (
            <button onClick={() => { setStatusFilter('all'); setDateFilter(''); setSearch(''); setFlagOnly(false); }} className="btn-ghost py-2 text-xs">Clear</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgb(var(--border))]">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Student</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Subject</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">AI Flags</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Risk</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[rgb(var(--border))] last:border-0">
                    {Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3.5"><div className="h-3.5 w-20 bg-[rgb(var(--border))] rounded animate-pulse" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-[rgb(var(--text-muted))]">No attendance records match your filters.</td></tr>
              ) : (
                filtered.map((r, i) => {
                  const st = STATUS_STYLES[r.status] ?? STATUS_STYLES.present;
                  const StatusIcon = st.icon;
                  return (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.015, 0.3) }}
                      className="border-b border-[rgb(var(--border))] last:border-0 hover:bg-[rgb(var(--text)/0.03)]"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-[rgb(var(--text))]">{r.students?.name ?? '—'}</p>
                          <p className="text-xs text-[rgb(var(--text-muted))]">{r.students?.register_number ?? ''}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[rgb(var(--text))]">{r.subjects?.name ?? '—'}</p>
                        <p className="text-xs text-[rgb(var(--text-muted))]">{r.subjects?.code ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 text-[rgb(var(--text-muted))]">
                        <p>{r.date}</p>
                        <p className="text-xs">{new Date(r.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
                          <StatusIcon size={13} /> {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {r.proxy_flag && <FlagBadge icon={AlertTriangle} label="Proxy" tone="error" />}
                          {r.multiple_device_flag && <FlagBadge icon={Smartphone} label="Multi-device" tone="warning" />}
                          {!r.proxy_flag && !r.multiple_device_flag && <span className="text-xs text-[rgb(var(--text-muted))]">Clean</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RiskBar score={r.risk_score} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]" title="Manual correction"><Pencil size={15} /></button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Manual Attendance Correction" description="Override the auto-marked status. This is logged as a manual correction.">
        {editing && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-[rgb(var(--text)/0.04)]">
              <p className="text-sm font-medium text-[rgb(var(--text))]">{editing.students?.name} <span className="text-[rgb(var(--text-muted))]">· {editing.students?.register_number}</span></p>
              <p className="text-xs text-[rgb(var(--text-muted))]">{editing.subjects?.name} · {editing.date}</p>
              <p className="text-xs text-[rgb(var(--text-muted))] mt-1">Current: <span className="font-medium">{STATUS_STYLES[editing.status]?.label ?? editing.status}</span></p>
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">New Status</label>
              <select className="input" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
                <option value="manual_correction">Corrected</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Correction Notes</label>
              <textarea className="input min-h-[72px]" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Reason for correction…" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Apply Correction'}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function SummaryChip({ label, value, tone, icon }: { label: string; value: number; tone: 'primary' | 'success' | 'error' | 'warning'; icon: React.ReactNode }) {
  const toneClass = {
    primary: 'text-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.1)]',
    success: 'text-[rgb(var(--success))] bg-[rgb(var(--success)/0.1)]',
    error: 'text-[rgb(var(--error))] bg-[rgb(var(--error)/0.1)]',
    warning: 'text-[rgb(var(--warning))] bg-[rgb(var(--warning)/0.1)]',
  }[tone];
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${toneClass}`}>{icon}</div>
      <div>
        <p className="text-lg font-semibold text-[rgb(var(--text))]">{value}</p>
        <p className="text-xs text-[rgb(var(--text-muted))]">{label}</p>
      </div>
    </div>
  );
}

function FlagBadge({ icon: Icon, label, tone }: { icon: typeof AlertTriangle; label: string; tone: 'error' | 'warning' }) {
  const cls = tone === 'error' ? 'bg-[rgb(var(--error)/0.12)] text-[rgb(var(--error))]' : 'bg-[rgb(var(--warning)/0.12)] text-[rgb(var(--warning))]';
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>
      <Icon size={10} /> {label}
    </span>
  );
}

function RiskBar({ score }: { score: number }) {
  const tone = score >= 50 ? 'rgb(var(--error))' : score >= 25 ? 'rgb(var(--warning))' : 'rgb(var(--success))';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-[rgb(var(--border))] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(score, 100)}%`, backgroundColor: `rgb(${tone})` }} />
      </div>
      <span className="text-xs text-[rgb(var(--text-muted))]">{score}</span>
    </div>
  );
}
