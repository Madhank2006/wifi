import { useRef, useState } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { uploadPhoto } from '@/lib/accounts';

interface PhotoUploadProps {
  value: string | null;
  onChange: (url: string) => void;
  folder: string;
  label?: string;
  shape?: 'circle' | 'rounded';
  size?: number;
}

export function PhotoUpload({ value, onChange, folder, label = 'Photo', shape = 'circle', size = 96 }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(value);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Image must be under 4 MB.');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadPhoto(file, folder);
      setPreview(url);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative ${shapeClass} overflow-hidden bg-[rgb(var(--primary)/0.1)] border-2 border-dashed border-[rgb(var(--border))] flex items-center justify-center cursor-pointer group`}
        style={{ width: size, height: size }}
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={20} className="text-white" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center text-[rgb(var(--text-muted))]">
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
            <span className="text-[10px] mt-1">Upload</span>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      {value && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setPreview(null); onChange(''); }}
          className="text-xs text-[rgb(var(--error))] flex items-center gap-1 hover:underline"
        >
          <X size={11} /> Remove
        </button>
      )}
      {error && <p className="text-xs text-[rgb(var(--error))]">{error}</p>}
    </div>
  );
}
