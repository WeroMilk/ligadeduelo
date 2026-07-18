import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, BarChart3 } from 'lucide-react';
import { useGame } from '@/hooks/useGameState';
import Minimap, { type AttackBeam, type ObjectiveAnimPhase, type SpectacleBurst } from '@/components/Minimap';
import DecisionOverlay, { type DecisionKind, type DecisionPayload } from '@/components/DecisionOverlay';
import CombatScreenFX, { type ScreenFxKind } from '@/components/CombatScreenFX';
import CombatAnnounceOverlay, { type AnnounceItem } from '@/components/CombatAnnounceOverlay';
import CombatHitOverlay from '@/components/CombatHitOverlay';
import ObjectiveMinigame, { type ObjectiveQtePayload } from '@/components/ObjectiveMinigame';
import CoopPvpDecisionFlow from '@/components/CoopPvpDecisionFlow';
import CoopClickBattle from '@/components/CoopClickBattle';
import MatchStatsModal from '@/components/MatchStatsModal';
import AdInterstitial, { QTE_REPLAY_AD_MS } from '@/components/AdInterstitial';
import { generateAIPlan, champDef, livingJungler } from '@/lib/turn-engine';
import { isCoopLocal } from '@/lib/coop';
import {
  MAX_QTE_REPLAYS_PER_MATCH,
  canReplayQte,
  qteReplaysRemaining,
} from '@/lib/qte-rules';
import { pushAdHidden, popAdHidden } from '@/lib/ad-visibility';
import { createPausableScheduler } from '@/lib/pausable-scheduler';
import { objectiveName } from '@/lib/game-data';
import { getMatchTimings } from '@/lib/express-mode';
import type { CombatFloat, LaneId, RoundResolution, Structure, TeamPlan } from '@/types/game';

const MAP_SIZE_MOBILE_MAX = 260;
const MAP_SIZE_MOBILE_MIN = 120;
/** Capsula + anuncios + estructuras + stats + marcador + gaps en móvil. */
const MOBILE_BELOW_MAP_RESERVE = 292;
const MAP_SLOT_SCALE = 1.08;
const DESKTOP_SIDEBAR_W = 288;
const DESKTOP_MAP_MAX = 460;
const DESKTOP_MAP_MIN = 200;

