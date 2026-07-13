import type { GameEvent } from '@/types/game';
import type { FeedTone } from '@/lib/combat-flavor';

function toneFor(e: GameEvent): FeedTone {
  if (e.type === 'first_blood') return 'first';
  if (e.type === 'double_kill' || e.type === 'triple_kill' || e.type === 'quadra_kill') return 'multi';
  if (e.type === 'tower_destroyed' || e.type === 'inhibitor_destroyed' || e.type === 'nexus_destroyed') return 'tower';
  if (e.type === 'kill') return 'kill';
  return 'other';
}

const TONE_CLASS: Record<FeedTone, string> = {
  first: 'border-[#F1C40F]/60 bg-[#F1C40F]/15 text-[#F1C40F]',
  multi: 'border-[#E67E22]/50 bg-[#E67E22]/10 text-[#E67E22]',
  kill: 'border-[#E74C3C]/40 bg-[#E74C3C]/10 text-[#F0E6D2]',
  tower: 'border-[#3498DB]/40 bg-[#3498DB]/10 text-[#8EC8FF]',
  other: 'border-[#2A3550] bg-[#141B2D] text-[#8B9BB4]',
};

interface CombatFeedProps {
  events: GameEvent[];
  max?: number;
}

export default function CombatFeed({ events, max = 6 }: CombatFeedProps) {
  const relevant = events
    .filter(e =>
      e.type === 'kill' || e.type === 'first_blood' || e.type === 'double_kill'
      || e.type === 'triple_kill' || e.type === 'quadra_kill'
      || e.type === 'tower_destroyed' || e.type === 'inhibitor_destroyed' || e.type === 'nexus_destroyed'
    )
    .slice(-max)
    .reverse();

  if (relevant.length === 0) {
    return (
      <div className="text-[#5A6A84] text-xs text-center py-2">
        El feed de combate espera la primera sangre…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {relevant.map((e, i) => {
        const tone = toneFor(e);
        return (
          <div
            key={`${e.step}-${e.type}-${i}`}
            className={`rounded-lg border px-2.5 py-1.5 text-xs leading-snug ${TONE_CLASS[tone]}`}
          >
            {e.message}
          </div>
        );
      })}
    </div>
  );
}
