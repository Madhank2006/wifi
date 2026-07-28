import { useEffect, useState } from 'react';
import { Smartphone, Fingerprint, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';

interface StudentRow {
  id: string;
  registered_device: string | null;
  device_fingerprint: string | null;
}

export function StudentDevice() {
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [device, setDevice] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase.from('students').select('id, registered_device, device_fingerprint').eq('user_id', user.id).maybeSingle();
      const s = data as unknown as StudentRow | null;
      setStudent(s);
      setDevice(s?.registered_device ?? '');
      setLoading(false);
    })();
  }, [user]);

  const register = async () => {
    if (!student || !device) return;
    setSaving(true);
    const fingerprint = await generateFingerprint();
    await supabase.from('students').update({ registered_device: device, device_fingerprint: fingerprint }).eq('id', student.id);
    setStudent({ ...student, registered_device: device, device_fingerprint: fingerprint });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) return <div className="card p-8 animate-pulse h-64" />;

  return (
    <div>
      <PageHeader title="My Device" description="Register or update the device used for Wi-Fi attendance." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]"><Smartphone size={20} /></div>
            <div>
              <h3 className="font-semibold text-[rgb(var(--text))]">Registered Device</h3>
              <p className="text-xs text-[rgb(var(--text-muted))]">MAC address / device identifier</p>
            </div>
          </div>

          <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Device MAC Address</label>
          <input className="input mb-3" value={device} onChange={(e) => setDevice(e.target.value)} placeholder="e.g. 00:1A:2B:3C:4D:01" />
          <div className="flex items-center gap-3">
            <button onClick={register} disabled={saving || !device} className="btn-primary">{saving ? 'Registering…' : 'Register / Update Device'}</button>
            {saved && <span className="text-xs text-[rgb(var(--success))] flex items-center gap-1"><Check size={14} /> Device registered</span>}
          </div>

          <div className="mt-5 p-3 rounded-xl bg-[rgb(var(--warning)/0.08)] border border-[rgb(var(--warning)/0.2)] flex gap-2">
            <AlertCircle size={15} className="text-[rgb(var(--warning))] shrink-0 mt-0.5" />
            <p className="text-xs text-[rgb(var(--text-muted))]">Only one registered device per student is allowed. Attendance is captured automatically when this device connects to the authorized college Wi-Fi during class hours.</p>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent))]"><Fingerprint size={20} /></div>
            <div>
              <h3 className="font-semibold text-[rgb(var(--text))]">Device Fingerprint</h3>
              <p className="text-xs text-[rgb(var(--text-muted))]">AI-generated unique identifier</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[rgb(var(--text)/0.04)] font-mono text-xs text-[rgb(var(--text))] break-all">
            {student?.device_fingerprint ?? 'Not registered yet'}
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-[rgb(var(--text-muted))]">
              <span className={`w-2 h-2 rounded-full ${student?.registered_device ? 'bg-[rgb(var(--success))]' : 'bg-[rgb(var(--text-muted))]'}`} />
              {student?.registered_device ? 'Device registered' : 'No device registered'}
            </div>
            <div className="flex items-center gap-2 text-[rgb(var(--text-muted))]">
              <span className={`w-2 h-2 rounded-full ${student?.device_fingerprint ? 'bg-[rgb(var(--success))]' : 'bg-[rgb(var(--text-muted))]'}`} />
              {student?.device_fingerprint ? 'Fingerprint generated' : 'No fingerprint'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function generateFingerprint(): Promise<string> {
  const nav = navigator;
  const seed = [
    nav.userAgent,
    nav.language,
    String(screen.width),
    String(screen.height),
    String(new Date().getTimezoneOffset()),
  ].join('|');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
