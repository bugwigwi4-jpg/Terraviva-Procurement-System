'use client';
import { useState } from 'react';

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

export default function PasswordInput({
  id, label, value, onChange, autoComplete = 'current-password', minLength, hint,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  autoComplete?: string; minLength?: number; hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <input
          id={id} type={visible ? 'text' : 'password'} required minLength={minLength}
          autoComplete={autoComplete} className="field !pr-11" value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button" onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-mute hover:text-ink"
        >
          <EyeIcon off={visible} />
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-mute">{hint}</p>}
    </div>
  );
}
