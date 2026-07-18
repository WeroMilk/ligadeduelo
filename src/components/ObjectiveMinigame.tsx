import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Champion, ObjectiveType, PendingObjective, TeamColor } from '@/types/game';
import { CHAMPIONS, objectiveName, objectiveImage } from '@/lib/game-data';
import { playZoneHitSound, playZoneMissSound } from '@/lib/sounds';

export type ObjectiveQtePayload = {
  skirmishWinner: TeamColor | null;
  attackingTeam: TeamColor;
  monsterTaken: boolean;
  loserFate?: 'killed' | 'escaped';
};

type Zone = { id: number; x: number; y: number };

type Props = {
  pending: PendingObjective;
  blueChampions: Champion[];
  redChampions: Champion[];
  onComplete: (result: ObjectiveQtePayload) => void;
  /** Congela bolitas, simulación y countdown. */
  paused?: boolean;
  /** Cambia para reiniciar el intento (tras anuncio de repetición). */
  attemptKey?: number;
  allowSimulate?: boolean;
};

type QteProfile = {
  zoneMs: number;
  zoneSizePx: number;
  spawnGapMs: number;
  hitDmg: number;
  missPenalty: number;
};

const ENEMY_ESCAPE_CHANCE = 0.42;
const SIM_HIT_CHANCE = 0.5;

function profileFor(obj: ObjectiveType, mode: 'default' | 'gank' | 'nexus' = 'default'): QteProfile {
  if (mode === 'nexus') {
    return { zoneMs: 540, zoneSizePx: 32, spawnGapMs: 860, hitDmg: 12, missPenalty: 26 };
  }
  if (mode === 'gank') {
    return { zoneMs: 580, zoneSizePx: 30, spawnGapMs: 920, hitDmg: 11, missPenalty: 24 };
  }
  if (obj === 'baron' || obj === 'dragon_ancestral') {
    return { zoneMs: 560, zoneSizePx: 28, spawnGapMs: 900, hitDmg: 11, missPenalty: 25 };
  }
  if (obj === 'dragon_fire') {
    return { zoneMs: 640, zoneSizePx: 30, spawnGapMs: 960, hitDmg: 12, missPenalty: 22 };
  }
  return { zoneMs: 700, zoneSizePx: 32, spawnGapMs: 1000, hitDmg: 13, missPenalty: 21 };
}

function monsterColor(obj: ObjectiveType): string {
  if (obj === 'dragon_water') return '#3498DB';
  if (obj === 'dragon_fire') return '#E67E22';
  if (obj === 'baron') return '#9B59B6';
  return '#F1C40F';
}

type FighterAnim = 'idle' | 'lunge' | 'shake' | 'counter';

function Portrait({
  champ,
  side,
  anim,
}: {
  champ: Champion | undefined;
  side: 'blue' | 'red' | 'monster';
  anim: FighterAnim;
}) {
  const def = champ ? CHAMPIONS.find(c => c.id === champ.defId) : undefined;
  const [imgOk, setImgOk] = useState(!!def?.image);
  const ring =
    side === 'blue' ? 'border-[#3498DB]' :
    side === 'red' ? 'border-[#E74C3C]' :
    'border-[#E67E22]';
  const animCls =
    anim === 'lunge' ? (side === 'blue' ? 'animate-obj-lunge-right' : 'animate-obj-lunge-left') :
    anim === 'shake' ? 'animate-obj-shake' :
    anim === 'counter' ? 'animate-obj-counter' :
    '';

  return (
    <div className={`flex flex-col items-center gap-1 ${animCls}`}>
      <div
        className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 overflow-hidden shrink-0 ${ring}`}
        style={{ backgroundColor: def?.color || '#1A2238' }}
      >
        {def?.image && imgOk ? (
          <img
            src={def.image}
            alt={def.name}
            className="w-full h-full object-cover"
            onError={() => setImgOk(false)}
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#F0E6D2]">
            {def?.initials || '?'}
          </span>
        )}
      </div>
      <span className="text-[10px] sm:text-[11px] font-bold text-[#F0E6D2] leading-none truncate max-w-[4.5rem] text-center">
        {def?.name || '???'}
      </span>
    </div>
  );
}

function MonsterIcon({ obj, anim }: { obj: ObjectiveType; anim: FighterAnim }) {
  const color = monsterColor(obj);
  const src = objectiveImage(obj);
  const [imgOk, setImgOk] = useState(!!src);
  const animCls =
    anim === 'shake' || anim === 'counter' ? 'animate-obj-monster-hit' :
    anim === 'lunge' ? 'animate-obj-counter' :
    'animate-obj-monster-idle';
  return (
    <div
      className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 overflow-hidden flex items-center justify-center shrink-0 ${animCls}`}
      style={{ borderColor: color, backgroundColor: `${color}22`, boxShadow: `0 0 28px ${color}55` }}
    >
      {src && imgOk ? (
        <img
          src={src}
          alt={objectiveName(obj)}
          className="w-full h-full object-cover"
          onError={() => setImgOk(false)}
        />
      ) : (
        <span className="text-2xl sm:text-3xl font-bold" style={{ color, fontFamily: 'Cinzel, serif' }}>
          {obj === 'baron' ? 'B' : 'D'}
        </span>
      )}
    </div>
  );
}

