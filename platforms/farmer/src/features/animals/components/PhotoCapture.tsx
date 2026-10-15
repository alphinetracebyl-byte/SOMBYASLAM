import { useRef, useState } from 'react';
import { Camera, Upload, X, ImageIcon } from 'lucide-react';
import s from './photo-capture.module.css';

interface Props {
  onCapture: (file: File) => void;
  onClear: () => void;
  preview: string | null;
  label?: string;
}

export function PhotoCapture({ onCapture, onClear, preview, label = 'Animal Photo' }: Props): JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    onCapture(file);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  if (preview) {
    return (
      <div className={s.previewWrap}>
        <img src={preview} alt="Animal photo preview" className={s.previewImg} />
        <button type="button" className={s.clearBtn} onClick={onClear}>
          <X size={14} strokeWidth={2.5} />
          Remove
        </button>
        <div className={s.previewLabel}>
          <ImageIcon size={13} strokeWidth={1.75} />
          Photo ready to upload
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${s.dropZone}${dragOver ? ' ' + s.dragActive : ''}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onChange}
      />
      <input
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        id="camera-capture"
        onChange={onChange}
      />

      <ImageIcon size={36} strokeWidth={1} color="#d1d5db" />
      <div className={s.dropTitle}>{label}</div>
      <div className={s.dropSub}>Take a photo or upload from your device</div>

      <div className={s.dropBtns}>
        <label htmlFor="camera-capture" className={s.captureBtn}>
          <Camera size={15} strokeWidth={2} />
          Open Camera
        </label>
        <button type="button" className={s.uploadBtn} onClick={() => fileRef.current?.click()}>
          <Upload size={15} strokeWidth={2} />
          Choose File
        </button>
      </div>

      <div className={s.dropHint}>JPEG, PNG or HEIC · Max 10 MB</div>
    </div>
  );
}
