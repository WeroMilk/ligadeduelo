import { createPortal } from 'react-dom';
import { useGame } from '@/hooks/useGameState';
import { ITEMS } from '@/lib/game-data';
import { champDef } from '@/lib/turn-engine';

export default function ShopPhase() {
  const { state, dispatch } = useGame();
  const champ = state.shopQueue[0];
  const tm = state.turnMatch;
  if (!champ || !tm) return null;

  const def = champDef(champ);
  const live = tm.blue.champions.find(c => c.instanceId === champ.instanceId) || champ;

  const popup = (
    <div
      className="popup-center px-3 py-3 sm:p-4 safe-top safe-bottom"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-[#0A0E1A]/90" />
      <div className="relative z-10 w-full max-w-lg bg-[#141B2D] rounded-2xl border-2 border-[#C9A84C] shadow-[0_0_40px_rgba(201,168,76,0.25)] p-3 sm:p-4">
        <div className="flex items-center gap-3 mb-2">
          {def.image && (
            <img src={def.image} alt={def.name} className="w-11 h-11 rounded-full border-2 border-[#C9A84C] object-cover shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[#C9A84C] text-[10px] uppercase tracking-wider">Tienda · Ronda {tm.round}</p>
            <h2 className="text-base font-bold text-[#F0E6D2] truncate" style={{ fontFamily: 'Cinzel, serif' }}>
              {def.name}
            </h2>
            <p className="text-[#8B9BB4] text-xs">
              Oro <span className="text-[#C9A84C] font-bold">{live.gold}</span> · Ítems {live.items.length}/6
              {state.shopQueue.length > 1 ? ` · ${state.shopQueue.length} pendientes` : ''}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {ITEMS.map(item => {
            const afford = live.gold >= 80 && live.items.length < 6;
            return (
              <button
                key={item.id}
                type="button"
                disabled={!afford}
                onClick={() => dispatch({ type: 'BUY_ITEM', instanceId: live.instanceId, itemId: item.id })}
                className="bg-[#0A0E1A] rounded-lg border border-[#2A3550] hover:border-[#C9A84C] disabled:opacity-40 p-1.5 flex flex-col items-center gap-1 min-h-0"
              >
                <div className="w-8 h-8 rounded overflow-hidden bg-[#141B2D] shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <span className="text-[#F0E6D2] text-[9px] font-bold text-center leading-tight line-clamp-2 w-full">
                  {item.name}
                </span>
                <span className="text-[#C9A84C] text-[9px] font-bold">80</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => dispatch({ type: 'SKIP_SHOP_CHAMP' })}
          className="w-full min-h-10 rounded-xl border border-[#2A3550] text-[#8B9BB4] font-bold text-sm"
        >
          Saltar este campeón
        </button>
      </div>
    </div>
  );

  return createPortal(popup, document.body);
}
