import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { PhotoUpload } from '@/components/ui/PhotoUpload';

interface StudentProfile {
  id: string;
  name: string;
  register_number: string;
  photo_url: string | null;
  email: string | null;
  mobile_number: string | null;
  semester: number;
  section: string | null;
  parent_name: string | null;
  parent_mobile: string | null;
  departments?: { name: string } | null;
  courses?: { name: string } | null;
}

export function StudentProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [mobile, setMobile] = useState('');
  const [parentMobile, setParentMobile] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('students')
        .select('id, name, register_number, photo_url, email, mobile_number, semester, section, parent_name, parent_mobile, departments(name), courses(name)')
        .eq('user_id', user.id)
        .maybeSingle();
      const p = data as unknown as StudentProfile | null;
      setProfile(p);
      setMobile(p?.mobile_number ?? '');
      setParentMobile(p?.parent_mobile ?? '');
      setLoading(false);
    })();
  }, [user]);

  const savePhoto = async (url: string) => {
    if (!profile) return;
    await supabase.from('students').update({ photo_url: url || null }).eq('id', profile.id);
    setProfile({ ...profile, photo_url: url || null });
  };

  const saveContact = async () => {
    if (!profile) return;
    setSaving(true);
    await supabase.from('students').update({ mobile_number: mobile || null, parent_mobile: parentMobile || null }).eq('id', profile.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) return <div className="card p-8 animate-pulse h-64" />;
  if (!profile) return <div className="card p-8 text-center text-sm text-[rgb(var(--text-muted))]">Profile not found.</div>;

  return (
    <div>
      <PageHeader title="My Profile" description="View and update your personal information." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-1 flex flex-col items-center">
          <PhotoUpload value={profile.photo_url} onChange={savePhoto} folder={`students/${profile.id}`} label="Profile Photo" shape="circle" size={128} />
          <h3 className="font-semibold text-[rgb(var(--text))] mt-4">{profile.name}</h3>
          <p className="text-sm text-[rgb(var(--text-muted))]">{profile.register_number}</p>
          <span className="mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]">Sem {profile.semester} · {profile.section ?? '—'}</span>
        </div>

        <div className="card p-5 lg:col-span-2 space-y-4">
          <h3 className="font-semibold text-[rgb(var(--text))]">Personal Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Register Number" value={profile.register_number} />
            <Field label="Email" value={profile.email} />
            <Field label="Department" value={profile.departments?.name} />
            <Field label="Course" value={profile.courses?.name} />
            <Field label="Semester" value={`Semester ${profile.semester}`} />
            <Field label="Section" value={profile.section} />
            <Field label="Parent Name" value={profile.parent_name} />
            <Field label="Parent Mobile" value={profile.parent_mobile} />
          </div>

          <div className="border-t border-[rgb(var(--border))] pt-4 space-y-3">
            <h4 className="text-sm font-semibold text-[rgb(var(--text))]">Editable Contact</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">My Mobile</label>
                <input className="input" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+1-555-0100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5">Parent Mobile</label>
                <input className="input" value={parentMobile} onChange={(e) => setParentMobile(e.target.value)} placeholder="+1-555-9900" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={saveContact} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Update Contact'}</button>
              {saved && <span className="text-xs text-[rgb(var(--success))]">Saved!</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium text-[rgb(var(--text-muted))] mb-0.5">{label}</p>
      <p className="text-sm text-[rgb(var(--text))]">{value ?? '—'}</p>
    </div>
  );
}
