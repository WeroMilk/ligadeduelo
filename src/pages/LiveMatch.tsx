import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '@/hooks/useGameState';
import Minimap, { type AttackBeam, type ObjectiveAnimPhase } from '@/components/Minimap';
import DecisionOverlay, { type DecisionKind, type DecisionPayload } from '@/components/DecisionOverlay';
import CombatScreenFX, { type ScreenFxKind } from '@/components/CombatScreenFX';
import CombatAnnounceOverlay, { type AnnounceItem, ANNOUNCE_DURATION_MS } from '@/components/CombatAnnounceOverlay';
import ObjectiveMinigame, { type ObjectiveQtePayload } from '@/components/ObjectiveMinigame';
import { generateAIPlan, champDef } from '@/lib/turn-engine';
import { setAdHidden } from '@/lib/ad-visibility';
import { objectiveName } from '@/lib/game-data';
import type { CombatFloat, LaneId, RoundResolution, Structure, TeamPlan } from '@/types/game';

const MAP_SIZE_MOBILE_MAX = 280;
const MAP_SIZE_MOBILE_MIN = 168;

function useMapSize(containerRef: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState(240);
  useEffect(() => {
    const el = containerRef.current;
    const update = () => {
      const desktop = window.matchMedia('(min-width: 768px)').matches;
      if (desktop) {
        const byH = Math.floor(window.innerHeight * 0.62);
        const byW = Math.floor(window.innerWidth * 0.48);
        setSize(Math.max(420, Math.min(580, byH, byW)));
        return;
      }
      // Móvil: encajar mapa + estructuras + kills en el alto disponible del body
      const h = el?.clientHeight ?? Math.floor(window.innerHeight * 0.45);
      // capsule ~28 + gaps ~24 + estructuras ~72 + kills ~56 + padding
      const reserved = 180;
      const byH = Math.floor((h - reserved) / 1.12);
      const byW = Math.floor((el?.clientWidth ?? window.innerWidth) - 32);
      setSize(Math.max(MAP_SIZE_MOBILE_MIN, Math.min(MAP_SIZE_MOBILE_MAX, byH, byW)));
    };
    update();
    window.addEventListener('resize', update);
    let ro: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update);
      ro.observe(el);
    }
    return () => {
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
  }, [containerRef]);
  return size;
}
const PROMPT_SEC = 8;
const LANE_MS = 2000;
const CINEMA_STUCK_MS = 12000;
const QTE_STUCK_MS = 55000;
const ANNOUNCE_MAX_WAIT_MS = 10000;

type Phase =
  | { t: 'prompt'; kind: DecisionKind }
  | { t: 'lane'; lane: LaneId; fight: boolean }
  | { t: 'objective'; anim: ObjectiveAnimPhase }
  | { t: 'qte' }
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
      Object.keys(plan.actions).forEach(id => {
        if (plan.actions[id] === 'defend') plan.actions[id] = 'attack';
      });
    }
  }
  return plan;
}

