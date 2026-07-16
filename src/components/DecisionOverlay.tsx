import { createPortal } from 'react-dom';
import { Ghost, TreePine, Castle } from 'lucide-react';
import type { LaneId } from '@/types/game';

export type DecisionKind = 'jungle' | 'objective' | 'siege';

export type DecisionPayload =
  | { kind: 'jungle'; target: LaneId | 'objective' }
  | { kind: 'objective'; contest: boolean }
  | { kind: 'siege'; lane: LaneId };

type Props = {
  kind: DecisionKind;
  objectiveLabel?: string | null;
  secondsLeft: number;
  onPick: (payload: DecisionPayload) => void;
};

export default function DecisionOverlay({ kind, objectiveLabel, secondsLeft, onPick }: Props) {
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
              ¿Dónde gankea la jungla?
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 0 as LaneId, label: 'Top' },
                { id: 1 as LaneId, label: 'Mid' },
                { id: 2 as LaneId, label: 'Bot' },
              ]).map(l => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => onPick({ kind: 'jungle', target: l.id })}
                  className="min-h-11 rounded-xl border border-[#2A3550] bg-[#0A0E1A] font-bold text-[#F0E6D2] flex items-center justify-center gap-2"
                >
                  <TreePine className="w-4 h-4 text-[#27AE60]" />
                  {l.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onPick({ kind: 'jungle', target: 'objective' })}
                className="min-h-11 rounded-xl border border-[#E67E22]/50 bg-[#E67E22]/15 font-bold text-[#F5B041] flex items-center justify-center gap-2 col-span-2"
              >
                <Ghost className="w-4 h-4" />
                Objetivo {objectiveLabel ? `· ${objectiveLabel}` : ''}
              </button>
            </div>
          </>
        )}

        {kind === 'objective' && (
          <>
            <h2 className="text-lg font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
              ¿Atacáis el {objectiveLabel || 'objetivo'}?
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onPick({ kind: 'objective', contest: true })}
                className="min-h-12 rounded-xl font-bold bg-[#C9A84C] text-[#0A0E1A]"
              >
                Sí, pelear
              </button>
              <button
                type="button"
                onClick={() => onPick({ kind: 'objective', contest: false })}
                className="min-h-12 rounded-xl font-bold border border-[#2A3550] text-[#8B9BB4]"
              >
                No, farm
              </button>
            </div>
          </>
        )}

        {kind === 'siege' && (
          <>
            <h2 className="text-lg font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
              ¿Priorizar qué torre?
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {([0, 1, 2] as LaneId[]).map(lane => (
                <button
                  key={lane}
                  type="button"
                  onClick={() => onPick({ kind: 'siege', lane })}
                  className="min-h-11 rounded-xl border border-[#2A3550] bg-[#0A0E1A] font-bold text-[#F0E6D2] flex flex-col items-center justify-center gap-1 text-xs"
                >
                  <Castle className="w-4 h-4 text-[#3498DB]" />
                  {lane === 0 ? 'Top' : lane === 1 ? 'Mid' : 'Bot'}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
