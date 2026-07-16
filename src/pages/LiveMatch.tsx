import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '@/hooks/useGameState';
import Minimap, { type AttackBeam, type ObjectiveAnimPhase } from '@/components/Minimap';
import DecisionOverlay, { type DecisionKind, type DecisionPayload } from '@/components/DecisionOverlay';
import CombatScreenFX, { type ScreenFxKind } from '@/components/CombatScreenFX';
import { generateAIPlan, champDef } from '@/lib/turn-engine';
import { objectiveName } from '@/lib/game-data';
import type { CombatFloat, LaneId, RoundResolution, TeamPlan } from '@/types/game';

const MAP_SIZE = 280;
const PROMPT_SEC = 8;
const LANE_MS = 2000;

type Phase =
  | { t: 'prompt'; kind: DecisionKind }
  | { t: 'lane'; lane: LaneId; fight: boolean }
  | { t: 'objective'; anim: ObjectiveAnimPhase }
  | { t: 'idle' };

type FxSignal = { kind: ScreenFxKind; label?: string; team?: 'blue' | 'red' | 'neutral'; nonce: number };

function mergeDecisions(
  base: TeamPlan,
  picks: DecisionPayload[],
  assistId?: string,
): TeamPlan {
  const plan: TeamPlan = {
    actions: { ...base.actions },
    ultimates: [...(base.ultimates || [])],
    bootsLane: { ...(base.bootsLane || {}) },
    jungleTarget: base.jungleTarget,
    objectiveAssistId: base.objectiveAssistId,
  };

  for (const p of picks) {
    if (p.kind === 'jungle') {
      plan.jungleTarget = p.target;
      plan.objectiveAssistId = p.target === 'objective' ? assistId : undefined;
    }
    if (p.kind === 'siege') {
      // Solo prioriza asedio en laners; no mueve a la jungla.
      Object.keys(plan.actions).forEach(id => {
        if (plan.actions[id] === 'defend') plan.actions[id] = 'attack';
      });
    }
  }
  return plan;
}

