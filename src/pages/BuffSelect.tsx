import { useGame } from '@/hooks/useGameState';
import { ROUND_BUFFS } from '@/lib/buffs';
import type { BuffId } from '@/types/game';
import { playClickSound } from '@/lib/sounds';
import { Flame, Shield, HeartPulse, Zap, Ghost } from 'lucide-react';
import { objectiveName } from '@/lib/turn-engine';

const ICONS: Record<BuffId, typeof Flame> = {
  fury: Flame,
  iron: Shield,
  vital: HeartPulse,
  greed: Zap,
};

/** Mid-match reward after winning an objective (replaces starting buff). */
export default function BuffSelect() {
  const { state, dispatch } = useGame();
  const selected = state.selectedBuffId;
  const isReward = state.currentScreen === 'rewardBuff';
  const obj = state.turnMatch?.lastResolution?.objective;

  const handlePick = (id: BuffId) => {
    playClickSound();
    dispatch({ type: 'SELECT_BUFF', buffId: id });
  };

  const handleConfirm = () => {
    if (!selected) return;
    playClickSound();
    dispatch({ type: 'CONFIRM_REWARD_BUFF' });
  };

  return (
    <div className="flex-1 min-h-0 w-full bg-[#0A0E1A] flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-4 pb-2 safe-top max-w-lg mx-auto w-full">
        <p className="text-[#C9A84C] text-xs uppercase tracking-[0.25em] mb-1">
          {isReward ? 'Recompensa de objetivo' : 'Ventaja'}
        </p>
        <h1 className="text-2xl font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
          Elige ventaja y riesgo
        </h1>
        {obj && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#E67E22]/40 bg-[#E67E22]/10 px-3 py-2 text-xs text-[#E67E22]">
            <Ghost className="w-3.5 h-3.5" />
            Ganaste el <span className="font-bold">{objectiveName(obj)}</span> — elige tu recompensa
          </div>
        )}
        <p className="text-[#8B9BB4] text-sm mt-2">
          Un buff para todo el equipo… a cambio de un coste.
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
              className={`w-full text-left rounded-xl border p-3 transition-all active:scale-[0.99] ${
                active
                  ? 'border-[#C9A84C] bg-[#C9A84C]/10'
                  : 'border-[#1E2740] bg-[#141B2D]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : 'bg-[#0A0E1A] text-[#8B9BB4]'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className={`font-bold text-sm ${active ? 'text-[#C9A84C]' : 'text-[#F0E6D2]'}`}>{buff.name}</p>
                  <p className="text-[#8B9BB4] text-xs mt-0.5">{buff.description}</p>
                  <p className="text-[#E74C3C] text-[11px] mt-1 font-medium">Riesgo: {buff.risk}</p>
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
          className="w-full min-h-12 bg-gradient-to-r from-[#C9A84C] to-[#B8953E] text-[#0A0E1A] font-bold rounded-xl disabled:opacity-40"
        >
          APLICAR Y CONTINUAR
        </button>
      </div>
    </div>
  );
}
