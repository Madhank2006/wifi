import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, Lock, Mail, ShieldCheck, ArrowRight, Eye, EyeOff, Shield, Users, GraduationCap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ADMIN_CREDENTIALS, FACULTY_DEMO, STUDENT_DEMO, type Role } from '@/lib/constants';

const ROLES: { id: Role; label: string; icon: typeof Shield; desc: string; demo: { email: string; password: string } }[] = [
  { id: 'admin', label: 'Admin', icon: Shield, desc: 'Manage the entire system', demo: ADMIN_CREDENTIALS },
  { id: 'faculty', label: 'Faculty', icon: Users, desc: 'View & verify attendance', demo: FACULTY_DEMO },
  { id: 'student', label: 'Student', icon: GraduationCap, desc: 'View your attendance', demo: STUDENT_DEMO },
];

export function Login() {
  const { signIn } = useAuth();
  const [role, setRole] = useState<Role>('admin');
  const [email, setEmail] = useState(ADMIN_CREDENTIALS.email);
  const [password, setPassword] = useState(ADMIN_CREDENTIALS.password);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectRole = (r: Role) => {
    setRole(r);
    const demo = ROLES.find((x) => x.id === r)!.demo;
    setEmail(demo.email);
    setPassword(demo.password);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password, role);
    if (error) setError(error);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[rgb(var(--primary)/0.18)] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[55%] h-[55%] rounded-full bg-[rgb(var(--accent)/0.15)] blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="glass-strong rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
              className="w-14 h-14 rounded-2xl bg-[rgb(var(--primary))] text-white flex items-center justify-center mb-4 shadow-lg"
            >
              <Wifi size={26} />
            </motion.div>
            <h1 className="text-xl font-semibold text-[rgb(var(--text))]">SmartAttendance</h1>
            <p className="text-sm text-[rgb(var(--text-muted))] mt-1">AI Smart Wi-Fi Based College Attendance</p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const active = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => selectRole(r.id)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all ${
                    active
                      ? 'border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]'
                      : 'border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--text)/0.04)]'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-xs font-medium">{r.label}</span>
                </button>
              );
            })}
          </div>

          <p className="text-center text-xs text-[rgb(var(--text-muted))] mb-4">
            {ROLES.find((r) => r.id === role)!.desc}
          </p>

          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-[rgb(var(--warning)/0.08)] border border-[rgb(var(--warning)/0.2)]">
            <ShieldCheck size={15} className="text-[rgb(var(--warning))] shrink-0" />
            <p className="text-xs text-[rgb(var(--text-muted))]">
              {role === 'admin'
                ? 'Admin manages all accounts. No public registration.'
                : role === 'faculty'
                ? 'Accounts are created by the Admin. Sign in with your college email.'
                : 'Accounts are created by the Admin. Sign in with your student email.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="you@college.edu"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-[rgb(var(--error))] bg-[rgb(var(--error)/0.08)] px-3 py-2 rounded-lg"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In as {ROLES.find((r) => r.id === role)!.label} <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center text-[11px] text-[rgb(var(--text-muted))] mt-6">
            Secured with JWT authentication. Session auto-expires after inactivity.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
