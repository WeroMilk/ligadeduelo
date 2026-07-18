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
      className={`rounded-xl border p-3 space-y-2 ${
        isWinner ? 'border-[#C9A84C]/60 bg-[#C9A84C]/5' : 'border-[#2A3550] bg-[#141B2D]'
      }`}
    >
      <div className={`flex items-center justify-between gap-2 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#F0E6D2]">{stats.teamName}</p>
          {isWinner && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C]">Ganador</p>
          )}
        </div>
        {isWinner && <Trophy className="h-4 w-4 shrink-0 text-[#C9A84C]" />}
      </div>
      <div className={`flex flex-wrap gap-2 text-[10px] ${align === 'right' ? 'justify-end' : ''}`}>
        <span className="rounded-md bg-[#2A3550] px-2 py-0.5 text-[#3498DB] font-bold">
          {stats.totalKills} bajas
        </span>
        <span className="rounded-md bg-[#2A3550] px-2 py-0.5 text-[#E74C3C] font-bold">
          {stats.totalDeaths} muertes
        </span>
      </div>
      <ul className="space-y-1.5">
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
      className={`flex items-center gap-2 rounded-lg border border-[#2A3550]/70 bg-[#0A0E1A]/60 px-2 py-1.5 ${
        align === 'right' ? 'flex-row-reverse text-right' : ''
      }`}
    >
      {def?.image ? (
        <img
          src={def.image}
          alt={def.name}
          className="h-8 w-8 shrink-0 rounded-full border border-[#2A3550] object-cover"
        />
      ) : (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#2A3550] text-white"
          style={{ backgroundColor: def?.color || '#333' }}
        >
          <User className="h-3.5 w-3.5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-[#F0E6D2]">{champ.playerName}</p>
        <p className="truncate text-[10px] text-[#8B9BB4]">
          {def?.name ?? champ.defId} · {ROLE_NAMES[champ.role]}
        </p>
      </div>
      <div className={`shrink-0 text-[10px] font-bold tabular-nums ${align === 'right' ? 'text-left' : 'text-right'}`}>
        <span className="text-[#3498DB]">{champ.kills}</span>
        <span className="text-[#8B9BB4]"> / </span>
        <span className="text-[#E74C3C]">{champ.deaths}</span>
        <span className="text-[#8B9BB4]"> / </span>
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
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Resumen: ${match.teamA.name} vs ${match.teamB.name}`}
      onClick={handleClose}
    >
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-2 border-[#C9A84C]/50 bg-[#0D1220] shadow-[0_0_40px_rgba(201,168,76,0.2)]"
        style={{ maxHeight: 'min(40rem, calc(100dvh - 2rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#2A3550] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B9BB4]">
              {match.roundName}
            </p>
            <h2
              className="text-base font-bold text-[#F0E6D2] md:text-lg leading-snug"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {match.teamA.name} vs {match.teamB.name}
            </h2>
            {match.winner && (
              <p className="mt-0.5 text-xs font-bold text-[#C9A84C]">Ganador: {winnerName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#2A3550] text-[#8B9BB4] hover:text-[#F0E6D2]"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {!summary ? (
            <p className="text-center text-sm text-[#8B9BB4] py-8">Sin estadísticas guardadas para esta partida.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#2A3550] bg-[#141B2D] px-4 py-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B9BB4] mb-1">
                  Marcador de bajas
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  <span className="text-[#5DADE2]">{summary.scoreBlue}</span>
                  <span className="mx-2 text-[#4A5570]">–</span>
                  <span className="text-[#F1948A]">{summary.scoreRed}</span>
                </p>
                <p className="mt-1 text-[10px] text-[#8B9BB4]">
                  {match.teamA.name} · {summary.blue.totalDeaths} muertes totales
                  {' · '}
                  {match.teamB.name} · {summary.red.totalDeaths} muertes totales
                </p>
                {summary.endedByNexus && (
                  <p className="mt-2 text-[10px] font-bold text-[#C9A84C]">Victoria por destrucción del nexo</p>
                )}
              </div>

              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B9BB4] px-0.5">
                K / D / A por campeón
              </p>

              <div className="grid gap-3 md:grid-cols-2">
                <TeamBlock stats={summary.blue} isWinner={match.winner === 'blue'} align="left" />
                <TeamBlock stats={summary.red} isWinner={match.winner === 'red'} align="right" />
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[#2A3550] px-4 py-3">
          <button
            type="button"
            onClick={handleClose}
            className="w-full rounded-xl py-3 font-bold"
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
