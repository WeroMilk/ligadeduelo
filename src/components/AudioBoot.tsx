import { useEffect } from 'react';
import { ensureAudioRunning, unlockAudio } from '@/lib/sounds';

/** Desbloquea audio y mantiene la música tras gestos o al volver a la pestaña. */
export default function AudioBoot() {
  useEffect(() => {
    const resume = () => {
      void ensureAudioRunning();
    };

    const boot = () => {
      void unlockAudio();
    };

    window.addEventListener('pointerdown', boot, { capture: true });
    window.addEventListener('keydown', boot, { capture: true });
    window.addEventListener('touchstart', boot, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') resume();
    });

    return () => {
      window.removeEventListener('pointerdown', boot, true);
      window.removeEventListener('keydown', boot, true);
      window.removeEventListener('touchstart', boot, true);
    };
  }, []);
  return null;
}
