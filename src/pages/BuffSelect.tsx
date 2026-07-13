import { useGame } from '@/hooks/useGameState';
import { ROUND_BUFFS } from '@/lib/buffs';
import type { BuffId } from '@/types/game';
import { RIVAL_TEAM_ID } from '@/lib/game-data';
import { playClickSound } from '@/lib/sounds';
import { Flame, Shield, HeartPulse, Zap, Swords } from 'lucide-react';

const ICONS: Record<BuffId, typeof Flame> = {
  fury: Flame,
  iron: Shield,
  vital: HeartPulse,
  greed: Zap,
};

export default function BuffSelect() {
  const { state, dispatch } = useGame();
  const match = state.currentMatch;
  const selected = state.selectedBuffId;
  const vsRival = match && (match.teamA.id === RIVAL_TEAM_ID || match.teamB.id === RIVAL_TEAM_ID);

  const handlePick = (id: BuffId) => {
    playClickSound();
    dispatch({ type: 'SELECT_BUFF', buffId: id });
  };

  const handleConfirm = () => {
    if (!selected) return;
    playClickSound();
    dispatch({ type: 'START_MATCH_WITH_BUFF' });
  };

  return (
    <div className="h-app bg-[#0A0E1A] flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-4 pb-2 safe-top max-w-lg mx-auto w-full">
        <p className="text-[#C9A84C] text-xs uppercase tracking-[0.25em] mb-1">Apuesta de ronda</p>
        <h1 className="text-2xl font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
          Elige tu riesgo
        </h1>
        <p className="text-[#8B9BB4] text-sm mt-1">
          Un buff para todo el equipo… a cambio de un coste.
        </p>
        {vsRival && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#6B1FA6]/50 bg-[#6B1FA6]/15 px-3 py-2">
            <Swords className="w-4 h-4 text-[#C39BD3] shrink-0" />
            <p className="text-[#C39BD3] text-xs leading-snug">
              <span className="font-bold">La Sombra Eterna</span> te espera. Esta rivalidad no olvida.
            </p>
          </div>
        )}
        <p className="text-[#5A6A84] text-xs mt-2">
          vs {match?.teamB.name || 'Rival'}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 max-w-lg mx-auto w-full space-y-2">
        {ROUND_BUFFS.map(buff => {
          const Icon = ICONS[buff.id];
          const active = selected === buff.id;
          return (
            <button
              key={buff.id}
              type="button"
              onClick={() => handlePick(buff.id)}
              className={`w-full text-left rounded-xl border p-3.5 transition-all active:scale-[0.99] ${
                active
                  ? 'border-[#C9A84C] bg-[#C9A84C]/10 shadow-[0_0_20px_rgba(201,168,76,0.15)]'
                  : 'border-[#1E2740] bg-[#141B2D] hover:border-[#2A3550]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : 'bg-[#0A0E1A] text-[#8B9BB4]'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className={`font-bold ${active ? 'text-[#C9A84C]' : 'text-[#F0E6D2]'}`}>{buff.name}</p>
                  <p className="text-[#8B9BB4] text-sm mt-0.5">{buff.description}</p>
                  <p className="text-[#E74C3C] text-xs mt-1.5 font-medium">Riesgo: {buff.risk}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="shrink-0 px-4 py-3 safe-bottom max-w-lg mx-auto w-full">
        <button
          type="button"
          disabled={!selected}
          onClick={handleConfirm}
          className="w-full min-h-12 bg-gradient-to-r from-[#C9A84C] to-[#B8953E] text-[#0A0E1A] font-bold rounded-xl disabled:opacity-40 active:scale-[0.98] transition-all"
        >
          ENTRAR AL DUELLO
        </button>
      </div>
    </div>
  );
}
