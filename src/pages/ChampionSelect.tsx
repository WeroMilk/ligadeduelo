import { useState, useEffect, useRef } from 'react';
import { useGame } from '@/hooks/useGameState';
import CoopSetupBanner from '@/components/CoopSetupBanner';
import { ROLE_COLORS, ROLE_NAMES, CHAMPIONS, MANA_COSTS_UI } from '@/lib/game-data';
import { getUltimate } from '@/lib/ultimates';
import { preloadChampionImages } from '@/lib/preload-images';
import { synergyBadgeStyle, synergyForMember } from '@/lib/player-synergy';
import type { Role } from '@/types/game';
import { Shield, TreePine, Zap, Crosshair, Heart, Check, ChevronRight, User } from 'lucide-react';
import NameSearch, { matchesNameQuery } from '@/components/NameSearch';

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
  const [searchQuery, setSearchQuery] = useState('');
  const roleTabsRef = useRef<HTMLDivElement>(null);
  const roleTabRefs = useRef<Partial<Record<Role, HTMLButtonElement | null>>>({});

  useEffect(() => {
    preloadChampionImages();
  }, []);

  useEffect(() => {
    preloadChampionImages(CHAMPIONS.filter(c => c.role === activeRole).map(c => c.image));
  }, [activeRole]);

  // Al cambiar de pestaña (manual o tras elegir campeón), desplaza la lista horizontal
  useEffect(() => {
    const tab = roleTabRefs.current[activeRole];
    const scroller = roleTabsRef.current;
    if (!tab || !scroller) return;
    const target = tab.offsetLeft - (scroller.clientWidth - tab.offsetWidth) / 2;
    scroller.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
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

  const roleChampions = CHAMPIONS.filter(
    c => c.role === activeRole && matchesNameQuery(c.name, searchQuery),
  );
  const canConfirm = state.selectedChampions.length === 5 && state.selectedRoster.length === 5;
  const activeMember = state.selectedRoster.find(r => r.role === activeRole);
  const memberName = activeMember?.name;

  return (
    <div className="flex-1 min-h-0 w-full bg-[#0A0E1A] flex flex-col overflow-hidden">
      <CoopSetupBanner />
      <div className="relative shrink-0 z-30 border-b border-[#1E2740] bg-[#0A0E1A] px-4 pb-1.5 pt-0 select-screen-top safe-chrome-x md:py-2.5">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-[#F0E6D2] md:text-lg" style={{ fontFamily: 'Cinzel, serif' }}>
              Campeón por integrante
            </h2>
            <p className="truncate text-[11px] text-[#C9A84C] md:text-xs">
              {memberName || state.playerTeamName || 'Tu equipo'} · {state.selectedChampions.length}/5
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-[#8B9BB4] md:text-[11px]">
              % = qué tanto el integrante del equipo sabe usar a cada campeón
            </p>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <NameSearch
              pinned
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar campeón..."
            />
            <span className={`pt-0.5 text-sm font-bold ${canConfirm ? 'text-[#2ECC71]' : 'text-[#8B9BB4]'}`}>
              {state.selectedChampions.length}/5
            </span>
          </div>
        </div>

        <div
          ref={roleTabsRef}
          className="mx-auto mt-1.5 flex max-w-6xl gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide touch-pan-x md:mt-2 md:gap-2 md:overflow-x-auto md:flex-nowrap md:pb-1"
        >
          {ROLES.map(role => {
            const isActive = activeRole === role;
            const isSelected = !!selectedByRole[role];
            const color = ROLE_COLORS[role];
            return (
              <button
                key={role}
                type="button"
                ref={el => {
                  roleTabRefs.current[role] = el;
                }}
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
        <div className="mx-auto mt-1 w-full max-w-6xl shrink-0 px-4 md:mt-2">
          <p className="rounded-lg bg-[#E74C3C]/10 px-3 py-1.5 text-center text-sm text-[#E74C3C]">{error}</p>
        </div>
      )}

      <div className="mx-auto mt-1 w-full max-w-6xl shrink-0 px-4 md:mt-1.5">
        <p className="rounded-lg border border-[#1E2740] bg-[#141B2D]/80 px-3 py-1.5 text-center text-[10px] md:text-[11px] text-[#8B9BB4]">
          Maná: Atacar {MANA_COSTS_UI.attack} · Habilidad {MANA_COSTS_UI.ability} · Defender {MANA_COSTS_UI.defend}
          {' · '}Definitiva -{MANA_COSTS_UI.ultimateCost}
          {' · '}CD {MANA_COSTS_UI.ultimateCooldown} turnos
          {' · '}Sin maná = vuelve a base
        </p>
      </div>

      <div className="mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-y-auto px-4 py-1 scrollbar-hide md:pt-3">
        <div className="grid auto-rows-min grid-cols-2 content-start gap-2 pb-1 md:grid-cols-3 md:gap-2 lg:grid-cols-6 md:w-full md:pb-2">
          {roleChampions.length === 0 ? (
            <p className="col-span-full pt-10 text-center text-sm text-[#8B9BB4]">
              Ningún campeón coincide con la búsqueda.
            </p>
          ) : roleChampions.map(champ => {
            const isSelected = selectedIds.includes(champ.id);
            const ult = getUltimate(champ.id);
            const syn = synergyForMember(activeMember, champ.id);
            const badge = syn ? synergyBadgeStyle(syn.affinity) : null;
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
                {badge && (
                  <span
                    className={`absolute top-1.5 left-1.5 z-10 rounded-full border px-1.5 py-0.5 text-[9px] font-bold leading-none ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                )}
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
                    <p className="text-[#8B9BB4] text-[10px] mb-0.5">{ROLE_NAMES[champ.role]}</p>
                    {syn && activeMember && (
                      <p className="text-[9px] text-[#C9A84C] mb-1 truncate leading-tight">
                        {activeMember.name} · {syn.affinity}%
                      </p>
                    )}
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
                      <span className="text-[#8B9BB4]"> · CD {MANA_COSTS_UI.ultimateCooldown}</span>
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

      <div className="shrink-0 border-t border-[#1E2740] bg-[#0A0E1A] px-3 py-1.5 md:px-4 md:pt-2.5 md:pb-2">
        <div className="mx-auto flex max-w-6xl items-center gap-2 md:gap-4">
          <div className="flex min-w-0 flex-1 items-center justify-start gap-1 overflow-x-auto scrollbar-hide md:gap-2">
            {state.selectedChampions.map(c => {
              const def = CHAMPIONS.find(ch => ch.id === c.defId);
              if (!def) return null;
              return (
                <div key={c.defId} className="relative shrink-0">
                  {def.image ? (
                    <img src={def.image} alt={def.name} className="h-8 w-8 rounded-full border-2 border-[#C9A84C] object-cover md:h-10 md:w-10" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#C9A84C] text-xs font-bold text-white md:h-10 md:w-10" style={{ backgroundColor: def.color }}>
                      <User className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </div>
                  )}
                </div>
              );
            })}
            {Array.from({ length: 5 - state.selectedChampions.length }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8 w-8 shrink-0 rounded-full border-2 border-dashed border-[#2A3550] bg-[#141B2D] md:h-10 md:w-10" />
            ))}
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all md:min-h-11 md:min-w-[140px] md:rounded-xl md:px-5 md:py-2.5 md:text-sm flex items-center justify-center gap-1 md:gap-1.5 ${
              canConfirm
                ? 'bg-gradient-to-r from-[#C9A84C] to-[#B8953E] text-[#0A0E1A] shadow-[0_4px_16px_rgba(201,168,76,0.28)] active:scale-[0.98]'
                : 'bg-[#1E2740] text-[#4A5570] cursor-not-allowed'
            }`}
          >
            ENTRAR
            <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