const SKIRMISH_GOAL = 100;
const MONSTER_HP = 100;

type Phase = 'countdown' | 'skirmish' | 'monster' | 'escape-popup';

const COUNTDOWN_STEPS = ['3', '2', '1', '¡YA!'] as const;
const COUNTDOWN_STEP_MS = 700;

function NexusTarget({
  side,
  anim,
}: {
  side: 'blue' | 'red';
  anim: FighterAnim;
}) {
  const color = side === 'blue' ? '#3498DB' : '#E74C3C';
  const animCls =
    anim === 'shake' || anim === 'counter' ? 'animate-obj-monster-hit' :
    anim === 'lunge' ? 'animate-obj-counter' :
    'animate-obj-monster-idle';
  return (
    <div className={`relative flex flex-col items-center ${animCls}`}>
      <div
        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 flex items-center justify-center"
        style={{
          borderColor: color,
          background: side === 'blue'
            ? 'radial-gradient(circle at 40% 35%, #5DADE2 0%, #1A5276 55%, #0B1C2C 100%)'
            : 'radial-gradient(circle at 40% 35%, #F1948A 0%, #922B21 55%, #1C0B0B 100%)',
          boxShadow: `0 0 28px ${color}aa, inset 0 0 16px rgba(241,196,15,0.35)`,
        }}
      >
        <span
          className="text-lg sm:text-xl font-bold text-[#F1C40F] drop-shadow"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          N
        </span>
      </div>
      <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-[#F1C40F]">
        Nexo
      </span>
    </div>
  );
}

export default function ObjectiveMinigame({
  pending,
  blueChampions,
  redChampions,
  onComplete,
  paused = false,
  attemptKey: _attemptKey = 0,
  allowSimulate = true,
}: Props) {
  void _attemptKey;
  const isGank = pending.kind === 'gank';
  const isNexusDefense = pending.kind === 'nexus_defense';
  const isNexusAssault = pending.kind === 'nexus_assault';
  const isNexusQte = isNexusDefense || isNexusAssault;
  const isSkirmishOnly = isGank || isNexusDefense;
  const contested = pending.contested || isSkirmishOnly;
  const playPhase: Phase = isNexusAssault
    ? 'monster'
    : contested || isSkirmishOnly
      ? 'skirmish'
      : 'monster';
  const profile = useMemo(
    () => profileFor(
      pending.objective,
      isNexusQte ? 'nexus' : isGank ? 'gank' : 'default',
    ),
    [pending.objective, isGank, isNexusQte],
  );
  const [phase, setPhase] = useState<Phase>('countdown');
  const [countdownIdx, setCountdownIdx] = useState(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [blueBar, setBlueBar] = useState(0);
  const [redBar, setRedBar] = useState(0);
  const [monsterHp, setMonsterHp] = useState(MONSTER_HP);
  const [allyHp, setAllyHp] = useState(100);
  const [skirmishWinner, setSkirmishWinner] = useState<TeamColor | null>(null);
  const [loserFate, setLoserFate] = useState<'killed' | 'escaped'>('killed');
  const [zone, setZone] = useState<Zone | null>(null);
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null);
  const readyLog = isNexusAssault
    ? '¡Toca las bolitas amarillas y derriba el nexo enemigo!'
    : isNexusDefense
      ? '¡Toca las bolitas amarillas y salva tu nexo!'
      : '¡Toca las zonas a tiempo!';
  const [log, setLog] = useState<string>('Prepárate…');
  const [blueAnim, setBlueAnim] = useState<FighterAnim>('idle');
  const [redAnim, setRedAnim] = useState<FighterAnim>('idle');
  const [monsterAnim, setMonsterAnim] = useState<FighterAnim>('idle');
  const [simulating, setSimulating] = useState(false);
  const completedRef = useRef(false);
  const finishedRef = useRef(false);
  const loserFateRef = useRef<'killed' | 'escaped'>('killed');
  const simulatingRef = useRef(false);
  const phaseRef = useRef(phase);
  const blueBarRef = useRef(blueBar);
  const redBarRef = useRef(redBar);
  const monsterHpRef = useRef(monsterHp);
  const allyHpRef = useRef(allyHp);
  phaseRef.current = phase;
  blueBarRef.current = blueBar;
  redBarRef.current = redBar;
  monsterHpRef.current = monsterHp;
  allyHpRef.current = allyHp;

  // Cuenta 3–2–1–¡YA! antes de cualquier intento
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (paused) return;
    if (countdownIdx >= COUNTDOWN_STEPS.length) {
      setLog(readyLog);
      setPhase(playPhase);
      return;
    }
    setLog('Prepárate…');
    const t = window.setTimeout(() => {
      if (pausedRef.current) return;
      setCountdownIdx(i => i + 1);
    }, COUNTDOWN_STEP_MS);
    return () => window.clearTimeout(t);
  }, [phase, countdownIdx, paused, playPhase, readyLog]);

  const finishOnce = useCallback((result: ObjectiveQtePayload) => {
    if (completedRef.current) return;
    completedRef.current = true;
    finishedRef.current = true;
    simulatingRef.current = false;
    setSimulating(false);
    setZone(null);
    onComplete(result);
  }, [onComplete]);

  const blueFighters = useMemo(
    () => pending.blueIds
      .map(id => blueChampions.find(c => c.instanceId === id))
      .filter(Boolean)
      .slice(0, 2) as Champion[],
    [pending.blueIds, blueChampions],
  );
  const redFighters = useMemo(
    () => pending.redIds
      .map(id => redChampions.find(c => c.instanceId === id))
      .filter(Boolean)
      .slice(0, 2) as Champion[],
    [pending.redIds, redChampions],
  );

  const blueShown = blueFighters.length > 0
    ? blueFighters
    : blueChampions.filter(c => c.isAlive).slice(0, 2);
  const redShown = redFighters.length > 0
    ? redFighters
    : redChampions.filter(c => c.isAlive).slice(0, 2);

  const attackingTeam: TeamColor =
    phase === 'monster' && skirmishWinner
      ? skirmishWinner
      : 'blue';

  const pulseAnim = (setter: (a: FighterAnim) => void, anim: FighterAnim, ms = 420) => {
    setter(anim);
    window.setTimeout(() => setter('idle'), ms);
  };

  const spawnZone = useCallback(() => {
    if (completedRef.current || finishedRef.current || pausedRef.current) {
      setZone(null);
      return;
    }
    const p = phaseRef.current;
    if (p !== 'skirmish' && p !== 'monster') {
      setZone(null);
      return;
    }
    setZone({
      id: Date.now(),
      x: 18 + Math.random() * 64,
      y: 28 + Math.random() * 48,
    });
  }, []);

  const continueAfterFate = useCallback((winner: TeamColor, fate: 'killed' | 'escaped') => {
    loserFateRef.current = fate;
    setLoserFate(fate);
    setSkirmishWinner(winner);

    if (isSkirmishOnly) {
      if (isNexusDefense) {
        setLog(winner === 'blue'
          ? (fate === 'escaped' ? '¡Asaltante huye · nexo a salvo!' : '¡Nexo defendido!')
          : 'El nexo cae…');
      } else {
        setLog(winner === 'blue'
          ? (fate === 'escaped' ? 'El enemigo escapó' : '¡Ganaron el choque!')
          : (fate === 'escaped' ? 'Escapan · pierden el próximo turno' : 'El rival gana el choque'));
      }
      window.setTimeout(() => {
        finishOnce({
          skirmishWinner: winner,
          attackingTeam: winner,
          monsterTaken: true,
          loserFate: fate,
        });
      }, fate === 'escaped' ? 1100 : 700);
      return;
    }

    if (winner === 'blue') {
      setLog(fate === 'escaped'
        ? 'El enemigo escapó · ahora el monstruo'
        : '¡Ganaron la pelea! Ahora el monstruo');
      setPhase('monster');
      setMonsterHp(MONSTER_HP);
      setAllyHp(100);
      finishedRef.current = false;
    } else {
      setLog(fate === 'escaped'
        ? 'Escapan · el rival pelea el monstruo'
        : 'El rival gana · ellos pelean el monstruo');
      window.setTimeout(() => {
        finishOnce({
          skirmishWinner: 'red',
          attackingTeam: 'red',
          monsterTaken: Math.random() < 0.62,
          loserFate: fate,
        });
      }, 900);
    }
  }, [finishOnce, isSkirmishOnly, isNexusDefense]);

  const applyHit = useCallback(() => {
    if (pausedRef.current || completedRef.current || finishedRef.current) return;
    const p = phaseRef.current;
    if (p === 'skirmish' && (blueBarRef.current >= SKIRMISH_GOAL || redBarRef.current >= SKIRMISH_GOAL)) return;
    if (p === 'monster' && (monsterHpRef.current <= 0 || allyHpRef.current <= 0)) return;

    setFlash('hit');
    playZoneHitSound();
    if (p === 'skirmish') {
      setBlueBar(v => {
        const next = Math.min(SKIRMISH_GOAL, v + profile.hitDmg);
        if (next >= SKIRMISH_GOAL) {
          finishedRef.current = true;
          setZone(null);
        }
        return next;
      });
      setLog(simulatingRef.current ? 'Simulado · acierto' : '¡Bien! Tus aliados golpean');
      pulseAnim(setBlueAnim, 'lunge');
      pulseAnim(setRedAnim, 'shake');
    } else if (p === 'monster') {
      setMonsterHp(v => {
        const next = Math.max(0, v - profile.hitDmg);
        if (next <= 0) {
          finishedRef.current = true;
          setZone(null);
        }
        return next;
      });
      setLog(
        simulatingRef.current
          ? 'Simulado · acierto'
          : isNexusAssault
            ? '¡Bien! El nexo enemigo cruje'
            : '¡Bien! Dañas al objetivo',
      );
      pulseAnim(setBlueAnim, 'lunge');
      pulseAnim(setMonsterAnim, 'shake');
    }
    setZone(null);
    window.setTimeout(() => setFlash(null), 280);
    window.setTimeout(() => {
      if (!completedRef.current && !finishedRef.current) spawnZone();
    }, 280);
  }, [profile.hitDmg, spawnZone, isNexusAssault]);

  useEffect(() => {
    if (phase !== 'skirmish' && phase !== 'monster') return;
    if (paused) {
      setZone(null);
      return;
    }
    finishedRef.current = false;
    completedRef.current = false;
    spawnZone();
    const iv = window.setInterval(() => {
      if (pausedRef.current || completedRef.current || finishedRef.current) {
        setZone(null);
        return;
      }
      spawnZone();
    }, profile.spawnGapMs);
    return () => window.clearInterval(iv);
  }, [phase, spawnZone, profile.spawnGapMs, paused]);

  useEffect(() => {
    if (!zone || paused) return;
    if (completedRef.current || finishedRef.current) {
      setZone(null);
      return;
    }
    const t = window.setTimeout(() => {
      if (pausedRef.current || completedRef.current || finishedRef.current) {
        setZone(null);
        return;
      }
      setFlash('miss');
      playZoneMissSound();
      if (phase === 'skirmish') {
        setRedBar(v => Math.min(SKIRMISH_GOAL, v + profile.missPenalty));
        setLog(simulatingRef.current ? 'Simulado · fallo' : 'Fallaste · el rival golpea');
        pulseAnim(setBlueAnim, 'shake');
        pulseAnim(setRedAnim, 'lunge');
      } else if (phase === 'monster') {
        setAllyHp(v => Math.max(0, v - profile.missPenalty));
        setLog(
          simulatingRef.current
            ? 'Simulado · fallo'
            : isNexusAssault
              ? 'El nexo empuja · tu equipo pierde terreno'
              : 'El objetivo te golpea',
        );
        pulseAnim(setBlueAnim, 'shake');
        pulseAnim(setMonsterAnim, 'lunge');
      }
      setZone(null);
      window.setTimeout(() => setFlash(null), 280);
    }, profile.zoneMs);
    return () => window.clearTimeout(t);
  }, [zone, phase, profile.zoneMs, profile.missPenalty, isNexusAssault, paused]);

  // Auto-simulación: 50% acierto por bolita; si falla, el timeout de la zona cuenta miss
  useEffect(() => {
    if (!zone || !simulating || paused) return;
    if (completedRef.current || finishedRef.current) return;
    if (phase !== 'skirmish' && phase !== 'monster') return;

    const delay = 180 + Math.random() * 220;
    const t = window.setTimeout(() => {
      if (pausedRef.current || !simulatingRef.current || completedRef.current || finishedRef.current) return;
      if (Math.random() < SIM_HIT_CHANCE) {
        applyHit();
      }
    }, delay);
    return () => window.clearTimeout(t);
  }, [zone, simulating, phase, applyHit, paused]);

  useEffect(() => {
    if (phase !== 'escape-popup' || !simulating || paused) return;
    const t = window.setTimeout(() => {
      if (pausedRef.current || !simulatingRef.current) return;
      continueAfterFate('blue', 'escaped');
    }, 900);
    return () => window.clearTimeout(t);
  }, [phase, simulating, continueAfterFate, paused]);

  useEffect(() => {
    if (phase !== 'skirmish') return;
    if (blueBar >= SKIRMISH_GOAL) {
      finishedRef.current = true;
      setZone(null);
      if (Math.random() < ENEMY_ESCAPE_CHANCE) {
        setPhase('escape-popup');
        setLog('El enemigo escapó');
        finishedRef.current = false;
      } else {
        continueAfterFate('blue', 'killed');
      }
    } else if (redBar >= SKIRMISH_GOAL) {
      finishedRef.current = true;
      setZone(null);
      continueAfterFate('red', 'killed');
    }
  }, [blueBar, redBar, phase, continueAfterFate]);

  useEffect(() => {
    if (phase !== 'monster' || skirmishWinner === 'red') return;
    if (monsterHp <= 0) {
      finishedRef.current = true;
      setZone(null);
      setLog(isNexusAssault ? '¡Nexo enemigo destruido!' : '¡Objetivo conquistado!');
      window.setTimeout(() => {
        finishOnce({
          skirmishWinner: contested ? 'blue' : null,
          attackingTeam: 'blue',
          monsterTaken: true,
          loserFate: contested ? loserFateRef.current : undefined,
        });
      }, 600);
    } else if (allyHp <= 0) {
      finishedRef.current = true;
      setZone(null);
      setLog(isNexusAssault ? 'El nexo enemigo resiste' : 'Tu equipo cae ante el monstruo');
      window.setTimeout(() => {
        finishOnce({
          skirmishWinner: contested ? 'blue' : null,
          attackingTeam: 'blue',
          monsterTaken: false,
          loserFate: contested ? loserFateRef.current : undefined,
        });
      }, 600);
    }
  }, [monsterHp, allyHp, phase, skirmishWinner, contested, finishOnce, isNexusAssault]);

  const onZoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (paused || simulatingRef.current) return;
    if (!zone || completedRef.current || finishedRef.current) return;
    applyHit();
  };

  const startAutoSimulate = () => {
    if (paused || completedRef.current || finishedRef.current || simulatingRef.current) return;
    if (phase !== 'countdown') return;
    simulatingRef.current = true;
    setSimulating(true);
    setLog('Simulación elegida · empezará al terminar la cuenta');
  };

  const label = isNexusAssault
    ? 'Nexo enemigo'
    : isNexusDefense
      ? 'Defensa del Nexo'
      : isGank
        ? `Choque · ${pending.lane === 0 ? 'Superior' : pending.lane === 2 ? 'Inferior' : 'Central'}`
        : objectiveName(pending.objective);

  const frameBorder = isNexusQte
    ? 'border-[#F1C40F]'
    : 'border-[#E67E22]';
  const frameShadow = isNexusAssault
    ? 'shadow-[0_0_60px_rgba(241,196,15,0.45),0_0_120px_rgba(231,76,60,0.3)]'
    : isNexusDefense
      ? 'shadow-[0_0_60px_rgba(241,196,15,0.45),0_0_120px_rgba(52,152,219,0.25)]'
      : 'shadow-[0_0_50px_rgba(230,126,34,0.35)]';
  const accent = isNexusQte ? '#F1C40F' : '#E67E22';
  const monsterBarColor = isNexusAssault ? '#E74C3C' : '#E67E22';

  const body = (
    <div className="fixed inset-0 z-[95] flex items-center justify-center px-3 bg-black/85 backdrop-blur-[2px]">
      <div
        className={`relative w-full max-w-lg rounded-2xl border-2 bg-[#0D1220] overflow-hidden ${frameBorder} ${frameShadow}`}
      >
        {isNexusQte && (
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background: isNexusAssault
                ? 'radial-gradient(ellipse at 50% 0%, rgba(231,76,60,0.45) 0%, transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(241,196,15,0.25) 0%, transparent 50%)'
                : 'radial-gradient(ellipse at 50% 0%, rgba(52,152,219,0.45) 0%, transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(241,196,15,0.25) 0%, transparent 50%)',
            }}
          />
        )}
        <div className="relative px-4 pt-4 pb-2 text-center border-b border-[#2A3550]">
          <p
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: accent }}
          >
            {isNexusAssault
              ? 'Asalto final'
              : isNexusDefense
                ? 'Base bajo ataque'
                : isGank
                  ? 'Gank disputado'
                  : phase === 'skirmish'
                    ? 'Pelea 2 contra 2'
                    : `Asalto · ${label}`}
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
            {isNexusAssault
              ? '¡Derriba el nexo enemigo!'
              : isNexusDefense
                ? '¡Defiende tu nexo!'
                : isGank
                  ? 'Choque de junglas'
                  : phase === 'skirmish' || phase === 'escape-popup'
                    ? 'Pelea por el objetivo'
                    : `Derrota al ${label}`}
          </h2>
          <p className="text-xs text-[#8B9BB4] mt-1">{log}</p>
        </div>

        {phase === 'countdown' ? (
          <div className="relative px-5 py-16 text-center space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C]">
              Prepárate
            </p>
            <p
              className="text-6xl sm:text-7xl font-black text-[#F1C40F] drop-shadow-[0_0_24px_rgba(241,196,15,0.55)]"
              style={{ fontFamily: 'Cinzel, serif' }}
              key={countdownIdx}
            >
              {COUNTDOWN_STEPS[Math.min(countdownIdx, COUNTDOWN_STEPS.length - 1)]}
            </p>
            <p className="text-sm text-[#8B9BB4]">
              {paused ? 'Pausa · la cuenta se reanuda al continuar' : 'Las bolitas amarillas empiezan al terminar la cuenta'}
            </p>
            {allowSimulate && (
              <>
                <button
                  type="button"
                  onClick={startAutoSimulate}
                  disabled={simulating || paused}
                  className="mx-auto flex w-full max-w-xs min-h-11 items-center justify-center gap-2 rounded-xl border border-[#C9A84C]/45 bg-[#C9A84C]/12 font-bold text-[#C9A84C] active:scale-[0.99] disabled:opacity-60"
                >
                  {simulating ? 'Simulación seleccionada' : 'Simular'}
                </button>
                <p className="text-[10px] text-[#8B9BB4]">
                  Si no lo eliges durante la cuenta, jugarás este intento manualmente.
                </p>
              </>
            )}
          </div>
        ) : phase === 'escape-popup' ? (
          <div className="relative px-5 py-8 text-center space-y-4">
            <p
              className="text-2xl font-bold text-[#F1C40F]"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {isNexusDefense ? '¡El asaltante huye!' : 'El enemigo escapó'}
            </p>
            <p className="text-sm text-[#8B9BB4]">
              {isNexusDefense
                ? 'Tu nexo resiste. Continúa la partida.'
                : 'Sus campeones sobreviven, pero pierden el próximo turno.'}
            </p>
            {!simulating && !paused && (
              <button
                type="button"
                className="w-full rounded-xl py-3 font-bold"
                style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
                onClick={() => continueAfterFate('blue', 'escaped')}
              >
                Continuar
              </button>
            )}
          </div>
        ) : (
          <>
            <div
              className={`relative h-72 sm:h-80 ${
                isNexusAssault
                  ? 'bg-gradient-to-b from-[#280A0A] via-[#141B2D] to-[#1A1020]'
                  : isNexusDefense
                    ? 'bg-gradient-to-b from-[#0A1628] via-[#141B2D] to-[#1A1020]'
                    : 'bg-[#141B2D]'
              } ${
                flash === 'hit' ? 'ring-2 ring-[#2ECC71]' : flash === 'miss' ? 'ring-2 ring-[#E74C3C]' : ''
              }`}
            >
              {isNexusQte && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full blur-3xl opacity-30 animate-pulse"
                    style={{
                      background: isNexusAssault
                        ? 'radial-gradient(circle, #E74C3C 0%, transparent 70%)'
                        : 'radial-gradient(circle, #3498DB 0%, transparent 70%)',
                    }}
                  />
                </div>
              )}
              {phase === 'skirmish' ? (
                <div className="absolute inset-x-4 top-3 space-y-2 z-[1]">
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-[#3498DB]">
                        {isNexusDefense ? 'Defensa' : 'Tu equipo'}
                      </span>
                      <span className="text-[#3498DB]">{blueBar}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/50 overflow-hidden">
                      <div className="h-full bg-[#3498DB] transition-all" style={{ width: `${blueBar}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-[#E74C3C]">
                        {isNexusDefense ? 'Asaltante' : 'Enemigos'}
                      </span>
                      <span className="text-[#E74C3C]">{redBar}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/50 overflow-hidden">
                      <div className="h-full bg-[#E74C3C] transition-all" style={{ width: `${redBar}%` }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-x-4 top-3 space-y-2 z-[1]">
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span style={{ color: monsterBarColor }}>{label}</span>
                      <span style={{ color: monsterBarColor }}>{monsterHp}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-black/50 overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{ width: `${monsterHp}%`, backgroundColor: monsterBarColor }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-[#3498DB]">
                        {isNexusAssault ? 'Asalto' : 'Tu equipo'}
                      </span>
                      <span className="text-[#3498DB]">{allyHp}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/50 overflow-hidden">
                      <div className="h-full bg-[#27AE60] transition-all" style={{ width: `${allyHp}%` }} />
                    </div>
                  </div>
                </div>
              )}

              <div className="absolute inset-x-0 top-[4.5rem] bottom-10 flex items-center justify-between px-5 sm:px-8 pointer-events-none z-[1]">
                <div className="flex flex-col gap-2 items-start">
                  {blueShown.map(c => (
                    <Portrait key={c.instanceId} champ={c} side="blue" anim={blueAnim} />
                  ))}
                </div>

                <div className="flex flex-col items-center gap-1">
                  {isNexusAssault ? (
                    <NexusTarget side="red" anim={monsterAnim} />
                  ) : isNexusDefense ? (
                    <NexusTarget side="blue" anim="idle" />
                  ) : phase === 'skirmish' || !pending.objective ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B9BB4]">contra</span>
                  ) : (
                    <MonsterIcon obj={pending.objective} anim={monsterAnim} />
                  )}
                </div>

                <div className="flex flex-col gap-2 items-end">
                  {phase === 'skirmish'
                    ? redShown.map(c => (
                        <Portrait key={c.instanceId} champ={c} side="red" anim={redAnim} />
                      ))
                    : null}
                </div>
              </div>

              {zone && !simulating && (
                <button
                  type="button"
                  onClick={onZoneClick}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-[#F1C40F] bg-[#F1C40F]/30 animate-obj-zone z-10"
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: profile.zoneSizePx,
                    height: profile.zoneSizePx,
                    boxShadow: isNexusQte ? '0 0 18px rgba(241,196,15,0.8)' : undefined,
                  }}
                  aria-label="Zona de acierto"
                />
              )}

              {zone && simulating && (
                <div
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-[#F1C40F] bg-[#F1C40F]/25 animate-obj-zone z-10"
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: profile.zoneSizePx,
                    height: profile.zoneSizePx,
                  }}
                  aria-hidden
                />
              )}

              <p className="absolute bottom-3 inset-x-0 text-center text-[10px] text-[#8B9BB4] z-[1]">
                {isNexusAssault
                  ? 'Toca las bolitas amarillas para tumbar el nexo enemigo'
                  : isNexusDefense
                    ? 'Toca las bolitas amarillas antes de que el asaltante tumbe el nexo'
                    : `Equipo atacante: ${attackingTeam === 'blue' ? 'Azul (tú)' : 'Rojo'}${
                        loserFate === 'escaped' && skirmishWinner === 'blue' ? ' · el rival escapó' : ''
                      }`}
              </p>
            </div>

          </>
        )}
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
