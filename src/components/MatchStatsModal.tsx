import { createPortal } from 'react-dom';
import { BarChart3, X } from 'lucide-react';
import type { Champion, Role, TeamData } from '@/types/game';
import { CHAMPIONS, ROLE_COLORS, ROLE_NAMES } from '@/lib/game-data';

const ROLE_ORDER: Role[] = ['top', 'jungle', 'mid', 'adc', 'support'];

function roleRank(role: Role) {
  const i = ROLE_ORDER.indexOf(role);
  return i >= 0 ? i : 99;
}

function sortedChamps(team: TeamData): Champion[] {
  return [...team.champions].sort((a, b) => {
    const da = CHAMPIONS.find(c => c.id === a.defId);
    const db = CHAMPIONS.find(c => c.id === b.defId);
    return roleRank(da?.role || 'mid') - roleRank(db?.role || 'mid');
  });
}

function StatBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="h-1 rounded-full bg-black/50 overflow-hidden">
      <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function ChampRow({ champ, side }: { champ: Champion; side: 'blue' | 'red' }) {
  const def = CHAMPIONS.find(c => c.id === champ.defId);
  const role = def?.role || 'mid';
  const dead = !champ.isAlive || champ.stats.hp <= 0;
  return (
    <div
      className={`flex items-center gap-1 rounded border px-1 py-0.5 ${
        dead ? 'border-[#2A3550]/60 opacity-55' : 'border-[#1E2740] bg-[#141B2D]/80'
      }`}
    >
      <div
        className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border"
        style={{
          borderColor: side === 'blue' ? '#3498DB' : '#E74C3C',
          backgroundColor: def?.color || '#1A2238',
        }}
      >
        {def?.image ? (
          <img src={def.image} alt={def.name} className="h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">
            {def?.initials || '?'}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-1">
          <p className="truncate text-[9px] font-bold text-[#F0E6D2]">
            {def?.name || champ.defId}
          </p>
          <p className="shrink-0 text-[8px] font-bold tabular-nums text-[#C9A84C]">
            {champ.kills || 0}/{champ.deaths || 0}/{champ.assists || 0}
          </p>
        </div>
        <p className="text-[8px] font-bold uppercase truncate" style={{ color: ROLE_COLORS[role] }}>
          {ROLE_NAMES[role]}
          {dead ? ' · X' : ''}
        </p>
        <div className="mt-0.5 grid grid-cols-2 gap-1">
          <StatBar value={champ.stats.hp} max={champ.stats.maxHp} color="#E74C3C" />
          <StatBar value={champ.stats.mana} max={champ.stats.maxMana} color="#3498DB" />
        </div>
      </div>
    </div>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  blue: TeamData;
  red: TeamData;
};

export default function MatchStatsModal({ open, onClose, blue, red }: Props) {
  if (!open) return null;

  const blueList = sortedChamps(blue);
  const redList = sortedChamps(red);

  return createPortal(
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center bg-black/75 px-3"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Estadísticas"
      onClick={onClose}
    >
      <div
        className="modal-panel flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border-2 border-[#C9A84C]/45 bg-[#0D1220] shadow-[0_0_40px_rgba(201,168,76,0.2)]"
        style={{
          maxHeight:
            'min(40rem, calc(100dvh - 1.5rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)))',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#2A3550] px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <BarChart3 className="h-4 w-4 shrink-0 text-[#C9A84C]" />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-[#C9A84C]" style={{ fontFamily: 'Cinzel, serif' }}>
                Estadísticas
              </h2>
              <p className="text-[9px] text-[#8B9BB4]">Vida · Maná · K/D/A</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2A3550] text-[#8B9BB4]"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-1.5 overflow-hidden px-3 py-2">
          <section className="min-w-0 overflow-hidden">
            <div className="mb-0.5 flex items-center justify-between gap-1">
              <p className="text-[8px] font-bold uppercase tracking-wider text-[#3498DB] truncate">
                {blue.name}
              </p>
              <p className="text-[8px] font-bold text-[#3498DB] shrink-0">{blue.kills}K</p>
            </div>
            <div className="space-y-0.5">
              {blueList.map(c => (
                <ChampRow key={c.instanceId} champ={c} side="blue" />
              ))}
            </div>
          </section>

          <section className="min-w-0 overflow-hidden">
            <div className="mb-0.5 flex items-center justify-between gap-1">
              <p className="text-[8px] font-bold uppercase tracking-wider text-[#E74C3C] truncate">
                {red.name}
              </p>
              <p className="text-[8px] font-bold text-[#E74C3C] shrink-0">{red.kills}K</p>
            </div>
            <div className="space-y-0.5">
              {redList.map(c => (
                <ChampRow key={c.instanceId} champ={c} side="red" />
              ))}
            </div>
          </section>
        </div>

        <div className="modal-footer shrink-0 border-t border-[#2A3550] px-3 pb-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl py-2.5 text-sm font-bold"
            style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
