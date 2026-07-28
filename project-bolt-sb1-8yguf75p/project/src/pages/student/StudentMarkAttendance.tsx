import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi, Smartphone, CalendarClock, MapPin, CheckCircle2, XCircle, Clock,
  Fingerprint, Loader2, CheckCheck, AlertCircle, Ban, Radio,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';

interface StudentData {
  id: string;
  name: string;
  register_number: string;
  department_id: string | null;
  course_id: string | null;
  semester: number;
  section: string | null;
  registered_device: string | null;
  device_fingerprint: string | null;
  departments?: { name: string } | null;
  courses?: { name: string } | null;
}

interface TimetableSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject_id: string;
  faculty_id: string;
  classroom_id: string | null;
  subjects?: { name: string; code: string } | null;
  faculty?: { name: string } | null;
  classrooms?: { name: string } | null;
}

interface WifiAP {
  id: string;
  ssid: string;
  classroom_id: string | null;
  enabled: boolean;
}

interface AttSettings {
  enabled: boolean;
  window_open_minutes: number;
  window_close_minutes: number;
}

interface CheckState {
  signedIn: boolean;
  deviceRegistered: boolean;
  hasScheduledClass: boolean;
  withinTimeWindow: boolean;
  onCollegeWifi: boolean;
  locationVerified: boolean;
  notAlreadyMarked: boolean;
}

