import { useGame } from '@/hooks/useGameState';
import { Skull, RotateCcw, Eye, Landmark } from 'lucide-react';
import { useEffect } from 'react';
import { playDefeatSound, playClickSound } from '@/lib/sounds';

function endedByNexus(tm: ReturnType<typeof useGame>['state']['turnMatch']): boolean {
  if (!tm) return false;
  if (tm.lastResolution?.autoNexus) return true;
  const blue = tm.structures.find(s => s.id === 'nexus_blue');
  const red = tm.structures.find(s => s.id === 'nexus_red');
  return !!(blue?.isDestroyed || red?.isDestroyed);
}

export default function DefeatScreen() {
  const { state, dispatch } = useGame();

  const currentRound = state.tournament?.currentRound ?? 0;
  const roundNames = ['Octavos', 'Cuartos', 'Semifinal', 'Final'];
  const tm = state.turnMatch;
  const nexusLoss = endedByNexus(tm);
  const myKills = tm?.blue.kills ?? 0;
  const theirKills = tm?.red.kills ?? 0;
  const hadMoreKills = myKills > theirKills;

  useEffect(() => {
    playDefeatSound();
  }, []);

  const handleRestart = () => {
    playClickSound();
    dispatch({ type: 'RESET_TOURNAMENT' });
  };

  const handleViewBracket = () => {
    playClickSound();
    dispatch({ type: 'SET_SCREEN', screen: 'bracket', bracketViewRound: 0 });
  };

  return (
    <div className="screen-center relative bg-[#0A0E1A] px-4 py-4 md:py-8 safe-top safe-chrome-x safe-bottom">
      <div
        className={`absolute inset-0 ${
          nexusLoss
            ? 'bg-[radial-gradient(ellipse_at_center,rgba(52,152,219,0.18),transparent_65%)]'
            : 'bg-gradient-radial from-[#E74C3C]/10 via-transparent to-transparent'
        }`}
      />

      <div className="relative z-10 flex flex-col items-center gap-4 md:gap-6 max-w-sm w-full">
        <div
          className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center ${
            nexusLoss
              ? 'bg-gradient-to-br from-[#5DADE2] to-[#1A5276] shadow-[0_0_60px_rgba(52,152,219,0.35)]'
              : 'bg-gradient-to-br from-[#E74C3C] to-[#922B21] shadow-[0_0_60px_rgba(231,76,60,0.3)]'
          }`}
        >
          {nexusLoss ? (
            <Landmark className="w-10 h-10 md:w-12 md:h-12 text-[#0A0E1A]" />
          ) : (
            <Skull className="w-10 h-10 md:w-12 md:h-12 text-[#0A0E1A]" />
          )}
        </div>

        <div className="text-center">
          <h1
            className={`text-3xl md:text-4xl font-bold ${nexusLoss ? 'text-[#5DADE2]' : 'text-[#E74C3C]'}`}
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            {nexusLoss ? '¡NEXO CAÍDO!' : 'ELIMINADO'}
          </h1>
          <p className="text-[#8B9BB4] mt-1 md:mt-2 text-sm">
            {nexusLoss
              ? 'Te destrozaron la base · derrota por nexo'
              : 'Tu equipo ha sido eliminado del torneo'}
          </p>
        </div>

        {nexusLoss && (
          <div className="w-full rounded-xl border-2 border-[#E74C3C]/40 bg-[#E74C3C]/10 px-3 py-3 text-center space-y-1.5">
            <p className="text-sm font-bold text-[#F1948A]">Tu nexo fue destruido</p>
            <p className="text-[11px] text-[#C5D0E0] leading-snug">
              {hadMoreKills
                ? `Llevabas ${myKills}–${theirKills} en bajas, pero una línea quedó sola y tumbaron tu base. Las bajas no salvan el nexo.`
                : `Marcador ${myKills}–${theirKills}. Dejaron tu base expuesta: el nexo decide la partida, no solo las bajas.`}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#E74C3C]/90 pt-0.5">
              Malas rotaciones · línea libre · base rota
            </p>
          </div>
        )}

        <div
          className={`w-full rounded-xl border p-4 text-center ${
            nexusLoss ? 'bg-[#141B2D] border-[#3498DB]/35' : 'bg-[#141B2D] border-[#E74C3C]/30'
          }`}
        >
          <p className="text-[#8B9BB4] text-sm">Bajas finales</p>
          <p className={`text-2xl font-bold mt-1 ${nexusLoss ? 'text-[#F0E6D2]' : 'text-[#E74C3C]'}`}>
            {myKills} – {theirKills}
          </p>
          {nexusLoss && hadMoreKills && (
            <p className="text-[10px] text-[#E74C3C] font-bold mt-2">
              Más bajas que el rival · igual perdiste por nexo
            </p>
          )}
          <p className="text-[#8B9BB4] text-xs mt-2">Ronda: {roundNames[currentRound] || 'Octavos'}</p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={handleRestart}
            className="w-full bg-gradient-to-r from-[#C9A84C] to-[#B8953E] text-[#0A0E1A] font-bold py-4 rounded-xl shadow-[0_4px_20px_rgba(201,168,76,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            NUEVO TORNEO
          </button>
          <button
            onClick={handleViewBracket}
            className="w-full bg-[#141B2D] border border-[#2A3550] text-[#8B9BB4] font-bold py-3 rounded-xl hover:border-[#C9A84C] hover:text-[#F0E6D2] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            VER BRACKET
          </button>
        </div>
      </div>
    </div>
  );
}
