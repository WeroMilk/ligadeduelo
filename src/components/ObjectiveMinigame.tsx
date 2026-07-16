import { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Champion, ObjectiveType, PendingObjective, TeamColor } from '@/types/game';
import { CHAMPIONS, objectiveName } from '@/lib/game-data';

export type ObjectiveQtePayload = {
  skirmishWinner: TeamColor | null;
  attackingTeam: TeamColor;
  monsterTaken: boolean;
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

function profileFor(obj: ObjectiveType): QteProfile {
  if (obj === 'baron' || obj === 'dragon_ancestral') {
    return { zoneMs: 700, zoneSizePx: 32, spawnGapMs: 1050, hitDmg: 14, missPenalty: 20 };
  }
  if (obj === 'dragon_fire') {
    return { zoneMs: 780, zoneSizePx: 34, spawnGapMs: 1100, hitDmg: 15, missPenalty: 18 };
  }
  return { zoneMs: 850, zoneSizePx: 36, spawnGapMs: 1150, hitDmg: 16, missPenalty: 17 };
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
    <div
      className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 overflow-hidden shrink-0 ${ring} ${animCls}`}
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
  );
}

function MonsterIcon({ obj, anim }: { obj: ObjectiveType; anim: FighterAnim }) {
  const color = monsterColor(obj);
  const animCls =
    anim === 'shake' || anim === 'counter' ? 'animate-obj-monster-hit' :
    anim === 'lunge' ? 'animate-obj-counter' :
    'animate-obj-monster-idle';
  return (
    <div
      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 flex items-center justify-center shrink-0 ${animCls}`}
      style={{ borderColor: color, backgroundColor: `${color}33`, boxShadow: `0 0 24px ${color}55` }}
    >
      <span className="text-2xl sm:text-3xl font-bold" style={{ color, fontFamily: 'Cinzel, serif' }}>
        {obj === 'baron' ? 'B' : 'D'}
      </span>
    </div>
  );
}

const SKIRMISH_GOAL = 100;
const MONSTER_HP = 100;

