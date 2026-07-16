import { useGame } from '@/hooks/useGameState';
import { Trophy, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { playVictorySound, playClickSound } from '@/lib/sounds';

export default function VictoryScreen() {
  const { state, dispatch } = useGame();
  const [confetti, setConfetti] = useState<{ id: number; x: number; delay: number; color: string }[]>([]);

  const roundIdx = state.tournament?.currentRound ?? 0;
  const lastRoundIdx = (state.tournament?.rounds.length ?? 4) - 1;
  const isTournamentFinal = roundIdx >= lastRoundIdx;

  // Final del torneo: ir directo a la pantalla de campeón (sin interstitial)
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

  const tm = state.turnMatch;

  if (isTournamentFinal) {
    return <div className="screen-center bg-[#0A0E1A]" aria-hidden />;
  }

  return (
    <div className="screen-center relative bg-[#0A0E1A] px-4 py-4 md:py-8 safe-top safe-chrome-x safe-bottom overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        {confetti.map(c => (
          <div key={c.id} className="absolute w-2 h-2 rounded-sm animate-confetti" style={{ left: `${c.x}%`, top: '-10px', backgroundColor: c.color, animationDelay: `${c.delay}s` }} />
        ))}
      </div>
      <div className="relative z-10 flex flex-col items-center gap-4 md:gap-6 max-w-sm w-full">
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#8B6914] flex items-center justify-center shadow-[0_0_60px_rgba(201,168,76,0.4)]">
          <Trophy className="w-10 h-10 md:w-12 md:h-12 text-[#0A0E1A]" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-[#C9A84C]" style={{ fontFamily: 'Cinzel, serif' }}>¡VICTORIA!</h1>
          <p className="text-[#8B9BB4] mt-1 md:mt-2 text-sm">Victoria en la grieta</p>
        </div>
        <div className="w-full bg-[#141B2D] rounded-xl border border-[#1E2740] p-4 grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-[#C9A84C]">{tm?.blue.kills ?? 0}</p>
            <p className="text-[#8B9BB4] text-xs">Tus kills</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#E74C3C]">{tm?.red.kills ?? 0}</p>
            <p className="text-[#8B9BB4] text-xs">Kills rival</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            playClickSound();
            dispatch({ type: 'ADVANCE_BRACKET' });
          }}
          className="w-full font-bold py-4 rounded-xl flex items-center justify-center gap-2"
          style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
        >
          CONTINUAR
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
