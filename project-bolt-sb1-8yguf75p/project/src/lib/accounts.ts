import { supabase } from '@/lib/supabase';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/provision-admin`;

export interface CreateAccountPayload {
  action: 'create-account';
  email: string;
  password: string;
  role: 'faculty' | 'student';
  name: string;
  profile?: Record<string, unknown>;
}

export interface EdgeResult {
  message?: string;
  error?: string;
  userId?: string;
}

export async function callAccountFunction(payload: CreateAccountPayload): Promise<EdgeResult> {
  const { data: session } = await supabase.auth.getSession();
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as EdgeResult;
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json;
}

export async function uploadPhoto(file: File, folder: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('photos').upload(fileName, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('photos').getPublicUrl(fileName);
  return data.publicUrl;
}
