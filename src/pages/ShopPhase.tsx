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
      className="popup-center px-4 py-8 sm:p-8 safe-top safe-bottom"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-[#0A0E1A]/90" />
      <div className="relative z-10 my-auto w-full max-w-md max-h-[min(80svh,680px)] overflow-y-auto bg-[#141B2D] rounded-2xl border-2 border-[#C9A84C] shadow-[0_0_40px_rgba(201,168,76,0.25)] p-4 sm:p-6">
        <p className="text-[#C9A84C] text-xs uppercase tracking-wider text-center">Tienda · Ronda {tm.round - 1}</p>
        <h2 className="text-center text-xl font-bold text-[#F0E6D2] mt-1" style={{ fontFamily: 'Cinzel, serif' }}>
          Compra para {def.name}
        </h2>
        <p className="text-center text-[#8B9BB4] text-sm mt-1">
          Oro: <span className="text-[#C9A84C] font-bold">{live.gold}</span> · Ítems {live.items.length}/6
          {state.shopQueue.length > 1 ? ` · ${state.shopQueue.length} pendientes` : ''}
        </p>

        <div className="flex justify-center my-3">
          {def.image && (
            <img src={def.image} alt={def.name} className="w-16 h-16 rounded-full border-2 border-[#C9A84C] object-cover" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 items-stretch mb-3">
          {ITEMS.map(item => {
            const afford = live.gold >= 80 && live.items.length < 6;
            return (
              <button
                key={item.id}
                type="button"
                disabled={!afford}
                onClick={() => dispatch({ type: 'BUY_ITEM', instanceId: live.instanceId, itemId: item.id })}
                className="bg-[#0A0E1A] rounded-xl border-2 border-[#2A3550] hover:border-[#C9A84C] disabled:opacity-40 p-2.5 h-[124px] flex flex-col items-center gap-1.5"
              >
                <div className="w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-[#141B2D]">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <span className="text-[#F0E6D2] text-[11px] font-bold text-center leading-tight h-8 w-full line-clamp-2 flex items-center justify-center">
                  {item.name}
                </span>
                <span className="text-[#8B9BB4] text-[10px] text-center h-8 w-full line-clamp-2 leading-tight">
                  {item.description}
                </span>
                <span className="text-[#C9A84C] text-[10px] font-bold">80 oro</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => dispatch({ type: 'SKIP_SHOP_CHAMP' })}
          className="w-full min-h-11 rounded-xl border border-[#2A3550] text-[#8B9BB4] font-bold"
        >
          Saltar este campeón
        </button>
      </div>
    </div>
  );

  return createPortal(popup, document.body);
}
