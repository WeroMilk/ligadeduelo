import { createPortal } from 'react-dom';
import { Trophy, X, User } from 'lucide-react';
import type { ChampionMatchStats, Match, TeamMatchStats } from '@/types/game';
import { CHAMPIONS, ROLE_NAMES } from '@/lib/game-data';
import { playClickSound } from '@/lib/sounds';

type Props = {
  match: Match;
  onClose: () => void;
};

function TeamBlock({
  stats,
  isWinner,
  align,
}: {
  stats: TeamMatchStats;
  isWinner: boolean;
  align: 'left' | 'right';
}) {
  return (
    <section
      className={`min-w-0 rounded-lg border p-1.5 space-y-1 ${
        isWinner ? 'border-[#C9A84C]/60 bg-[#C9A84C]/5' : 'border-[#2A3550] bg-[#141B2D]'
      }`}
    >
      <div className={`flex items-center justify-between gap-1 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold text-[#F0E6D2]">{stats.teamName}</p>
          {isWinner && (
            <p className="text-[8px] font-bold uppercase tracking-wider text-[#C9A84C]">Ganador</p>
          )}
        </div>
        {isWinner && <Trophy className="h-3 w-3 shrink-0 text-[#C9A84C]" />}
      </div>
      <div className={`flex flex-wrap gap-1 text-[8px] ${align === 'right' ? 'justify-end' : ''}`}>
        <span className="rounded bg-[#2A3550] px-1 py-0.5 text-[#3498DB] font-bold">
          {stats.totalKills}K
        </span>
        <span className="rounded bg-[#2A3550] px-1 py-0.5 text-[#E74C3C] font-bold">
          {stats.totalDeaths}D
        </span>
      </div>
      <ul className="space-y-0.5">
        {stats.champions.map(champ => (
          <ChampionRow key={`${stats.teamId}-${champ.defId}-${champ.playerName}`} champ={champ} align={align} />
        ))}
      </ul>
    </section>
  );
}

function ChampionRow({ champ, align }: { champ: ChampionMatchStats; align: 'left' | 'right' }) {
  const def = CHAMPIONS.find(c => c.id === champ.defId);
  return (
    <li
      className={`flex items-center gap-1 rounded border border-[#2A3550]/70 bg-[#0A0E1A]/60 px-1 py-0.5 ${
        align === 'right' ? 'flex-row-reverse text-right' : ''
      }`}
    >
      {def?.image ? (
        <img
          src={def.image}
          alt={def.name}
          className="h-6 w-6 shrink-0 rounded-full border border-[#2A3550] object-cover"
        />
      ) : (
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#2A3550] text-white"
          style={{ backgroundColor: def?.color || '#333' }}
        >
          <User className="h-2.5 w-2.5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[9px] font-bold text-[#F0E6D2]">{def?.name ?? champ.defId}</p>
        <p className="truncate text-[8px] text-[#8B9BB4]">
          {champ.playerName} · {ROLE_NAMES[champ.role]}
        </p>
      </div>
      <div className={`shrink-0 text-[8px] font-bold tabular-nums leading-tight ${align === 'right' ? 'text-left' : 'text-right'}`}>
        <span className="text-[#3498DB]">{champ.kills}</span>
        <span className="text-[#8B9BB4]">/</span>
        <span className="text-[#E74C3C]">{champ.deaths}</span>
        <span className="text-[#8B9BB4]">/</span>
        <span className="text-[#2ECC71]">{champ.assists}</span>
      </div>
    </li>
  );
}

export default function BracketMatchModal({ match, onClose }: Props) {
  const summary = match.resultSummary;
  const winnerName = match.winner === 'blue' ? match.teamA.name : match.teamB.name;

  const handleClose = () => {
    playClickSound();
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 px-3"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Resumen: ${match.teamA.name} vs ${match.teamB.name}`}
      onClick={handleClose}
    >
      <div
        className="modal-panel flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-2 border-[#C9A84C]/50 bg-[#0D1220] shadow-[0_0_40px_rgba(201,168,76,0.2)]"
        style={{ maxHeight: 'min(40rem, calc(100dvh - 1.5rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[#2A3550] px-3 py-2">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#8B9BB4]">
              {match.roundName}
            </p>
            <h2
              className="text-sm font-bold text-[#F0E6D2] md:text-base leading-snug truncate"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {match.teamA.name} vs {match.teamB.name}
            </h2>
            {match.winner && (
              <p className="mt-0.5 text-[10px] font-bold text-[#C9A84C] truncate">Ganador: {winnerName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2A3550] text-[#8B9BB4] hover:text-[#F0E6D2]"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-3 py-2">
          {!summary ? (
            <p className="text-center text-xs text-[#8B9BB4] py-6">Sin estadísticas guardadas para esta partida.</p>
          ) : (
            <div className="flex flex-col gap-1.5 h-full">
              <div className="shrink-0 rounded-lg border border-[#2A3550] bg-[#141B2D] px-2 py-1.5 text-center">
                <p className="text-[8px] font-bold uppercase tracking-wider text-[#8B9BB4]">
                  Marcador de bajas
                </p>
                <p className="text-lg font-bold tabular-nums leading-tight">
                  <span className="text-[#5DADE2]">{summary.scoreBlue}</span>
                  <span className="mx-1.5 text-[#4A5570]">–</span>
                  <span className="text-[#F1948A]">{summary.scoreRed}</span>
                </p>
                {summary.endedByNexus && (
                  <p className="mt-0.5 text-[8px] font-bold text-[#C9A84C]">Victoria por nexo</p>
                )}
              </div>

              <p className="shrink-0 text-[8px] font-bold uppercase tracking-wider text-[#8B9BB4]">
                K / D / A por campeón
              </p>

              <div className="grid min-h-0 flex-1 grid-cols-2 gap-1.5">
                <TeamBlock stats={summary.blue} isWinner={match.winner === 'blue'} align="left" />
                <TeamBlock stats={summary.red} isWinner={match.winner === 'red'} align="right" />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer shrink-0 border-t border-[#2A3550] px-3 pb-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
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
