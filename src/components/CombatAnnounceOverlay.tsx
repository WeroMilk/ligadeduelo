import { useEffect, useState } from 'react';
import type { KillAnnounce, ObjectiveBonusAnnounce, TeamColor } from '@/types/game';

export type AnnounceItem =
  | { kind: 'kill'; data: KillAnnounce }
  | { kind: 'objective'; data: ObjectiveBonusAnnounce };

type Props = {
  /** Cuando cambia (nonce), encola estos anuncios. */
  batch: { items: AnnounceItem[]; nonce: number } | null;
  /** true mientras hay un popup visible o en cola. */
  onBusyChange?: (busy: boolean) => void;
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

export default function CombatAnnounceOverlay({ batch, onBusyChange }: Props) {
  const [queue, setQueue] = useState<AnnounceItem[]>([]);
  const [current, setCurrent] = useState<AnnounceItem | null>(null);

  useEffect(() => {
    if (!batch || batch.items.length === 0) return;
    setQueue(prev => [...prev, ...batch.items]);
  }, [batch?.nonce]);

  const busy = !!current || queue.length > 0;
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  // Dequeue next item when idle
  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setCurrent(next);
    setQueue(rest);
  }, [current, queue]);

  // Timer only depends on current — must not share deps with queue updates
  useEffect(() => {
    if (!current) return;
    const t = window.setTimeout(() => setCurrent(null), ANNOUNCE_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [current]);

  if (!current) return null;

  const wrapClass =
    'pointer-events-none absolute inset-0 z-[120] flex items-center justify-center px-3';

  const body =
    current.kind === 'kill' ? (
      <div className={wrapClass} aria-live="polite">
        <div
          className="w-full max-w-md rounded-xl border-2 bg-[#0D1220]/95 px-4 py-2 text-center shadow-[0_6px_28px_rgba(0,0,0,0.55)] backdrop-blur-sm animate-kill-banner"
          style={{ borderColor: teamColor(current.data.team) }}
        >
          {multiLabel(current.data.multi) && (
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#F1C40F]">
              {multiLabel(current.data.multi)}
            </p>
          )}
          <p className="text-sm sm:text-base font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
            {killTitle(current.data)}
          </p>
        </div>
      </div>
    ) : (
      <div className={wrapClass} aria-live="polite">
        <div className="w-full max-w-md rounded-xl border-2 border-[#F1C40F] bg-[#0D1220]/95 px-4 py-2 text-center shadow-[0_6px_28px_rgba(241,196,15,0.3)] backdrop-blur-sm animate-kill-banner">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[#F1C40F]">Bonus de objetivo</p>
          <p className="text-sm sm:text-base font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
            {current.data.title}
          </p>
          <p className="text-xs text-[#C9A84C] mt-0.5 leading-snug">{current.data.bonusText}</p>
          <p className="text-[10px] text-[#8B9BB4] mt-0.5">
            Reciben ({current.data.teamName}):{' '}
            {current.data.recipients.length > 0 ? current.data.recipients.join(', ') : 'ninguno vivo'}
          </p>
        </div>
      </div>
    );

  return body;
}
