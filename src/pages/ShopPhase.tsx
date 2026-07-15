import { createPortal } from 'react-dom';
import { useGame } from '@/hooks/useGameState';
import { ITEMS } from '@/lib/game-data';
import { champDef } from '@/lib/turn-engine';
import type { Stats } from '@/types/game';

const STAT_ROWS: { key: keyof Stats; label: string; max: number }[] = [
  { key: 'ad', label: 'ATQ', max: 20 },
  { key: 'ap', label: 'MAG', max: 20 },
  { key: 'maxHp', label: 'VIDA', max: 150 },
  { key: 'attackSpeed', label: 'VEL.ATQ', max: 0.25 },
  { key: 'moveSpeed', label: 'VEL', max: 25 },
  { key: 'armor', label: 'ARM', max: 20 },
  { key: 'mr', label: 'MR', max: 20 },
  { key: 'maxMana', label: 'MANÁ', max: 120 },
];

function ItemStatBars({ bonus }: { bonus: Partial<Stats> }) {
  const rows = STAT_ROWS.filter(r => (bonus[r.key] ?? 0) > 0);
  if (rows.length === 0) return null;
  return (
    <div className="w-full space-y-0.5 mt-0.5">
      {rows.map(r => {
        const val = Number(bonus[r.key] ?? 0);
        const pct = Math.min(100, (val / r.max) * 100);
        return (
          <div key={r.key} className="flex items-center gap-0.5">
            <span className="text-[7px] text-[#8B9BB4] w-7 shrink-0 leading-none">{r.label}</span>
            <div className="flex-1 h-1 rounded-full bg-[#0A0E1A] overflow-hidden">
              <div className="h-full rounded-full bg-[#C9A84C]" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
            const afford = live.gold >= item.cost && live.items.length < 6;
            return (
              <button
                key={item.id}
                type="button"
                disabled={!afford}
                onClick={() => dispatch({ type: 'BUY_ITEM', instanceId: live.instanceId, itemId: item.id })}
                className="bg-[#0A0E1A] rounded-lg border border-[#2A3550] hover:border-[#C9A84C] disabled:opacity-40 p-1.5 flex flex-col items-center gap-0.5 min-h-0"
              >
                <div className="w-8 h-8 rounded overflow-hidden bg-[#141B2D] shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <span className="text-[#F0E6D2] text-[9px] font-bold text-center leading-tight line-clamp-2 w-full">
                  {item.name}
                </span>
                <span className="text-[#C9A84C] text-[9px] font-bold">{item.cost} oro</span>
                <ItemStatBars bonus={item.statBonus} />
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
