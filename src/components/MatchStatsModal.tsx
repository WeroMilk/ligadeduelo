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
    <div className="h-1.5 rounded-full bg-black/50 overflow-hidden">
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
      className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
        dead ? 'border-[#2A3550]/60 opacity-55' : 'border-[#1E2740] bg-[#141B2D]/80'
      }`}
    >
      <div
        className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border-2"
        style={{
          borderColor: side === 'blue' ? '#3498DB' : '#E74C3C',
          backgroundColor: def?.color || '#1A2238',
        }}
      >
        {def?.image ? (
          <img src={def.image} alt={def.name} className="h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
            {def?.initials || '?'}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-[#F0E6D2]">
              {def?.name || champ.defId}
              {champ.playerName ? (
                <span className="ml-1 font-normal text-[#8B9BB4]">· {champ.playerName}</span>
              ) : null}
            </p>
            <p className="text-[9px] font-bold uppercase" style={{ color: ROLE_COLORS[role] }}>
              {ROLE_NAMES[role]}
              {dead ? ' · Caído' : ''}
            </p>
          </div>
          <p className="shrink-0 text-[11px] font-bold tabular-nums text-[#C9A84C]">
            {champ.kills || 0}/{champ.deaths || 0}/{champ.assists || 0}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="mb-0.5 flex justify-between text-[9px]">
              <span className="text-[#E74C3C]">HP</span>
              <span className="text-[#8B9BB4]">
                {Math.max(0, Math.floor(champ.stats.hp))}/{champ.stats.maxHp}
              </span>
            </div>
            <StatBar value={champ.stats.hp} max={champ.stats.maxHp} color="#E74C3C" />
          </div>
          <div>
            <div className="mb-0.5 flex justify-between text-[9px]">
              <span className="text-[#3498DB]">MN</span>
              <span className="text-[#8B9BB4]">
                {Math.max(0, Math.floor(champ.stats.mana))}/{champ.stats.maxMana}
              </span>
            </div>
            <StatBar value={champ.stats.mana} max={champ.stats.maxMana} color="#3498DB" />
          </div>
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
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border-2 border-[#C9A84C]/45 bg-[#0D1220] shadow-[0_0_40px_rgba(201,168,76,0.2)]"
        style={{
          maxHeight:
            'min(40rem, calc(100dvh - 1.5rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)))',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#2A3550] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <BarChart3 className="h-5 w-5 shrink-0 text-[#C9A84C]" />
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-[#C9A84C]" style={{ fontFamily: 'Cinzel, serif' }}>
                Estadísticas
              </h2>
              <p className="text-[10px] text-[#8B9BB4]">Vida · Maná · K / D / A</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2A3550] text-[#8B9BB4]"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3">
          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#3498DB]">
                Aliados · {blue.name}
              </p>
              <p className="text-[10px] font-bold text-[#3498DB]">{blue.kills} bajas</p>
            </div>
            <div className="space-y-1.5">
              {blueList.map(c => (
                <ChampRow key={c.instanceId} champ={c} side="blue" />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#E74C3C]">
                Enemigos · {red.name}
              </p>
              <p className="text-[10px] font-bold text-[#E74C3C]">{red.kills} bajas</p>
            </div>
            <div className="space-y-1.5">
              {redList.map(c => (
                <ChampRow key={c.instanceId} champ={c} side="red" />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
