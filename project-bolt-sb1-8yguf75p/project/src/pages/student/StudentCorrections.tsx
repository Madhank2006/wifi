import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileEdit, Clock, Check, X, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';

interface Correction {
  id: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  subjects?: { name: string } | null;
}

const STATUS_META: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-[rgb(var(--warning)/0.12)]', text: 'text-[rgb(var(--warning))]', label: 'Pending' },
  approved: { bg: 'bg-[rgb(var(--success)/0.12)]', text: 'text-[rgb(var(--success))]', label: 'Approved' },
  rejected: { bg: 'bg-[rgb(var(--error)/0.12)]', text: 'text-[rgb(var(--error))]', label: 'Rejected' },
};

export function StudentCorrections() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data: prof } = await supabase.from('students').select('id').eq('user_id', user.id).maybeSingle();
    if (!prof) { setLoading(false); return; }
    setStudentId(prof.id);
    const { data } = await supabase
      .from('attendance_correction_requests')
      .select('id, reason, status, admin_notes, created_at, reviewed_at, attendance!left(subjects(name))')
      .eq('student_id', prof.id)
      .order('created_at', { ascending: false });
    setRows((data ?? []) as unknown as Correction[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const submit = async () => {
    if (!studentId || !reason) return;
    setSaving(true);
    await supabase.from('attendance_correction_requests').insert({
      student_id: studentId,
      reason,
      status: 'pending',
    });
    setSaving(false);
    setModalOpen(false);
    setReason('');
    load();
  };

  return (
    <div>
      <PageHeader
        title="Correction Requests"
        description="Submit a request if your attendance was missed or marked incorrectly."
        action={<button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2"><FileEdit size={16} /> New Request</button>}
      />

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-4 h-20 animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center">
          <FileEdit size={32} className="mx-auto text-[rgb(var(--text-muted))] mb-3" />
          <p className="text-sm text-[rgb(var(--text-muted))]">No correction requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => {
            const meta = STATUS_META[r.status] ?? STATUS_META.pending;
            return (
              <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${meta.bg} ${meta.text}`}>{meta.label}</span>
                      <span className="text-xs text-[rgb(var(--text-muted))] flex items-center gap-1"><Clock size={11} /> {new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-[rgb(var(--text))]">{r.reason}</p>
                    {r.admin_notes && (
                      <div className="mt-2 p-2 rounded-lg bg-[rgb(var(--text)/0.04)] flex gap-2">
                        <MessageSquare size={13} className="text-[rgb(var(--text-muted))] shrink-0 mt-0.5" />
                        <p className="text-xs text-[rgb(var(--text-muted))]">{r.admin_notes}</p>
                      </div>
                    )}
                    {r.reviewed_at && <p className="text-xs text-[rgb(var(--text-muted))] mt-2">Reviewed {new Date(r.reviewed_at).toLocaleString()}</p>}
                  </div>
                  <div className="shrink-0">
                    {r.status === 'approved' && <Check size={18} className="text-[rgb(var(--success))]" />}
                    {r.status === 'rejected' && <X size={18} className="text-[rgb(var(--error))]" />}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Correction Request" description="Explain why your attendance needs correction. An admin will review it.">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Reason</label>
            <textarea className="input min-h-[100px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. I was present in class but my attendance was not recorded. My device was connected to the Wi-Fi." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={submit} disabled={saving || !reason} className="btn-primary">{saving ? 'Submitting…' : 'Submit Request'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
