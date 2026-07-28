import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5"
    >
      <div>
        <h1 className="text-xl font-semibold text-[rgb(var(--text))]">{title}</h1>
        {description && <p className="text-sm text-[rgb(var(--text-muted))] mt-0.5">{description}</p>}
      </div>
      {action}
    </motion.div>
  );
}
