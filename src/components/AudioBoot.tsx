import { useEffect } from 'react';
import { unlockAudio } from '@/lib/sounds';

/** Desbloquea audio y arranca música tras el primer toque/clic. */
export default function AudioBoot() {
  useEffect(() => {
    const boot = () => {
      void unlockAudio();
      window.removeEventListener('pointerdown', boot);
      window.removeEventListener('keydown', boot);
      window.removeEventListener('touchstart', boot);
    };
    window.addEventListener('pointerdown', boot, { once: true });
    window.addEventListener('keydown', boot, { once: true });
    window.addEventListener('touchstart', boot, { once: true });
    return () => {
      window.removeEventListener('pointerdown', boot);
      window.removeEventListener('keydown', boot);
      window.removeEventListener('touchstart', boot);
    };
  }, []);
  return null;
}
