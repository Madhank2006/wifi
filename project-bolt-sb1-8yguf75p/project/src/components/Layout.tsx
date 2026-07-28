import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Wifi, LogOut, Menu, X, Moon, Sun, ChevronRight } from 'lucide-react';
import { getNavItems } from '@/config/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/lib/constants';

interface LayoutProps {
  active: string;
  onNavigate: (id: string) => void;
  children: ReactNode;
}

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin Portal',
  faculty: 'Faculty Portal',
  student: 'Student Portal',
};

export function Layout({ active, onNavigate, children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { signOut, role, user } = useAuth();

  const navItems = getNavItems(role);
  const groups = Array.from(new Set(navItems.map((n) => n.group)));
  const activeItem = navItems.find((n) => n.id === active);

  const handleNav = (id: string) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? 'User';
  const initials = displayName.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="p-2 rounded-xl bg-[rgb(var(--primary))] text-white">
          <Wifi size={20} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-[rgb(var(--text))]">SmartAttendance</p>
          <p className="text-[11px] text-[rgb(var(--text-muted))]">{role ? ROLE_LABEL[role] : 'Portal'}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5">
        {groups.map((group) => (
          <div key={group}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">
              {group}
            </p>
            <div className="space-y-0.5">
              {navItems.filter((n) => n.group === group).map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]'
                        : 'text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--text)/0.05)] hover:text-[rgb(var(--text))]'
                    }`}
                  >
                    <Icon size={17} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isActive && <ChevronRight size={14} />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-[rgb(var(--border))]">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[rgb(var(--error))] hover:bg-[rgb(var(--error)/0.08)] transition-colors"
        >
          <LogOut size={17} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex w-64 shrink-0 glass border-r border-[rgb(var(--border))]">
        {SidebarContent}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-64 glass-strong lg:hidden"
            >
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 glass border-b border-[rgb(var(--border))]">
          <div className="flex items-center justify-between px-4 lg:px-8 py-3.5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text))]"
              >
                <Menu size={18} />
              </button>
              <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-muted))]">
                <span className="capitalize">{role}</span>
                <ChevronRight size={14} />
                <span className="text-[rgb(var(--text))] font-medium">{activeItem?.label ?? 'Dashboard'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <div className="hidden sm:flex items-center gap-2.5 pl-3 ml-1 border-l border-[rgb(var(--border))]">
                <div className="w-8 h-8 rounded-full bg-[rgb(var(--primary))] text-white flex items-center justify-center text-xs font-semibold">
                  {initials}
                </div>
                <div className="leading-tight max-w-[160px] truncate">
                  <p className="text-xs font-semibold text-[rgb(var(--text))] truncate">{displayName}</p>
                  <p className="text-[11px] text-[rgb(var(--text-muted))] truncate">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {mobileOpen && (
        <button
          onClick={() => setMobileOpen(false)}
          className="fixed top-3 right-3 z-50 lg:hidden p-2 rounded-lg glass text-[rgb(var(--text))]"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}
