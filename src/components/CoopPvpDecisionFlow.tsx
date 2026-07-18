import { useEffect, useMemo, useRef, useState } from 'react';
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
  const picksRef = useRef<DecisionPayload[]>([]);
  const pickQueueRef = useRef<DecisionKind[]>([]);
  const bluePlanRef = useRef<TeamPlan | null>(null);
  const startedRound = useRef<number | null>(null);
  const tmRef = useRef(tm);
  const onResolveRef = useRef(onResolve);
  tmRef.current = tm;
  onResolveRef.current = onResolve;

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

  const beginInteractiveTurn = (team: 'blue' | 'red') => {
    picksRef.current = [];
    pickQueueRef.current = ['jungle'];
    setTurn(team);
    setPromptKind('jungle');
  };

  const applyTeamPlan = (team: TeamColor, picks: DecisionPayload[]) => {
    const live = tmRef.current;
    const plan = planForTeam(live, team, picks);
    picksRef.current = [];
    setPromptKind(null);

    if (team === 'blue') {
      bluePlanRef.current = plan;
      const redSide = live.red;
      if (!livingJungler(redSide)) {
        const redPlan = planForTeam(live, 'red', []);
        onResolveRef.current(plan, redPlan);
        setTurn('done');
        return;
      }
      beginInteractiveTurn('red');
      return;
    }

    onResolveRef.current(bluePlanRef.current ?? planForTeam(live, 'blue', []), plan);
    setTurn('done');
  };

  const startRound = () => {
    bluePlanRef.current = null;
    const live = tmRef.current;
    if (!livingJungler(live.blue)) {
      const bluePlan = planForTeam(live, 'blue', []);
      bluePlanRef.current = bluePlan;
      if (!livingJungler(live.red)) {
        onResolveRef.current(bluePlan, planForTeam(live, 'red', []));
        setTurn('done');
        return;
      }
      beginInteractiveTurn('red');
      return;
    }
    beginInteractiveTurn('blue');
  };

  useEffect(() => {
    if (startedRound.current === round) return;
    startedRound.current = round;
    startRound();
  }, [round]);

  const acceptPick = (payload: DecisionPayload) => {
    if (paused) return;
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
      applyTeamPlan(currentTeam, next);
    }
  };

  if (turn === 'done') return null;

  return promptKind ? (
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
  ) : null;
}
