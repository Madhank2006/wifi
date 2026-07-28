import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone?: 'primary' | 'success' | 'warning' | 'error' | 'accent';
  hint?: string;
  delay?: number;
}

const toneMap: Record<string, string> = {
  primary: 'text-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.1)]',
  success: 'text-[rgb(var(--success))] bg-[rgb(var(--success)/0.1)]',
  warning: 'text-[rgb(var(--warning))] bg-[rgb(var(--warning)/0.1)]',
  error: 'text-[rgb(var(--error))] bg-[rgb(var(--error)/0.1)]',
  accent: 'text-[rgb(var(--accent))] bg-[rgb(var(--accent)/0.1)]',
};

export function StatCard({ label, value, icon, tone = 'primary', hint, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="card card-hover p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[rgb(var(--text-muted))] uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold mt-1.5 text-[rgb(var(--text))]">{value}</p>
          {hint && <p className="text-xs text-[rgb(var(--text-muted))] mt-1">{hint}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${toneMap[tone]}`}>{icon}</div>
      </div>
    </motion.div>
  );
}
