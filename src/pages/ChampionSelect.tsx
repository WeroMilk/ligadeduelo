import { useState } from 'react';
import { useGame } from '@/hooks/useGameState';
import { CHAMPIONS, ROLE_COLORS, ROLE_NAMES } from '@/lib/game-data';
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
    } else {
      if (state.selectedChampions.length >= 5) {
        setError('Ya has seleccionado 5 campeones');
        return;
      }
      dispatch({ type: 'SELECT_CHAMPION', defId });
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
    <div className="min-h-screen bg-[#0A0E1A] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0A0E1A]/95 backdrop-blur-sm border-b border-[#1E2740] px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h2 className="text-[#F0E6D2] font-bold text-lg" style={{ fontFamily: 'Cinzel, serif' }}>
            Selecciona tu Equipo
          </h2>
          <span className={`text-sm font-bold ${canConfirm ? 'text-[#2ECC71]' : 'text-[#8B9BB4]'}`}>
            {state.selectedChampions.length}/5
          </span>
        </div>

        {/* Role Tabs */}
        <div className="flex gap-2 mt-3 max-w-lg mx-auto overflow-x-auto pb-1 scrollbar-hide">
          {ROLES.map(role => {
            const isActive = activeRole === role;
            const isSelected = !!selectedByRole[role];
            const color = ROLE_COLORS[role];
            return (
              <button
                key={role}
                onClick={() => { setActiveRole(role); setError(''); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
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
        <div className="max-w-lg mx-auto px-4 mt-3">
          <p className="text-[#E74C3C] text-sm text-center bg-[#E74C3C]/10 rounded-lg py-2 px-3">
            {error}
          </p>
        </div>
      )}

      {/* Champion Grid */}
      <div className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        <div className="grid grid-cols-2 gap-3">
          {roleChampions.map(champ => {
            const isSelected = selectedIds.includes(champ.id);
            return (
              <button
                key={champ.id}
                onClick={() => handleSelect(champ.id)}
                className={`relative rounded-xl p-3 border-2 transition-all text-left ${
                  isSelected
                    ? 'border-[#C9A84C] bg-[#C9A84C]/10 shadow-[0_0_20px_rgba(201,168,76,0.15)]'
                    : 'border-[#1E2740] bg-[#141B2D] hover:border-[#2A3550] hover:bg-[#1A2035]'
                }`}
              >
                {/* Avatar */}
                <div className="flex flex-col items-center gap-2">
                  {champ.image ? (
                    <img
                      src={champ.image}
                      alt={champ.name}
                      className={`w-16 h-16 rounded-full object-cover border-2 ${
                        isSelected ? 'border-[#C9A84C]' : 'border-[#2A3550]'
                      }`}
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold text-white border-2"
                      style={{
                        backgroundColor: champ.color,
                        borderColor: isSelected ? '#C9A84C' : '#2A3550',
                      }}
                    >
                      {champ.initials}
                    </div>
                  )}

                  <div className="text-center">
                    <p className="text-[#F0E6D2] font-bold text-sm">{champ.name}</p>
                    <p className="text-[#8B9BB4] text-xs">{ROLE_NAMES[champ.role]}</p>
                  </div>
                </div>

                {/* Selected checkmark */}
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

      {/* Footer with selected champions */}
      <div className="sticky bottom-0 bg-[#0A0E1A]/95 backdrop-blur-sm border-t border-[#1E2740] px-4 py-4">
        <div className="max-w-lg mx-auto">
          {/* Selected avatars row */}
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
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
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
