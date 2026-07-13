import { useGame } from '@/hooks/useGameState';
import { Crown, RotateCcw, User } from 'lucide-react';
import { getChampionDef } from '@/lib/game-engine';
import { useEffect, useState } from 'react';

export default function TournamentWin() {
  const { state, dispatch } = useGame();
  const [particles, setParticles] = useState<{ id: number; x: number; delay: number; color: string }[]>([]);

  useEffect(() => {
    const colors = ['#C9A84C', '#F1C40F', '#E67E22', '#E74C3C', '#3498DB'];
    const p = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles(p);
  }, []);

  const handleRestart = () => {
    dispatch({ type: 'RESET_TOURNAMENT' });
  };

  const champions = state.tournament?.playerTeam?.champions || [];

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute w-1.5 h-1.5 rounded-full animate-confetti"
            style={{
              left: `${p.x}%`,
              top: '-5px',
              backgroundColor: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${4 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Golden glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#C9A84C] opacity-15 blur-[180px] rounded-full" />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-md w-full">
        {/* Crown */}
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#F1C40F] via-[#C9A84C] to-[#8B6914] flex items-center justify-center shadow-[0_0_80px_rgba(201,168,76,0.5)] animate-pulse-slow">
          <Crown className="w-14 h-14 text-[#0A0E1A]" />
        </div>

        <div className="text-center">
          <p className="text-[#C9A84C] text-sm uppercase tracking-[0.3em] mb-2">Felicidades</p>
          <h1 className="text-3xl font-bold text-[#F1C40F]" style={{ fontFamily: 'Cinzel, serif', textShadow: '0 2px 20px rgba(241,196,15,0.4)' }}>
            ¡CAMPEÓN DEL TORNEO!
          </h1>
          <p className="text-[#8B9BB4] mt-2">
            {state.playerTeamName || 'Tu equipo'} ha conquistado la Grieta
          </p>
        </div>

        {/* Team showcase */}
        <div className="w-full bg-[#141B2D] rounded-xl border border-[#C9A84C]/30 p-4">
          <p className="text-[#C9A84C] text-xs uppercase tracking-wider text-center mb-3">Equipo Campeón</p>
          <div className="flex justify-center gap-3">
            {champions.map(c => {
              const def = getChampionDef(c.defId);
              return (
                <div key={c.instanceId} className="flex flex-col items-center gap-1">
                  {def.image ? (
                    <img src={def.image} alt={def.name} className="w-14 h-14 rounded-full border-2 border-[#C9A84C] object-cover shadow-[0_0_10px_rgba(201,168,76,0.3)]" />
                  ) : (
                    <div className="w-14 h-14 rounded-full border-2 border-[#C9A84C] flex items-center justify-center font-bold text-white" style={{ backgroundColor: def.color }}>
                      <User className="w-6 h-6" />
                    </div>
                  )}
                  <span className="text-[#F0E6D2] text-[10px] font-bold">{def.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleRestart}
          className="w-full bg-gradient-to-r from-[#C9A84C] to-[#F1C40F] text-[#0A0E1A] font-bold text-lg py-4 rounded-xl shadow-[0_4px_30px_rgba(201,168,76,0.4)] hover:shadow-[0_4px_40px_rgba(201,168,76,0.6)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          JUGAR OTRO TORNEO
        </button>
      </div>
    </div>
  );
}
