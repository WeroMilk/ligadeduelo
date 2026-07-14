import { useGame } from '@/hooks/useGameState';
import { getUltimate } from '@/lib/ultimates';
import { champDef } from '@/lib/turn-engine';
import Minimap from '@/components/Minimap';
import type { CombatAction, LaneId } from '@/types/game';
import { Swords, Sparkles, Shield, Crosshair, Ghost } from 'lucide-react';

const ACTIONS: { id: CombatAction; label: string; hint: string }[] = [
  { id: 'attack', label: 'Atacar', hint: 'Daño físico' },
  { id: 'ability', label: 'Habilidad', hint: 'Daño mágico' },
  { id: 'defend', label: 'Defender', hint: 'Recibe ~40% del daño' },
];

const LANES: { id: LaneId; label: string }[] = [
  { id: 0, label: 'Top' },
  { id: 1, label: 'Mid' },
  { id: 2, label: 'Bot' },
];

export default function PlanPhase() {
  const { state, dispatch } = useGame();
  const tm = state.turnMatch;
  if (!tm) return null;

  const living = tm.blue.champions.filter(c => c.isAlive);
  const readyCount = living.filter(c => state.playerPlan.actions[c.instanceId]).length;
  const allAssigned = readyCount === living.length && living.length > 0;
  const jungle = living.find(c => champDef(c).role === 'jungle');
  const objLabel = tm.objective === 'baron' ? 'Barón' : tm.objective === 'dragon' ? 'Dragón' : null;

  return (
    <div className="flex-1 min-h-0 w-full bg-[#0A0E1A] flex flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[#1E2740] px-4 py-3 safe-top">
        <div className="max-w-lg mx-auto flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[#C9A84C] text-xs uppercase tracking-wider">Planificación</p>
                <h1 className="text-xl font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
                  Ronda {tm.round}/{tm.maxRounds}
                </h1>
              </div>
              <div className="text-right text-sm">
                <p className="text-[#3498DB] font-bold">{tm.blue.score} pts</p>
                <p className="text-[#E74C3C] font-bold">{tm.red.score} pts</p>
              </div>
            </div>
            <p className="mt-2 text-sm text-[#8B9BB4]">
              Elige si cada campeón ataca o defiende
              <span className={`ml-2 font-bold ${allAssigned ? 'text-[#2ECC71]' : 'text-[#C9A84C]'}`}>
                {readyCount}/{living.length} listos
              </span>
            </p>
            {objLabel && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#E67E22]/40 bg-[#E67E22]/10 px-3 py-2 text-xs text-[#E67E22]">
                <Ghost className="w-3.5 h-3.5" />
                Objetivo: <span className="font-bold">{objLabel}</span> — manda a la jungla a contestarlo
              </div>
            )}
            {state.ahriPeekAction && (
              <div className="mt-2 rounded-lg border border-[#9B59B6]/40 bg-[#9B59B6]/10 px-3 py-2 text-xs text-[#C39BD3]">
                Encanto de Ahri: el mid enemigo jugó{' '}
                <span className="font-bold uppercase">
                  {state.ahriPeekAction === 'attack' ? 'Atacar' : state.ahriPeekAction === 'defend' ? 'Defender' : 'Habilidad'}
                </span>
              </div>
            )}
          </div>
          <Minimap
            className="hidden sm:block"
            size={132}
            blueChampions={tm.blue.champions}
            redChampions={tm.red.champions}
            structures={tm.structures}
            objective={tm.objective}
            bluePlan={state.playerPlan}
            redPlan={state.enemyPlanPreview}
            showActions
          />
        </div>
      </div>

      {/* Mobile floating minimap */}
      <div className="sm:hidden fixed right-3 bottom-20 z-40 pointer-events-none safe-bottom">
        <Minimap
          size={112}
          blueChampions={tm.blue.champions}
          redChampions={tm.red.champions}
          structures={tm.structures}
          objective={tm.objective}
          bluePlan={state.playerPlan}
          showActions
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 max-w-lg mx-auto w-full space-y-3">
        {jungle && (
          <div className="rounded-xl border border-[#27AE60]/40 bg-[#141B2D] p-3">
            <p className="text-[#27AE60] text-xs font-bold uppercase mb-2">Jungla — ¿a dónde rotas?</p>
            <div className="flex flex-wrap gap-2">
              {LANES.map(l => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_JUNGLE_TARGET', target: l.id })}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border ${
                    state.playerPlan.jungleTarget === l.id
                      ? 'border-[#27AE60] bg-[#27AE60]/20 text-[#2ECC71]'
                      : 'border-[#2A3550] text-[#8B9BB4]'
                  }`}
                >
                  Ayudar {l.label}
                </button>
              ))}
              {objLabel && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SET_JUNGLE_TARGET', target: 'objective' })}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border ${
                    state.playerPlan.jungleTarget === 'objective'
                      ? 'border-[#E67E22] bg-[#E67E22]/20 text-[#E67E22]'
                      : 'border-[#2A3550] text-[#8B9BB4]'
                  }`}
                >
                  Ir al {objLabel}
                </button>
              )}
            </div>
          </div>
        )}

        {living.map(c => {
          const def = champDef(c);
          const ult = getUltimate(c.defId);
          const selected = state.playerPlan.actions[c.instanceId];
          const ultOn = state.playerPlan.ultimates.includes(c.instanceId);
          const hasBoots = c.items.some(i => i.defId === 'boots');

          return (
            <div
              key={c.instanceId}
              className={`rounded-xl border bg-[#141B2D] p-3 ${
                selected ? 'border-[#C9A84C]/50' : 'border-[#E74C3C]/35'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                {def.image ? (
                  <img src={def.image} alt={def.name} className="w-12 h-12 rounded-full border-2 border-[#3498DB] object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#2A3550]" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[#F0E6D2] truncate">{def.name}</p>
                    {!selected && (
                      <span className="shrink-0 text-[10px] font-bold uppercase text-[#E74C3C]">Sin elegir</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#8B9BB4]">
                    HP {Math.floor(c.stats.hp)}/{c.stats.maxHp} · Oro {c.gold}
                    {c.tearStacks > 0 ? ` · Lágrima ${c.tearStacks}/5` : ''}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-2">
                {ACTIONS.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => dispatch({ type: 'SET_PLAN_ACTION', instanceId: c.instanceId, action: a.id })}
                    className={`rounded-lg border px-2 py-2.5 text-center min-h-[72px] ${
                      selected === a.id
                        ? 'border-[#C9A84C] bg-[#C9A84C]/15 text-[#C9A84C]'
                        : 'border-[#2A3550] text-[#8B9BB4]'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      {a.id === 'attack' && <Swords className="w-4 h-4" />}
                      {a.id === 'ability' && <Sparkles className="w-4 h-4" />}
                      {a.id === 'defend' && <Shield className="w-4 h-4" />}
                    </div>
                    <p className="text-xs font-bold">{a.label}</p>
                    <p className="text-[9px] opacity-80 leading-tight mt-0.5">{a.hint}</p>
                  </button>
                ))}
              </div>

              {!c.ultimateUsed && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'TOGGLE_ULTIMATE', instanceId: c.instanceId })}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs mb-2 ${
                    ultOn ? 'border-[#9B59B6] bg-[#9B59B6]/15 text-[#C39BD3]' : 'border-[#2A3550] text-[#8B9BB4]'
                  }`}
                >
                  <span className="font-bold">ULT · {ult.name}</span>
                  <span className="block mt-0.5 opacity-90">{ult.description}</span>
                </button>
              )}

              {hasBoots && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Crosshair className="w-3.5 h-3.5 text-[#8B9BB4]" />
                  <span className="text-[10px] text-[#8B9BB4]">Botas →</span>
                  {LANES.map(l => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => dispatch({ type: 'SET_BOOTS_LANE', instanceId: c.instanceId, lane: l.id })}
                      className={`px-2 py-1 rounded text-[10px] font-bold border ${
                        state.playerPlan.bootsLane?.[c.instanceId] === l.id
                          ? 'border-[#C9A84C] text-[#C9A84C]'
                          : 'border-[#2A3550] text-[#8B9BB4]'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="shrink-0 px-4 py-3 safe-bottom max-w-lg mx-auto w-full">
        <button
          type="button"
          disabled={!allAssigned}
          onClick={() => dispatch({ type: 'CONFIRM_PLAN' })}
          className="w-full min-h-12 rounded-xl font-bold disabled:opacity-40"
          style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
        >
          {allAssigned ? 'REVELAR Y RESOLVER' : `ELIGE ACCIONES (${readyCount}/${living.length})`}
        </button>
      </div>
    </div>
  );
}
