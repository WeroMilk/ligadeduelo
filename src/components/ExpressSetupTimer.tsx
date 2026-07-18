import { useEffect, useState } from 'react';
import { useGame } from '@/hooks/useGameState';
import { isExpressMode, setupSecondsLeft } from '@/lib/express-mode';
import { Clock } from 'lucide-react';

export default function ExpressSetupTimer() {
  const { state, dispatch } = useGame();
  const express = isExpressMode(state.gameMode);
  const deadline = state.setupDeadlineMs;
  const [left, setLeft] = useState<number | null>(() =>
    setupSecondsLeft(deadline, state.gameMode),
  );

  useEffect(() => {
    if (!express || deadline == null) {
      setLeft(null);
      return;
    }

    let fired = false;
    const tick = () => {
      const sec = setupSecondsLeft(deadline, state.gameMode);
      setLeft(sec);
      if (sec === 0 && !fired) {
        fired = true;
        dispatch({ type: 'AUTO_FILL_SETUP' });
      }
    };

    tick();
    const iv = window.setInterval(tick, 400);
    return () => window.clearInterval(iv);
  }, [express, deadline, dispatch, state.gameMode]);

  if (!express || left == null) return null;

  const urgent = left <= 30;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');

  return (
    <div
      className={`flex items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
        urgent
          ? 'border-[#E74C3C]/60 bg-[#E74C3C]/15 text-[#E74C3C]'
          : 'border-[#C9A84C]/50 bg-[#C9A84C]/10 text-[#C9A84C]'
      }`}
    >
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span>Armado · {mm}:{ss}</span>
    </div>
  );
}
