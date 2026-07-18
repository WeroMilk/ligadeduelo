import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { KillAnnounce, ObjectiveBonusAnnounce, TeamColor } from '@/types/game';

export type AnnounceItem =
  | { kind: 'kill'; data: KillAnnounce }
  | { kind: 'objective'; data: ObjectiveBonusAnnounce };

type Props = {
  /** Cuando cambia (nonce), encola estos anuncios. */
  batch: { items: AnnounceItem[]; nonce: number } | null;
  /** true mientras hay un popup visible o en cola. */
  onBusyChange?: (busy: boolean) => void;
  /** inline = entre stats y panel de bajas; fixed-top = header global */
  placement?: 'inline' | 'fixed-top';
  /** Congela el timer del anuncio visible. */
  paused?: boolean;
};

export const ANNOUNCE_DURATION_MS = 6000;

function multiLabel(n: number): string | null {
  if (n >= 5) return '¡PENTABAJA!';
  if (n === 4) return '¡CUÁDRUPLE BAJA!';
  if (n === 3) return '¡TRIPLE BAJA!';
  if (n === 2) return '¡DOBLE BAJA!';
  return null;
}

function killTitle(a: KillAnnounce): string {
  if (a.multi >= 2) {
    return `${a.killerName} mató a ${a.victimNames.join(', ')}`;
  }
  return `${a.killerName} mató a ${a.victimNames[0] || 'un rival'}`;
}

function teamColor(team: TeamColor): string {
  return team === 'blue' ? '#3498DB' : '#E74C3C';
}

function AnnounceBanner({ current, paused }: { current: AnnounceItem; paused: boolean }) {
  if (current.kind === 'kill') {
    return (
      <div
        className="w-full rounded-lg border bg-[#0D1220]/95 px-3 py-1.5 text-center shadow-[0_4px_16px_rgba(0,0,0,0.45)] backdrop-blur-sm animate-kill-banner"
        style={{ borderColor: teamColor(current.data.team), animationPlayState: paused ? 'paused' : 'running' }}
        aria-live="polite"
      >
        {multiLabel(current.data.multi) && (
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#F1C40F] leading-tight">
            {multiLabel(current.data.multi)}
          </p>
        )}
        <p className="text-xs font-bold text-[#F0E6D2] leading-snug" style={{ fontFamily: 'Cinzel, serif' }}>
          {killTitle(current.data)}
        </p>
      </div>
    );
  }

  return (
    <div
      className="w-full rounded-lg border bg-[#0D1220]/95 px-3 py-1.5 text-center shadow-[0_4px_16px_rgba(0,0,0,0.45)] backdrop-blur-sm animate-kill-banner"
      style={{
        borderColor: teamColor(current.data.team),
        boxShadow: current.data.team === 'blue'
          ? '0 4px 16px rgba(52,152,219,0.25)'
          : '0 4px 16px rgba(231,76,60,0.25)',
        animationPlayState: paused ? 'paused' : 'running',
      }}
      aria-live="polite"
    >
      <p
        className="text-[8px] font-bold uppercase tracking-wider"
        style={{ color: teamColor(current.data.team) }}
      >
        Bonus de objetivo · {current.data.team === 'blue' ? 'Azul' : 'Rojo'}
      </p>
      <p className="text-xs font-bold text-[#F0E6D2] leading-snug" style={{ fontFamily: 'Cinzel, serif' }}>
        {current.data.title}
      </p>
      <p
        className="text-[10px] mt-0.5 leading-snug truncate"
        style={{ color: teamColor(current.data.team) }}
      >
        {current.data.bonusText}
      </p>
    </div>
  );
}

export default function CombatAnnounceOverlay({
  batch,
  onBusyChange,
  placement = 'inline',
  paused = false,
}: Props) {
  const [queue, setQueue] = useState<AnnounceItem[]>([]);
  const [current, setCurrent] = useState<AnnounceItem | null>(null);
  const remainingMs = useRef(ANNOUNCE_DURATION_MS);
  const startedAt = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (!batch || batch.items.length === 0) return;
    setQueue(prev => [...prev, ...batch.items]);
  }, [batch?.nonce]);

  const busy = !!current || queue.length > 0;
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setCurrent(next);
    setQueue(rest);
    remainingMs.current = ANNOUNCE_DURATION_MS;
  }, [current, queue]);

  useEffect(() => {
    if (!current) {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      startedAt.current = null;
      return;
    }

    if (paused) {
      if (timerRef.current != null && startedAt.current != null) {
        const elapsed = Date.now() - startedAt.current;
        remainingMs.current = Math.max(0, remainingMs.current - elapsed);
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
        startedAt.current = null;
      }
      return;
    }

    startedAt.current = Date.now();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      startedAt.current = null;
      remainingMs.current = ANNOUNCE_DURATION_MS;
      setCurrent(null);
    }, remainingMs.current);

    return () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (startedAt.current != null && !pausedRef.current) {
        const elapsed = Date.now() - startedAt.current;
        remainingMs.current = Math.max(0, remainingMs.current - elapsed);
        startedAt.current = null;
      }
    };
  }, [current, paused]);

  if (placement === 'inline') {
    return (
      <div className="pointer-events-none flex min-h-[2rem] md:min-h-[2.75rem] w-full shrink-0 items-center justify-center px-1">
        {current ? <AnnounceBanner current={current} paused={paused} /> : null}
      </div>
    );
  }

  if (!current) return null;

  const topWrapClass =
    'pointer-events-none fixed inset-x-0 top-0 z-[120] flex justify-center px-3 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)]';

  const body = (
    <div className={topWrapClass}>
      <div className="w-full max-w-md">
        <AnnounceBanner current={current} paused={paused} />
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(body, document.body) : body;
}
