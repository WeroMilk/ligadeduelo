import { useEffect } from 'react';
import { unlockAudio } from '@/lib/sounds';

/** Desbloquea audio y arranca música tras el primer toque/clic. */
export default function AudioBoot() {
  useEffect(() => {
    const boot = () => {
      void unlockAudio();
      window.removeEventListener('pointerdown', boot, true);
      window.removeEventListener('keydown', boot, true);
      window.removeEventListener('touchstart', boot, true);
    };
    // Capture: corre antes que onClick, así el contexto ya se reanuda en el gesto.
    window.addEventListener('pointerdown', boot, { capture: true, once: true });
    window.addEventListener('keydown', boot, { capture: true, once: true });
    window.addEventListener('touchstart', boot, { capture: true, once: true });
    return () => {
      window.removeEventListener('pointerdown', boot, true);
      window.removeEventListener('keydown', boot, true);
      window.removeEventListener('touchstart', boot, true);
    };
  }, []);
  return null;
}
