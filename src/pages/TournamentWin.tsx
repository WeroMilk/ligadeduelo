import { useGame } from '@/hooks/useGameState';
import { Crown, RotateCcw, User, Award, Flag } from 'lucide-react';
import { getChampionDef } from '@/lib/game-engine';
import { useEffect, useState } from 'react';
import { playVictorySound } from '@/lib/sounds';
import TournamentRecap from '@/components/TournamentRecap';

export default function TournamentWin() {
  const { state, dispatch } = useGame();
  const champion = state.tournament?.champion;
  const playerWon = champion?.id === 'player';
  const [particles, setParticles] = useState<{ id: number; x: number; delay: number; color: string }[]>([]);
  const frame = state.tournament?.championFrame ?? 'gold';
  const titles = state.tournament?.titles ?? [];

  useEffect(() => {
    if (!playerWon) return;
    playVictorySound();
    const colors = frame === 'obsidian'
      ? ['#9B59B6', '#6B1FA6', '#C39BD3', '#F0E6D2', '#C9A84C']
      : ['#C9A84C', '#F1C40F', '#E67E22', '#E74C3C', '#3498DB'];
    setParticles(Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
    })));
  }, [frame, playerWon]);

  const handleRestart = () => {
    dispatch({ type: 'RESET_TOURNAMENT' });
  };

  const champions = state.tournament?.playerTeam?.champions || [];
  const ring =
    frame === 'obsidian'
      ? 'border-[#9B59B6] shadow-[0_0_16px_rgba(155,89,182,0.55)]'
      : 'border-[#C9A84C] shadow-[0_0_16px_rgba(201,168,76,0.45)]';
  const skinTint = frame === 'obsidian' ? 'hue-rotate-[-20deg] saturate-125' : 'hue-rotate-[8deg] saturate-125 brightness-110';

  if (!playerWon) {
    return (
      <div className="screen-center relative bg-[#0A0E1A] px-4 py-3 md:py-6 safe-top safe-chrome-x safe-bottom">
        <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-3 md:gap-4 pb-4">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#141B2D] border-2 border-[#2A3550] flex items-center justify-center shrink-0">
            <Flag className="w-7 h-7 md:w-9 md:h-9 text-[#8B9BB4]" />
          </div>
          <div className="text-center shrink-0">
            <p className="text-[#8B9BB4] text-xs md:text-sm uppercase tracking-[0.3em] mb-1 md:mb-2">Fin del torneo</p>
            <h1 className="text-xl sm:text-3xl font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
              Campeón: {champion?.name || 'Otro equipo'}
            </h1>
            <p className="text-[#8B9BB4] mt-1 md:mt-2 text-xs md:text-sm">
              Tu equipo fue eliminado. Espectaste hasta el final del bracket.
            </p>
          </div>

          <TournamentRecap playerWon={false} />

          <button
            type="button"
            onClick={handleRestart}
            className="w-full shrink-0 bg-gradient-to-r from-[#C9A84C] to-[#B8953E] text-[#0A0E1A] font-bold text-base md:text-lg py-3.5 md:py-4 rounded-xl flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            NUEVO TORNEO
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-center relative bg-[#0A0E1A] px-4 py-3 md:py-6 safe-top safe-chrome-x safe-bottom">
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

      <div
        className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-15 blur-[180px] rounded-full ${
          frame === 'obsidian' ? 'bg-[#9B59B6]' : 'bg-[#C9A84C]'
        }`}
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-3 md:gap-4 pb-4">
        <div className={`w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center animate-pulse-slow shrink-0 ${
          frame === 'obsidian'
            ? 'bg-gradient-to-br from-[#9B59B6] via-[#6B1FA6] to-[#2C1638] shadow-[0_0_80px_rgba(155,89,182,0.5)]'
            : 'bg-gradient-to-br from-[#F1C40F] via-[#C9A84C] to-[#8B6914] shadow-[0_0_80px_rgba(201,168,76,0.5)]'
        }`}>
          <Crown className="w-8 h-8 md:w-12 md:h-12 text-[#0A0E1A]" />
        </div>

        <div className="text-center shrink-0">
          <p className="text-[#C9A84C] text-xs md:text-sm uppercase tracking-[0.3em] mb-1 md:mb-2">Felicidades</p>
          <h1
            className={`text-xl sm:text-3xl font-bold ${frame === 'obsidian' ? 'text-[#C39BD3]' : 'text-[#F1C40F]'}`}
            style={{ fontFamily: 'Cinzel, serif', textShadow: '0 2px 20px rgba(241,196,15,0.4)' }}
          >
            ¡CAMPEÓN DEL TORNEO!
          </h1>
          <p className="text-[#8B9BB4] mt-1 md:mt-2 text-xs md:text-sm">
            {state.playerTeamName || 'Tu equipo'} ha conquistado la Grieta
          </p>
        </div>

        {titles.length > 0 && (
          <div className="w-full flex flex-wrap justify-center gap-2 shrink-0">
            {titles.map(t => (
              <span
                key={t}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${
                  frame === 'obsidian'
                    ? 'border-[#9B59B6]/50 bg-[#9B59B6]/15 text-[#C39BD3]'
                    : 'border-[#C9A84C]/50 bg-[#C9A84C]/15 text-[#C9A84C]'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                {t}
              </span>
            ))}
          </div>
        )}

        <div className={`w-full rounded-xl border p-2.5 md:p-3 shrink-0 ${
          frame === 'obsidian' ? 'bg-[#12081A] border-[#9B59B6]/35' : 'bg-[#141B2D] border-[#C9A84C]/30'
        }`}>
          <p className={`text-xs uppercase tracking-wider text-center mb-2 ${
            frame === 'obsidian' ? 'text-[#C39BD3]' : 'text-[#C9A84C]'
          }`}>
            Marco {frame === 'obsidian' ? 'Challenger' : 'Dorado'} · Tu equipo
          </p>
          <div className="flex justify-center flex-wrap gap-2">
            {champions.map(c => {
              const def = getChampionDef(c.defId);
              return (
                <div key={c.instanceId} className="flex flex-col items-center gap-1 w-14">
                  <div className={`p-0.5 rounded-full border-2 ${ring}`}>
                    {def.image ? (
                      <img
                        src={def.image}
                        alt={def.name}
                        className={`w-10 h-10 rounded-full object-cover ${skinTint}`}
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${skinTint}`}
                        style={{ backgroundColor: def.color }}
                      >
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <span className="text-[#F0E6D2] text-[9px] font-bold truncate max-w-full text-center">{def.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        <TournamentRecap playerWon />

        <button
          type="button"
          onClick={handleRestart}
          className="w-full shrink-0 bg-gradient-to-r from-[#C9A84C] to-[#F1C40F] text-[#0A0E1A] font-bold text-base md:text-lg py-3.5 md:py-4 rounded-xl shadow-[0_4px_30px_rgba(201,168,76,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          JUGAR OTRO TORNEO
        </button>
      </div>
    </div>
  );
}
