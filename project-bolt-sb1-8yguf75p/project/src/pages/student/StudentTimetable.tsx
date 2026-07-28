import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';

interface Slot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subjects?: { name: string; code: string } | null;
  classrooms?: { name: string } | null;
  faculty?: { name: string } | null;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function StudentTimetable() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: prof } = await supabase.from('students').select('id, department_id, semester, section').eq('user_id', user.id).maybeSingle();
      if (!prof) { setLoading(false); return; }
      let q = supabase.from('timetables').select('id, day_of_week, start_time, end_time, subjects(name, code), classrooms(name), faculty(name)');
      if (prof.department_id) q = q.eq('department_id', prof.department_id);
      q = q.eq('semester', prof.semester);
      const { data } = await q.order('day_of_week').order('start_time');
      setSlots((data ?? []) as unknown as Slot[]);
      setLoading(false);
    })();
  }, [user]);

  const byDay = (d: number) => slots.filter((s) => s.day_of_week === d);

  if (loading) return <div className="card p-8 animate-pulse h-64" />;

  return (
    <div>
      <PageHeader title="My Timetable" description="Your weekly class schedule." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {DAYS.map((day, di) => (
          <motion.div key={di} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: di * 0.04 }} className="card p-4">
            <h3 className="font-semibold text-[rgb(var(--text))] mb-3">{day}</h3>
            {byDay(di).length === 0 ? (
              <p className="text-xs text-[rgb(var(--text-muted))] py-4 text-center">No classes</p>
            ) : (
              <div className="space-y-2">
                {byDay(di).map((s) => (
                  <div key={s.id} className="p-2.5 rounded-lg bg-[rgb(var(--accent)/0.06)] border border-[rgb(var(--accent)/0.12)]">
                    <p className="text-sm font-medium text-[rgb(var(--text))]">{s.subjects?.name ?? '—'}</p>
                    <p className="text-xs text-[rgb(var(--text-muted))] flex items-center gap-1 mt-0.5"><Clock size={11} />{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</p>
                    <p className="text-xs text-[rgb(var(--text-muted))]">{s.classrooms?.name ?? ''} · {s.faculty?.name ?? ''}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
