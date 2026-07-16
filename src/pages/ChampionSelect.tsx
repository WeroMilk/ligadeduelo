import { useState, useEffect } from 'react';
import { useGame } from '@/hooks/useGameState';
import { ROLE_COLORS, ROLE_NAMES, CHAMPIONS } from '@/lib/game-data';
import { getUltimate } from '@/lib/ultimates';
import { preloadChampionImages } from '@/lib/preload-images';
import type { Role } from '@/types/game';
import { Shield, TreePine, Zap, Crosshair, Heart, Check, ChevronRight, User } from 'lucide-react';

const ROLE_ICONS: Record<Role, React.ReactNode> = {
  top: <Shield className="w-4 h-4" />,
  jungle: <TreePine className="w-4 h-4" />,
  mid: <Zap className="w-4 h-4" />,
  adc: <Crosshair className="w-4 h-4" />,
  support: <Heart className="w-4 h-4" />,
};

const ROLES: Role[] = ['top', 'jungle', 'mid', 'adc', 'support'];

export default function ChampionSelect() {
  const { state, dispatch } = useGame();
  const [activeRole, setActiveRole] = useState<Role>('top');
  const [error, setError] = useState('');

  useEffect(() => {
    preloadChampionImages();
  }, []);

  useEffect(() => {
    preloadChampionImages(CHAMPIONS.filter(c => c.role === activeRole).map(c => c.image));
  }, [activeRole]);

  const selectedIds = state.selectedChampions.map(c => c.defId);
  const selectedByRole = state.selectedChampions.reduce((acc, c) => {
    const def = CHAMPIONS.find(ch => ch.id === c.defId);
    if (def) acc[def.role] = c.defId;
    return acc;
  }, {} as Record<string, string>);

  const handleSelect = (defId: string) => {
    setError('');
    if (selectedIds.includes(defId)) {
      dispatch({ type: 'DESELECT_CHAMPION', defId });
      return;
    }
    const def = CHAMPIONS.find(c => c.id === defId);
    if (!def) return;

    const replacing = !!selectedByRole[def.role];
    dispatch({ type: 'SELECT_CHAMPION', defId });
    if (replacing) return;

    const start = ROLES.indexOf(def.role);
    const nextSelected = { ...selectedByRole, [def.role]: defId };
    for (let i = 1; i < ROLES.length; i++) {
      const nextRole = ROLES[(start + i) % ROLES.length];
      if (!nextSelected[nextRole]) {
        setActiveRole(nextRole);
        break;
      }
    }
  };

  const handleConfirm = () => {
    if (state.selectedChampions.length !== 5) {
      setError('Selecciona exactamente 5 campeones (1 por rol)');
      return;
    }
    dispatch({ type: 'CONFIRM_TEAM' });
  };

  const roleChampions = CHAMPIONS.filter(c => c.role === activeRole);
  const canConfirm = state.selectedChampions.length === 5 && state.selectedRoster.length === 5;
  const memberName = state.selectedRoster.find(r => r.role === activeRole)?.name;

  return (
    <div className="flex-1 min-h-0 w-full bg-[#0A0E1A] flex flex-col overflow-hidden">
      <div className="shrink-0 z-30 bg-[#0A0E1A] border-b border-[#1E2740] px-4 py-2.5 safe-top safe-chrome-x">
        <div className="flex items-center justify-between max-w-6xl mx-auto gap-2">
          <div className="min-w-0">
            <h2 className="text-[#F0E6D2] font-bold text-lg" style={{ fontFamily: 'Cinzel, serif' }}>
              Campeón por integrante
            </h2>
            <p className="text-xs text-[#C9A84C] truncate">
              {memberName || state.playerTeamName || 'Tu equipo'} · {state.selectedChampions.length}/5
            </p>
          </div>
          <span className={`text-sm font-bold shrink-0 ${canConfirm ? 'text-[#2ECC71]' : 'text-[#8B9BB4]'}`}>
            {state.selectedChampions.length}/5
          </span>
        </div>

        <div className="flex gap-2 mt-2 max-w-6xl mx-auto overflow-x-auto pb-1 scrollbar-hide touch-pan-x md:overflow-visible md:flex-wrap">
          {ROLES.map(role => {
            const isActive = activeRole === role;
            const isSelected = !!selectedByRole[role];
            const color = ROLE_COLORS[role];
            return (
              <button
                key={role}
                type="button"
                onClick={() => { setActiveRole(role); setError(''); }}
                className={`flex items-center gap-1.5 px-3 min-h-10 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive ? 'text-white shadow-lg' : 'text-[#8B9BB4] bg-[#141B2D] hover:bg-[#1E2740]'
                }`}
                style={isActive ? { backgroundColor: color, boxShadow: `0 2px 12px ${color}40` } : {}}
              >
                {ROLE_ICONS[role]}
                {ROLE_NAMES[role]}
                {isSelected && <Check className="w-3 h-3 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="shrink-0 max-w-6xl mx-auto px-4 mt-2 w-full">
          <p className="text-[#E74C3C] text-sm text-center bg-[#E74C3C]/10 rounded-lg py-2 px-3">{error}</p>
        </div>
      )}

      {/* Mobile: grid 2 cols; Desktop: fila arriba con scroll si no cabe */}
      <div className="flex-1 min-h-0 max-w-6xl mx-auto w-full px-4 py-2 overflow-y-auto md:pt-3">
        <div className="grid grid-cols-2 gap-2.5 pb-2 md:grid-cols-3 lg:grid-cols-6 md:gap-2 md:w-full md:content-start md:auto-rows-min">
          {roleChampions.map(champ => {
            const isSelected = selectedIds.includes(champ.id);
            const ult = getUltimate(champ.id);
            return (
              <button
                key={champ.id}
                type="button"
                onClick={() => handleSelect(champ.id)}
                className={`relative rounded-xl p-2.5 md:p-2 border-2 transition-all text-left active:scale-[0.98] ${
                  isSelected
                    ? 'border-[#C9A84C] bg-[#C9A84C]/10 shadow-[0_0_20px_rgba(201,168,76,0.15)]'
                    : 'border-[#1E2740] bg-[#141B2D] hover:border-[#2A3550] hover:bg-[#1A2035]'
                }`}
              >
                <div className="flex flex-col items-center gap-1 md:gap-1">
                  {champ.image ? (
                    <img
                      src={champ.image}
                      alt={champ.name}
                      width={56}
                      height={56}
                      loading={champ.role === activeRole ? 'eager' : 'lazy'}
                      decoding="async"
                      className={`w-14 h-14 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full object-cover border-2 shrink-0 ${
                        isSelected ? 'border-[#C9A84C]' : 'border-[#2A3550]'
                      }`}
                      onError={e => {
                        const el = e.currentTarget;
                        el.style.display = 'none';
                        el.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-14 h-14 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center text-lg font-bold text-white border-2 shrink-0 ${champ.image ? 'hidden' : ''}`}
                    style={{
                      backgroundColor: champ.color,
                      borderColor: isSelected ? '#C9A84C' : '#2A3550',
                    }}
                  >
                    {champ.initials}
                  </div>

                  <div className="text-center w-full">
                    <p className="text-[#F0E6D2] font-bold text-sm truncate leading-tight">{champ.name}</p>
                    <p className="text-[#8B9BB4] text-[10px] mb-1">{ROLE_NAMES[champ.role]}</p>
                    <div className="grid grid-cols-2 gap-x-1 gap-y-0 text-[10px] text-left px-0.5 leading-tight">
                      <span className="text-[#E74C3C]">HP {champ.baseStats.maxHp}</span>
                      <span className="text-[#3498DB]">MN {champ.baseStats.maxMana}</span>
                      <span className="text-[#E67E22]">AD {champ.baseStats.ad}</span>
                      <span className="text-[#9B59B6]">AP {champ.baseStats.ap}</span>
                      <span className="text-[#95A5A6]">ARM {champ.baseStats.armor}</span>
                      <span className="text-[#5DADE2]">MR {champ.baseStats.mr}</span>
                    </div>
                    <p className="text-[#C9A84C] text-[9px] md:text-[10px] mt-1 leading-snug px-0.5 line-clamp-2">
                      <span className="font-bold">{champ.passive.name}</span>
                      {' · '}
                      {champ.passive.description}
                    </p>
                    <p className="text-[#9B59B6] text-[9px] md:text-[10px] mt-0.5 leading-snug px-0.5 line-clamp-2 hidden sm:block">
                      <span className="font-bold">ULT {ult.name}</span>
                      {' · '}
                      {ult.description}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#C9A84C] flex items-center justify-center">
                    <Check className="w-3 h-3 text-[#0A0E1A]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 bg-[#0A0E1A] border-t border-[#1E2740] px-4 pt-2.5 pb-2">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:gap-4">
          <div className="flex justify-center md:justify-start gap-2 mb-2.5 md:mb-0 md:flex-1">
            {state.selectedChampions.map(c => {
              const def = CHAMPIONS.find(ch => ch.id === c.defId);
              if (!def) return null;
              return (
                <div key={c.defId} className="relative">
                  {def.image ? (
                    <img src={def.image} alt={def.name} className="w-10 h-10 rounded-full border-2 border-[#C9A84C] object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-[#C9A84C]" style={{ backgroundColor: def.color }}>
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}
            {Array.from({ length: 5 - state.selectedChampions.length }).map((_, i) => (
              <div key={`empty-${i}`} className="w-10 h-10 rounded-full border-2 border-dashed border-[#2A3550] bg-[#141B2D]" />
            ))}
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`w-full md:w-auto md:min-w-[240px] min-h-12 py-3.5 px-6 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
              canConfirm
                ? 'bg-gradient-to-r from-[#C9A84C] to-[#B8953E] text-[#0A0E1A] shadow-[0_4px_20px_rgba(201,168,76,0.3)] active:scale-[0.98]'
                : 'bg-[#1E2740] text-[#4A5570] cursor-not-allowed'
            }`}
          >
            CONFIRMAR EQUIPO
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
