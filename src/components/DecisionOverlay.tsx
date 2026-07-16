import { createPortal } from 'react-dom';
import { Ghost, TreePine } from 'lucide-react';
import type { Champion, LaneId } from '@/types/game';
import { CHAMPIONS, ROLE_NAMES } from '@/lib/game-data';
import { playDecideSound } from '@/lib/sounds';

export type DecisionKind = 'jungle' | 'assist';

export type DecisionPayload =
  | { kind: 'jungle'; target: LaneId | 'objective' }
  | { kind: 'assist'; champId: string };

type Props = {
  kind: DecisionKind;
  objectiveLabel?: string | null;
  allowObjective?: boolean;
  /** Campeones vivos (no jungla) para ayudar en el objetivo. */
  assistOptions?: Champion[];
  secondsLeft: number;
  onPick: (payload: DecisionPayload) => void;
};

export default function DecisionOverlay({
  kind,
  objectiveLabel,
  allowObjective = false,
  assistOptions = [],
  secondsLeft,
  onPick,
}: Props) {
  const pick = (payload: DecisionPayload) => {
    playDecideSound();
    onPick(payload);
  };

  const body = (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center px-3 pb-6 sm:pb-0 bg-black/55">
      <div className="w-full max-w-md rounded-2xl border-2 border-[#C9A84C] bg-[#141B2D] p-4 shadow-[0_0_40px_rgba(201,168,76,0.25)] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C]">Decisión de equipo</p>
          <span className="text-xs font-mono text-[#8B9BB4]">{secondsLeft}s</span>
        </div>

        {kind === 'jungle' && (
          <>
            <h2 className="text-lg font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
              Jungla: ¿gank u objetivo?
            </h2>
            <p className="text-xs text-[#8B9BB4]">
              Solo una opción: gankear una línea o ir al objetivo.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 0 as LaneId, label: 'Gank Superior' },
                { id: 1 as LaneId, label: 'Gank Central' },
                { id: 2 as LaneId, label: 'Gank Inferior' },
              ]).map(l => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => pick({ kind: 'jungle', target: l.id })}
                  className="min-h-11 rounded-xl border border-[#2A3550] bg-[#0A0E1A] font-bold text-[#F0E6D2] flex items-center justify-center gap-2"
                >
                  <TreePine className="w-4 h-4 text-[#27AE60]" />
                  {l.label}
                </button>
              ))}
              {allowObjective && (
                <button
                  type="button"
                  onClick={() => pick({ kind: 'jungle', target: 'objective' })}
                  className="min-h-11 rounded-xl border border-[#E67E22]/50 bg-[#E67E22]/15 font-bold text-[#F5B041] flex items-center justify-center gap-2 col-span-2 animate-obj-breathe"
                >
                  <Ghost className="w-4 h-4" />
                  Objetivo {objectiveLabel ? `· ${objectiveLabel}` : ''}
                </button>
              )}
            </div>
          </>
        )}

        {kind === 'assist' && (
          <>
            <h2 className="text-lg font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
              ¿Quién ayuda al {objectiveLabel || 'objetivo'}?
            </h2>
            <p className="text-xs text-[#8B9BB4]">
              Elige un campeón para ir con la jungla. Su línea queda más expuesta.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {assistOptions.map(c => {
                const def = CHAMPIONS.find(d => d.id === c.defId);
                if (!def) return null;
                return (
                  <button
                    key={c.instanceId}
                    type="button"
                    onClick={() => pick({ kind: 'assist', champId: c.instanceId })}
                    className="min-h-[4.5rem] rounded-xl border border-[#2A3550] bg-[#0A0E1A] px-2 py-2 flex items-center gap-2 text-left active:scale-[0.98]"
                  >
                    {def.image ? (
                      <img
                        src={def.image}
                        alt={def.name}
                        className="h-10 w-10 shrink-0 rounded-full object-cover border-2 border-[#C9A84C]/50"
                      />
                    ) : (
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#C9A84C]/50 text-xs font-bold text-white"
                        style={{ backgroundColor: def.color }}
                      >
                        {def.initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#F0E6D2] truncate">{def.name}</p>
                      <p className="text-[10px] text-[#8B9BB4]">{ROLE_NAMES[def.role]}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            {assistOptions.length === 0 && (
              <p className="text-center text-xs text-[#E74C3C]">No hay aliados vivos para ayudar.</p>
            )}
          </>
        )}
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
