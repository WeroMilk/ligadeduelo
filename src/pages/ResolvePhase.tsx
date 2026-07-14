import { useGame } from '@/hooks/useGameState';
import { actionLabelEs, champDef } from '@/lib/turn-engine';
import Minimap from '@/components/Minimap';
import type { CombatAction, DuelFighterSummary, DuelSummary, LaneId } from '@/types/game';
import { Swords, Sparkles, Shield, Castle, Ghost } from 'lucide-react';

const LANE_NAMES: Record<LaneId, string> = { 0: 'Top', 1: 'Mid', 2: 'Bot' };

function ActionIcon({ action }: { action: CombatAction }) {
  if (action === 'attack') return <Swords className="w-3.5 h-3.5" />;
  if (action === 'ability') return <Sparkles className="w-3.5 h-3.5" />;
  return <Shield className="w-3.5 h-3.5" />;
}

function HpBar({ fighter, team }: { fighter: DuelFighterSummary; team: 'blue' | 'red' }) {
  const pct = Math.max(0, Math.min(100, (fighter.hpAfter / fighter.maxHp) * 100));
  const fill = team === 'blue' ? 'bg-[#3498DB]' : 'bg-[#E74C3C]';
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] text-[#8B9BB4] mb-0.5">
        <span>{fighter.isAlive ? `${fighter.hpAfter}/${fighter.maxHp}` : 'KO'}</span>
        {fighter.hpBefore !== fighter.hpAfter && (
          <span className="text-[#E74C3C]">-{Math.max(0, fighter.hpBefore - fighter.hpAfter)}</span>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-[#0A0E1A] overflow-hidden">
        <div className={`h-full rounded-full transition-all ${fighter.isAlive ? fill : 'bg-[#5D6D7E]'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function FighterCard({ fighter, team }: { fighter: DuelFighterSummary; team: 'blue' | 'red' }) {
  const border = team === 'blue' ? 'border-[#3498DB]/40' : 'border-[#E74C3C]/40';
  return (
    <div className={`flex-1 min-w-0 rounded-lg border ${border} bg-[#0A0E1A]/60 p-2 ${!fighter.isAlive ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        {fighter.image ? (
          <img src={fighter.image} alt={fighter.name} className="w-10 h-10 rounded-full object-cover border border-[#2A3550]" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#2A3550]" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[#F0E6D2] text-xs truncate">{fighter.name}</p>
          <p className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase ${
            fighter.action === 'defend' ? 'text-[#2ECC71]' : 'text-[#C9A84C]'
          }`}>
            <ActionIcon action={fighter.action} />
            {actionLabelEs(fighter.action)}
            {fighter.usedUlt && <span className="text-[#C39BD3]">· ULT</span>}
          </p>
        </div>
      </div>
      <HpBar fighter={fighter} team={team} />
      {fighter.damageDealt > 0 && (
        <p className="text-[10px] text-[#8B9BB4] mt-1">Infligió {fighter.damageDealt}</p>
      )}
    </div>
  );
}

function DuelCard({ duel }: { duel: DuelSummary }) {
  return (
    <div className="rounded-xl border border-[#1E2740] bg-[#141B2D] p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B9BB4]">
          {duel.kind === 'siege' ? (
            <span className="inline-flex items-center gap-1 text-[#3498DB]"><Castle className="w-3 h-3" /> Asedio {LANE_NAMES[duel.lane]}</span>
          ) : (
            <>Línea {LANE_NAMES[duel.lane]}</>
          )}
        </p>
        {!duel.blue?.isAlive && duel.kind === 'duel' && <span className="text-[10px] font-bold text-[#E74C3C]">Aliado KO</span>}
        {!duel.red?.isAlive && duel.kind === 'duel' && duel.blue?.isAlive && <span className="text-[10px] font-bold text-[#2ECC71]">Enemigo KO</span>}
      </div>
      <div className="flex items-stretch gap-2">
        {duel.blue ? <FighterCard fighter={duel.blue} team="blue" /> : <div className="flex-1" />}
        {duel.kind === 'duel' && <div className="shrink-0 self-center text-[10px] font-bold text-[#5D6D7E]">VS</div>}
        {duel.red ? <FighterCard fighter={duel.red} team="red" /> : <div className="flex-1" />}
      </div>
      <p className="text-xs text-[#C9A84C] leading-snug">{duel.summary}</p>
    </div>
  );
}

export default function ResolvePhase() {
  const { state, dispatch } = useGame();
  const tm = state.turnMatch;
  const res = tm?.lastResolution;
  if (!tm || !res) return null;

  const duels = res.duels ?? [];
  const objName = res.objective === 'baron' ? 'Barón' : res.objective === 'dragon' ? 'Dragón' : null;
  const objWinnerName = res.objectiveWinner === 'blue' ? tm.blue.name : res.objectiveWinner === 'red' ? tm.red.name : null;

  return (
    <div className="flex-1 min-h-0 w-full bg-[#0A0E1A] flex flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[#1E2740] px-4 py-3 safe-top">
        <div className="max-w-lg mx-auto flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[#C9A84C] text-xs uppercase tracking-wider">Resolución</p>
            <h1 className="text-xl font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
              Ronda {res.round} revelada
            </h1>
            <div className="flex justify-between mt-2 text-sm font-bold">
              <span className="text-[#3498DB]">{tm.blue.name}: {tm.blue.score} (+{res.blueScoreDelta})</span>
              <span className="text-[#E74C3C]">{tm.red.name}: {tm.red.score} (+{res.redScoreDelta})</span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="rounded-lg border border-[#1E2740] bg-[#141B2D] px-2 py-1.5">
                <p className="text-[#8B9BB4]">Kills</p>
                <p className="font-bold text-[#F0E6D2]">{res.blueKillsDelta ?? 0} – {res.redKillsDelta ?? 0}</p>
              </div>
              <div className="rounded-lg border border-[#1E2740] bg-[#141B2D] px-2 py-1.5">
                <p className="text-[#8B9BB4]">Torres</p>
                <p className="font-bold text-[#F0E6D2]">{res.towersTakenBlue ?? 0} – {res.towersTakenRed ?? 0}</p>
              </div>
              <div className="rounded-lg border border-[#1E2740] bg-[#141B2D] px-2 py-1.5">
                <p className="text-[#8B9BB4]">Objetivo</p>
                <p className="font-bold text-[#F0E6D2] truncate">
                  {objName && objWinnerName ? `${objName}: ${objWinnerName}` : objName ? 'Sin pelea' : '—'}
                </p>
              </div>
            </div>
          </div>
          <Minimap
            className="hidden sm:block"
            size={140}
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

      <div className="sm:hidden fixed right-3 bottom-20 z-40 pointer-events-none safe-bottom">
        <Minimap
          size={112}
          blueChampions={tm.blue.champions}
          redChampions={tm.red.champions}
          structures={tm.structures}
          objective={tm.objective}
          bluePlan={state.playerPlan}
          redPlan={state.enemyPlanPreview}
          showActions
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 max-w-lg mx-auto w-full space-y-4">
        <section>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B9BB4] mb-2">Acciones reveladas</p>
          <div className="grid grid-cols-2 gap-2">
            {[...tm.blue.champions, ...tm.red.champions].filter(c => c.revealedAction).map(c => {
              const def = champDef(c);
              const action = c.revealedAction!;
              return (
                <div
                  key={c.instanceId}
                  className={`rounded-lg border px-2 py-1.5 text-xs flex items-center gap-2 ${
                    c.team === 'blue' ? 'border-[#3498DB]/40 bg-[#3498DB]/10' : 'border-[#E74C3C]/40 bg-[#E74C3C]/10'
                  }`}
                >
                  {def.image ? (
                    <img src={def.image} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#2A3550]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#F0E6D2] truncate">{def.name}</p>
                    <p className="inline-flex items-center gap-1 uppercase text-[10px] text-[#C9A84C] font-bold">
                      <ActionIcon action={action} />
                      {actionLabelEs(action)}
                    </p>
                  </div>
                  {!c.isAlive && <span className="text-[#E74C3C] font-bold text-[10px]">KO</span>}
                </div>
              );
            })}
          </div>
        </section>

        {duels.length > 0 && (
          <section className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B9BB4]">Duelos de la ronda</p>
            {duels.map(d => <DuelCard key={d.id} duel={d} />)}
          </section>
        )}

        {objName && objWinnerName && (
          <div className="rounded-xl border border-[#E67E22]/40 bg-[#E67E22]/10 px-3 py-2 text-xs text-[#F5B041] flex items-center gap-2">
            <Ghost className="w-4 h-4 shrink-0" />
            <span><span className="font-bold">{objWinnerName}</span> conquistó el {objName}</span>
          </div>
        )}

        <section className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B9BB4]">Cronología</p>
          {res.log.map(line => (
            <div
              key={line.id}
              className={`rounded-lg border px-3 py-2 text-xs leading-snug ${
                line.tone === 'kill' ? 'border-[#E74C3C]/40 bg-[#E74C3C]/10 text-[#F5B7B1]' :
                line.tone === 'tower' ? 'border-[#3498DB]/40 bg-[#3498DB]/10 text-[#8EC8FF]' :
                line.tone === 'objective' ? 'border-[#E67E22]/40 bg-[#E67E22]/10 text-[#F5B041]' :
                line.tone === 'ulti' ? 'border-[#9B59B6]/40 bg-[#9B59B6]/10 text-[#C39BD3]' :
                line.tone === 'section' ? 'border-transparent bg-transparent text-[#C9A84C] font-bold uppercase tracking-wider px-0' :
                'border-[#1E2740] bg-[#141B2D] text-[#8B9BB4]'
              }`}
            >
              {line.text}
            </div>
          ))}
        </section>
      </div>

      <div className="shrink-0 px-4 py-3 safe-bottom max-w-lg mx-auto w-full">
        <button
          type="button"
          onClick={() => dispatch({ type: 'CONTINUE_AFTER_RESOLVE' })}
          className="w-full min-h-12 rounded-xl font-bold"
          style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
        >
          {tm.isComplete ? 'VER RESULTADO' : 'IR A LA TIENDA'}
        </button>
      </div>
    </div>
  );
}
