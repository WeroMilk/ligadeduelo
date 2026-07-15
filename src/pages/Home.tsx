import { useState } from 'react';
import { useGame } from '@/hooks/useGameState';
import { FAN_ORGS, fanOrgDisplayName, type FanOrg } from '@/lib/game-data';
import { Swords, Sparkles, Check } from 'lucide-react';

export default function Home() {
  const { dispatch } = useGame();
  const [selected, setSelected] = useState<FanOrg | null>(null);

  const handleStart = () => {
    if (!selected) return;
    dispatch({ type: 'SET_TEAM_NAME', name: fanOrgDisplayName(selected) });
    dispatch({ type: 'SET_SCREEN', screen: 'championSelect' });
  };

  return (
    <div className="flex-1 min-h-0 w-full bg-[#0A0E1A] flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-8 pb-4 safe-top text-center">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#8B6914] flex items-center justify-center shadow-[0_0_40px_rgba(201,168,76,0.3)]">
            <Swords className="w-8 h-8 text-[#0A0E1A]" />
          </div>
          <h1
            className="text-3xl font-bold tracking-wider"
            style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#C9A84C' }}
          >
            LIGA DE DUELO
          </h1>
          <p className="text-sm tracking-[0.25em] uppercase" style={{ color: '#8B9BB4' }}>
            Elige tu org · el resto se simula
          </p>
          <div className="w-28 h-px bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />
          <p className="text-sm text-[#8B9BB4]">
            Apoya a un equipo legendario. Luego eliges 5 campeones y el torneo se resuelve solo.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-3 max-w-md mx-auto w-full">
        <div className="grid grid-cols-1 gap-2">
          {FAN_ORGS.map(org => {
            const active = selected?.id === org.id;
            return (
              <button
                key={org.id}
                type="button"
                onClick={() => setSelected(org)}
                className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all flex items-center gap-3 ${
                  active
                    ? 'border-[#C9A84C] bg-[#C9A84C]/10'
                    : 'border-[#1E2740] bg-[#141B2D] hover:border-[#2A3550]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#F0E6D2] truncate">{org.name}</p>
                  <p className="text-xs text-[#8B9BB4]">
                    {org.era} · {org.region}
                  </p>
                </div>
                {active && (
                  <span className="shrink-0 w-7 h-7 rounded-full bg-[#C9A84C] flex items-center justify-center">
                    <Check className="w-4 h-4 text-[#0A0E1A]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 px-4 py-3 safe-bottom max-w-md mx-auto w-full border-t border-[#1E2740]">
        <button
          type="button"
          onClick={handleStart}
          disabled={!selected}
          className="w-full font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
        >
          <Sparkles className="w-5 h-5" />
          ELEGIR CAMPEONES
        </button>
        <p className="text-[11px] text-center mt-2 text-[#8B9BB4]">
          16 equipos · combate 100% simulado
        </p>
      </div>
    </div>
  );
}
