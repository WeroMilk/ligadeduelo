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

const DURATION_MS = 6000;

function multiLabel(n: number): string | null {
  if (n >= 5) return '¡PENTAKILL!';
  if (n === 4) return '¡QUADRA KILL!';
  if (n === 3) return '¡TRIPLE KILL!';
  if (n === 2) return '¡DOUBLE KILL!';
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

  useEffect(() => {
    onBusyChange?.(!!current || queue.length > 0);
  }, [current, queue.length, onBusyChange]);

  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setCurrent(next);
    setQueue(rest);
    const t = window.setTimeout(() => setCurrent(null), DURATION_MS);
    return () => window.clearTimeout(t);
  }, [current, queue]);

  if (!current) return null;

  if (current.kind === 'kill') {
    const a = current.data;
    const multi = multiLabel(a.multi);
    return (
      <div className="pointer-events-none fixed inset-0 z-[70] flex items-start justify-center pt-[18%] px-4" aria-live="polite">
        <div
          className="w-full max-w-md rounded-2xl border-2 bg-[#0D1220]/95 px-5 py-4 text-center shadow-[0_0_40px_rgba(0,0,0,0.55)] animate-kill-banner"
          style={{ borderColor: teamColor(a.team) }}
        >
          {multi && (
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F1C40F] mb-1">{multi}</p>
          )}
          <p className="text-lg sm:text-xl font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
            {killTitle(a)}
          </p>
        </div>
      </div>
    );
  }

  const o = current.data;
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-start justify-center pt-[18%] px-4" aria-live="polite">
      <div
        className="w-full max-w-md rounded-2xl border-2 border-[#F1C40F] bg-[#0D1220]/95 px-5 py-4 text-center shadow-[0_0_40px_rgba(241,196,15,0.35)] animate-kill-banner"
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#F1C40F] mb-1">Bonus de objetivo</p>
        <p className="text-lg font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
          {o.title}
        </p>
        <p className="text-sm text-[#C9A84C] mt-2 leading-snug">{o.bonusText}</p>
        <p className="text-xs text-[#8B9BB4] mt-2">
          Reciben ({o.teamName}): {o.recipients.length > 0 ? o.recipients.join(', ') : 'ninguno vivo'}
        </p>
      </div>
    </div>
  );
}
