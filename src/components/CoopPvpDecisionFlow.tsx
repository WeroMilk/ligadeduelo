import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DecisionOverlay, { type DecisionKind, type DecisionPayload } from '@/components/DecisionOverlay';
import { generateAIPlan, livingJungler, champDef } from '@/lib/turn-engine';
import { objectiveName } from '@/lib/game-data';
import type { TeamColor, TeamPlan, TurnMatchState } from '@/types/game';

type Turn = 'blue' | 'red' | 'done';

type Props = {
  tm: TurnMatchState;
  blueLabel: string;
  redLabel: string;
  round: number;
  paused: boolean;
  onResolve: (bluePlan: TeamPlan, redPlan: TeamPlan) => void;
};

function mergeDecisions(
  base: TeamPlan,
  picks: DecisionPayload[],
  junglerReady: boolean,
): TeamPlan {
  const plan: TeamPlan = {
    actions: { ...base.actions },
    ultimates: [...(base.ultimates || [])],
    bootsLane: { ...(base.bootsLane || {}) },
    jungleTarget: junglerReady ? base.jungleTarget : undefined,
    objectiveAssistId: junglerReady ? base.objectiveAssistId : undefined,
  };
  if (!junglerReady) return plan;
  for (const p of picks) {
    if (p.kind === 'jungle') {
      plan.jungleTarget = p.target;
      if (p.target !== 'objective') plan.objectiveAssistId = undefined;
    }
    if (p.kind === 'assist') {
      plan.objectiveAssistId = p.champId;
      plan.jungleTarget = 'objective';
    }
  }
  return plan;
}

function planForTeam(tm: TurnMatchState, team: TeamColor, picks: DecisionPayload[]): TeamPlan {
  const side = team === 'blue' ? tm.blue : tm.red;
  const junglerReady = !!livingJungler(side);
  const base = generateAIPlan(tm, team);
  return mergeDecisions(base, picks, junglerReady);
}

export default function CoopPvpDecisionFlow({
  tm,
  blueLabel,
  redLabel,
  round,
  paused,
  onResolve,
}: Props) {
  const [turn, setTurn] = useState<Turn>('blue');
  const [promptKind, setPromptKind] = useState<DecisionKind | null>(null);
  const [awaitConfirm, setAwaitConfirm] = useState(false);
  const picksRef = useRef<DecisionPayload[]>([]);
  const pickQueueRef = useRef<DecisionKind[]>([]);
  const bluePlanRef = useRef<TeamPlan | null>(null);
  const startedRound = useRef<number | null>(null);

  const objLabel = tm.objective ? objectiveName(tm.objective) : null;
  const currentTeam: TeamColor = turn === 'red' ? 'red' : 'blue';
  const currentLabel = turn === 'red' ? redLabel : blueLabel;
  const teamData = currentTeam === 'blue' ? tm.blue : tm.red;

  const assistCandidates = useMemo(() => {
    return teamData.champions.filter(c => {
      if (!c.isAlive || c.stats.hp <= 0) return false;
      return champDef(c).role !== 'jungle';
    });
  }, [teamData.champions]);

  const startTeamTurn = useCallback((team: 'blue' | 'red') => {
    picksRef.current = [];
    pickQueueRef.current = [];
    setAwaitConfirm(false);
    setTurn(team);

    const side = team === 'blue' ? tm.blue : tm.red;
    if (!livingJungler(side)) {
      const plan = planForTeam(tm, team, []);
      if (team === 'blue') {
        bluePlanRef.current = plan;
        startTeamTurn('red');
      } else {
        onResolve(bluePlanRef.current ?? planForTeam(tm, 'blue', []), plan);
        setTurn('done');
      }
      return;
    }

    pickQueueRef.current = ['jungle'];
    setPromptKind('jungle');
  }, [tm, onResolve]);

  useEffect(() => {
    if (startedRound.current === round) return;
    startedRound.current = round;
    bluePlanRef.current = null;
    startTeamTurn('blue');
  }, [round, startTeamTurn]);

  const acceptPick = (payload: DecisionPayload) => {
    if (paused || awaitConfirm) return;
    const next = [...picksRef.current.filter(p => p.kind !== payload.kind), payload];
    picksRef.current = next;

    if (
      payload.kind === 'jungle'
      && payload.target === 'objective'
      && tm.objective
      && livingJungler(teamData)
      && assistCandidates.length > 0
    ) {
      pickQueueRef.current = ['assist', ...pickQueueRef.current.filter(k => k !== 'assist')];
    }

    const nextKind = pickQueueRef.current.shift();
    if (nextKind) {
      setPromptKind(nextKind);
    } else {
      setPromptKind(null);
      setAwaitConfirm(true);
    }
  };

  const confirmTurn = () => {
    const plan = planForTeam(tm, currentTeam, picksRef.current);
    setAwaitConfirm(false);
    picksRef.current = [];

    if (currentTeam === 'blue') {
      bluePlanRef.current = plan;
      startTeamTurn('red');
    } else {
      onResolve(bluePlanRef.current ?? planForTeam(tm, 'blue', []), plan);
      setTurn('done');
    }
  };

  if (turn === 'done') return null;

  return (
    <>
      {promptKind && !awaitConfirm && (
        <DecisionOverlay
          kind={promptKind}
          objectiveLabel={objLabel}
          allowObjective={!!tm.objective}
          assistOptions={assistCandidates}
          secondsLeft={0}
          showTimer={false}
          teamColor={currentTeam}
          playerLabel={currentLabel}
          onPick={acceptPick}
        />
      )}
      {awaitConfirm && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/55 px-3 pb-6 sm:pb-0">
          <div className="w-full max-w-md rounded-2xl border-2 border-[#C9A84C] bg-[#141B2D] p-4 shadow-[0_0_40px_rgba(201,168,76,0.25)] space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C]">
              Turno {currentTeam === 'blue' ? 'azul' : 'rojo'}
            </p>
            <h2 className="text-lg font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
              {currentLabel}
            </h2>
            <p className="text-xs text-[#8B9BB4]">
              Revisa tu elección y confirma para pasar al rival.
            </p>
            <button
              type="button"
              disabled={paused}
              onClick={confirmTurn}
              className="w-full min-h-11 rounded-xl font-bold"
              style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
            >
              Confirmar elección
            </button>
          </div>
        </div>
      )}
    </>
  );
}
