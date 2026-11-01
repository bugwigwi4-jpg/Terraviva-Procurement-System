'use client';
import { useEffect, useState } from 'react';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = 'tv-install-dismissed';

export default function InstallPrompt() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    let dismissed = false;
    try { dismissed = localStorage.getItem(KEY) === '1'; } catch { /* storage unavailable */ }
    if (standalone || dismissed) return;

    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) setIos(true);
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as InstallEvent); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  function dismiss() {
    try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
    setEvt(null); setIos(false);
  }

  async function install() {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setEvt(null);
  }

  if (!evt && !ios) return null;
  return (
    <div role="dialog" aria-label="Install the Terraviva app"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-lg border border-line bg-white p-4 shadow-lg">
      <p className="font-bold">Install the Terraviva app</p>
      {evt ? (
        <p className="mt-1 text-sm text-mute">Open it from your home screen, like any other app.</p>
      ) : (
        <p className="mt-1 text-sm text-mute">Tap the Share button, then &ldquo;Add to Home Screen&rdquo;.</p>
      )}
      <div className="mt-3 flex gap-3">
        {evt && <button className="btn btn-primary" onClick={install}>Install</button>}
        <button className="btn btn-ghost" onClick={dismiss}>Not now</button>
      </div>
    </div>
  );
}
