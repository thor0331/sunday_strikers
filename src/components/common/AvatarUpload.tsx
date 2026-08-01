import { useRef, useState, type FormEvent } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { useToastStore } from '../../stores/toastStore';

interface AvatarUploadProps {
  src: string | null;
  alt: string;
  editable?: boolean;
  onUpload?: (file: File) => Promise<unknown>;
  onDeletePhoto?: () => Promise<unknown>;
  onView?: () => void;
}

export function AvatarUpload({ src, alt, editable = false, onUpload, onDeletePhoto, onView }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const showToast = useToastStore((s) => s.show);

  async function handleFileSelected(event: FormEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file || !onUpload) return;
    setIsUploading(true);
    try {
      await onUpload(file);
      showToast('Photo uploaded successfully.', 'success');
    } catch {
      showToast('Failed to upload photo. Please try again.', 'error');
    } finally {
      setIsUploading(false);
      event.currentTarget.value = '';
    }
  }

  async function handleDelete() {
    if (!onDeletePhoto) return;
    try {
      await onDeletePhoto();
      showToast('Photo removed.', 'success');
    } catch {
      showToast('Failed to remove photo. Please try again.', 'error');
    }
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-20 h-20 sm:w-24 sm:h-24">
        {/* Avatar image / initials */}
        <button
          type="button"
          onClick={src && onView ? onView : undefined}
          className="h-full w-full overflow-hidden rounded-full border-2 border-white shadow-md transition-transform duration-200 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:cursor-default"
          disabled={!src || !onView}
        >
          {src && !imgFailed ? (
            <img src={src} alt={alt} className="h-full w-full object-cover" onError={() => setImgFailed(true)} />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-400 to-teal-600 text-lg font-bold text-white sm:text-xl">
              {alt.charAt(0).toUpperCase()}
            </div>
          )}
        </button>

        {/* Uploading spinner */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-white sm:h-7 sm:w-7" />
          </div>
        )}

        {/* Camera overlay (admin, not uploading) */}
        {editable && !isUploading && (
          <>
            {/* Desktop: full overlay on hover */}
            <div
              className="absolute inset-0 hidden cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 backdrop-blur-[1px] transition-opacity hover:opacity-100 sm:flex"
              onClick={() => inputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-0.5 text-white">
                <Camera className="h-5 w-5 drop-shadow-sm" />
                <span className="text-[10px] font-semibold tracking-wide drop-shadow-sm">Change Photo</span>
              </div>
            </div>
            {/* Mobile: camera badge at bottom-right */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              aria-label="Change photo"
              className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-teal-500 text-white shadow-md border-2 border-white transition-transform hover:scale-110 active:scale-95 sm:hidden"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </>
        )}

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>

      {/* Delete photo (admin, has photo, not uploading) */}
      {editable && src && !isUploading && (
        <button
          type="button"
          onClick={handleDelete}
          className="flex items-center gap-1 text-[11px] font-medium text-red-500 hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          Delete Photo
        </button>
      )}
    </div>
  );
}
