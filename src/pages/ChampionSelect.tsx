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

  // Prefetch visible role first, then the rest
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
    // Tocár el mismo campeón = quitarlo
    if (selectedIds.includes(defId)) {
      dispatch({ type: 'DESELECT_CHAMPION', defId });
      return;
    }
    const def = CHAMPIONS.find(c => c.id === defId);
    if (!def) return;

    const replacing = !!selectedByRole[def.role];
    dispatch({ type: 'SELECT_CHAMPION', defId });

    // Solo avanzar de rol si era una selección nueva (no un cambio)
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
  const canConfirm = state.selectedChampions.length === 5;

  return (
    <div className="flex-1 min-h-0 w-full bg-[#0A0E1A] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 z-30 bg-[#0A0E1A] border-b border-[#1E2740] px-4 py-3 safe-top">
        <div className="flex items-center justify-between max-w-lg mx-auto gap-2">
          <div className="min-w-0">
            <h2 className="text-[#F0E6D2] font-bold text-lg" style={{ fontFamily: 'Cinzel, serif' }}>
              5 campeones
            </h2>
            <p className="text-xs text-[#C9A84C] truncate">{state.playerTeamName || 'Tu org'}</p>
          </div>
          <span className={`text-sm font-bold shrink-0 ${canConfirm ? 'text-[#2ECC71]' : 'text-[#8B9BB4]'}`}>
            {state.selectedChampions.length}/5
          </span>
        </div>

        {/* Role Tabs */}
        <div className="flex gap-2 mt-3 max-w-lg mx-auto overflow-x-auto pb-1 scrollbar-hide touch-pan-x">
          {ROLES.map(role => {
            const isActive = activeRole === role;
            const isSelected = !!selectedByRole[role];
            const color = ROLE_COLORS[role];
            return (
              <button
                key={role}
                type="button"
                onClick={() => { setActiveRole(role); setError(''); }}
                className={`flex items-center gap-1.5 px-3 min-h-11 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive
                    ? 'text-white shadow-lg'
                    : 'text-[#8B9BB4] bg-[#141B2D] hover:bg-[#1E2740]'
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

      {/* Error */}
      {error && (
        <div className="shrink-0 max-w-lg mx-auto px-4 mt-2 w-full">
          <p className="text-[#E74C3C] text-sm text-center bg-[#E74C3C]/10 rounded-lg py-2 px-3">
            {error}
          </p>
        </div>
      )}

      {/* Champion Grid (scrollable) */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 max-w-lg mx-auto w-full">
        <div className="grid grid-cols-2 gap-2.5 pb-2">
          {roleChampions.map(champ => {
            const isSelected = selectedIds.includes(champ.id);
            return (
              <button
                key={champ.id}
                type="button"
                onClick={() => handleSelect(champ.id)}
                className={`relative rounded-xl p-2.5 border-2 transition-all text-left active:scale-[0.98] ${
                  isSelected
                    ? 'border-[#C9A84C] bg-[#C9A84C]/10 shadow-[0_0_20px_rgba(201,168,76,0.15)]'
                    : 'border-[#1E2740] bg-[#141B2D] hover:border-[#2A3550] hover:bg-[#1A2035]'
                }`}
              >
                <div className="flex flex-col items-center gap-1.5">
                  {champ.image ? (
                    <img
                      src={champ.image}
                      alt={champ.name}
                      width={56}
                      height={56}
                      loading={champ.role === activeRole ? 'eager' : 'lazy'}
                      decoding="async"
                      className={`w-14 h-14 rounded-full object-cover border-2 ${
                        isSelected ? 'border-[#C9A84C]' : 'border-[#2A3550]'
                      }`}
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white border-2"
                      style={{
                        backgroundColor: champ.color,
                        borderColor: isSelected ? '#C9A84C' : '#2A3550',
                      }}
                    >
                      {champ.initials}
                    </div>
                  )}

                  <div className="text-center w-full">
                    <p className="text-[#F0E6D2] font-bold text-sm truncate">{champ.name}</p>
                    <p className="text-[#8B9BB4] text-[11px] mb-1.5">{ROLE_NAMES[champ.role]}</p>
                    <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5 text-[10px] sm:text-[11px] text-left px-0.5">
                      <span className="text-[#E74C3C]">HP {champ.baseStats.maxHp}</span>
                      <span className="text-[#3498DB]">MN {champ.baseStats.maxMana}</span>
                      <span className="text-[#E67E22]">AD {champ.baseStats.ad}</span>
                      <span className="text-[#9B59B6]">AP {champ.baseStats.ap}</span>
                      <span className="text-[#95A5A6]">ARM {champ.baseStats.armor}</span>
                      <span className="text-[#5DADE2]">MR {champ.baseStats.mr}</span>
                    </div>
                    <p className="text-[#C9A84C] text-[10px] mt-1.5 leading-snug px-0.5 line-clamp-2">
                      <span className="font-bold">{champ.passive.name}</span>
                      {' · '}
                      {champ.passive.description}
                    </p>
                    <p className="text-[#9B59B6] text-[10px] mt-1 leading-snug px-0.5 line-clamp-2">
                      <span className="font-bold">ULT {getUltimate(champ.id).name}</span>
                      {' · '}
                      {getUltimate(champ.id).description}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#C9A84C] flex items-center justify-center">
                    <Check className="w-4 h-4 text-[#0A0E1A]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer fijo */}
      <div className="shrink-0 bg-[#0A0E1A] border-t border-[#1E2740] px-4 pt-3 safe-bottom">
        <div className="max-w-lg mx-auto pb-3">
          <div className="flex justify-center gap-2 mb-3">
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
            className={`w-full min-h-12 py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
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
