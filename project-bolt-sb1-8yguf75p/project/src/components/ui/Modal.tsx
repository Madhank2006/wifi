import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, description, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) {
      const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
      window.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', handler);
        document.body.style.overflow = '';
      };
    }
  }, [open, onClose]);

  const maxW = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={`glass-strong relative w-full ${maxW} rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto`}
          >
            <div className="flex items-start justify-between gap-4 p-5 border-b border-[rgb(var(--border))]">
              <div>
                <h2 className="text-lg font-semibold text-[rgb(var(--text))]">{title}</h2>
                {description && <p className="text-sm text-[rgb(var(--text-muted))] mt-0.5">{description}</p>}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
