import { createPortal } from 'react-dom';
import { BarChart3, X } from 'lucide-react';
import type { Champion, Role, TeamData } from '@/types/game';
import { CHAMPIONS, ROLE_NAMES } from '@/lib/game-data';

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

function ChampRow({ champ, side }: { champ: Champion; side: 'blue' | 'red' }) {
  const def = CHAMPIONS.find(c => c.id === champ.defId);
  const role = def?.role || 'mid';
  const dead = !champ.isAlive || champ.stats.hp <= 0;
  const hp = Math.max(0, Math.floor(champ.stats.hp));
  const mn = Math.max(0, Math.floor(champ.stats.mana));

  return (
    <div
      className={`flex items-center gap-1 rounded border px-1 py-px leading-none ${
        dead ? 'border-[#2A3550]/50 opacity-50' : 'border-[#1E2740]/80 bg-[#141B2D]/60'
      }`}
    >
      <div
        className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full border"
        style={{
          borderColor: side === 'blue' ? '#3498DB' : '#E74C3C',
          backgroundColor: def?.color || '#1A2238',
        }}
      >
        {def?.image ? (
          <img src={def.image} alt={def.name} className="h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-white">
            {def?.initials || '?'}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[8px] font-bold text-[#F0E6D2]">
          {def?.name || champ.defId}
          <span className="ml-0.5 font-normal text-[#8B9BB4]">
            {champ.kills || 0}/{champ.deaths || 0}/{champ.assists || 0}
          </span>
        </p>
        <p className="truncate text-[7px] text-[#8B9BB4]">
          {ROLE_NAMES[role].slice(0, 3)}
          {' · HP '}
          {hp}
          {' · MN '}
          {mn}
          {dead ? ' · X' : ''}
        </p>
      </div>
    </div>
  );
}

function TeamColumn({ team, side }: { team: TeamData; side: 'blue' | 'red' }) {
  const list = sortedChamps(team);
  const accent = side === 'blue' ? '#3498DB' : '#E74C3C';

  return (
    <section className="min-w-0 flex flex-col gap-0.5 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-1 border-b border-[#2A3550]/60 pb-0.5">
        <p className="truncate text-[8px] font-bold uppercase tracking-wide" style={{ color: accent }}>
          {team.name}
        </p>
        <p className="shrink-0 text-[8px] font-bold tabular-nums" style={{ color: accent }}>
          {team.kills}K
        </p>
      </div>
      <div className="flex flex-col gap-px">
        {list.map(c => (
          <ChampRow key={c.instanceId} champ={c} side={side} />
        ))}
      </div>
    </section>
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

  return createPortal(
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center bg-black/75 px-3"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Estadísticas"
      onClick={onClose}
    >
      <div
        className="modal-panel flex w-full max-w-md flex-col overflow-hidden rounded-2xl border-2 border-[#C9A84C]/45 bg-[#0D1220] shadow-[0_0_40px_rgba(201,168,76,0.2)]"
        style={{
          maxHeight:
            'calc(100dvh - 1rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#2A3550] px-3 py-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 shrink-0 text-[#C9A84C]" />
            <div className="min-w-0">
              <h2 className="truncate text-xs font-bold text-[#C9A84C]" style={{ fontFamily: 'Cinzel, serif' }}>
                Estadísticas
              </h2>
              <p className="text-[8px] text-[#8B9BB4] leading-tight">Vida · Maná · K/D/A</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A3550] text-[#8B9BB4]"
            aria-label="Cerrar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="shrink-0 px-3 pt-1.5">
          <div className="rounded-lg border border-[#2A3550] bg-[#141B2D] px-2 py-1 text-center">
            <p className="text-[8px] font-bold uppercase tracking-wider text-[#8B9BB4]">Bajas</p>
            <p className="text-sm font-bold tabular-nums leading-tight">
              <span className="text-[#5DADE2]">{blue.kills}</span>
              <span className="mx-1 text-[#4A5570]">–</span>
              <span className="text-[#F1948A]">{red.kills}</span>
            </p>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-1.5 px-3 py-1.5">
          <TeamColumn team={blue} side="blue" />
          <TeamColumn team={red} side="red" />
        </div>

        <div className="modal-footer shrink-0 border-t border-[#2A3550]">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl py-2 text-sm font-bold"
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
