import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

interface DataTableProps<T> {
  columns: { key: string; label: string; render?: (row: T) => ReactNode; className?: string }[];
  rows: T[];
  loading?: boolean;
  search?: string;
  searchPlaceholder?: string;
  onSearchChange?: (v: string) => void;
  emptyMessage?: string;
  rowKey: (row: T) => string;
  actions?: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns, rows, loading, search, searchPlaceholder, onSearchChange, emptyMessage, rowKey, actions,
}: DataTableProps<T>) {
  return (
    <div className="card overflow-hidden">
      {onSearchChange && (
        <div className="p-4 border-b border-[rgb(var(--border))]">
          <div className="relative max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
            <input
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder ?? 'Search…'}
              className="input pl-9 py-2"
            />
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgb(var(--border))]">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))] ${c.className ?? ''}`}
                >
                  {c.label}
                </th>
              ))}
              {actions && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[rgb(var(--border))] last:border-0">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3.5">
                      <div className="h-3.5 w-24 bg-[rgb(var(--border))] rounded animate-pulse" />
                    </td>
                  ))}
                  {actions && <td className="px-4 py-3.5"><div className="h-3.5 w-12 bg-[rgb(var(--border))] rounded animate-pulse" /></td>}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-12 text-center text-sm text-[rgb(var(--text-muted))]">
                  {emptyMessage ?? 'No records found.'}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <motion.tr
                  key={rowKey(row)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="border-b border-[rgb(var(--border))] last:border-0 hover:bg-[rgb(var(--text)/0.03)] transition-colors"
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3.5 text-[rgb(var(--text))] ${c.className ?? ''}`}>
                      {c.render ? c.render(row) : (row as Record<string, ReactNode>)[c.key]}
                    </td>
                  ))}
                  {actions && <td className="px-4 py-3.5 text-right whitespace-nowrap">{actions(row)}</td>}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