function useMapSize(containerRef: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState(220);
  useEffect(() => {
    const el = containerRef.current;
    const update = () => {
      if (!el) return;
      const desktop = window.matchMedia('(min-width: 768px)').matches;
      const h = el.clientHeight;
      const w = el.clientWidth;

      if (desktop) {
        // Escritorio: mapa a la izquierda; estructuras y marcador en panel lateral
        const reserved = 56;
        const availW = w - DESKTOP_SIDEBAR_W - 24;
        const byH = Math.floor((h - reserved) / MAP_SLOT_SCALE);
        const byW = Math.floor(Math.max(160, availW) / MAP_SLOT_SCALE);
        setSize(Math.max(DESKTOP_MAP_MIN, Math.min(DESKTOP_MAP_MAX, byH, byW)));
        return;
      }

      // Móvil: encajar mapa + paneles en el viewport sin scroll
      const byH = Math.floor((h - MOBILE_BELOW_MAP_RESERVE) / MAP_SLOT_SCALE);
      const byW = Math.floor(w - 12);
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
const CINEMA_STUCK_MS_MIN = 12000;
const QTE_STUCK_MS = 55000;

function laneCameraPan(lane: LaneId): { x: number; y: number } {
  if (lane === 0) return { x: 10, y: 8 };
  if (lane === 2) return { x: -10, y: -8 };
  return { x: 0, y: 0 };
}

/** Posición aproximada en el minimapa por carril/equipo (para FX de muerte). */
function approxLanePos(team: 'blue' | 'red', lane: LaneId): { x: number; y: number } {
  const mid = lane === 0 ? { x: 0.22, y: 0.32 } : lane === 2 ? { x: 0.62, y: 0.72 } : { x: 0.42, y: 0.52 };
  if (team === 'blue') return mid;
  return { x: 1 - mid.x + 0.08, y: 1 - mid.y - 0.08 };
}

/** HP estructural previo al cine: deshace floats de torre/nexo sobre una copia. */
function structuresBeforeCinema(structures: Structure[], floats: CombatFloat[]): Structure[] {
  const clone = structures.map(s => ({ ...s }));
  const structureFloats = floats.filter(f => f.targetType === 'tower' || f.targetType === 'nexus');
  for (let i = structureFloats.length - 1; i >= 0; i--) {
    const f = structureFloats[i];
    const s = clone.find(x => x.id === f.targetId);
    if (!s) continue;
    const hp = f.structureHpBefore != null
      ? f.structureHpBefore
      : Math.min(s.maxHp, s.hp + Math.max(0, f.amount));
    s.hp = hp;
    s.isDestroyed = hp <= 0;
  }
  return clone;
}

function applyStructureHitVisual(structures: Structure[], hit: CombatFloat): Structure[] {
  if (hit.targetType !== 'tower' && hit.targetType !== 'nexus') return structures;
  return structures.map(s => {
    if (s.id !== hit.targetId) return s;
    const hp = hit.structureHpAfter != null
      ? hit.structureHpAfter
      : Math.max(0, s.hp - Math.max(0, hit.amount));
    return { ...s, hp, isDestroyed: hp <= 0 };
  });
}

type Phase =
  | { t: 'prompt'; kind: DecisionKind }
  | { t: 'lane'; lane: LaneId; fight: boolean }
  | { t: 'objective'; anim: ObjectiveAnimPhase }
  | { t: 'qte' }
  | { t: 'qte_result' }
  | { t: 'idle' };

type FxSignal = { kind: ScreenFxKind; label?: string; team?: 'blue' | 'red' | 'neutral'; nonce: number };

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

function StructureHpRow({ structures, team }: { structures: Structure[]; team: 'blue' | 'red' }) {
  const towers = [0, 1, 2].map(lane =>
    structures.find(s => s.type === 'tower' && s.team === team && s.lane === lane),
  );
  const nexus = structures.find(s => s.type === 'nexus' && s.team === team);
  const color = team === 'blue' ? '#3498DB' : '#E74C3C';
  const labels = ['Sup', 'Cen', 'Inf'];

  const bar = (s: Structure | undefined, label: string) => {
    const destroyed = !s || s.isDestroyed || s.hp <= 0;
    const pct = destroyed ? 0 : Math.max(0, Math.min(100, (s!.hp / s!.maxHp) * 100));
    return (
      <div key={label} className="flex-1 min-w-0">
        <div className="flex justify-between text-[9px] leading-tight">
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
  const timings = useMemo(() => getMatchTimings(state.gameMode), [state.gameMode]);
  const isCoop = isCoopLocal(state.gameMode);
  const isCoopPvp = isCoop && !!state.currentMatch?.isPvpMatch;
  const isCoopSolo = isCoop && !!state.currentMatch?.isPlayerMatch && !isCoopPvp;
  const humanSide = state.playerSide ?? 'blue';
  const bodyRef = useRef<HTMLDivElement>(null);
  const mapSize = useMapSize(bodyRef);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [promptLeft, setPromptLeft] = useState(timings.promptSec);
  const [scale, setScale] = useState(0.92);
  const [fx, setFx] = useState<FxSignal | null>(null);
  const [shake, setShake] = useState<'none' | 'soft' | 'hard'>('none');
  const [punch, setPunch] = useState(0);
  const [spectacleBursts, setSpectacleBursts] = useState<SpectacleBurst[]>([]);
  const [cinemaRes, setCinemaRes] = useState<RoundResolution | null>(null);
  /** HP de torres/nexos sincronizado con el golpe narrado (null = usar estado real). */
  const [visualStructures, setVisualStructures] = useState<Structure[] | null>(null);
  const [activeFloats, setActiveFloats] = useState<CombatFloat[]>([]);
  const [activeHit, setActiveHit] = useState<CombatFloat | null>(null);
  const [camPan, setCamPan] = useState({ x: 0, y: 0 });
  const [announceBatch, setAnnounceBatch] = useState<{ items: AnnounceItem[]; nonce: number } | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [pauseBeforeStats, setPauseBeforeStats] = useState(false);
  const [pendingQteResult, setPendingQteResult] = useState<ObjectiveQtePayload | null>(null);
  const [qteAttempt, setQteAttempt] = useState(0);
  const [qteReplayCount, setQteReplayCount] = useState(0);
  const [showReplayAd, setShowReplayAd] = useState(false);
  const pickQueue = useRef<DecisionKind[]>([]);
  const picksRef = useRef<DecisionPayload[]>([]);
  const cinemaScheduler = useRef(createPausableScheduler());
  const promptsForRound = useRef<number | null>(null);
  const cinemaForKey = useRef<string | null>(null);
  const postQteClaim = useRef(false);
  const needsPostQteClaim = useRef(false);
  const awaitingCinema = useRef(false);
  const awaitingQte = useRef(false);
  const phaseRef = useRef<Phase | null>(null);
  const tmRef = useRef(tm);
  const phaseStartedAt = useRef(Date.now());
  const cinemaStuckMs = useRef(CINEMA_STUCK_MS_MIN);
  const pausedAccumMs = useRef(0);
  const pauseStartedAt = useRef<number | null>(null);
  const fxNonce = useRef(0);
  const announceNonce = useRef(0);
  const announcedKeys = useRef<Set<string>>(new Set());
  const isPausedRef = useRef(false);
  const showReplayAdRef = useRef(false);
  const pendingQteRef = useRef<ObjectiveQtePayload | null>(null);
  const statsOpenRef = useRef(false);

  phaseRef.current = phase;
  tmRef.current = tm;
  isPausedRef.current = isPaused;
  showReplayAdRef.current = showReplayAd;
  pendingQteRef.current = pendingQteResult;
  statsOpenRef.current = statsOpen;

  const matchFrozen = isPaused || showReplayAd || !!pendingQteResult || statsOpen;

  // Banner oculto durante toda la partida en vivo (evita solapar estructuras/marcador)
  useEffect(() => {
    pushAdHidden();
    return () => popAdHidden();
  }, []);

  useEffect(() => {
    cinemaScheduler.current.setPaused(matchFrozen);
    if (matchFrozen) {
      if (pauseStartedAt.current == null) pauseStartedAt.current = Date.now();
    } else if (pauseStartedAt.current != null) {
      pausedAccumMs.current += Date.now() - pauseStartedAt.current;
      pauseStartedAt.current = null;
    }
  }, [matchFrozen]);

  const effectiveElapsed = () => {
    const frozenExtra =
      pauseStartedAt.current != null ? Date.now() - pauseStartedAt.current : 0;
    return Date.now() - phaseStartedAt.current - pausedAccumMs.current - frozenExtra;
  };

  const enqueueAnnounces = (items: AnnounceItem[], key: string) => {
    if (items.length === 0) return 0;
    if (announcedKeys.current.has(key)) return 0;
    announcedKeys.current.add(key);
    announceNonce.current += 1;
    setAnnounceBatch({ items, nonce: announceNonce.current });
    return items.length;
  };

  const killAnnouncesToItems = (announces: RoundResolution['killAnnounces']): AnnounceItem[] =>
    (announces || []).map(k => ({ kind: 'kill' as const, data: k }));

  /** Avanza el cine tras la animación mínima; los popups siguen en paralelo. */
  const endCinemaAfterDelay = (res: RoundResolution, minWaitMs = 0) => {
    cinemaScheduler.current.schedule(() => endCinemaAndContinue(res), Math.max(0, minWaitMs));
  };

  const resetCinemaGuards = () => {
    cinemaForKey.current = null;
    postQteClaim.current = false;
  };

  const markPhaseStart = () => {
    phaseStartedAt.current = Date.now();
    pausedAccumMs.current = 0;
    pauseStartedAt.current = matchFrozen || isPausedRef.current ? Date.now() : null;
  };

  const pushBursts = (bursts: SpectacleBurst[]) => {
    if (bursts.length === 0) return;
    setSpectacleBursts(prev => [...prev.slice(-8), ...bursts]);
    const ids = new Set(bursts.map(b => b.id));
    window.setTimeout(() => {
      setSpectacleBursts(prev => prev.filter(b => !ids.has(b.id)));
    }, 900);
  };

  const fireFx = (kind: ScreenFxKind, label?: string, team?: FxSignal['team']) => {
    fxNonce.current += 1;
    setFx({ kind, label, team, nonce: fxNonce.current });
    const isNexus = !!label && /NEXO/i.test(label);
    const level: 'none' | 'soft' | 'hard' =
      kind === 'kill' || (kind === 'tower' && isNexus) ? 'hard'
      : kind === 'hit' || kind === 'tower' || kind === 'objective' ? 'soft'
      : 'none';
    if (level !== 'none') {
      setShake(level);
      window.setTimeout(() => setShake('none'), level === 'hard' ? 460 : 340);
    }
    if (kind === 'kill' || kind === 'tower' || kind === 'objective') {
      setPunch(p => p + 1);
    }
  };

  const assistCandidates = useMemo(() => {
    if (!tm) return [];
    const champs = humanSide === 'red' ? tm.red.champions : tm.blue.champions;
    return champs.filter(c => {
      if (!c.isAlive || c.stats.hp <= 0) return false;
      const def = champDef(c);
      return def.role !== 'jungle';
    });
  }, [tm, humanSide]);

  const clearCinema = () => {
    cinemaScheduler.current.clearAll();
  };

  const endCinemaAndContinue = (res: RoundResolution) => {
    const current = tmRef.current;
    awaitingCinema.current = false;
    awaitingQte.current = false;
    needsPostQteClaim.current = false;
    resetCinemaGuards();
    cinemaStuckMs.current = CINEMA_STUCK_MS_MIN;
    setActiveFloats([]);
    setActiveHit(null);
    setSpectacleBursts([]);
    setVisualStructures(null);
    setCamPan({ x: 0, y: 0 });
    setCinemaRes(null);
    setPhase({ t: 'idle' });
    markPhaseStart();
    if (res.matchOver || current?.isComplete || current?.winner) {
      dispatch({ type: 'FINISH_LIVE_MATCH' });
      return;
    }
    if (current) beginPrompts(current.round);
  };

  const playObjectiveClaim = (res: RoundResolution, announceQteKills = false) => {
    clearCinema();
    markPhaseStart();
    setCinemaRes(res);
    setActiveHit(null);
    setActiveFloats([]);
    setVisualStructures(null);
    setCamPan({ x: 0, y: 0 });
    setScale(1.12);
    const objItems: AnnounceItem[] = res.objectiveBonus
      ? [{ kind: 'objective', data: res.objectiveBonus }]
      : [];
    // Tras QTE: solo kills nuevas del objetivo; sin QTE ya se anunciaron al inicio del cine
    const items = announceQteKills
      ? [...killAnnouncesToItems(res.killAnnounces), ...objItems]
      : objItems;
    enqueueAnnounces(
      items,
      announceQteKills
        ? `obj-qte-${res.round}-${res.objectiveWinner}-${res.objectiveBonus?.id || 'x'}`
        : `obj-${res.round}-${res.objectiveWinner}-${res.objectiveBonus?.id || 'x'}`,
    );
    const schedule = (fn: () => void, ms: number) => {
      cinemaScheduler.current.schedule(fn, ms);
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
    // Mínimo el claim corto; popups no bloquean el avance
    endCinemaAfterDelay(res, timings.nexusClaimMs);
  };

  const playCinema = (res: RoundResolution) => {
    const current = tmRef.current;
    if (!current) return;
    clearCinema();
    markPhaseStart();
    setCinemaRes(res);
    setScale(1.08);
    setActiveFloats([]);
    setActiveHit(null);
    setCamPan({ x: 0, y: 0 });

    // Kills de líneas al empezar el cine (aliados y enemigos)
    const laneKills = (res.killAnnounces || []).map(k => ({ kind: 'kill' as const, data: k }));
    if (laneKills.length > 0) {
      enqueueAnnounces(laneKills, `kills-${res.round}-${res.blueKillsDelta}-${res.redKillsDelta}`);
    }

    // Choque de junglas o QTE de nexo: al instante (sin esperar el cine de líneas)
    if (
      res.pendingObjectiveQte
      && (current.pendingObjective?.kind === 'gank'
        || current.pendingObjective?.kind === 'nexus_defense'
        || current.pendingObjective?.kind === 'nexus_assault')
    ) {
      awaitingQte.current = true;
      needsPostQteClaim.current = true;
      setVisualStructures(null);
      setPhase({ t: 'qte' });
      return;
    }

    // HP estructural se revela golpe a golpe (no el resultado ya aplicado del motor).
    setVisualStructures(structuresBeforeCinema(current.structures, res.floats || []));

    // Daños y curaciones se narran uno a uno. El sort moderno es estable,
    // así que conserva el orden de emisión dentro de cada línea.
    const orderedHits = [...(res.floats || [])]
      .sort((a, b) => (a.lane ?? 1) - (b.lane ?? 1));

    const laneCount = new Set(orderedHits.map(h => h.lane ?? 1)).size || 1;
    const estimatedMs =
      orderedHits.length * timings.hitPauseMs
      + laneCount * timings.laneIntroMs
      + timings.cinemaBufferMs;
    cinemaStuckMs.current = Math.max(CINEMA_STUCK_MS_MIN, estimatedMs);

    const schedule = (fn: () => void, ms: number) => {
      cinemaScheduler.current.schedule(fn, ms);
    };

    let t = 0;
    let lastLane: LaneId | null = null;

    if (orderedHits.length === 0) {
      setPhase({ t: 'lane', lane: 0, fight: false });
      t = timings.laneIntroMs;
    } else {
      for (const hit of orderedHits) {
        const lane = (hit.lane ?? 1) as LaneId;
        if (lastLane !== lane) {
          schedule(() => {
            setPhase({ t: 'lane', lane, fight: false });
            setActiveFloats([]);
            setActiveHit(null);
            setScale(1.14);
            setCamPan(laneCameraPan(lane));
          }, t);
          t += timings.laneIntroMs;
          lastLane = lane;
        }
        schedule(() => {
          setPhase({ t: 'lane', lane, fight: true });
          setActiveFloats([hit]);
          setActiveHit(hit);
          setScale(1.22);
          setCamPan(laneCameraPan(lane));
          if (hit.targetType === 'tower' || hit.targetType === 'nexus') {
            setVisualStructures(prev => applyStructureHitVisual(prev ?? current.structures, hit));
          }
          if (hit.kind === 'damage') {
            fireFx(
              'hit',
              undefined,
              hit.sourceTeam === 'blue' ? 'blue' : hit.sourceTeam === 'red' ? 'red' : 'neutral',
            );
          }
        }, t);
        t += timings.hitPauseMs;
      }
    }

    schedule(() => {
      setActiveHit(null);
      setActiveFloats([]);
      const live = tmRef.current;
      const allChamps = live ? [...live.blue.champions, ...live.red.champions] : [];
      const deathBursts: SpectacleBurst[] = [];
      for (const ka of res.killAnnounces || []) {
        for (const name of ka.victimNames) {
          const victim = allChamps.find(c => champDef(c).name === name);
          if (!victim) continue;
          const lane = (victim.position.lane ?? 1) as LaneId;
          const pos = approxLanePos(victim.team, lane);
          deathBursts.push({
            id: `death-${res.round}-${name}-${Date.now()}`,
            kind: 'death',
            x: pos.x,
            y: pos.y,
            team: victim.team,
          });
        }
      }
      if (deathBursts.length > 0) pushBursts(deathBursts);

      const totalKills = (res.blueKillsDelta ?? 0) + (res.redKillsDelta ?? 0);
      if (totalKills > 0) {
        const killerSide = (res.blueKillsDelta ?? 0) >= (res.redKillsDelta ?? 0) ? 'blue' : 'red';
        fireFx('kill', totalKills > 1 ? `¡${totalKills} BAJAS!` : '¡BAJA!', killerSide);
      }
      const towers = (res.towersTakenBlue ?? 0) + (res.towersTakenRed ?? 0);
      if (towers > 0 && !res.autoNexus) {
        fireFx('tower', '¡Torre caída!', (res.towersTakenBlue ?? 0) > 0 ? 'blue' : 'red');
        const destroyed = (live?.structures || []).filter(s => s.type === 'tower' && s.isDestroyed);
        pushBursts(
          destroyed.slice(-towers).map((s, i) => ({
            id: `tower-${res.round}-${s.id}-${i}`,
            kind: 'tower' as const,
            x: s.team === 'blue' ? 0.22 + s.lane * 0.12 : 0.78 - s.lane * 0.12,
            y: s.team === 'blue' ? 0.78 - s.lane * 0.12 : 0.22 + s.lane * 0.12,
            team: s.team,
          })),
        );
      }
      if (res.autoNexus) {
        const playerWon = res.winner === 'blue';
        fireFx(
          'tower',
          playerWon ? '¡NEXO ENEMIGO DESTRUIDO!' : '¡TU NEXO FUE DESTRUIDO!',
          playerWon ? 'blue' : 'red',
        );
        const nexusTeam = playerWon ? 'red' : 'blue';
        pushBursts([{
          id: `nexus-${res.round}`,
          kind: 'nexus',
          x: nexusTeam === 'blue' ? 0.12 : 0.88,
          y: nexusTeam === 'blue' ? 0.88 : 0.12,
          team: nexusTeam,
        }]);
      }
    }, Math.max(200, t - 100));

    schedule(() => {
      setActiveHit(null);
      setActiveFloats([]);
      setCamPan({ x: 0, y: 0 });
      setScale(1.08);
      const live = tmRef.current;
      if (res.pendingObjectiveQte && live?.pendingObjective) {
        awaitingQte.current = true;
        needsPostQteClaim.current = true;
        markPhaseStart();
        setPhase({ t: 'qte' });
        return;
      }
      if (res.pendingObjectiveQte && !live?.pendingObjective) {
        endCinemaAfterDelay(res, res.autoNexus ? timings.nexusClaimMs : 0);
        return;
      }
      if (res.objective || res.objectiveWinner || res.objectiveBonus) {
        playObjectiveClaim(res);
      } else {
        endCinemaAfterDelay(res, res.autoNexus ? timings.nexusClaimMs : 0);
      }
    }, t + 400);
  };

  /** Victoria del jugador humano en bolitas / clicks. */
  const playerWonQte = (qte: ObjectiveQtePayload) => {
    if (qte.skirmishWinner && qte.skirmishWinner !== humanSide) return false;
    if (qte.skirmishWinner === humanSide) return qte.monsterTaken;
    return qte.monsterTaken && qte.attackingTeam === humanSide;
  };

  const confirmQteResult = (qte: ObjectiveQtePayload) => {
    awaitingQte.current = false;
    setPendingQteResult(null);
    setShowReplayAd(false);
    markPhaseStart();
    setPhase({ t: 'idle' });
    dispatch({ type: 'RESOLVE_OBJECTIVE_QTE', qte });
  };

  const onQteComplete = (qte: ObjectiveQtePayload) => {
    if (isCoopPvp || playerWonQte(qte)) {
      confirmQteResult(qte);
      return;
    }
    awaitingQte.current = true;
    markPhaseStart();
    setPendingQteResult(qte);
    setPhase({ t: 'qte_result' });
  };

  const requestQteReplay = () => {
    if (
      !pendingQteResult
      || playerWonQte(pendingQteResult)
      || !canReplayQte(qteReplayCount)
    ) return;
    setShowReplayAd(true);
  };

  const onReplayAdComplete = useCallback(() => {
    setShowReplayAd(false);
    setPendingQteResult(null);
    setQteReplayCount(n => Math.min(MAX_QTE_REPLAYS_PER_MATCH, n + 1));
    setQteAttempt(n => n + 1);
    awaitingQte.current = true;
    phaseStartedAt.current = Date.now();
    pausedAccumMs.current = 0;
    pauseStartedAt.current = isPausedRef.current ? Date.now() : null;
    setPhase({ t: 'qte' });
  }, []);

  const openStats = () => {
    setPauseBeforeStats(isPaused);
    setIsPaused(true);
    setStatsOpen(true);
  };

  const closeStats = () => {
    setStatsOpen(false);
    setIsPaused(pauseBeforeStats);
  };

  const togglePause = () => {
    if (showReplayAd || pendingQteResult) return;
    setIsPaused(p => !p);
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
      playObjectiveClaim(res, true);
    } else {
      // Choque de junglas: sin claim de monstruo; kills de línea ya se anunciaron en playCinema
      cinemaForKey.current = `gank-done-${res.round}`;
      postQteClaim.current = true;
      const gankKills = killAnnouncesToItems(res.killAnnounces);
      if (gankKills.length > 0) {
        enqueueAnnounces(
          gankKills,
          `gank-kills-${res.round}-${res.blueKillsDelta}-${res.redKillsDelta}`,
        );
      }
      endCinemaAfterDelay(res);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tm?.lastResolution, tm?.pendingObjective]);

  const resolveWithPicks = (finalPicks: DecisionPayload[]) => {
    if (!tm) return;
    const side = humanSide;
    const team = side === 'blue' ? tm.blue : tm.red;
    const junglerReady = !!livingJungler(team);
    const humanPlan = mergeDecisions(generateAIPlan(tm, side), finalPicks, junglerReady);
    awaitingCinema.current = true;
    markPhaseStart();
    setPhase({ t: 'idle' });
    if (side === 'blue') {
      dispatch({ type: 'RESOLVE_LIVE_ROUND', bluePlan: humanPlan });
    } else {
      dispatch({ type: 'RESOLVE_LIVE_ROUND', redPlan: humanPlan });
    }
  };

  const simulateHumanTurn = () => {
    if (!tm) return;
    const side = humanSide;
    const team = side === 'blue' ? tm.blue : tm.red;
    if (!livingJungler(team)) {
      pickQueue.current = [];
      resolveWithPicks([]);
      return;
    }
    const aiPlan = generateAIPlan(tm, side);
    const picks: DecisionPayload[] = [];
    if (aiPlan.jungleTarget !== undefined) {
      picks.push({ kind: 'jungle', target: aiPlan.jungleTarget });
      if (
        aiPlan.jungleTarget === 'objective'
        && tm.objective
        && aiPlan.objectiveAssistId
        && assistCandidates.some(c => c.instanceId === aiPlan.objectiveAssistId)
      ) {
        picks.push({ kind: 'assist', champId: aiPlan.objectiveAssistId });
      }
    }
    pickQueue.current = [];
    resolveWithPicks(picks);
  };

  const simulateLiveMatch = () => {
    if (!window.confirm('¿Simular el resto de esta partida automáticamente?')) return;
    dispatch({ type: 'SIMULATE_LIVE_MATCH' });
  };

  const beginPrompts = (round: number) => {
    const current = tmRef.current;
    if (!current || current.isComplete) return;
    if (isCoopPvp) {
      promptsForRound.current = round;
      return;
    }
    resetCinemaGuards();
    promptsForRound.current = round;
    picksRef.current = [];
    setScale(0.92);
    setCinemaRes(null);
    setActiveFloats([]);
    setActiveHit(null);
    setCamPan({ x: 0, y: 0 });
    markPhaseStart();

    const humanTeam = humanSide === 'red' ? current.red : current.blue;
    if (!livingJungler(humanTeam)) {
      pickQueue.current = [];
      resolveWithPicks([]);
      return;
    }

    const queue: DecisionKind[] = ['jungle'];
    pickQueue.current = queue;
    const first = queue.shift();
    if (first) setPhase({ t: 'prompt', kind: first });
    else resolveWithPicks([]);
  };

  useEffect(() => {
    if (!tm || tm.isComplete) return;
    if (awaitingCinema.current || awaitingQte.current) return;
    if (promptsForRound.current === tm.round) return;
    // Nueva ronda: limpiar guards stale del cine anterior
    if (tm.lastResolution && tm.lastResolution.round !== tm.round) {
      awaitingCinema.current = false;
      awaitingQte.current = false;
      needsPostQteClaim.current = false;
      postQteClaim.current = false;
      cinemaForKey.current = null;
    }
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
      // Congelado: pausa, anuncio de repetición o pantalla Continuar/Repetir
      if (
        isPausedRef.current
        || statsOpenRef.current
        || showReplayAdRef.current
        || pendingQteRef.current
        || phaseRef.current?.t === 'qte_result'
      ) {
        return;
      }
      const p = phaseRef.current;
      const elapsed = effectiveElapsed();
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
          elapsed > cinemaStuckMs.current &&
          !current.pendingObjective
        ) {
          beginPrompts(current.round);
        }
        return;
      }
      if (elapsed < cinemaStuckMs.current) return;
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
      if (isPausedRef.current || statsOpenRef.current || showReplayAdRef.current || pendingQteRef.current) return;
      const current = tmRef.current;
      if (!current || !awaitingCinema.current || awaitingQte.current) return;
      const elapsed = effectiveElapsed();
      if (elapsed < cinemaStuckMs.current) return;
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
    setPromptLeft(timings.promptSec);
    let autoPicked = false;
    const iv = window.setInterval(() => {
      if (isPausedRef.current || statsOpenRef.current || showReplayAdRef.current || autoPicked) return;
      setPromptLeft(s => {
        const next = Math.max(0, s - 1);
        if (next === 0 && !autoPicked) {
          autoPicked = true;
          const kind = (phaseRef.current && phaseRef.current.t === 'prompt')
            ? phaseRef.current.kind
            : 'jungle';
          let def: DecisionPayload;
          if (kind === 'jungle') {
            def = { kind: 'jungle', target: tmRef.current?.objective ? 'objective' : 1 };
          } else {
            const fallback = assistCandidates[0]?.instanceId
              || tmRef.current?.blue.champions.find(c => c.isAlive)?.instanceId
              || '';
            def = { kind: 'assist', champId: fallback };
          }
          window.setTimeout(() => {
            if (isPausedRef.current || statsOpenRef.current || pendingQteRef.current || showReplayAdRef.current) return;
            if (phaseRef.current?.t !== 'prompt') return;
            acceptPick(def);
          }, 0);
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase?.t === 'prompt' ? (phase as { kind: DecisionKind }).kind : null, tm?.round]);

  function acceptPick(payload: DecisionPayload) {
    const next = [...picksRef.current.filter(p => p.kind !== payload.kind), payload];
    picksRef.current = next;

    const current = tmRef.current;
    const sideTeam = humanSide === 'red' ? current?.red : current?.blue;

    if (
      payload.kind === 'jungle'
      && payload.target === 'objective'
      && current?.objective
      && sideTeam
      && livingJungler(sideTeam)
      && assistCandidates.length > 0
    ) {
      pickQueue.current = ['assist', ...pickQueue.current.filter(k => k !== 'assist')];
    }

    const nextKind = pickQueue.current.shift();
    if (nextKind) {
      setPhase({ t: 'prompt', kind: nextKind });
    } else {
      resolveWithPicks(next);
    }
  }

  const handlePvpResolve = (bluePlan: TeamPlan, redPlan: TeamPlan) => {
    awaitingCinema.current = true;
    markPhaseStart();
    setPhase({ t: 'idle' });
    dispatch({ type: 'RESOLVE_LIVE_ROUND', bluePlan, redPlan });
  };

  if (!tm) return null;

  const objLabel = (cinemaRes?.objective ?? tm.objective)
    ? objectiveName(cinemaRes?.objective ?? tm.objective)
    : null;
  const focusLane = phase?.t === 'lane' ? phase.lane : null;
  const cinemaApproach = phase?.t === 'lane' && !!phase.fight;
  const attackBeams: AttackBeam[] = (() => {
    if (!activeHit?.sourceId) return [];
    if (activeHit.kind === 'heal' && activeHit.sourceId === activeHit.targetId) return [];
    return [{
      fromId: activeHit.sourceId,
      toId: activeHit.targetId,
      toKind: activeHit.targetType === 'champ' ? 'champ' : 'structure',
      effectKind: activeHit.kind,
      sourceTeam: activeHit.sourceTeam,
    }];
  })();

  const slot = Math.round(mapSize * MAP_SLOT_SCALE);
  const displayRound = cinemaRes ? cinemaRes.round : tm.round;
  const capsule =
    !phase || phase.t === 'idle' ? `Ronda ${displayRound}` :
    phase.t === 'prompt' ? 'Tu decisión…' :
    phase.t === 'lane' ? `Línea ${['Superior', 'Central', 'Inferior'][phase.lane]}${phase.fight ? ' · Combate' : ''}` :
    phase.t === 'qte' ? '¡Pelea el objetivo!' :
    phase.t === 'qte_result' ? 'Resultado del combate' :
    phase.t === 'objective' ? `Objetivo · ${objLabel || '…'}` :
    '…';

  const pauseBlocked = !!pendingQteResult || showReplayAd;
  const qteReplaysLeft = qteReplaysRemaining(qteReplayCount);
  const displayStructures = visualStructures ?? tm.structures;

  return (
    <div className={`flex-1 min-h-0 w-full bg-[#0A0E1A] flex flex-col overflow-hidden relative ${shake === 'hard' ? 'animate-screen-shake-hard' : shake === 'soft' ? 'animate-screen-shake' : ''}`}>
      <div className="shrink-0 px-3 pb-2 pt-0 safe-top safe-chrome-x border-b border-[#1E2740] max-w-lg md:max-w-6xl mx-auto w-full md:px-4 md:py-3">
        <p className="text-[#C9A84C] text-[10px] md:text-xs uppercase tracking-wider">Partida en vivo</p>
        <div className="flex justify-between items-center gap-2">
          <h1 className="text-base md:text-xl font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
            Ronda {displayRound}/{tm.maxRounds}
          </h1>
        <div className="flex items-center gap-1.5 shrink-0">
          {isCoop && (
            <button
              type="button"
              onClick={simulateLiveMatch}
              disabled={pauseBlocked}
              className="rounded-full border border-[#8B9BB4]/40 bg-[#141B2D] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#8B9BB4] active:scale-95 disabled:opacity-40"
            >
              Simular
            </button>
          )}
          <button
            type="button"
            onClick={togglePause}
            disabled={pauseBlocked}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 ${
              isPaused
                ? 'border-[#2ECC71]/50 bg-[#2ECC71]/15 text-[#2ECC71]'
                : 'border-[#C9A84C]/50 bg-[#C9A84C]/12 text-[#C9A84C]'
            }`}
            aria-label={isPaused ? 'Continuar partida' : 'Pausar partida'}
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {isPaused ? 'Continuar' : 'Pausa'}
          </button>
        </div>
        </div>
      </div>

      <div
        ref={bodyRef}
        className="flex-1 min-h-0 overflow-hidden md:overflow-y-auto overscroll-contain scrollbar-hide px-2 py-1.5 w-full max-w-lg mx-auto flex flex-col gap-1.5 md:max-w-6xl md:px-4 md:py-2 md:flex-row md:items-stretch md:justify-center md:gap-6 lg:gap-8"
      >
        <div className="flex w-full min-h-0 flex-1 flex-col items-center justify-between gap-1 md:flex-none md:justify-center md:gap-2 md:flex-1 md:min-w-0">
          <div key={capsule} className="rounded-full border border-[#C9A84C]/40 bg-[#141B2D] px-3 py-0.5 shrink-0 animate-scale-in">
            <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-[#C9A84C]">{capsule}</p>
          </div>

          <div className="relative flex shrink-0 items-center justify-center overflow-hidden mx-auto" style={{ width: slot, height: slot, maxWidth: '100%' }}>
            <div
              key={`punch-${punch}`}
              className={punch > 0 ? 'animate-fx-punch' : undefined}
              style={{ width: mapSize, height: mapSize }}
            >
            <div
              className="transition-transform duration-500 ease-out"
              style={{
                transform: `translate(${camPan.x}%, ${camPan.y}%) scale(${scale})`,
                width: mapSize,
                height: mapSize,
              }}
            >
              <Minimap
                size={mapSize}
                blueChampions={tm.blue.champions}
                redChampions={tm.red.champions}
                structures={displayStructures}
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
                impactTargetId={activeHit?.targetId ?? null}
                lungeFromId={activeHit?.kind === 'damage' ? activeHit.sourceId ?? null : null}
                activeEffectKind={activeHit?.kind ?? null}
                activeSourceTeam={activeHit?.sourceTeam ?? null}
                spectacleBursts={spectacleBursts}
                ultimateIds={[
                  ...(state.playerPlan?.ultimates || []),
                  ...(state.enemyPlanPreview?.ultimates || []),
                ]}
              />
            </div>
            </div>
            <CombatScreenFX signal={fx} />
            <CombatHitOverlay hit={activeHit} durationMs={timings.hitPauseMs} paused={matchFrozen} />

            {phase?.t === 'prompt' && !statsOpen && !isCoopPvp && (
              <DecisionOverlay
                kind={phase.kind}
                objectiveLabel={objLabel}
                allowObjective={!!tm.objective}
                assistOptions={assistCandidates}
                secondsLeft={isCoopSolo ? 0 : promptLeft}
                showTimer={!isCoopSolo}
                teamColor={humanSide}
                onPick={isPaused ? () => undefined : acceptPick}
                onSimulateTurn={isCoop && !isCoopPvp && !isPaused ? simulateHumanTurn : undefined}
              />
            )}

            {phase?.t === 'qte_result' && pendingQteResult && !showReplayAd && !playerWonQte(pendingQteResult) && (
              <div className="absolute inset-0 z-[130] flex items-center justify-center bg-black/70 p-3">
                <div className="w-full max-w-sm overflow-hidden rounded-2xl border-2 border-[#C9A84C]/50 bg-[#0D1220] p-3 shadow-[0_0_40px_rgba(201,168,76,0.25)]">
                  <p className="text-center text-[10px] font-bold uppercase tracking-wider text-[#C9A84C]">
                    Combate de bolitas
                  </p>
                  <h3
                    className="mt-1 text-center text-lg font-bold text-[#F0E6D2]"
                    style={{ fontFamily: 'Cinzel, serif' }}
                  >
                    ¡Casi!
                  </h3>
                  <p className="mt-1 text-center text-xs text-[#8B9BB4]">
                    {qteReplaysLeft > 0
                      ? `Perdiste este intento. Puedes repetir (${qteReplaysLeft} disponibles) viendo un anuncio de 10 segundos.`
                      : 'Perdiste este intento. Ya usaste tus 3 repeticiones de esta partida.'}
                  </p>
                  <div className={`mt-3 grid grid-cols-1 gap-2 ${
                    qteReplaysLeft > 0 ? 'sm:grid-cols-2' : ''
                  }`}>
                    {qteReplaysLeft > 0 && (
                      <button
                        type="button"
                        onClick={requestQteReplay}
                        className="min-h-10 rounded-xl border border-[#C9A84C]/45 bg-[#C9A84C]/12 font-bold text-[#C9A84C]"
                      >
                        Repetir
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => confirmQteResult(pendingQteResult)}
                      className="min-h-10 rounded-xl font-bold"
                      style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <CombatAnnounceOverlay batch={announceBatch} placement="inline" paused={matchFrozen} />

          <div className="w-full space-y-1 md:hidden shrink-0" style={{ maxWidth: Math.max(mapSize, 260) }}>
            <div className="rounded-lg border border-[#1E2740] bg-[#0D1220] px-1.5 py-1 shrink-0 space-y-0.5">
              <StructureHpRow structures={displayStructures} team="blue" />
              <StructureHpRow structures={displayStructures} team="red" />
            </div>

            <button
              type="button"
              onClick={openStats}
              className="w-full shrink-0 flex items-center justify-center gap-1.5 rounded-lg border border-[#C9A84C]/45 bg-[#C9A84C]/12 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#C9A84C] active:scale-[0.99]"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Estadísticas
            </button>

            <div className="grid w-full shrink-0 grid-cols-2 gap-1.5 text-[10px]">
              <div className="min-w-0 rounded-lg border border-[#3498DB]/30 bg-[#3498DB]/10 px-2 py-1">
                <p className="text-[#8B9BB4] leading-none">Azul</p>
                <p className="font-bold text-[#F0E6D2] truncate leading-tight">{tm.blue.name}</p>
                <p className="text-sm font-bold text-[#3498DB] leading-none mt-0.5">{tm.blue.kills} <span className="text-[9px] font-bold uppercase tracking-wider text-[#8B9BB4]">bajas</span></p>
              </div>
              <div className="min-w-0 rounded-lg border border-[#E74C3C]/30 bg-[#E74C3C]/10 px-2 py-1 text-right">
                <p className="text-[#8B9BB4] leading-none">Rojo</p>
                <p className="font-bold text-[#F0E6D2] truncate leading-tight">{tm.red.name}</p>
                <p className="text-sm font-bold text-[#E74C3C] leading-none mt-0.5">{tm.red.kills} <span className="text-[9px] font-bold uppercase tracking-wider text-[#8B9BB4]">bajas</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden md:flex md:w-72 lg:w-80 md:shrink-0 md:flex-col md:justify-center md:gap-3 md:min-h-0 md:py-1">
          <div className="grid grid-cols-1 gap-2 text-[11px]">
            <div className="min-w-0 rounded-lg border border-[#3498DB]/30 bg-[#3498DB]/10 px-3 py-2">
              <p className="text-[#8B9BB4]">Azul</p>
              <p className="font-bold text-[#F0E6D2] truncate text-sm">{tm.blue.name}</p>
              <p className="text-xl font-bold text-[#3498DB] mt-0.5">{tm.blue.kills}</p>
              <p className="text-[10px] uppercase tracking-wider text-[#8B9BB4]">Bajas</p>
            </div>
            <div className="min-w-0 rounded-lg border border-[#E74C3C]/30 bg-[#E74C3C]/10 px-3 py-2">
              <p className="text-[#8B9BB4]">Rojo</p>
              <p className="font-bold text-[#F0E6D2] truncate text-sm">{tm.red.name}</p>
              <p className="text-xl font-bold text-[#E74C3C] mt-0.5">{tm.red.kills}</p>
              <p className="text-[10px] uppercase tracking-wider text-[#8B9BB4]">Bajas</p>
            </div>
          </div>

          <div className="rounded-xl border border-[#1E2740] bg-[#0D1220] p-2.5 shrink-0">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#8B9BB4] text-center mb-1">
              Estructuras
            </p>
            <div className="space-y-1.5">
              <StructureHpRow structures={displayStructures} team="blue" />
              <StructureHpRow structures={displayStructures} team="red" />
            </div>
          </div>

          <button
            type="button"
            onClick={openStats}
            className="w-full shrink-0 flex items-center justify-center gap-2 rounded-xl border-2 border-[#C9A84C]/45 bg-[#C9A84C]/12 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-[#C9A84C] active:scale-[0.99]"
          >
            <BarChart3 className="h-4 w-4" />
            Estadísticas
          </button>
        </div>
      </div>

      {isCoopPvp && tm && !tm.isComplete && !awaitingCinema.current && !awaitingQte.current && (
        <CoopPvpDecisionFlow
          tm={tm}
          blueLabel={tm.blue.name}
          redLabel={tm.red.name}
          round={tm.round}
          paused={matchFrozen}
          onResolve={handlePvpResolve}
        />
      )}

      {phase?.t === 'qte' && tm.pendingObjective && !showReplayAd && isCoopPvp && (
        <CoopClickBattle
          leftLabel={tm.blue.name}
          rightLabel={tm.red.name}
          leftTeam="blue"
          rightTeam="red"
          pending={tm.pendingObjective}
          onComplete={onQteComplete}
          paused={isPaused}
        />
      )}

      {phase?.t === 'qte' && tm.pendingObjective && !showReplayAd && !isCoopPvp && (
        <ObjectiveMinigame
          key={qteAttempt}
          pending={tm.pendingObjective}
          blueChampions={tm.blue.champions}
          redChampions={tm.red.champions}
          onComplete={onQteComplete}
          paused={isPaused}
          attemptKey={qteAttempt}
          allowSimulate={state.gameMode === 'ai' || isCoopLocal(state.gameMode)}
          playerSide={humanSide}
          simulateWinRate={isCoop ? 0.75 : 0.6}
        />
      )}

      <AdInterstitial
        open={showReplayAd}
        durationMs={QTE_REPLAY_AD_MS}
        onComplete={onReplayAdComplete}
        respectPremium
      />

      <MatchStatsModal
        open={statsOpen}
        onClose={closeStats}
        blue={tm.blue}
        red={tm.red}
      />

    </div>
  );
}