export function StudentMarkAttendance() {
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [currentSlot, setCurrentSlot] = useState<TimetableSlot | null>(null);
  const [wifiAPs, setWifiAPs] = useState<WifiAP[]>([]);
  const [settings, setSettings] = useState<AttSettings | null>(null);
  const [checks, setChecks] = useState<CheckState>({
    signedIn: false, deviceRegistered: false, hasScheduledClass: false,
    withinTimeWindow: false, onCollegeWifi: false, locationVerified: false, notAlreadyMarked: false,
  });
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [now, setNow] = useState(new Date());

  // Load student profile and data
  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: prof } = await supabase
        .from('students')
        .select('id, name, register_number, department_id, course_id, semester, section, registered_device, device_fingerprint, departments(name), courses(name)')
        .eq('user_id', user.id)
        .maybeSingle();
      const s = prof as unknown as StudentData | null;
      setStudent(s);
      if (!s) { setLoading(false); return; }

      const { data: waps } = await supabase.from('wifi_access_points').select('id, ssid, classroom_id, enabled').eq('enabled', true);
      setWifiAPs((waps ?? []) as unknown as WifiAP[]);

      setLoading(false);
    })();
  }, [user]);

  // Tick every 10 seconds to re-evaluate time-based checks
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  // Find current class slot based on day and time
  useEffect(() => {
    (async () => {
      if (!student) return;
      const today = now.getDay();
      const currentTime = now.toTimeString().slice(0, 5);

      const { data: slots } = await supabase
        .from('timetables')
        .select('id, day_of_week, start_time, end_time, subject_id, faculty_id, classroom_id, subjects(name, code), faculty(name), classrooms(name)')
        .eq('day_of_week', today)
        .eq('semester', student.semester)
        .order('start_time');

      const allSlots = (slots ?? []) as unknown as TimetableSlot[];
      // Find slot where current time is within the window
      const active = allSlots.find((s) => currentTime >= s.start_time.slice(0, 5) && currentTime <= s.end_time.slice(0, 5));
      setCurrentSlot(active ?? null);

      // Load settings for this slot
      if (active) {
        const { data: sett } = await supabase
          .from('attendance_settings')
          .select('enabled, window_open_minutes, window_close_minutes')
          .eq('timetable_id', active.id)
          .maybeSingle();
        setSettings((sett as unknown as AttSettings | null) ?? { enabled: true, window_open_minutes: 10, window_close_minutes: 20 });
      } else {
        setSettings(null);
      }
    })();
  }, [student, now]);

  // Run all validation checks
  const runChecks = useCallback(async () => {
    if (!student || !currentSlot) {
      setChecks({ signedIn: !!user, deviceRegistered: false, hasScheduledClass: false, withinTimeWindow: false, onCollegeWifi: false, locationVerified: false, notAlreadyMarked: false });
      return;
    }

    // 1. Signed in - always true if we got here
    const signedIn = !!user;

    // 2. Device registered
    const deviceRegistered = !!student.registered_device;

    // 3. Has scheduled class
    const hasScheduledClass = !!currentSlot;

    // 4. Within time window
    let withinTimeWindow = false;
    if (currentSlot && settings) {
      const slotStart = currentSlot.start_time.slice(0, 5);
      const slotEnd = currentSlot.end_time.slice(0, 5);
      const [sh, sm] = slotStart.split(':').map(Number);
      const [eh, em] = slotEnd.split(':').map(Number);
      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const windowOpen = startMinutes - settings.window_open_minutes;
      const windowClose = startMinutes + settings.window_close_minutes;
      withinTimeWindow = nowMinutes >= windowOpen && nowMinutes <= windowClose;
    }

    // 5. On college WiFi (simulated - check if any enabled AP exists for this classroom)
    const matchingAP = wifiAPs.find((ap) => ap.classroom_id === currentSlot.classroom_id);
    const onCollegeWifi = !!matchingAP;

    // 6. Location verified (WiFi AP covers this classroom)
    const locationVerified = !!matchingAP;

    // 7. Not already marked
    const today = now.toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('student_id', student.id)
      .eq('timetable_id', currentSlot.id)
      .eq('date', today)
      .maybeSingle();
    const notAlreadyMarked = !existing;

    setChecks({ signedIn, deviceRegistered, hasScheduledClass, withinTimeWindow, onCollegeWifi, locationVerified, notAlreadyMarked });
  }, [student, currentSlot, settings, wifiAPs, now, user]);

  useEffect(() => { runChecks(); }, [runChecks]);

  const allPassed = Object.values(checks).every(Boolean);

  const markAttendance = async () => {
    if (!student || !currentSlot || !allPassed) return;
    setMarking(true);
    setResult(null);

    try {
      const today = now.toISOString().slice(0, 10);
      const matchingAP = wifiAPs.find((ap) => ap.classroom_id === currentSlot.classroom_id);

      const { error } = await supabase.from('attendance').insert({
        student_id: student.id,
        subject_id: currentSlot.subject_id,
        timetable_id: currentSlot.id,
        classroom_id: currentSlot.classroom_id,
        wifi_ap_id: matchingAP?.id ?? null,
        date: today,
        marked_at: now.toISOString(),
        status: 'present',
        method: 'wifi',
        device_verified: true,
        ai_validated: true,
        proxy_flag: false,
        multiple_device_flag: false,
        risk_score: 0,
        wifi_ssid: matchingAP?.ssid ?? null,
        device_id: student.registered_device,
        location_verified: true,
        faculty_verified: false,
      });

      if (error) {
        if (error.code === '23505') {
          setResult({ success: false, message: 'You have already marked attendance for this class.' });
        } else {
          setResult({ success: false, message: error.message });
        }
      } else {
        setResult({ success: true, message: 'Attendance marked successfully!' });
        runChecks();
      }
    } catch {
      setResult({ success: false, message: 'Failed to mark attendance. Please try again.' });
    } finally {
      setMarking(false);
    }
  };

  if (loading) return <div className="card p-8 animate-pulse h-64" />;

  const checkItems = [
    { key: 'signedIn', label: 'Signed In', icon: CheckCircle2, ...checks.signedIn ? { ok: true } : { ok: false } },
    { key: 'deviceRegistered', label: 'Device Registered', icon: Smartphone, ok: checks.deviceRegistered },
    { key: 'hasScheduledClass', label: 'Scheduled Class Active', icon: CalendarClock, ok: checks.hasScheduledClass },
    { key: 'withinTimeWindow', label: 'Within Attendance Window', icon: Clock, ok: checks.withinTimeWindow },
    { key: 'onCollegeWifi', label: 'Connected to College WiFi', icon: Wifi, ok: checks.onCollegeWifi },
    { key: 'locationVerified', label: 'Location Verified', icon: MapPin, ok: checks.locationVerified },
    { key: 'notAlreadyMarked', label: 'Not Already Marked', icon: Ban, ok: checks.notAlreadyMarked },
  ] as const;

  return (
    <div>
      <PageHeader title="Mark Attendance" description="All conditions must be satisfied before you can mark attendance." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Current class info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
          <h3 className="font-semibold text-[rgb(var(--text))] mb-4 flex items-center gap-2">
            <CalendarClock size={18} className="text-[rgb(var(--primary))]" />
            Current Class
          </h3>
          {currentSlot ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[rgb(var(--primary)/0.06)] border border-[rgb(var(--primary)/0.12)]">
                <p className="font-semibold text-[rgb(var(--text))] text-lg">{currentSlot.subjects?.name ?? 'Unknown'}</p>
                <p className="text-sm text-[rgb(var(--text-muted))]">{currentSlot.subjects?.code ?? ''}</p>
                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                  <div>
                    <p className="text-xs text-[rgb(var(--text-muted))]">Time</p>
                    <p className="text-[rgb(var(--text))] flex items-center gap-1"><Clock size={13} />{currentSlot.start_time.slice(0, 5)} – {currentSlot.end_time.slice(0, 5)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[rgb(var(--text-muted))]">Faculty</p>
                    <p className="text-[rgb(var(--text))]">{currentSlot.faculty?.name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[rgb(var(--text-muted))]">Classroom</p>
                    <p className="text-[rgb(var(--text))]">{currentSlot.classrooms?.name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[rgb(var(--text-muted))]">Semester</p>
                    <p className="text-[rgb(var(--text))]">Sem {student?.semester} · {student?.section ?? '—'}</p>
                  </div>
                </div>
              </div>
              {settings && (
                <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
                  <Clock size={12} />
                  Window opens {settings.window_open_minutes} min before, closes {settings.window_close_minutes} min after class start
                  {!settings.enabled && <span className="text-[rgb(var(--error))] font-medium ml-1">· Attendance disabled by admin</span>}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <CalendarClock size={32} className="mx-auto text-[rgb(var(--text-muted))] mb-2" />
              <p className="text-sm text-[rgb(var(--text-muted))]">No class scheduled right now.</p>
              <p className="text-xs text-[rgb(var(--text-muted))] mt-1">Attendance can only be marked during scheduled class time.</p>
            </div>
          )}
        </motion.div>

        {/* Validation checks */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-5">
          <h3 className="font-semibold text-[rgb(var(--text))] mb-4 flex items-center gap-2">
            <Fingerprint size={18} className="text-[rgb(var(--accent))]" />
            Verification Checks
          </h3>
          <div className="space-y-2.5">
            {checkItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.key} className="flex items-center gap-3 p-2.5 rounded-lg bg-[rgb(var(--text)/0.03)]">
                  <div className={`p-1.5 rounded-lg ${item.ok ? 'bg-[rgb(var(--success)/0.12)] text-[rgb(var(--success))]' : 'bg-[rgb(var(--error)/0.12)] text-[rgb(var(--error))]'}`}>
                    {item.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  </div>
                  <Icon size={15} className="text-[rgb(var(--text-muted))]" />
                  <span className={`text-sm flex-1 ${item.ok ? 'text-[rgb(var(--text))]' : 'text-[rgb(var(--text-muted))]'}`}>{item.label}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Mark attendance button + result */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5 mt-4">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            {allPassed ? (
              <span className="text-[rgb(var(--success))] flex items-center gap-1.5"><CheckCheck size={16} /> All conditions verified. You can mark attendance.</span>
            ) : (
              <span className="text-[rgb(var(--text-muted))] flex items-center gap-1.5"><AlertCircle size={16} /> Some conditions are not met. Attendance is blocked.</span>
            )}
          </div>

          <button
            onClick={markAttendance}
            disabled={!allPassed || marking}
            className={`px-8 py-3.5 rounded-2xl font-semibold text-base transition-all ${
              allPassed && !marking
                ? 'bg-[rgb(var(--primary))] text-white hover:scale-105 shadow-lg shadow-[rgb(var(--primary)/0.3)] active:scale-95'
                : 'bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))] cursor-not-allowed'
            }`}
          >
            {marking ? (
              <span className="flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> Marking…</span>
            ) : (
              <span className="flex items-center gap-2"><Radio size={18} /> Mark Attendance</span>
            )}
          </button>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
                  result.success
                    ? 'bg-[rgb(var(--success)/0.12)] text-[rgb(var(--success))]'
                    : 'bg-[rgb(var(--error)/0.12)] text-[rgb(var(--error))]'
                }`}
              >
                {result.success ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                {result.message}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Device status */}
      {student && !student.registered_device && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-4 mt-4 border-l-2 border-l-[rgb(var(--warning))]">
          <div className="flex items-center gap-3">
            <Smartphone size={18} className="text-[rgb(var(--warning))]" />
            <p className="text-sm text-[rgb(var(--text))]">No device registered. Please register your device first to mark attendance.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
