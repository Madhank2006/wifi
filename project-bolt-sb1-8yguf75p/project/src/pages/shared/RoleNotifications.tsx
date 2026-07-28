import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCircle2, AlertTriangle, Wrench, CalendarOff, ClipboardCheck, Mail, Smartphone, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  channel: string;
  read: boolean;
  created_at: string;
}

const TYPE_META: Record<string, { icon: typeof Bell; bg: string; text: string }> = {
  attendance_recorded: { icon: ClipboardCheck, bg: 'bg-[rgb(var(--success)/0.12)]', text: 'text-[rgb(var(--success))]' },
  low_attendance: { icon: AlertTriangle, bg: 'bg-[rgb(var(--warning)/0.12)]', text: 'text-[rgb(var(--warning))]' },
  correction: { icon: ClipboardCheck, bg: 'bg-[rgb(var(--primary)/0.12)]', text: 'text-[rgb(var(--primary))]' },
  holiday: { icon: CalendarOff, bg: 'bg-[rgb(var(--accent)/0.12)]', text: 'text-[rgb(var(--accent))]' },
  maintenance: { icon: Wrench, bg: 'bg-[rgb(var(--error)/0.12)]', text: 'text-[rgb(var(--error))]' },
};

const CHANNEL_ICON: Record<string, typeof Mail> = { email: Mail, push: Smartphone, sms: MessageSquare };

export function RoleNotifications() {
  const [rows, setRows] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markRead = async (n: Notification) => {
    await supabase.from('notifications').update({ read: true }).eq('id', n.id);
    load();
  };

  const unread = rows.filter((r) => !r.read).length;

  return (
    <div>
      <PageHeader title="Notifications" description="Attendance alerts, warnings and notices." />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]"><Bell size={16} /></div>
          <div><p className="text-lg font-semibold text-[rgb(var(--text))]">{rows.length}</p><p className="text-xs text-[rgb(var(--text-muted))]">Total</p></div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[rgb(var(--warning)/0.1)] text-[rgb(var(--warning))]"><AlertTriangle size={16} /></div>
          <div><p className="text-lg font-semibold text-[rgb(var(--text))]">{unread}</p><p className="text-xs text-[rgb(var(--text-muted))]">Unread</p></div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[rgb(var(--success)/0.1)] text-[rgb(var(--success))]"><CheckCircle2 size={16} /></div>
          <div><p className="text-lg font-semibold text-[rgb(var(--text))]">{rows.length - unread}</p><p className="text-xs text-[rgb(var(--text-muted))]">Read</p></div>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-4 h-20 animate-pulse" />)
        ) : rows.length === 0 ? (
          <div className="card p-12 text-center text-sm text-[rgb(var(--text-muted))]">No notifications yet.</div>
        ) : (
          rows.map((n, i) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.maintenance;
            const Icon = meta.icon;
            const ChannelIcon = CHANNEL_ICON[n.channel] ?? Mail;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className={`card p-4 flex items-start gap-3 ${!n.read ? 'border-l-2 border-l-[rgb(var(--primary))]' : ''}`}
              >
                <div className={`p-2.5 rounded-xl ${meta.bg} ${meta.text} shrink-0`}><Icon size={18} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-[rgb(var(--text))]">{n.title}</h4>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-[rgb(var(--primary))]" />}
                  </div>
                  <p className="text-sm text-[rgb(var(--text-muted))] mt-0.5">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-[rgb(var(--text-muted))]">
                    <span className="flex items-center gap-1"><ChannelIcon size={12} /> {n.channel}</span>
                    <span>· {new Date(n.created_at).toLocaleString()}</span>
                  </div>
                </div>
                {!n.read && <button onClick={() => markRead(n)} className="text-xs text-[rgb(var(--primary))] hover:underline shrink-0">Mark read</button>}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