export default function LiveMatch() {
  const { state, dispatch } = useGame();
  const tm = state.turnMatch;
  const [phase, setPhase] = useState<Phase | null>(null);
  const [promptLeft, setPromptLeft] = useState(PROMPT_SEC);
  const [scale, setScale] = useState(0.92);
  const [fx, setFx] = useState<FxSignal | null>(null);
  const [shake, setShake] = useState(false);
  const [cinemaRes, setCinemaRes] = useState<RoundResolution | null>(null);
  const [activeFloats, setActiveFloats] = useState<CombatFloat[]>([]);
  const pickQueue = useRef<DecisionKind[]>([]);
  const picksRef = useRef<DecisionPayload[]>([]);
  const cinemaTimers = useRef<number[]>([]);
  const promptsForRound = useRef<number | null>(null);
  const cinemaForKey = useRef<string | null>(null);
  const awaitingCinema = useRef(false);
  const fxNonce = useRef(0);

  const fireFx = (kind: ScreenFxKind, label?: string, team?: FxSignal['team']) => {
    fxNonce.current += 1;
    setFx({ kind, label, team, nonce: fxNonce.current });
    if (kind === 'kill' || kind === 'hit') {
      setShake(true);
      window.setTimeout(() => setShake(false), 380);
    }
  };

  const assistId = useMemo(() => {
    if (!tm) return undefined;
    return tm.blue.champions.find(c => champDef(c).role === 'mid' && c.isAlive)?.instanceId;
  }, [tm]);

  const clearCinema = () => {
    cinemaTimers.current.forEach(t => window.clearTimeout(t));
    cinemaTimers.current = [];
  };

  const endCinemaAndContinue = (res: RoundResolution) => {
    awaitingCinema.current = false;
    setActiveFloats([]);
    setCinemaRes(null);
    setPhase({ t: 'idle' });
    if (res.matchOver || tm?.isComplete) {
      dispatch({ type: 'FINISH_LIVE_MATCH' });
      return;
    }
    // Siguiente ronda (round ya avanzó en resolve)
    if (tm) beginPrompts(tm.round);
  };

  const playCinema = (res: RoundResolution) => {
    if (!tm) return;
    clearCinema();
    setCinemaRes(res);
    setScale(1.08);
    setPhase({ t: 'lane', lane: 0, fight: false });
    setActiveFloats([]);

    const schedule = (fn: () => void, ms: number) => {
      cinemaTimers.current.push(window.setTimeout(fn, ms));
    };

    const floatsForLane = (lane: LaneId) =>
      (res.floats || []).filter(f => f.lane === lane || (f.targetType !== 'champ' && f.lane === lane));

    const fightLane = (lane: LaneId, at: number) => {
      schedule(() => {
        setPhase({ t: 'lane', lane, fight: true });
        setActiveFloats(floatsForLane(lane));
        fireFx('hit', undefined, lane === 1 ? 'neutral' : lane === 0 ? 'blue' : 'red');
      }, at);
    };

    fightLane(0, 800);
    schedule(() => { setPhase({ t: 'lane', lane: 1, fight: false }); setActiveFloats([]); }, LANE_MS);
    fightLane(1, LANE_MS + 800);
    schedule(() => { setPhase({ t: 'lane', lane: 2, fight: false }); setActiveFloats([]); }, LANE_MS * 2);
    fightLane(2, LANE_MS * 2 + 800);

    let t = LANE_MS * 3;
    const hadObj = !!res.objective;
    if (hadObj) {
      schedule(() => {
        setPhase({ t: 'objective', anim: 'pulse' });
        setScale(1.12);
        setActiveFloats((res.floats || []).filter(f => f.lane === 1 && f.targetType === 'champ'));
      }, t);
      schedule(() => {
        setPhase({ t: 'objective', anim: 'clash' });
        fireFx('hit', undefined, 'neutral');
      }, t + 800);
      schedule(() => setPhase({ t: 'objective', anim: 'claim' }), t + 1400);
      t += 2400;
    } else {
      t += 400;
    }

    // FX banners from resolution
    schedule(() => {
      const totalKills = (res.blueKillsDelta ?? 0) + (res.redKillsDelta ?? 0);
      if (totalKills > 0) {
        const killerSide = (res.blueKillsDelta ?? 0) >= (res.redKillsDelta ?? 0) ? 'blue' : 'red';
        fireFx('kill', totalKills > 1 ? `¡${totalKills} KILLS!` : '¡KILL!', killerSide);
      }
      const towers = (res.towersTakenBlue ?? 0) + (res.towersTakenRed ?? 0);
      if (towers > 0) {
        fireFx(
          'tower',
          (res.towersTakenBlue ?? 0) > 0 ? '¡Torre caída!' : '¡Torre caída!',
          (res.towersTakenBlue ?? 0) > 0 ? 'blue' : 'red',
        );
      }
      if (res.objectiveWinner) {
        const name = res.objective ? objectiveName(res.objective) : 'Objetivo';
        fireFx(
          'objective',
          `${res.objectiveWinner === 'blue' ? 'Azul' : 'Rojo'} · ${name}`,
          res.objectiveWinner === 'blue' ? 'blue' : 'red',
        );
      }
    }, Math.max(900, t - 1200));

    schedule(() => endCinemaAndContinue(res), t + 400);
  };

  const resolveWithPicks = (finalPicks: DecisionPayload[]) => {
    if (!tm) return;
    const base = generateAIPlan(tm, 'blue');
    const plan = mergeDecisions(base, finalPicks, assistId);
    awaitingCinema.current = true;
    setPhase({ t: 'idle' });
    dispatch({ type: 'RESOLVE_LIVE_ROUND', plan });
  };

  const beginPrompts = (round: number) => {
    if (!tm || tm.isComplete) return;
    promptsForRound.current = round;
    const queue: DecisionKind[] = ['jungle'];
    if (round % 2 === 0) queue.push('siege');
    pickQueue.current = queue;
    picksRef.current = [];
    setScale(0.92);
    setCinemaRes(null);
    setActiveFloats([]);
    const first = queue.shift();
    if (first) setPhase({ t: 'prompt', kind: first });
    else resolveWithPicks([]);
  };

  // Start prompts for current round once
  useEffect(() => {
    if (!tm || tm.isComplete) return;
    if (awaitingCinema.current) return;
    if (promptsForRound.current === tm.round) return;
    clearCinema();
    beginPrompts(tm.round);
    return () => clearCinema();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tm?.round, tm?.isComplete]);

  // When resolve lands, play cinema from THIS resolution
  useEffect(() => {
    const res = tm?.lastResolution;
    if (!res || !awaitingCinema.current) return;
    const key = `${res.round}-${res.blueKillsDelta}-${res.redKillsDelta}-${res.towersTakenBlue}-${res.towersTakenRed}-${res.duels.length}`;
    if (cinemaForKey.current === key) return;
    cinemaForKey.current = key;
    playCinema(res);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tm?.lastResolution]);

  useEffect(() => {
    if (!phase || phase.t !== 'prompt') return;
    setPromptLeft(PROMPT_SEC);
    const iv = window.setInterval(() => setPromptLeft(s => Math.max(0, s - 1)), 1000);
    const to = window.setTimeout(() => {
      const kind = phase.kind;
      const def: DecisionPayload =
        kind === 'jungle'
          ? { kind: 'jungle', target: tm?.objective ? 'objective' : 1 }
          : { kind: 'siege', lane: 1 };
      acceptPick(def);
    }, PROMPT_SEC * 1000);
    return () => {
      window.clearInterval(iv);
      window.clearTimeout(to);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase?.t === 'prompt' ? (phase as { kind: DecisionKind }).kind : null, tm?.round]);

  function acceptPick(payload: DecisionPayload) {
    const next = [...picksRef.current.filter(p => p.kind !== payload.kind), payload];
    picksRef.current = next;
    const nextKind = pickQueue.current.shift();
    if (nextKind) {
      setPhase({ t: 'prompt', kind: nextKind });
    } else {
      resolveWithPicks(next);
    }
  }

  if (!tm) return null;

  const res = cinemaRes || tm.lastResolution;
  const objLabel = tm.objective ? objectiveName(tm.objective) : null;
  const focusLane = phase?.t === 'lane' ? phase.lane : null;
  const cinemaApproach = phase?.t === 'lane';
  const attackBeams: AttackBeam[] = (() => {
    if (phase?.t !== 'lane' || !phase.fight || !cinemaRes) return [];
    return cinemaRes.duels
      .filter(d => d.kind === 'duel' && d.lane === phase.lane && d.blue && d.red)
      .map(d => ({ blueId: d.blue!.instanceId, redId: d.red!.instanceId }));
  })();

  const capsule =
    !phase || phase.t === 'idle' ? `Ronda ${tm.round}` :
    phase.t === 'prompt' ? 'Tu decisión…' :
    phase.t === 'lane' ? `Línea ${['Top', 'Mid', 'Bot'][phase.lane]}${phase.fight ? ' · Combate' : ''}` :
    phase.t === 'objective' ? `Objetivo · ${objLabel || objectiveName(res?.objective ?? null)}` :
    '…';

  const slot = Math.round(MAP_SIZE * 1.15);
  const displayRound = cinemaRes ? cinemaRes.round : Math.max(1, tm.round - (awaitingCinema.current ? 1 : 0));

  return (
    <div className={`flex-1 min-h-0 w-full bg-[#0A0E1A] flex flex-col overflow-hidden relative ${shake ? 'animate-screen-shake' : ''}`}>
      <CombatScreenFX signal={fx} />

      <div className="shrink-0 px-4 py-3 safe-top border-b border-[#1E2740] max-w-lg mx-auto w-full pr-14">
        <p className="text-[#C9A84C] text-xs uppercase tracking-wider">Partida en vivo</p>
        <div className="flex justify-between items-end gap-2">
          <h1 className="text-lg font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
            Ronda {displayRound}/{tm.maxRounds}
          </h1>
          <p className="text-sm font-bold">
            <span className="text-[#3498DB]">{tm.blue.score}</span>
            <span className="text-[#8B9BB4]"> – </span>
            <span className="text-[#E74C3C]">{tm.red.score}</span>
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 max-w-lg mx-auto w-full md:max-w-5xl md:overflow-hidden md:flex md:flex-row md:items-center md:gap-8">
        <div className="flex flex-col items-center gap-3 w-full md:flex-1">
          <div className="rounded-full border border-[#C9A84C]/40 bg-[#141B2D] px-3 py-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#C9A84C]">{capsule}</p>
          </div>

          <div className="relative flex items-center justify-center overflow-hidden" style={{ width: slot, height: slot }}>
            <div className="transition-transform duration-700 ease-out" style={{ transform: `scale(${scale})`, width: MAP_SIZE, height: MAP_SIZE }}>
              <Minimap
                size={MAP_SIZE}
                blueChampions={tm.blue.champions}
                redChampions={tm.red.champions}
                structures={tm.structures}
                objective={cinemaRes?.objective ?? tm.objective}
                bluePlan={state.playerPlan}
                redPlan={state.enemyPlanPreview}
                showActions={phase?.t === 'lane' && phase.fight}
                showHp
                focusLane={focusLane}
                cinemaApproach={!!cinemaApproach}
                highlightObjective={phase?.t === 'objective'}
                objectiveAnim={phase?.t === 'objective' ? phase.anim : 'none'}
                objectiveWinner={cinemaRes?.objectiveWinner ?? null}
                attackBeams={attackBeams}
                combatFloats={activeFloats}
              />
            </div>
          </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-2 text-[11px] md:w-56 md:grid-cols-1 shrink-0">
          <div className="rounded-lg border border-[#3498DB]/30 bg-[#3498DB]/10 px-2 py-1.5 md:py-3">
            <p className="text-[#8B9BB4]">Azul</p>
            <p className="font-bold text-[#F0E6D2] truncate">{tm.blue.name}</p>
            <p className="text-lg font-bold text-[#3498DB] mt-1">{tm.blue.score}</p>
          </div>
          <div className="rounded-lg border border-[#E74C3C]/30 bg-[#E74C3C]/10 px-2 py-1.5 text-right md:text-left md:py-3">
            <p className="text-[#8B9BB4]">Rojo</p>
            <p className="font-bold text-[#F0E6D2] truncate">{tm.red.name}</p>
            <p className="text-lg font-bold text-[#E74C3C] mt-1">{tm.red.score}</p>
          </div>
        </div>
      </div>

      {phase?.t === 'prompt' && (
        <DecisionOverlay
          kind={phase.kind}
          objectiveLabel={objLabel}
          allowObjective={!!tm.objective}
          secondsLeft={promptLeft}
          onPick={acceptPick}
        />
      )}
    </div>
  );
}
