import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, LogIn, Plus, Pencil, Trash2, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';

interface AuditLog {
  id: string;
  actor: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  details: string | null;
  created_at: string;
}

const ACTION_ICON: Record<string, typeof Shield> = {
  login: LogIn, create: Plus, update: Pencil, delete: Trash2,
};

export function AuditLogs() {
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
      setRows(data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) =>
    r.actor.toLowerCase().includes(search.toLowerCase()) ||
    r.action.toLowerCase().includes(search.toLowerCase()) ||
    (r.details ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const headers = ['Timestamp', 'Actor', 'Action', 'Entity', 'Details'];
    const csv = [headers.join(','), ...filtered.map((r) => [r.created_at, r.actor, r.action, r.entity ?? '', (r.details ?? '').replace(/,/g, ';')].join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit-logs-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Activity monitoring and security trail for all admin actions."
        action={<button onClick={exportCSV} className="btn-ghost flex items-center gap-2"><Download size={15} /> Export</button>}
      />

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-[rgb(var(--border))]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by actor, action or details…"
            className="input py-2 max-w-xs"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgb(var(--border))]">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Actor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Entity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Details</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[rgb(var(--border))] last:border-0">
                    {Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3.5"><div className="h-3.5 w-24 bg-[rgb(var(--border))] rounded animate-pulse" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-[rgb(var(--text-muted))]">No audit logs found.</td></tr>
              ) : (
                filtered.map((r, i) => {
                  const Icon = ACTION_ICON[r.action] ?? Shield;
                  return (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      className="border-b border-[rgb(var(--border))] last:border-0 hover:bg-[rgb(var(--text)/0.03)]"
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]"><Icon size={13} /></span>
                          <span className="font-medium capitalize text-[rgb(var(--text))]">{r.action}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[rgb(var(--text-muted))]">{r.actor}</td>
                      <td className="px-4 py-3 text-[rgb(var(--text-muted))]">{r.entity ?? '—'}</td>
                      <td className="px-4 py-3 text-[rgb(var(--text-muted))]">{r.details ?? '—'}</td>
                      <td className="px-4 py-3 text-[rgb(var(--text-muted))] text-xs">{new Date(r.created_at).toLocaleString()}</td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
