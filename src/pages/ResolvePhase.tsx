import { useEffect, useMemo, useState } from 'react';
import { useGame } from '@/hooks/useGameState';
import { actionLabelEs, champDef } from '@/lib/turn-engine';
import { objectiveName } from '@/lib/game-data';
import Minimap, { type AttackBeam, type ObjectiveAnimPhase } from '@/components/Minimap';
import type { CombatAction, DuelFighterSummary, DuelSummary, LaneId, RoundResolution } from '@/types/game';
import { Swords, Sparkles, Shield, Castle, Ghost } from 'lucide-react';

const LANE_NAMES: Record<LaneId, string> = { 0: 'Top', 1: 'Mid', 2: 'Bot' };
const MAP_SIZE = 260;

type CinemaKind = 'intro' | 'lane' | 'objective' | 'summary';

type CinemaStep = {
  kind: CinemaKind;
  lane?: LaneId;
  label: string;
  scale: number;
};

function buildCinemaSteps(res: RoundResolution): CinemaStep[] {
  const steps: CinemaStep[] = [
    { kind: 'intro', label: 'La grieta se agita…', scale: 0.88 },
  ];
  for (const lane of [0, 1, 2] as LaneId[]) {
    const has = res.duels.some(d => d.lane === lane);
    if (has) {
      steps.push({
        kind: 'lane',
        lane,
        label: `Línea ${LANE_NAMES[lane]}`,
        scale: 1.08,
      });
    }
  }
  if (res.objective && (res.objectiveWinner || res.contestedObjective)) {
    steps.push({
      kind: 'objective',
      label: res.contestedObjective
        ? `Rivalidad · ${objectiveName(res.objective)}`
        : objectiveName(res.objective),
      scale: 1.12,
    });
  }
  steps.push({ kind: 'summary', label: 'Resultado de la ronda', scale: 1 });
  return steps;
}

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
      </div>
      <div className="h-1.5 rounded-full bg-[#0A0E1A] overflow-hidden">
        <div className={`h-full rounded-full ${fighter.isAlive ? fill : 'bg-[#5D6D7E]'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function FighterCard({ fighter, team }: { fighter: DuelFighterSummary; team: 'blue' | 'red' }) {
  const border = team === 'blue' ? 'border-[#3498DB]/40' : 'border-[#E74C3C]/40';
  return (
    <div className={`flex-1 min-w-0 rounded-lg border ${border} bg-[#0A0E1A]/60 p-2 ${!fighter.isAlive ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        {fighter.image ? (
          <img src={fighter.image} alt={fighter.name} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#2A3550]" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[#F0E6D2] text-xs truncate">{fighter.name}</p>
          <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-[#C9A84C]">
            <ActionIcon action={fighter.action} />
            {actionLabelEs(fighter.action)}
          </p>
        </div>
      </div>
      <HpBar fighter={fighter} team={team} />
    </div>
  );
}

function DuelCard({ duel }: { duel: DuelSummary }) {
  return (
    <div className="rounded-xl border border-[#1E2740] bg-[#141B2D] p-2.5 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B9BB4]">
        {duel.kind === 'siege' ? (
          <span className="inline-flex items-center gap-1 text-[#3498DB]"><Castle className="w-3 h-3" /> Asedio {LANE_NAMES[duel.lane]}</span>
        ) : (
          <>Línea {LANE_NAMES[duel.lane]}</>
        )}
      </p>
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

  const steps = useMemo(() => (res ? buildCinemaSteps(res) : []), [res]);
  const [stepIndex, setStepIndex] = useState(0);
  const [laneFight, setLaneFight] = useState(false);
  const [objAnim, setObjAnim] = useState<ObjectiveAnimPhase>('none');

  useEffect(() => {
    setStepIndex(0);
    setLaneFight(false);
    setObjAnim('none');
  }, [res?.round]);

  useEffect(() => {
    if (!res || steps.length === 0) return;
    const step = steps[stepIndex];
    if (!step) return;

    const timers: number[] = [];

    if (step.kind === 'lane') {
      setLaneFight(false);
      timers.push(window.setTimeout(() => setLaneFight(true), 1200));
      timers.push(window.setTimeout(() => {
        setStepIndex(i => Math.min(i + 1, steps.length - 1));
      }, 2800));
    } else if (step.kind === 'objective') {
      setObjAnim('pulse');
      timers.push(window.setTimeout(() => setObjAnim('clash'), 1100));
      timers.push(window.setTimeout(() => setObjAnim('claim'), 1700));
      timers.push(window.setTimeout(() => {
        setStepIndex(i => Math.min(i + 1, steps.length - 1));
      }, 3200));
    } else if (step.kind === 'intro') {
      timers.push(window.setTimeout(() => {
        setStepIndex(i => Math.min(i + 1, steps.length - 1));
      }, 1800));
    }
    // summary: stays until user continues

    return () => { timers.forEach(t => window.clearTimeout(t)); };
  }, [stepIndex, steps, res?.round]);

  if (!tm || !res) return null;

  const step = steps[stepIndex] ?? steps[steps.length - 1];
  const isSummary = step?.kind === 'summary';
  const isLane = step?.kind === 'lane';
  const isObj = step?.kind === 'objective';

  const activeLaneDuels = isLane && step.lane !== undefined
    ? res.duels.filter(d => d.lane === step.lane)
    : [];

  const attackBeams: AttackBeam[] =
    isLane && laneFight
      ? activeLaneDuels
          .filter(d => d.kind === 'duel' && d.blue && d.red)
          .map(d => ({ blueId: d.blue!.instanceId, redId: d.red!.instanceId }))
      : [];

  const objName = res.objective ? objectiveName(res.objective) : null;
  const objWinnerName =
    res.objectiveWinner === 'blue' ? tm.blue.name :
    res.objectiveWinner === 'red' ? tm.red.name : null;

  const shownDuels = isLane
    ? activeLaneDuels
    : isSummary
      ? res.duels
      : [];

  const scale = step?.scale ?? 1;
  const slot = Math.round(MAP_SIZE * 1.14);

  return (
    <div className="flex-1 min-h-0 w-full bg-[#0A0E1A] flex flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[#1E2740] px-4 py-3 safe-top max-w-lg mx-auto w-full">
        <p className="text-[#C9A84C] text-xs uppercase tracking-wider">Resolución</p>
        <h1 className="text-xl font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
          Ronda {res.round} en el mapa
        </h1>
        {isSummary && (
          <>
            <div className="flex justify-between mt-2 text-sm font-bold">
              <span className="text-[#3498DB]">{tm.blue.name}: {tm.blue.score} (+{res.blueScoreDelta})</span>
              <span className="text-[#E74C3C]">{tm.red.name}: {tm.red.score} (+{res.redScoreDelta})</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
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
                <p className="font-bold text-[#F0E6D2] truncate text-[10px]">
                  {objName && objWinnerName ? `${objWinnerName}` : objName ? 'Sin pelea' : '—'}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 max-w-lg mx-auto w-full space-y-3">
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-full border border-[#C9A84C]/50 bg-[#141B2D] px-3 py-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#C9A84C]">
              {step?.label ?? '…'}
              {isLane && !laneFight ? ' · Avance' : isLane && laneFight ? ' · Combate' : ''}
            </p>
          </div>

          <div
            className="relative flex items-center justify-center overflow-hidden"
            style={{ width: slot, height: slot }}
          >
            <div
              className="transition-transform duration-1000 ease-out"
              style={{ transform: `scale(${scale})`, width: MAP_SIZE, height: MAP_SIZE }}
            >
              <Minimap
                size={MAP_SIZE}
                blueChampions={tm.blue.champions}
                redChampions={tm.red.champions}
                structures={tm.structures}
                objective={res.objective ?? tm.objective}
                bluePlan={state.playerPlan}
                redPlan={state.enemyPlanPreview}
                showActions={isLane ? laneFight : isSummary || isObj}
                focusLane={isLane ? step.lane ?? null : null}
                cinemaApproach={isLane}
                highlightObjective={isObj || (isSummary && !!res.objectiveWinner)}
                objectiveAnim={isObj ? objAnim : isSummary && res.objectiveWinner ? 'claim' : 'none'}
                objectiveWinner={res.objectiveWinner ?? null}
                attackBeams={attackBeams}
              />
            </div>
          </div>

          {isObj && (
            <div className="w-full rounded-xl border border-[#E67E22]/40 bg-[#E67E22]/10 px-3 py-2 text-xs text-[#F5B041] flex items-center gap-2">
              <Ghost className="w-4 h-4 shrink-0" />
              <span>
                {objAnim === 'claim' && objWinnerName ? (
                  <>
                    <span className="font-bold">{objWinnerName}</span> conquista el {objName}
                    {res.contestedObjective ? ' en rivalidad' : ''}
                  </>
                ) : res.contestedObjective ? (
                  <>Rivalidad por el {objName}</>
                ) : (
                  <>Pelea por el {objName}</>
                )}
              </span>
            </div>
          )}

          {(isLane && laneFight) && (
            <div className="w-full grid grid-cols-2 gap-1.5">
              {[...tm.blue.champions, ...tm.red.champions]
                .filter(c => {
                  if (!c.revealedAction) return false;
                  const plan = c.team === 'blue' ? state.playerPlan : state.enemyPlanPreview;
                  const lane =
                    plan?.bootsLane?.[c.instanceId] ??
                    (champDef(c).role === 'top' ? 0 : champDef(c).role === 'adc' || champDef(c).role === 'support' ? 2 : 1);
                  return lane === step.lane;
                })
                .slice(0, 6)
                .map(c => {
                  const def = champDef(c);
                  const action = c.revealedAction!;
                  return (
                    <div
                      key={c.instanceId}
                      className={`rounded-md border px-1.5 py-1 text-[10px] flex items-center gap-1.5 ${
                        c.team === 'blue' ? 'border-[#3498DB]/40 bg-[#3498DB]/10' : 'border-[#E74C3C]/40 bg-[#E74C3C]/10'
                      }`}
                    >
                      <span className="font-bold text-[#F0E6D2] truncate">{def.name}</span>
                      <span className="ml-auto uppercase text-[#C9A84C] font-bold">{actionLabelEs(action)}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {shownDuels.length > 0 && (isLane ? laneFight : isSummary) && (
          <section className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B9BB4]">
              {isSummary ? 'Duelos' : `Duelos · ${LANE_NAMES[step.lane!]}`}
            </p>
            {shownDuels.map(d => <DuelCard key={d.id} duel={d} />)}
          </section>
        )}

        {isSummary && objName && objWinnerName && (
          <div className="rounded-xl border border-[#E67E22]/40 bg-[#E67E22]/10 px-3 py-2 text-xs text-[#F5B041] flex items-center gap-2">
            <Ghost className="w-4 h-4 shrink-0" />
            <span>
              <span className="font-bold">{objWinnerName}</span> conquistó el {objName}
              {res.contestedObjective ? ' en rivalidad' : ''}
              {res.awardedFreeItem ? ' · +ítem gratis' : ''}
              {res.ancestralGranted ? ' · bendición ancestral' : ''}
            </span>
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 py-3 safe-bottom max-w-lg mx-auto w-full flex gap-2">
        {!isSummary && (
          <button
            type="button"
            onClick={() => {
              setLaneFight(true);
              setObjAnim('claim');
              setStepIndex(i => Math.min(i + 1, steps.length - 1));
            }}
            className="min-h-12 flex-1 rounded-xl font-bold border border-[#2A3550] text-[#8B9BB4]"
          >
            SALTAR
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (!isSummary) {
              setStepIndex(steps.length - 1);
              setLaneFight(true);
              setObjAnim(res.objectiveWinner ? 'claim' : 'none');
              return;
            }
            dispatch({ type: 'CONTINUE_AFTER_RESOLVE' });
          }}
          className="w-full min-h-12 rounded-xl font-bold flex-[2]"
          style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
        >
          {!isSummary
            ? 'CONTINUAR'
            : tm.isComplete
              ? 'VER RESULTADO'
              : tm.pendingReward
                ? 'ELEGIR RECOMPENSA'
                : 'SIGUIENTE RONDA'}
        </button>
      </div>
    </div>
  );
}
