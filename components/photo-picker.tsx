import { Camera } from "lucide-react";
import { useId, useRef } from "react";
import { prepareCardPhoto } from "@/lib/card-photo";

// A round avatar control: empty, it offers "Add photo"; filled, it shows the crop.
export function PhotoPicker({ photo, disabled, onChange, onBusy, onError }: {
  photo?: string;
  disabled?: boolean;
  onChange: (photo: string | undefined) => void;
  onBusy: (busy: boolean) => void;
  onError: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const hint = useId();
  return (
    <div className="photo-picker">
      <button type="button" className="photo-avatar" disabled={disabled} aria-describedby={hint}
        aria-label={photo ? "Change photo" : "Add photo"} onClick={() => input.current?.click()}>
        {photo ? <img src={photo} alt="" width={56} height={56} /> : <Camera size={20} aria-hidden="true" />}
      </button>
      <div className="photo-copy">
        {photo
          ? <span className="photo-actions">
            <button type="button" className="text-button" disabled={disabled} onClick={() => input.current?.click()}>Change photo</button>
            <button type="button" className="text-button danger-text" disabled={disabled} onClick={() => onChange(undefined)}>Remove</button>
          </span>
          : <button type="button" className="text-button" disabled={disabled} onClick={() => input.current?.click()}>Add photo</button>}
        <small id={hint}>Optional. Shown on your card, not in the QR.</small>
      </div>
      <input ref={input} className="visually-hidden" type="file" tabIndex={-1} aria-hidden="true"
        accept="image/jpeg,image/png,image/webp" onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          onBusy(true);
          try { onChange(await prepareCardPhoto(file)); }
          catch { onError("Choose a readable JPG, PNG or WebP photo under 12 MB."); }
          finally { onBusy(false); }
        }} />
    </div>
  );
}
