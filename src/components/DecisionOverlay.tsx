import { Ghost, TreePine, Zap } from 'lucide-react';
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
  showTimer?: boolean;
  teamColor?: 'blue' | 'red';
  playerLabel?: string;
  onPick: (payload: DecisionPayload) => void;
  /** Coop: simular elección automática del turno. */
  onSimulateTurn?: () => void;
};

export default function DecisionOverlay({
  kind,
  objectiveLabel,
  allowObjective = false,
  assistOptions = [],
  secondsLeft,
  showTimer = true,
  teamColor,
  playerLabel,
  onPick,
  onSimulateTurn,
}: Props) {
  const pick = (payload: DecisionPayload) => {
    playDecideSound();
    onPick(payload);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-3 md:absolute md:p-2">
      <div className="w-full max-w-sm max-h-full md:max-h-[min(100%,28rem)] overflow-y-auto scrollbar-hide rounded-2xl border-2 border-[#C9A84C] bg-[#141B2D] p-3 shadow-[0_0_40px_rgba(201,168,76,0.25)] space-y-2 md:space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] md:text-[9px] font-bold uppercase tracking-wider text-[#C9A84C]">
            {playerLabel ? `Turno · ${playerLabel}` : 'Decisión de equipo'}
          </p>
          {showTimer ? (
            <span className="text-[11px] md:text-[10px] font-mono text-[#8B9BB4]">{secondsLeft}s</span>
          ) : (
            <span className="text-[10px] md:text-[9px] text-[#8B9BB4]">Sin límite</span>
          )}
        </div>
        {teamColor && (
          <p className={`text-[11px] md:text-[10px] font-bold ${teamColor === 'blue' ? 'text-[#3498DB]' : 'text-[#E74C3C]'}`}>
            Equipo {teamColor === 'blue' ? 'azul' : 'rojo'}
          </p>
        )}

        {kind === 'jungle' && (
          <>
            <h2 className="text-sm font-bold text-[#F0E6D2] leading-snug" style={{ fontFamily: 'Cinzel, serif' }}>
              Jungla: ¿gank u objetivo?
            </h2>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                { id: 0 as LaneId, label: 'Gank Sup.', labelMd: 'Gank Superior' },
                { id: 1 as LaneId, label: 'Gank Cen.', labelMd: 'Gank Central' },
                { id: 2 as LaneId, label: 'Gank Inf.', labelMd: 'Gank Inferior' },
              ]).map(l => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => pick({ kind: 'jungle', target: l.id })}
                  className="min-h-9 rounded-lg border border-[#2A3550] bg-[#0A0E1A] px-2 font-bold text-[#F0E6D2] flex items-center justify-center gap-1 text-[10px] md:text-xs"
                >
                  <TreePine className="w-3 h-3 text-[#27AE60] shrink-0" />
                  <span className="md:hidden">{l.label}</span>
                  <span className="hidden md:inline">{l.labelMd}</span>
                </button>
              ))}
              {allowObjective && (
                <button
                  type="button"
                  onClick={() => pick({ kind: 'jungle', target: 'objective' })}
                  className="min-h-9 rounded-lg border border-[#E67E22]/50 bg-[#E67E22]/15 px-2 font-bold text-[#F5B041] flex items-center justify-center gap-1 col-span-2 animate-obj-glow text-[10px]"
                >
                  <Ghost className="w-3 h-3 shrink-0" />
                  Objetivo{objectiveLabel ? ` · ${objectiveLabel}` : ''}
                </button>
              )}
            </div>
          </>
        )}

        {kind === 'assist' && (
          <>
            <h2 className="text-base md:text-sm font-bold text-[#F0E6D2] leading-snug" style={{ fontFamily: 'Cinzel, serif' }}>
              ¿Quién ayuda al {objectiveLabel || 'objetivo'}?
            </h2>
            <div className="flex flex-col gap-1.5 md:gap-1">
              {assistOptions.map(c => {
                const def = CHAMPIONS.find(d => d.id === c.defId);
                if (!def) return null;
                return (
                  <button
                    key={c.instanceId}
                    type="button"
                    onClick={() => pick({ kind: 'assist', champId: c.instanceId })}
                    className="min-h-11 md:min-h-9 rounded-lg border border-[#2A3550] bg-[#0A0E1A] px-2.5 py-1.5 md:px-2 md:py-1 flex items-center gap-2.5 md:gap-2 text-left"
                  >
                    {def.image ? (
                      <img
                        src={def.image}
                        alt={def.name}
                        className="h-9 w-9 md:h-7 md:w-7 shrink-0 rounded-full object-cover border border-[#C9A84C]/50"
                      />
                    ) : (
                      <div
                        className="flex h-9 w-9 md:h-7 md:w-7 shrink-0 items-center justify-center rounded-full border border-[#C9A84C]/50 text-[10px] md:text-[9px] font-bold text-white"
                        style={{ backgroundColor: def.color }}
                      >
                        {def.initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-[10px] font-bold leading-tight text-[#F0E6D2] whitespace-normal break-words">
                        {def.name}
                      </p>
                      <p className="text-[10px] md:text-[8px] text-[#8B9BB4] leading-none mt-0.5 md:mt-0">{ROLE_NAMES[def.role]}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            {assistOptions.length === 0 && (
              <p className="text-center text-[10px] text-[#E74C3C]">No hay aliados vivos para ayudar.</p>
            )}
          </>
        )}

        {onSimulateTurn && (
          <button
            type="button"
            onClick={() => {
              playDecideSound();
              onSimulateTurn();
            }}
            className="w-full min-h-8 rounded-lg border border-[#C9A84C]/40 bg-[#C9A84C]/10 text-[10px] font-bold text-[#C9A84C] flex items-center justify-center gap-1"
          >
            <Zap className="h-3 w-3" />
            Simular turno
          </button>
        )}
      </div>
    </div>
  );
}
