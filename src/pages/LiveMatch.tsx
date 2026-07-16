import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '@/hooks/useGameState';
import Minimap, { type AttackBeam, type ObjectiveAnimPhase } from '@/components/Minimap';
import DecisionOverlay, { type DecisionKind, type DecisionPayload } from '@/components/DecisionOverlay';
import CombatScreenFX, { type ScreenFxKind } from '@/components/CombatScreenFX';
import { generateAIPlan, champDef } from '@/lib/turn-engine';
import { objectiveName } from '@/lib/game-data';
import type { LaneId, TeamPlan } from '@/types/game';

const MAP_SIZE = 280;
const PROMPT_SEC = 8;
const LANE_MS = 2000;

type Phase =
  | { t: 'prompt'; kind: DecisionKind }
  | { t: 'lane'; lane: LaneId; fight: boolean }
  | { t: 'objective'; anim: ObjectiveAnimPhase }
  | { t: 'resolving' };

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
    if (p.kind === 'objective') {
      if (p.contest) {
        plan.jungleTarget = 'objective';
        plan.objectiveAssistId = assistId;
      } else if (plan.jungleTarget === 'objective') {
        plan.jungleTarget = 1;
        plan.objectiveAssistId = undefined;
      }
    }
    if (p.kind === 'siege') {
      Object.keys(plan.actions).forEach(id => {
        if (plan.actions[id] === 'defend') plan.actions[id] = 'attack';
      });
      plan.jungleTarget = p.lane;
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
  const pickQueue = useRef<DecisionKind[]>([]);
  const picksRef = useRef<DecisionPayload[]>([]);
  const cinemaTimers = useRef<number[]>([]);
  const roundStarted = useRef<number | null>(null);
  const lastResKey = useRef<string | null>(null);
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

  const startCinema = (finalPicks: DecisionPayload[]) => {
    if (!tm) return;
    clearCinema();
    setScale(1.08);
    setPhase({ t: 'lane', lane: 0, fight: false });

    const schedule = (fn: () => void, ms: number) => {
      cinemaTimers.current.push(window.setTimeout(fn, ms));
    };

    const fightLane = (lane: LaneId, at: number) => {
      schedule(() => {
        setPhase({ t: 'lane', lane, fight: true });
        fireFx('hit', undefined, lane === 1 ? 'neutral' : lane === 0 ? 'blue' : 'red');
      }, at);
    };

    fightLane(0, 800);
    schedule(() => setPhase({ t: 'lane', lane: 1, fight: false }), LANE_MS);
    fightLane(1, LANE_MS + 800);
    schedule(() => setPhase({ t: 'lane', lane: 2, fight: false }), LANE_MS * 2);
    fightLane(2, LANE_MS * 2 + 800);

    let t = LANE_MS * 3;
    if (tm.objective) {
      schedule(() => {
        setPhase({ t: 'objective', anim: 'pulse' });
        setScale(1.12);
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

    schedule(() => {
      setPhase({ t: 'resolving' });
      const base = generateAIPlan(tm, 'blue');
      const plan = mergeDecisions(base, finalPicks, assistId);
      dispatch({ type: 'RESOLVE_LIVE_ROUND', plan });
      roundStarted.current = null;
    }, t);
  };

  const beginPrompts = () => {
    if (!tm) return;
    const queue: DecisionKind[] = [];
    if (tm.objective) queue.push('objective');
    queue.push('jungle');
    if (tm.round % 2 === 0) queue.push('siege');
    pickQueue.current = queue;
    picksRef.current = [];
    setScale(0.92);
    const first = queue.shift();
    if (first) setPhase({ t: 'prompt', kind: first });
    else startCinema([]);
  };

  useEffect(() => {
    if (!tm || tm.isComplete) return;
    if (roundStarted.current === tm.round) return;
    roundStarted.current = tm.round;
    clearCinema();
    beginPrompts();
    return () => clearCinema();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tm?.round, tm?.isComplete]);

  useEffect(() => {
    const res = tm?.lastResolution;
    if (!res) return;
    const key = `${res.round}-${res.blueKillsDelta}-${res.redKillsDelta}-${res.towersTakenBlue}-${res.towersTakenRed}-${res.objectiveWinner ?? '-'}`;
    if (lastResKey.current === key) return;
    lastResKey.current = key;

    const totalKills = (res.blueKillsDelta ?? 0) + (res.redKillsDelta ?? 0);
    if (totalKills > 0) {
      const killerSide = (res.blueKillsDelta ?? 0) >= (res.redKillsDelta ?? 0) ? 'blue' : 'red';
      const labels = ['¡KILL!', '¡EJECUTADO!', '¡ELIMINADO!', '¡FIRST BLOOD!'];
      const label = totalKills > 1 ? `¡${totalKills} KILLS!` : labels[Math.floor(Math.random() * labels.length)];
      fireFx('kill', label, killerSide);
      if (totalKills > 1) {
        window.setTimeout(() => fireFx('kill', '¡MASACRE!', killerSide), 350);
      }
    }

    const towers = (res.towersTakenBlue ?? 0) + (res.towersTakenRed ?? 0);
    if (towers > 0) {
      window.setTimeout(() => {
        fireFx(
          'tower',
          (res.towersTakenBlue ?? 0) > 0 ? '¡Torre azul!' : '¡Torre roja!',
          (res.towersTakenBlue ?? 0) > 0 ? 'blue' : 'red',
        );
      }, totalKills > 0 ? 500 : 0);
    }

    if (res.objectiveWinner) {
      window.setTimeout(() => {
        const name = res.objective ? objectiveName(res.objective) : 'Objetivo';
        fireFx('objective', `${res.objectiveWinner === 'blue' ? 'Azul' : 'Rojo'} conquista ${name}`, res.objectiveWinner === 'blue' ? 'blue' : 'red');
      }, 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tm?.lastResolution?.round, tm?.lastResolution?.blueKillsDelta, tm?.lastResolution?.redKillsDelta]);

  useEffect(() => {
    if (!phase || phase.t !== 'prompt') return;
    setPromptLeft(PROMPT_SEC);
    const iv = window.setInterval(() => setPromptLeft(s => Math.max(0, s - 1)), 1000);
    const to = window.setTimeout(() => {
      const kind = phase.kind;
      const def: DecisionPayload =
        kind === 'jungle'
          ? { kind: 'jungle', target: tm?.objective ? 'objective' : 1 }
          : kind === 'objective'
            ? { kind: 'objective', contest: true }
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
      startCinema(next);
    }
  }

  if (!tm) return null;

  const res = tm.lastResolution;
  const objLabel = tm.objective ? objectiveName(tm.objective) : null;
  const focusLane = phase?.t === 'lane' ? phase.lane : null;
  const cinemaApproach = phase?.t === 'lane';
  const attackBeams: AttackBeam[] = (() => {
    if (phase?.t !== 'lane' || !phase.fight) return [];
    if (res) {
      return res.duels
        .filter(d => d.lane === phase.lane && d.blue && d.red)
        .map(d => ({ blueId: d.blue!.instanceId, redId: d.red!.instanceId }));
    }
    const blues = tm.blue.champions.filter(c => c.isAlive).slice(0, 2);
    const reds = tm.red.champions.filter(c => c.isAlive).slice(0, 2);
    return blues.map((b, i) => (reds[i] ? { blueId: b.instanceId, redId: reds[i].instanceId } : null)).filter(Boolean) as AttackBeam[];
  })();

  const capsule =
    !phase ? `Ronda ${tm.round}` :
    phase.t === 'prompt' ? 'Tu decisión…' :
    phase.t === 'lane' ? `Línea ${['Top', 'Mid', 'Bot'][phase.lane]}${phase.fight ? ' · Combate' : ''}` :
    phase.t === 'objective' ? `Objetivo · ${objLabel}` :
    'Resolviendo…';

  const slot = Math.round(MAP_SIZE * 1.15);

  return (
    <div className={`flex-1 min-h-0 w-full bg-[#0A0E1A] flex flex-col overflow-hidden relative ${shake ? 'animate-screen-shake' : ''}`}>
      <CombatScreenFX signal={fx} />

      <div className="shrink-0 px-4 py-3 safe-top border-b border-[#1E2740] max-w-lg mx-auto w-full pl-14">
        <p className="text-[#C9A84C] text-xs uppercase tracking-wider">Partida en vivo</p>
        <div className="flex justify-between items-end gap-2">
          <h1 className="text-lg font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
            Ronda {tm.round}/{tm.maxRounds}
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
                objective={tm.objective}
                bluePlan={state.playerPlan}
                redPlan={state.enemyPlanPreview}
                showActions={phase?.t === 'lane' && phase.fight}
                focusLane={focusLane}
                cinemaApproach={!!cinemaApproach}
                highlightObjective={phase?.t === 'objective'}
                objectiveAnim={phase?.t === 'objective' ? phase.anim : 'none'}
                objectiveWinner={res?.objectiveWinner ?? null}
                attackBeams={attackBeams}
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
          secondsLeft={promptLeft}
          onPick={acceptPick}
        />
      )}
    </div>
  );
}
