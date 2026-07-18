import { useGame } from '@/hooks/useGameState';
import { isCoopLocal } from '@/lib/coop';
import { getBracketTimings } from '@/lib/express-mode';
import { Trophy, ChevronRight, User, Landmark } from 'lucide-react';
import { useEffect, useState } from 'react';
import { playVictorySound, playClickSound } from '@/lib/sounds';
import { CHAMPIONS, ROLE_NAMES } from '@/lib/game-data';
import type { Role } from '@/types/game';

const ROLE_ORDER: Role[] = ['top', 'jungle', 'mid', 'adc', 'support'];

function endedByNexus(tm: ReturnType<typeof useGame>['state']['turnMatch']): boolean {
  if (!tm) return false;
  if (tm.lastResolution?.autoNexus) return true;
  const blue = tm.structures.find(s => s.id === 'nexus_blue');
  const red = tm.structures.find(s => s.id === 'nexus_red');
  return !!(blue?.isDestroyed || red?.isDestroyed);
}

export default function VictoryScreen() {
  const { state, dispatch } = useGame();
  const [confetti, setConfetti] = useState<{ id: number; x: number; delay: number; color: string }[]>([]);

  const roundIdx = state.tournament?.currentRound ?? 0;
  const lastRoundIdx = (state.tournament?.rounds.length ?? 4) - 1;
  const isTournamentFinal = roundIdx >= lastRoundIdx;

  useEffect(() => {
    if (!isTournamentFinal) return;
    dispatch({ type: 'ADVANCE_BRACKET' });
  }, [isTournamentFinal, dispatch]);

  useEffect(() => {
    if (isTournamentFinal) return;
    playVictorySound();
    const colors = ['#C9A84C', '#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#E67E22'];
    setConfetti(Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
    })));
  }, [isTournamentFinal]);

  const autoAdvanceMs = getBracketTimings(state.gameMode).victoryAutoAdvanceMs;
  useEffect(() => {
    if (isTournamentFinal || autoAdvanceMs <= 0) return;
    const t = window.setTimeout(() => {
      dispatch({ type: 'ADVANCE_BRACKET' });
    }, autoAdvanceMs);
    return () => window.clearTimeout(t);
  }, [isTournamentFinal, autoAdvanceMs, dispatch]);

  const tm = state.turnMatch;
  const isCoopPvp = isCoopLocal(state.gameMode) && !!state.currentMatch?.isPvpMatch;
  const winnerName = state.lastMatchWinnerName;

  if (isTournamentFinal) {
    return <div className="screen-center bg-[#0A0E1A]" aria-hidden />;
  }

  const nexusWin = endedByNexus(tm);
  const myTeam = tm?.blue;
  const theirTeam = tm?.red;
  const myKills = myTeam?.kills ?? 0;
  const theirKills = theirTeam?.kills ?? 0;
  const behindOnKills = myKills < theirKills;

  const teamLines = ROLE_ORDER.map(role => {
    const member = state.selectedRoster.find(r => r.role === role);
    const champ = (tm?.blue.champions || state.selectedChampions).find(c => {
      const def = CHAMPIONS.find(d => d.id === c.defId);
      return def?.role === role;
    });
    const def = champ ? CHAMPIONS.find(d => d.id === champ.defId) : null;
    return {
      role,
      roleLabel: ROLE_NAMES[role],
      player: member?.name || '—',
      champ: def?.name || '—',
      champImage: def?.image || null,
      champColor: def?.color || '#333',
    };
  });

  return (
    <div className="screen-center relative bg-[#0A0E1A] px-4 py-4 md:py-8 safe-top safe-chrome-x safe-bottom">
      <div className="absolute inset-0 pointer-events-none">
        {confetti.map(c => (
          <div key={c.id} className="absolute w-2 h-2 rounded-sm animate-confetti" style={{ left: `${c.x}%`, top: '-10px', backgroundColor: c.color, animationDelay: `${c.delay}s` }} />
        ))}
      </div>
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-4 md:gap-6 pb-4">
        <div
          className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shrink-0 ${
            nexusWin
              ? 'bg-gradient-to-br from-[#3498DB] to-[#1A5276] shadow-[0_0_60px_rgba(52,152,219,0.45)]'
              : 'bg-gradient-to-br from-[#C9A84C] to-[#8B6914] shadow-[0_0_60px_rgba(201,168,76,0.4)]'
          }`}
        >
          {nexusWin ? (
            <Landmark className="w-10 h-10 md:w-12 md:h-12 text-[#0A0E1A]" />
          ) : (
            <Trophy className="w-10 h-10 md:w-12 md:h-12 text-[#0A0E1A]" />
          )}
        </div>
        <div className="text-center shrink-0">
          <h1
            className={`text-3xl md:text-4xl font-bold ${nexusWin ? 'text-[#3498DB]' : 'text-[#C9A84C]'}`}
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            {nexusWin ? '¡NEXO DESTRUIDO!' : '¡VICTORIA!'}
          </h1>
          <p className="text-[#8B9BB4] mt-1 md:mt-2 text-sm">
            {isCoopPvp && winnerName
              ? `Ganó ${winnerName}`
              : nexusWin
                ? 'Tumbaron la base enemiga · victoria por nexo'
                : `${state.playerTeamName || 'Tu equipo'} · Victoria en la grieta`}
          </p>
        </div>

        {isCoopPvp && winnerName && (
          <div className="w-full rounded-xl border-2 border-[#C9A84C]/45 bg-[#C9A84C]/10 px-3 py-3 text-center">
            <p className="text-sm font-bold text-[#C9A84C]">Resultado PvP</p>
            <p className="text-[11px] text-[#8B9BB4] mt-1">
              {tm?.blue.name} {myKills} – {theirKills} {tm?.red.name}
            </p>
          </div>
        )}

        {nexusWin && (
          <div className="w-full rounded-xl border-2 border-[#3498DB]/45 bg-[#3498DB]/10 px-3 py-3 text-center space-y-1">
            <p className="text-sm font-bold text-[#85C1E9]">La partida terminó al caer su nexo</p>
            <p className="text-[11px] text-[#8B9BB4] leading-snug">
              {behindOnKills
                ? `Ibas ${myKills}–${theirKills} en bajas, pero su base cayó primero. Las bajas ya no importan.`
                : `Marcador ${myKills}–${theirKills}. Igual: el nexo decide, no solo las bajas.`}
            </p>
          </div>
        )}

        <div className="w-full bg-[#141B2D] rounded-xl border border-[#1E2740] p-4 grid grid-cols-2 gap-3 text-center shrink-0">
          <div>
            <p className="text-2xl font-bold text-[#C9A84C]">{myKills}</p>
            <p className="text-[#8B9BB4] text-xs">Tus bajas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#E74C3C]">{theirKills}</p>
            <p className="text-[#8B9BB4] text-xs">Bajas rival</p>
          </div>
        </div>

        <div className="w-full rounded-xl border border-[#C9A84C]/25 bg-[#0D1220] p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-[#C9A84C] text-center">Tu equipo</p>
          {teamLines.map(l => (
            <div key={l.role} className="flex items-center gap-2 rounded-lg border border-[#1E2740] bg-[#141B2D] px-2.5 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase text-[#8B9BB4]">{l.roleLabel}</p>
                <p className="text-sm font-bold text-[#F0E6D2] truncate">{l.player}</p>
              </div>
              <span className="text-[#4A5570] text-xs">→</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {l.champImage ? (
                  <img src={l.champImage} alt={l.champ} className="w-8 h-8 rounded-full object-cover border border-[#2A3550]" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: l.champColor }}>
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
                <span className="text-xs font-bold text-[#C9A84C] truncate max-w-[72px]">{l.champ}</span>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            dispatch({ type: 'ADVANCE_BRACKET' });
          }}
          className="w-full font-bold py-4 rounded-xl flex items-center justify-center gap-2 shrink-0"
          style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
        >
          CONTINUAR
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
