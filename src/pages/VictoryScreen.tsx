import { useGame } from '@/hooks/useGameState';
import { Trophy, ChevronRight, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { playVictorySound } from '@/lib/sounds';

export default function VictoryScreen() {
  const { state, dispatch } = useGame();
  const [confetti, setConfetti] = useState<{ id: number; x: number; delay: number; color: string }[]>([]);

  useEffect(() => {
    playVictorySound();
    const colors = ['#C9A84C', '#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#E67E22'];
    const c = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setConfetti(c);
  }, []);

  const handleAdvance = () => {
    dispatch({ type: 'ADVANCE_BRACKET' });
  };

  const blueKills = state.simulationSnapshot?.blueKills || 0;
  const redKills = state.simulationSnapshot?.redKills || 0;
  const steps = state.simulationSnapshot?.step || 0;

  return (
    <div className="min-h-app bg-[#0A0E1A] flex flex-col items-center justify-center relative overflow-y-auto px-4 py-8 safe-top safe-bottom">
      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none">
        {confetti.map(c => (
          <div
            key={c.id}
            className="absolute w-2 h-2 rounded-sm animate-confetti"
            style={{
              left: `${c.x}%`,
              top: '-10px',
              backgroundColor: c.color,
              animationDelay: `${c.delay}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#C9A84C] opacity-10 blur-[150px] rounded-full" />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-sm w-full">
        {/* Trophy */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#8B6914] flex items-center justify-center shadow-[0_0_60px_rgba(201,168,76,0.4)] animate-bounce-slow">
          <Trophy className="w-12 h-12 text-[#0A0E1A]" />
        </div>

        <div className="text-center">
          <h1 className="text-4xl font-bold text-[#C9A84C]" style={{ fontFamily: 'Cinzel, serif', textShadow: '0 2px 20px rgba(201,168,76,0.4)' }}>
            ¡VICTORIA!
          </h1>
          <p className="text-[#8B9BB4] mt-2">
            Tu equipo avanza en el torneo
          </p>
        </div>

        {/* Stats */}
        <div className="w-full bg-[#141B2D] rounded-xl border border-[#1E2740] p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-[#C9A84C]">{blueKills}</p>
              <p className="text-[#8B9BB4] text-xs">Kills</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#E74C3C]">{redKills}</p>
              <p className="text-[#8B9BB4] text-xs">Muertes rival</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#F0E6D2]">{steps}</p>
              <p className="text-[#8B9BB4] text-xs">Turnos</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleAdvance}
          className="w-full bg-gradient-to-r from-[#C9A84C] to-[#B8953E] text-[#0A0E1A] font-bold text-lg py-4 rounded-xl shadow-[0_4px_20px_rgba(201,168,76,0.3)] hover:shadow-[0_4px_30px_rgba(201,168,76,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          AVANZAR
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