function StructureHpRow({ structures, team }: { structures: Structure[]; team: 'blue' | 'red' }) {
  const towers = [0, 1, 2].map(lane =>
    structures.find(s => s.type === 'tower' && s.team === team && s.lane === lane),
  );
  const nexus = structures.find(s => s.type === 'nexus' && s.team === team);
  const color = team === 'blue' ? '#3498DB' : '#E74C3C';
  const labels = ['T', 'M', 'B'];

  const bar = (s: Structure | undefined, label: string) => {
    const destroyed = !s || s.isDestroyed || s.hp <= 0;
    const pct = destroyed ? 0 : Math.max(0, Math.min(100, (s!.hp / s!.maxHp) * 100));
    return (
      <div key={label} className="flex-1 min-w-0">
        <div className="flex justify-between text-[9px] mb-0.5">
          <span style={{ color }}>{label}</span>
          <span className="text-[#8B9BB4]">
            {destroyed ? '✕' : `${Math.floor(s!.hp)}`}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-black/50 overflow-hidden">
          <div
            className="h-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: destroyed ? '#4A5570' : pct > 50 ? '#27AE60' : pct > 25 ? '#F1C40F' : '#E74C3C',
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex gap-1.5 w-full">
      {towers.map((s, i) => bar(s, `Torre ${labels[i]}`))}
      {bar(nexus, 'Nexo')}
    </div>
  );
}

export default function LiveMatch() {
  const { state, dispatch } = useGame();
  const tm = state.turnMatch;
  const bodyRef = useRef<HTMLDivElement>(null);
  const mapSize = useMapSize(bodyRef);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [promptLeft, setPromptLeft] = useState(PROMPT_SEC);
  const [scale, setScale] = useState(0.92);
  const [fx, setFx] = useState<FxSignal | null>(null);
  const [shake, setShake] = useState(false);
  const [cinemaRes, setCinemaRes] = useState<RoundResolution | null>(null);
  const [activeFloats, setActiveFloats] = useState<CombatFloat[]>([]);
  const [announceBatch, setAnnounceBatch] = useState<{ items: AnnounceItem[]; nonce: number } | null>(null);
  const [announceBusy, setAnnounceBusy] = useState(false);
  const announceBusyRef = useRef(false);
  const pickQueue = useRef<DecisionKind[]>([]);
  const picksRef = useRef<DecisionPayload[]>([]);
  const cinemaTimers = useRef<number[]>([]);
  const promptsForRound = useRef<number | null>(null);
  const cinemaForKey = useRef<string | null>(null);
  const postQteClaim = useRef(false);
  const needsPostQteClaim = useRef(false);
  const awaitingCinema = useRef(false);
  const awaitingQte = useRef(false);
  const phaseRef = useRef<Phase | null>(null);
  const tmRef = useRef(tm);
  const phaseStartedAt = useRef(Date.now());
  const fxNonce = useRef(0);
  const announceNonce = useRef(0);
  const announcedKeys = useRef<Set<string>>(new Set());

  phaseRef.current = phase;
  tmRef.current = tm;
  announceBusyRef.current = announceBusy;

  // Banner: visible al esperar; oculto en decisiones, QTE y popups
  useEffect(() => {
    const hide =
      phase?.t === 'prompt' ||
      phase?.t === 'qte' ||
      announceBusy;
    setAdHidden(hide);
    return () => setAdHidden(false);
  }, [phase, announceBusy]);

  const enqueueAnnounces = (items: AnnounceItem[], key: string) => {
    if (items.length === 0) return 0;
    if (announcedKeys.current.has(key)) return 0;
    announcedKeys.current.add(key);
    announceNonce.current += 1;
    setAnnounceBatch({ items, nonce: announceNonce.current });
    announceBusyRef.current = true;
    setAnnounceBusy(true);
    return items.length;
  };

  const announcesFromRes = (res: RoundResolution): AnnounceItem[] => {
    const items: AnnounceItem[] = [];
    for (const k of res.killAnnounces || []) {
      items.push({ kind: 'kill', data: k });
    }
    if (res.objectiveBonus) {
      items.push({ kind: 'objective', data: res.objectiveBonus });
    }
    return items;
  };

  /** Espera a que terminen los popups de kill/objetivo antes de seguir (con tope fail-open). */
  const endCinemaWhenAnnouncesDone = (res: RoundResolution, minWaitMs = 0) => {
    const started = Date.now();
    const maxWait = Math.max(minWaitMs, ANNOUNCE_MAX_WAIT_MS);
    const tryEnd = () => {
      const waited = Date.now() - started;
      const announceBlocking = announceBusyRef.current && waited < maxWait;
      if (waited < minWaitMs || announceBlocking) {
        cinemaTimers.current.push(window.setTimeout(tryEnd, 250));
        return;
      }
      endCinemaAndContinue(res);
    };
    cinemaTimers.current.push(window.setTimeout(tryEnd, Math.max(80, Math.min(minWaitMs, 250))));
  };

  const resetCinemaGuards = () => {
    cinemaForKey.current = null;
    postQteClaim.current = false;
  };

  const markPhaseStart = () => {
    phaseStartedAt.current = Date.now();
  };

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
    const current = tmRef.current;
    awaitingCinema.current = false;
    awaitingQte.current = false;
    needsPostQteClaim.current = false;
    announceBusyRef.current = false;
    setAnnounceBusy(false);
    resetCinemaGuards();
    setActiveFloats([]);
    setCinemaRes(null);
    setPhase({ t: 'idle' });
    markPhaseStart();
    if (res.matchOver || current?.isComplete || current?.winner) {
      dispatch({ type: 'FINISH_LIVE_MATCH' });
      return;
    }
    if (current) beginPrompts(current.round);
  };

  const playObjectiveClaim = (res: RoundResolution) => {
    clearCinema();
    markPhaseStart();
    setCinemaRes(res);
    setScale(1.12);
    const objItems: AnnounceItem[] = res.objectiveBonus
      ? [{ kind: 'objective', data: res.objectiveBonus }]
      : [];
    // Kills ya se anunciaron al inicio del cine; aquí solo el bonus del objetivo
    const n = enqueueAnnounces(
      objItems,
      `obj-${res.round}-${res.objectiveWinner}-${res.objectiveBonus?.id || 'x'}`,
    );
    const schedule = (fn: () => void, ms: number) => {
      cinemaTimers.current.push(window.setTimeout(fn, ms));
    };
    setPhase({ t: 'objective', anim: 'pulse' });
    schedule(() => {
      setPhase({ t: 'objective', anim: 'clash' });
      fireFx('hit', undefined, 'neutral');
    }, 600);
    schedule(() => setPhase({ t: 'objective', anim: 'claim' }), 1200);
    if (res.objectiveWinner) {
      schedule(() => {
        const name = res.objective ? objectiveName(res.objective) : 'Objetivo';
        fireFx(
          'objective',
          `${res.objectiveWinner === 'blue' ? 'Azul' : 'Rojo'} · ${name}`,
          res.objectiveWinner === 'blue' ? 'blue' : 'red',
        );
      }, 1400);
    }
    // Mínimo el claim corto; los popups de 6s bloquean el avance
    endCinemaWhenAnnouncesDone(res, Math.max(2200, n > 0 ? ANNOUNCE_DURATION_MS : 2200));
  };

  const playCinema = (res: RoundResolution) => {
    const current = tmRef.current;
    if (!current) return;
    clearCinema();
    markPhaseStart();
    setCinemaRes(res);
    setScale(1.08);
    setActiveFloats([]);

    // Kills de líneas al empezar el cine (aliados y enemigos)
    const laneKills = (res.killAnnounces || []).map(k => ({ kind: 'kill' as const, data: k }));
    const killCount = laneKills.length > 0
      ? enqueueAnnounces(laneKills, `kills-${res.round}-${res.blueKillsDelta}-${res.redKillsDelta}`)
      : 0;

    // Choque de junglas: QTE al instante (sin esperar el cine de líneas)
    if (res.pendingObjectiveQte && current.pendingObjective?.kind === 'gank') {
      awaitingQte.current = true;
      needsPostQteClaim.current = true;
      setPhase({ t: 'qte' });
      return;
    }

    setPhase({ t: 'lane', lane: 0, fight: false });

    const schedule = (fn: () => void, ms: number) => {
      cinemaTimers.current.push(window.setTimeout(fn, ms));
    };

    const floatsForLane = (lane: LaneId) =>
      (res.floats || []).filter(f => f.lane === lane);

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

    const t = LANE_MS * 3;

    schedule(() => {
      const totalKills = (res.blueKillsDelta ?? 0) + (res.redKillsDelta ?? 0);
      if (totalKills > 0) {
        const killerSide = (res.blueKillsDelta ?? 0) >= (res.redKillsDelta ?? 0) ? 'blue' : 'red';
        fireFx('kill', totalKills > 1 ? `¡${totalKills} KILLS!` : '¡KILL!', killerSide);
      }
      const towers = (res.towersTakenBlue ?? 0) + (res.towersTakenRed ?? 0);
      if (towers > 0) {
        fireFx('tower', '¡Torre caída!', (res.towersTakenBlue ?? 0) > 0 ? 'blue' : 'red');
      }
    }, Math.max(900, t - 800));

    schedule(() => {
      const live = tmRef.current;
      if (res.pendingObjectiveQte && live?.pendingObjective) {
        awaitingQte.current = true;
        needsPostQteClaim.current = true;
        markPhaseStart();
        setPhase({ t: 'qte' });
        setActiveFloats([]);
        return;
      }
      if (res.pendingObjectiveQte && !live?.pendingObjective) {
        endCinemaWhenAnnouncesDone(res);
        return;
      }
      if (res.objective || res.objectiveWinner || res.objectiveBonus) {
        playObjectiveClaim(res);
      } else {
        endCinemaWhenAnnouncesDone(res, killCount > 0 ? Math.min(t, ANNOUNCE_DURATION_MS) : 0);
      }
    }, t + 400);
  };

  const onQteComplete = (qte: ObjectiveQtePayload) => {
    awaitingQte.current = false;
    markPhaseStart();
    setPhase({ t: 'idle' });
    dispatch({ type: 'RESOLVE_OBJECTIVE_QTE', qte });
  };

  // Tras QTE: resolución final sin pending → animación claim (solo objetivos)
  useEffect(() => {
    const res = tm?.lastResolution;
    if (!res || !awaitingCinema.current) return;
    if (res.pendingObjectiveQte) return;
    if (!needsPostQteClaim.current && !cinemaForKey.current?.includes('qte-pending')) return;
    const key = `claim-${res.round}-${res.objectiveWinner}`;
    if (cinemaForKey.current === key || cinemaForKey.current === `gank-done-${res.round}`) return;
    needsPostQteClaim.current = false;
    if (res.objective || res.objectiveWinner) {
      postQteClaim.current = true;
      cinemaForKey.current = key;
      playObjectiveClaim(res);
    } else {
      // Choque de junglas: sin claim de monstruo
      cinemaForKey.current = `gank-done-${res.round}`;
      postQteClaim.current = true;
      enqueueAnnounces(announcesFromRes(res), `gank-${res.round}-${res.blueKillsDelta}-${res.redKillsDelta}`);
      endCinemaWhenAnnouncesDone(res, ANNOUNCE_DURATION_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tm?.lastResolution, tm?.pendingObjective]);

  const resolveWithPicks = (finalPicks: DecisionPayload[]) => {
    if (!tm) return;
    const base = generateAIPlan(tm, 'blue');
    const plan = mergeDecisions(base, finalPicks, assistId);
    awaitingCinema.current = true;
    markPhaseStart();
    setPhase({ t: 'idle' });
    dispatch({ type: 'RESOLVE_LIVE_ROUND', plan });
  };

  const beginPrompts = (round: number) => {
    const current = tmRef.current;
    if (!current || current.isComplete) return;
    resetCinemaGuards();
    promptsForRound.current = round;
    const queue: DecisionKind[] = ['jungle'];
    if (round % 2 === 0) queue.push('siege');
    pickQueue.current = queue;
    picksRef.current = [];
    setScale(0.92);
    setCinemaRes(null);
    setActiveFloats([]);
    markPhaseStart();
    const first = queue.shift();
    if (first) setPhase({ t: 'prompt', kind: first });
    else resolveWithPicks([]);
  };

  useEffect(() => {
    if (!tm || tm.isComplete) return;
    if (awaitingCinema.current || awaitingQte.current) return;
    if (promptsForRound.current === tm.round) return;
    clearCinema();
    beginPrompts(tm.round);
    return () => {
      // No matar timers del claim post-QTE al subir de ronda
      if (!awaitingCinema.current && !awaitingQte.current) clearCinema();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tm?.round, tm?.isComplete]);

  useEffect(() => {
    const res = tm?.lastResolution;
    if (!res || !awaitingCinema.current) return;
    if (awaitingQte.current) return;
    // Post-QTE: el claim effect es el único dueño
    if (postQteClaim.current || needsPostQteClaim.current) return;
    if (cinemaForKey.current?.startsWith('claim-') || cinemaForKey.current?.startsWith('gank-done-')) return;
    const key = `lanes-${res.round}-${res.blueKillsDelta}-${res.redKillsDelta}-${res.pendingObjectiveQte ? 'qte' : 'ok'}`;
    if (cinemaForKey.current === key || cinemaForKey.current === `${key}-qte-pending`) return;
    cinemaForKey.current = res.pendingObjectiveQte ? `${key}-qte-pending` : key;
    playCinema(res);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tm?.lastResolution]);

  // QTE fantasma: fase qte sin pending → recuperar
  useEffect(() => {
    if (phase?.t !== 'qte') return;
    if (tm?.pendingObjective) return;
    awaitingQte.current = false;
    setPhase({ t: 'idle' });
    if (tm?.lastResolution && awaitingCinema.current) {
      endCinemaAndContinue(tm.lastResolution);
    } else if (tm && !awaitingCinema.current && promptsForRound.current !== tm.round) {
      beginPrompts(tm.round);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, tm?.pendingObjective, tm?.lastResolution]);

  // Watchdog: rescata idle / cine / QTE trabados (móvil, timers pausados)
  useEffect(() => {
    if (!tm || tm.isComplete) return;
    const id = window.setInterval(() => {
      const current = tmRef.current;
      if (!current || current.isComplete) return;
      const p = phaseRef.current;
      const elapsed = Date.now() - phaseStartedAt.current;
      const res = current.lastResolution;

      if (awaitingQte.current || p?.t === 'qte') {
        if (elapsed < QTE_STUCK_MS) return;
        awaitingQte.current = false;
        if (!current.pendingObjective) {
          setPhase({ t: 'idle' });
          if (res && awaitingCinema.current) {
            clearCinema();
            endCinemaAndContinue(res);
          } else if (!awaitingCinema.current) {
            beginPrompts(current.round);
          }
          return;
        }
        dispatch({
          type: 'RESOLVE_OBJECTIVE_QTE',
          qte: { skirmishWinner: null, attackingTeam: 'blue', monsterTaken: false },
        });
        return;
      }

      if (!awaitingCinema.current) {
        // Idle huérfano: misma ronda sin prompts activos
        if (
          p?.t === 'idle' &&
          promptsForRound.current === current.round &&
          elapsed > CINEMA_STUCK_MS &&
          !current.pendingObjective
        ) {
          beginPrompts(current.round);
        }
        return;
      }
      if (elapsed < CINEMA_STUCK_MS) return;
      if (!res) return;
      // Fail-open: cualquier fase si el cine lleva demasiado
      clearCinema();
      endCinemaAndContinue(res);
    }, 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tm?.round, tm?.isComplete]);

  // Al volver de background: si el cine debería haber terminado, forzar avance
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      const current = tmRef.current;
      if (!current || !awaitingCinema.current || awaitingQte.current) return;
      const elapsed = Date.now() - phaseStartedAt.current;
      if (elapsed < CINEMA_STUCK_MS) return;
      const res = current.lastResolution;
      if (res) {
        clearCinema();
        endCinemaAndContinue(res);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const objLabel = (cinemaRes?.objective ?? tm.objective)
    ? objectiveName(cinemaRes?.objective ?? tm.objective)
    : null;
  const focusLane = phase?.t === 'lane' ? phase.lane : null;
  const cinemaApproach = phase?.t === 'lane';
  const attackBeams: AttackBeam[] = (() => {
    if (phase?.t !== 'lane' || !phase.fight || !cinemaRes) return [];
    const beams: AttackBeam[] = [];
    for (const d of cinemaRes.duels) {
      if (d.lane !== phase.lane) continue;
      if (d.kind === 'duel' && d.blue && d.red) {
        beams.push({ fromId: d.blue.instanceId, toId: d.red.instanceId, toKind: 'champ' });
      } else if (d.kind === 'siege' && d.siegeTargetId) {
        const attacker = d.blue || d.red;
        if (attacker) {
          beams.push({ fromId: attacker.instanceId, toId: d.siegeTargetId, toKind: 'structure' });
        }
      }
    }
    return beams;
  })();

  const capsule =
    !phase || phase.t === 'idle' ? `Ronda ${tm.round}` :
    phase.t === 'prompt' ? 'Tu decisión…' :
    phase.t === 'lane' ? `Línea ${['Top', 'Mid', 'Bot'][phase.lane]}${phase.fight ? ' · Combate' : ''}` :
    phase.t === 'qte' ? '¡Pelea el objetivo!' :
    phase.t === 'objective' ? `Objetivo · ${objLabel || '…'}` :
    '…';

  const slot = Math.round(mapSize * 1.12);
  const displayRound = cinemaRes ? cinemaRes.round : tm.round;

  return (
    <div className={`flex-1 min-h-0 w-full bg-[#0A0E1A] flex flex-col overflow-hidden relative ${shake ? 'animate-screen-shake' : ''}`}>
      <CombatScreenFX signal={fx} />
      <CombatAnnounceOverlay batch={announceBatch} onBusyChange={setAnnounceBusy} />

      <div className="shrink-0 px-3 py-2 safe-top safe-chrome-x border-b border-[#1E2740] max-w-lg md:max-w-6xl mx-auto w-full md:px-4 md:py-3">
        <p className="text-[#C9A84C] text-[10px] md:text-xs uppercase tracking-wider">Partida en vivo</p>
        <div className="flex justify-between items-end gap-2">
          <h1 className="text-base md:text-xl font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
            Ronda {displayRound}/{tm.maxRounds}
          </h1>
          <p className="text-sm md:text-base font-bold">
            <span className="text-[#3498DB]">{tm.blue.kills}</span>
            <span className="text-[#8B9BB4]"> – </span>
            <span className="text-[#E74C3C]">{tm.red.kills}</span>
            <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8B9BB4]">kills</span>
          </p>
        </div>
      </div>

      <div
        ref={bodyRef}
        className="flex-1 min-h-0 overflow-hidden px-3 py-2 max-w-lg mx-auto w-full flex flex-col justify-between gap-2 md:max-w-6xl md:px-4 md:py-3 md:flex-row md:items-center md:justify-center md:gap-10"
      >
        <div className="flex flex-col items-center gap-1.5 md:gap-3 w-full min-h-0 md:w-auto md:shrink-0">
          <div className="rounded-full border border-[#C9A84C]/40 bg-[#141B2D] px-3 py-0.5 shrink-0">
            <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-[#C9A84C]">{capsule}</p>
          </div>

          <div className="relative flex items-center justify-center overflow-hidden shrink-0" style={{ width: slot, height: slot }}>
            <div className="transition-transform duration-700 ease-out" style={{ transform: `scale(${scale})`, width: mapSize, height: mapSize }}>
              <Minimap
                size={mapSize}
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
                highlightObjective={phase?.t === 'objective' || phase?.t === 'qte'}
                objectiveAnim={phase?.t === 'objective' ? phase.anim : 'none'}
                objectiveWinner={cinemaRes?.objectiveWinner ?? null}
                attackBeams={attackBeams}
                combatFloats={activeFloats}
              />
            </div>
          </div>

          <div className="w-full space-y-1.5 rounded-xl border border-[#1E2740] bg-[#0D1220] p-2 shrink-0" style={{ maxWidth: mapSize }}>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#8B9BB4] text-center">
              Estructuras
            </p>
            <StructureHpRow structures={tm.structures} team="blue" />
            <StructureHpRow structures={tm.structures} team="red" />
          </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-2 text-[11px] shrink-0 md:w-64 md:grid-cols-1 md:gap-3">
          <div className="rounded-lg border border-[#3498DB]/30 bg-[#3498DB]/10 px-2 py-1 md:py-4 md:px-3">
            <p className="text-[#8B9BB4]">Azul</p>
            <p className="font-bold text-[#F0E6D2] truncate md:text-sm">{tm.blue.name}</p>
            <p className="text-base md:text-2xl font-bold text-[#3498DB] mt-0.5 md:mt-1">{tm.blue.kills}</p>
            <p className="text-[10px] uppercase tracking-wider text-[#8B9BB4]">Kills</p>
          </div>
          <div className="rounded-lg border border-[#E74C3C]/30 bg-[#E74C3C]/10 px-2 py-1 text-right md:text-left md:py-4 md:px-3">
            <p className="text-[#8B9BB4]">Rojo</p>
            <p className="font-bold text-[#F0E6D2] truncate md:text-sm">{tm.red.name}</p>
            <p className="text-base md:text-2xl font-bold text-[#E74C3C] mt-0.5 md:mt-1">{tm.red.kills}</p>
            <p className="text-[10px] uppercase tracking-wider text-[#8B9BB4]">Kills</p>
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

      {phase?.t === 'qte' && tm.pendingObjective && (
        <ObjectiveMinigame
          pending={tm.pendingObjective}
          blueChampions={tm.blue.champions}
          redChampions={tm.red.champions}
          onComplete={onQteComplete}
        />
      )}
    </div>
  );
}
