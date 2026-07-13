import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '@/hooks/useGameState';
import { ITEMS } from '@/lib/game-data';
import { getChampionDef } from '@/lib/game-engine';
import { Swords, RefreshCw, User } from 'lucide-react';

export default function ItemSelect() {
  const { state, dispatch } = useGame();
  const [replaceMode, setReplaceMode] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const champ = state.pendingItemChampion;

  useEffect(() => {
    setReplaceMode(false);
    setSelectedItemId(null);
  }, [champ?.instanceId]);

  useEffect(() => {
    if (!champ) return;
    const scrollY = window.scrollY;
    const { style } = document.body;
    const prev = {
      overflow: style.overflow,
      position: style.position,
      top: style.top,
      width: style.width,
    };
    style.overflow = 'hidden';
    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.width = '100%';
    return () => {
      style.overflow = prev.overflow;
      style.position = prev.position;
      style.top = prev.top;
      style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [champ]);

  if (!champ) return null;

  const def = getChampionDef(champ.defId);
  const inventoryFull = champ.items.length >= 6;

  const handleSelectItem = (itemId: string) => {
    if (inventoryFull && !replaceMode) {
      setSelectedItemId(itemId);
      setReplaceMode(true);
      return;
    }

    dispatch({
      type: 'SELECT_ITEM',
      championInstanceId: champ.instanceId,
      itemDefId: itemId,
    });
  };

  const handleReplaceItem = (slotIndex: number) => {
    if (!selectedItemId) return;
    dispatch({
      type: 'SELECT_ITEM',
      championInstanceId: champ.instanceId,
      itemDefId: selectedItemId,
      replaceIndex: slotIndex,
    });
    setReplaceMode(false);
    setSelectedItemId(null);
  };

  const popup = (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 safe-top"
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-select-title"
      style={{ overscrollBehavior: 'none' }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#0A0E1A]/90 touch-none" />

      {/* Panel */}
      <div
        className="relative z-10 w-full sm:max-w-md max-h-[min(90dvh,720px)] overflow-y-auto overscroll-contain bg-[#141B2D] rounded-t-2xl sm:rounded-2xl border-2 border-[#C9A84C] border-b-0 sm:border-b-2 shadow-[0_0_40px_rgba(201,168,76,0.25)] p-4 sm:p-6 safe-bottom"
      >
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[#2A3550] sm:hidden" />
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#C9A84C]/20 mb-2 sm:mb-3">
            <Swords className="w-6 h-6 sm:w-7 sm:h-7 text-[#C9A84C]" />
          </div>
          <h2
            id="item-select-title"
            className="text-[#F0E6D2] font-bold text-lg sm:text-xl"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            {replaceMode ? 'Reemplazar Ítem' : 'Ronda de Objetos'}
          </h2>
          <p className="text-[#8B9BB4] text-xs sm:text-sm mt-1">
            {replaceMode
              ? `Selecciona qué ítem reemplazar en ${def.name}`
              : `Elige un ítem para ${def.name}${state.pendingItemTotal > 1 ? ` (${state.pendingItemIndex}/${state.pendingItemTotal})` : ''}`}
          </p>
        </div>

        {/* Champion info */}
        <div className="flex items-center gap-3 bg-[#0A0E1A] rounded-xl p-3 mb-4">
          {def.image ? (
            <img
              src={def.image}
              alt={def.name}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-[#C9A84C] object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-[#C9A84C] flex items-center justify-center font-bold text-white flex-shrink-0"
              style={{ backgroundColor: def.color }}
            >
              <User className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[#F0E6D2] font-bold truncate">{def.name}</p>
            <p className="text-[#8B9BB4] text-xs">{champ.items.length}/6 ítems</p>
          </div>
        </div>

        {/* Replace mode */}
        {replaceMode && (
          <div className="mb-4">
            <p className="text-[#8B9BB4] text-xs mb-2">Inventario actual — toca uno para reemplazar:</p>
            <div className="grid grid-cols-6 gap-2">
              {champ.items.map((item, i) => {
                const itemDef = ITEMS.find(it => it.id === item.defId);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleReplaceItem(i)}
                    className="min-h-11 min-w-11 aspect-square rounded-lg border-2 border-[#E74C3C] hover:border-[#C9A84C] bg-[#0A0E1A] overflow-hidden active:scale-95 transition-transform"
                  >
                    {itemDef && (
                      <img src={itemDef.image} alt={itemDef.name} className="w-full h-full object-cover" />
                    )}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => { setReplaceMode(false); setSelectedItemId(null); }}
              className="mt-3 min-h-11 w-full text-[#8B9BB4] text-sm flex items-center justify-center gap-2 hover:text-[#F0E6D2] transition-colors rounded-lg border border-[#2A3550]"
            >
              <RefreshCw className="w-4 h-4" />
              Volver a la lista
            </button>
          </div>
        )}

        {/* Item grid: 2 cols mobile, 4 cols desktop — misma altura */}
        {!replaceMode && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pb-2 items-stretch">
            {ITEMS.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectItem(item.id)}
                className="bg-[#0A0E1A] rounded-xl border-2 border-[#2A3550] hover:border-[#C9A84C] focus:border-[#C9A84C] focus:outline-none p-2.5 h-[124px] sm:h-[132px] flex flex-col items-center justify-start gap-1.5 active:scale-95 transition-all"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-lg overflow-hidden bg-[#141B2D]">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[#F0E6D2] text-[11px] font-bold text-center leading-tight h-8 w-full line-clamp-2 flex items-center justify-center">
                  {item.name}
                </span>
                <span className="text-[#8B9BB4] text-[10px] text-center h-4 w-full truncate leading-none">
                  {item.description}
                </span>
              </button>
            ))}
          </div>
        )}

        {selectedItemId && replaceMode && (
          <div className="mt-4 bg-[#0A0E1A] rounded-xl p-3 flex items-center gap-3">
            {(() => {
              const item = ITEMS.find(i => i.id === selectedItemId);
              return item ? (
                <>
                  <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                  <div>
                    <p className="text-[#C9A84C] font-bold text-sm">{item.name}</p>
                    <p className="text-[#8B9BB4] text-xs">{item.description}</p>
                  </div>
                </>
              ) : null;
            })()}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(popup, document.body);
}