export default function ObjectiveMinigame({
  pending,
  blueChampions,
  redChampions,
  onComplete,
}: Props) {
  const contested = pending.contested;
  const profile = useMemo(() => profileFor(pending.objective), [pending.objective]);
  const [phase, setPhase] = useState<'skirmish' | 'monster'>(contested ? 'skirmish' : 'monster');
  const [blueBar, setBlueBar] = useState(0);
  const [redBar, setRedBar] = useState(0);
  const [monsterHp, setMonsterHp] = useState(MONSTER_HP);
  const [allyHp, setAllyHp] = useState(100);
  const [skirmishWinner, setSkirmishWinner] = useState<TeamColor | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null);
  const [log, setLog] = useState<string>('¡Toca las zonas a tiempo!');
  const [blueAnim, setBlueAnim] = useState<FighterAnim>('idle');
  const [redAnim, setRedAnim] = useState<FighterAnim>('idle');
  const [monsterAnim, setMonsterAnim] = useState<FighterAnim>('idle');

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

  // Fallback si no hay IDs: jungla / mid vivos
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
    setZone({
      id: Date.now(),
      x: 18 + Math.random() * 64,
      y: 28 + Math.random() * 48,
    });
  }, []);

  useEffect(() => {
    spawnZone();
    const iv = window.setInterval(spawnZone, profile.spawnGapMs);
    return () => window.clearInterval(iv);
  }, [phase, spawnZone, profile.spawnGapMs]);

  useEffect(() => {
    if (!zone) return;
    const t = window.setTimeout(() => {
      setFlash('miss');
      if (phase === 'skirmish') {
        setRedBar(v => Math.min(SKIRMISH_GOAL, v + profile.missPenalty));
        setLog('Fallaste · el rival golpea');
        pulseAnim(setBlueAnim, 'shake');
        pulseAnim(setRedAnim, 'lunge');
      } else {
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
      setSkirmishWinner('blue');
      setLog('¡Ganáis la escaramuza! Ahora el monstruo');
      setPhase('monster');
      setMonsterHp(MONSTER_HP);
      setAllyHp(100);
    } else if (redBar >= SKIRMISH_GOAL) {
      setSkirmishWinner('red');
      setLog('El rival gana la escaramuza · ellos pelean al monstruo');
      window.setTimeout(() => {
        onComplete({
          skirmishWinner: 'red',
          attackingTeam: 'red',
          monsterTaken: Math.random() < 0.55,
        });
      }, 900);
    }
  }, [blueBar, redBar, phase, onComplete]);

  useEffect(() => {
    if (phase !== 'monster' || skirmishWinner === 'red') return;
    if (monsterHp <= 0) {
      setLog('¡Objetivo conquistado!');
      window.setTimeout(() => {
        onComplete({
          skirmishWinner: contested ? 'blue' : null,
          attackingTeam: 'blue',
          monsterTaken: true,
        });
      }, 600);
    } else if (allyHp <= 0) {
      setLog('Vuestro equipo cae ante el monstruo');
      window.setTimeout(() => {
        onComplete({
          skirmishWinner: contested ? 'blue' : null,
          attackingTeam: 'blue',
          monsterTaken: false,
        });
      }, 600);
    }
  }, [monsterHp, allyHp, phase, skirmishWinner, contested, onComplete]);

  const onZoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!zone) return;
    setFlash('hit');
    if (phase === 'skirmish') {
      setBlueBar(v => Math.min(SKIRMISH_GOAL, v + profile.hitDmg));
      setLog('¡Acierto! Aliados golpean');
      pulseAnim(setBlueAnim, 'lunge');
      pulseAnim(setRedAnim, 'shake');
    } else {
      setMonsterHp(v => Math.max(0, v - profile.hitDmg));
      setLog('¡Acierto! Aliados dañan al objetivo');
      pulseAnim(setBlueAnim, 'lunge');
      pulseAnim(setMonsterAnim, 'shake');
    }
    setZone(null);
    window.setTimeout(() => setFlash(null), 280);
    window.setTimeout(spawnZone, 280);
  };

  const label = objectiveName(pending.objective);

  const body = (
    <div className="fixed inset-0 z-[95] flex items-center justify-center px-3 bg-black/80">
      <div className="relative w-full max-w-lg rounded-2xl border-2 border-[#E67E22] bg-[#0D1220] overflow-hidden shadow-[0_0_50px_rgba(230,126,34,0.35)]">
        <div className="px-4 pt-4 pb-2 text-center border-b border-[#2A3550]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#E67E22]">
            {phase === 'skirmish' ? 'Escaramuza 2v2' : `Asalto · ${label}`}
          </p>
          <h2 className="text-lg font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
            {phase === 'skirmish' ? 'Pelea por el objetivo' : `Derrota al ${label}`}
          </h2>
          <p className="text-xs text-[#8B9BB4] mt-1">{log}</p>
        </div>

        <div
          className={`relative h-72 sm:h-80 bg-[#141B2D] ${
            flash === 'hit' ? 'ring-2 ring-[#2ECC71]' : flash === 'miss' ? 'ring-2 ring-[#E74C3C]' : ''
          }`}
        >
          {phase === 'skirmish' ? (
            <div className="absolute inset-x-4 top-3 space-y-2">
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-[#3498DB]">Aliados</span>
                  <span className="text-[#3498DB]">{blueBar}%</span>
                </div>
                <div className="h-2 rounded-full bg-black/50 overflow-hidden">
                  <div className="h-full bg-[#3498DB] transition-all" style={{ width: `${blueBar}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-[#E74C3C]">Rivales</span>
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

          {/* Arena de combate animada */}
          <div className="absolute inset-x-0 top-[4.5rem] bottom-10 flex items-center justify-between px-5 sm:px-8 pointer-events-none">
            <div className="flex flex-col gap-2 items-start">
              {blueShown.map(c => (
                <Portrait key={c.instanceId} champ={c} side="blue" anim={blueAnim} />
              ))}
            </div>

            <div className="flex flex-col items-center gap-1">
              {phase === 'skirmish' ? (
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B9BB4]">VS</span>
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
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
