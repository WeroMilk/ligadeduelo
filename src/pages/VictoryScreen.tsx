import { useGame } from '@/hooks/useGameState';
import { Trophy, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { playVictorySound } from '@/lib/sounds';

export default function VictoryScreen() {
  const { state, dispatch } = useGame();
  const [confetti, setConfetti] = useState<{ id: number; x: number; delay: number; color: string }[]>([]);

  useEffect(() => {
    playVictorySound();
    const colors = ['#C9A84C', '#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#E67E22'];
    setConfetti(Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
    })));
  }, []);

  const tm = state.turnMatch;

  return (
    <div className="screen-center relative bg-[#0A0E1A] px-4 py-8 safe-top safe-bottom">
      <div className="absolute inset-0 pointer-events-none">
        {confetti.map(c => (
          <div key={c.id} className="absolute w-2 h-2 rounded-sm animate-confetti" style={{ left: `${c.x}%`, top: '-10px', backgroundColor: c.color, animationDelay: `${c.delay}s` }} />
        ))}
      </div>
      <div className="relative z-10 flex flex-col items-center gap-6 max-w-sm w-full">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#8B6914] flex items-center justify-center shadow-[0_0_60px_rgba(201,168,76,0.4)]">
          <Trophy className="w-12 h-12 text-[#0A0E1A]" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[#C9A84C]" style={{ fontFamily: 'Cinzel, serif' }}>¡VICTORIA!</h1>
          <p className="text-[#8B9BB4] mt-2">Victoria en la grieta</p>
        </div>
        <div className="w-full bg-[#141B2D] rounded-xl border border-[#1E2740] p-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-[#C9A84C]">{tm?.blue.score ?? 0}</p>
            <p className="text-[#8B9BB4] text-xs">Tus pts</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#E74C3C]">{tm?.red.score ?? 0}</p>
            <p className="text-[#8B9BB4] text-xs">Rival</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#F0E6D2]">{tm?.blue.kills ?? 0}</p>
            <p className="text-[#8B9BB4] text-xs">Kills</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: 'ADVANCE_BRACKET' })}
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
