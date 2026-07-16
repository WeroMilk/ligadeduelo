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
};

type QteProfile = {
  zoneMs: number;
  zoneSizePx: number;
  spawnGapMs: number;
  hitDmg: number;
  missPenalty: number;
};

const ENEMY_ESCAPE_CHANCE = 0.42;

function profileFor(obj: ObjectiveType, isGank = false): QteProfile {
  // Más difícil: zonas más rápidas y fallos más castigan
  if (isGank) {
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

type Phase = 'skirmish' | 'monster' | 'escape-popup';

export default function ObjectiveMinigame({
  pending,
  blueChampions,
  redChampions,
  onComplete,
}: Props) {
  const isGank = pending.kind === 'gank';
  const contested = pending.contested || isGank;
  const profile = useMemo(
    () => profileFor(pending.objective, isGank),
    [pending.objective, isGank],
  );
  const [phase, setPhase] = useState<Phase>(
    contested || isGank ? 'skirmish' : 'monster',
  );
  const [blueBar, setBlueBar] = useState(0);
  const [redBar, setRedBar] = useState(0);
  const [monsterHp, setMonsterHp] = useState(MONSTER_HP);
  const [allyHp, setAllyHp] = useState(100);
  const [skirmishWinner, setSkirmishWinner] = useState<TeamColor | null>(null);
  const [loserFate, setLoserFate] = useState<'killed' | 'escaped'>('killed');
  const [zone, setZone] = useState<Zone | null>(null);
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null);
  const [log, setLog] = useState<string>('¡Toca las zonas a tiempo!');
  const [blueAnim, setBlueAnim] = useState<FighterAnim>('idle');
  const [redAnim, setRedAnim] = useState<FighterAnim>('idle');
  const [monsterAnim, setMonsterAnim] = useState<FighterAnim>('idle');
  const completedRef = useRef(false);
  const finishedRef = useRef(false);
  const loserFateRef = useRef<'killed' | 'escaped'>('killed');

  const finishOnce = useCallback((result: ObjectiveQtePayload) => {
    if (completedRef.current) return;
    completedRef.current = true;
    finishedRef.current = true;
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

  const continueAfterFate = useCallback((winner: TeamColor, fate: 'killed' | 'escaped') => {
    loserFateRef.current = fate;
    setLoserFate(fate);
    setSkirmishWinner(winner);

    if (isGank) {
      setLog(winner === 'blue'
        ? (fate === 'escaped' ? 'El enemigo escapó' : '¡Ganaron el choque!')
        : (fate === 'escaped' ? 'Escapan · pierden el próximo turno' : 'El rival gana el choque'));
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
  }, [finishOnce, isGank]);

  const spawnZone = useCallback(() => {
    if (completedRef.current || finishedRef.current) {
      setZone(null);
      return;
    }
    if (phase !== 'skirmish' && phase !== 'monster') {
      setZone(null);
      return;
    }
    setZone({
      id: Date.now(),
      x: 18 + Math.random() * 64,
      y: 28 + Math.random() * 48,
    });
  }, [phase]);

  useEffect(() => {
    if (phase !== 'skirmish' && phase !== 'monster') return;
    finishedRef.current = false;
    completedRef.current = false;
    spawnZone();
    const iv = window.setInterval(() => {
      if (completedRef.current || finishedRef.current) {
        setZone(null);
        return;
      }
      spawnZone();
    }, profile.spawnGapMs);
    return () => window.clearInterval(iv);
  }, [phase, spawnZone, profile.spawnGapMs]);

  useEffect(() => {
    if (!zone) return;
    if (completedRef.current || finishedRef.current) {
      setZone(null);
      return;
    }
    const t = window.setTimeout(() => {
      if (completedRef.current || finishedRef.current) {
        setZone(null);
        return;
      }
      setFlash('miss');
      playZoneMissSound();
      if (phase === 'skirmish') {
        setRedBar(v => Math.min(SKIRMISH_GOAL, v + profile.missPenalty));
        setLog('Fallaste · el rival golpea');
        pulseAnim(setBlueAnim, 'shake');
        pulseAnim(setRedAnim, 'lunge');
      } else if (phase === 'monster') {
        setAllyHp(v => Math.max(0, v - profile.missPenalty));
        setLog('El objetivo te golpea');
        pulseAnim(setBlueAnim, 'shake');
        pulseAnim(setMonsterAnim, 'lunge');
      }
      setZone(null);
      window.setTimeout(() => setFlash(null), 280);
    }, profile.zoneMs);
    return () => window.clearTimeout(t);
  }, [zone, phase, profile.zoneMs, profile.missPenalty]);

  useEffect(() => {
    if (phase !== 'skirmish') return;
    if (blueBar >= SKIRMISH_GOAL) {
      finishedRef.current = true;
      setZone(null);
      // El enemigo puede escapar justo antes de morir
      if (Math.random() < ENEMY_ESCAPE_CHANCE) {
        setPhase('escape-popup');
        setLog('El enemigo escapó');
        finishedRef.current = false;
      } else {
        continueAfterFate('blue', 'killed');
      }
    } else if (redBar >= SKIRMISH_GOAL) {
      // El jugador no puede escapar: solo la IA tiene esa opción.
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
      setLog('¡Objetivo conquistado!');
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
      setLog('Tu equipo cae ante el monstruo');
      window.setTimeout(() => {
        finishOnce({
          skirmishWinner: contested ? 'blue' : null,
          attackingTeam: 'blue',
          monsterTaken: false,
          loserFate: contested ? loserFateRef.current : undefined,
        });
      }, 600);
    }
  }, [monsterHp, allyHp, phase, skirmishWinner, contested, finishOnce]);

  const onZoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!zone || completedRef.current || finishedRef.current) return;
    if (phase === 'skirmish' && (blueBar >= SKIRMISH_GOAL || redBar >= SKIRMISH_GOAL)) return;
    if (phase === 'monster' && (monsterHp <= 0 || allyHp <= 0)) return;

    setFlash('hit');
    playZoneHitSound();
    if (phase === 'skirmish') {
      setBlueBar(v => {
        const next = Math.min(SKIRMISH_GOAL, v + profile.hitDmg);
        if (next >= SKIRMISH_GOAL) {
          finishedRef.current = true;
          setZone(null);
        }
        return next;
      });
      setLog('¡Bien! Tus aliados golpean');
      pulseAnim(setBlueAnim, 'lunge');
      pulseAnim(setRedAnim, 'shake');
    } else if (phase === 'monster') {
      setMonsterHp(v => {
        const next = Math.max(0, v - profile.hitDmg);
        if (next <= 0) {
          finishedRef.current = true;
          setZone(null);
        }
        return next;
      });
      setLog('¡Bien! Dañas al objetivo');
      pulseAnim(setBlueAnim, 'lunge');
      pulseAnim(setMonsterAnim, 'shake');
    }
    setZone(null);
    window.setTimeout(() => setFlash(null), 280);
    window.setTimeout(() => {
      if (!completedRef.current && !finishedRef.current) spawnZone();
    }, 280);
  };

  /** Simula solo la fase actual (escaramuza o monstruo). No toca barras para no re-disparar effects. */
  const simulatePhase = () => {
    if (completedRef.current || finishedRef.current) return;
    if (phase === 'escape-popup') return;

    finishedRef.current = true;
    setZone(null);

    if (phase === 'skirmish') {
      const playerWins = Math.random() < 0.55;
      if (playerWins) {
        setLog('Simulado · ganaste el choque');
        if (Math.random() < ENEMY_ESCAPE_CHANCE) {
          setPhase('escape-popup');
          setLog('Simulado · el enemigo escapó');
          finishedRef.current = false;
        } else {
          continueAfterFate('blue', 'killed');
        }
      } else {
        setLog('Simulado · el rival gana el choque');
        continueAfterFate('red', 'killed');
      }
      return;
    }

    if (phase === 'monster') {
      const taken = Math.random() < 0.68;
      setLog(taken ? 'Simulado · objetivo conquistado' : 'Simulado · fallaste el objetivo');
      window.setTimeout(() => {
        finishOnce({
          skirmishWinner: contested ? 'blue' : null,
          attackingTeam: 'blue',
          monsterTaken: taken,
          loserFate: contested ? loserFateRef.current : undefined,
        });
      }, 450);
    }
  };

  const label = isGank
    ? `Choque · ${pending.lane === 0 ? 'Superior' : pending.lane === 2 ? 'Inferior' : 'Central'}`
    : objectiveName(pending.objective);

  const body = (
    <div className="fixed inset-0 z-[95] flex items-center justify-center px-3 bg-black/80">
      <div className="relative w-full max-w-lg rounded-2xl border-2 border-[#E67E22] bg-[#0D1220] overflow-hidden shadow-[0_0_50px_rgba(230,126,34,0.35)]">
        <div className="px-4 pt-4 pb-2 text-center border-b border-[#2A3550]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#E67E22]">
            {isGank ? 'Gank disputado' : phase === 'skirmish' ? 'Pelea 2 contra 2' : `Asalto · ${label}`}
          </p>
          <h2 className="text-lg font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
            {isGank
              ? 'Choque de junglas'
              : phase === 'skirmish' || phase === 'escape-popup'
                ? 'Pelea por el objetivo'
                : `Derrota al ${label}`}
          </h2>
          <p className="text-xs text-[#8B9BB4] mt-1">{log}</p>
        </div>

        {phase === 'escape-popup' ? (
          <div className="px-5 py-8 text-center space-y-4">
            <p
              className="text-2xl font-bold text-[#F1C40F]"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              El enemigo escapó
            </p>
            <p className="text-sm text-[#8B9BB4]">
              Sus campeones sobreviven, pero pierden el próximo turno.
            </p>
            <button
              type="button"
              className="w-full rounded-xl py-3 font-bold"
              style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
              onClick={() => continueAfterFate('blue', 'escaped')}
            >
              Continuar
            </button>
          </div>
        ) : (
          <>
            <div
              className={`relative h-72 sm:h-80 bg-[#141B2D] ${
                flash === 'hit' ? 'ring-2 ring-[#2ECC71]' : flash === 'miss' ? 'ring-2 ring-[#E74C3C]' : ''
              }`}
            >
              {phase === 'skirmish' ? (
                <div className="absolute inset-x-4 top-3 space-y-2">
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-[#3498DB]">Tu equipo</span>
                      <span className="text-[#3498DB]">{blueBar}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/50 overflow-hidden">
                      <div className="h-full bg-[#3498DB] transition-all" style={{ width: `${blueBar}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-[#E74C3C]">Enemigos</span>
                      <span className="text-[#E74C3C]">{redBar}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/50 overflow-hidden">
                      <div className="h-full bg-[#E74C3C] transition-all" style={{ width: `${redBar}%` }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-x-4 top-3 space-y-2">
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-[#E67E22]">{label}</span>
                      <span className="text-[#E67E22]">{monsterHp}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-black/50 overflow-hidden">
                      <div className="h-full bg-[#E67E22] transition-all" style={{ width: `${monsterHp}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-[#3498DB]">Tu equipo</span>
                      <span className="text-[#3498DB]">{allyHp}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/50 overflow-hidden">
                      <div className="h-full bg-[#27AE60] transition-all" style={{ width: `${allyHp}%` }} />
                    </div>
                  </div>
                </div>
              )}

              <div className="absolute inset-x-0 top-[4.5rem] bottom-10 flex items-center justify-between px-5 sm:px-8 pointer-events-none">
                <div className="flex flex-col gap-2 items-start">
                  {blueShown.map(c => (
                    <Portrait key={c.instanceId} champ={c} side="blue" anim={blueAnim} />
                  ))}
                </div>

                <div className="flex flex-col items-center gap-1">
                  {phase === 'skirmish' || !pending.objective ? (
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

              {zone && (
                <button
                  type="button"
                  onClick={onZoneClick}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-[#F1C40F] bg-[#F1C40F]/25 animate-obj-zone z-10"
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: profile.zoneSizePx,
                    height: profile.zoneSizePx,
                  }}
                  aria-label="Zona de acierto"
                />
              )}

              <p className="absolute bottom-3 inset-x-0 text-center text-[10px] text-[#8B9BB4]">
                Equipo atacante: {attackingTeam === 'blue' ? 'Azul (tú)' : 'Rojo'}
                {loserFate === 'escaped' && skirmishWinner === 'blue' ? ' · el rival escapó' : ''}
              </p>
            </div>

            <div className="border-t border-[#2A3550] px-4 py-3">
              <button
                type="button"
                onClick={simulatePhase}
                className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-[#C9A84C]/45 bg-[#C9A84C]/12 font-bold text-[#C9A84C] active:scale-[0.99]"
              >
                Simular
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
