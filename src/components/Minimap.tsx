import { useId } from 'react';
import type { Champion, Structure, TeamPlan, LaneId, ObjectiveType, CombatAction, TeamColor, CombatFloat } from '@/types/game';
import { actionLabelEs, champDef } from '@/lib/turn-engine';
import { objectiveIsBaronSide, objectiveName } from '@/lib/game-data';
import { combatFloatStyle } from '@/lib/combat-float-style';
import { Swords, Shield, Sparkles, Droplet } from 'lucide-react';

export type ObjectiveAnimPhase = 'none' | 'pulse' | 'clash' | 'claim';

export type AttackBeam = {
  fromId: string;
  toId: string;
  toKind: 'champ' | 'structure';
  effectKind?: CombatFloat['kind'];
};

type MinimapProps = {
  blueChampions: Champion[];
  redChampions: Champion[];
  structures: Structure[];
  objective?: ObjectiveType;
  bluePlan?: TeamPlan | null;
  redPlan?: TeamPlan | null;
  className?: string;
  size?: number;
  showActions?: boolean;
  showHp?: boolean;
  /** Dim/highlight cinema: focus one lane (0/1/2) or null for all. */
  focusLane?: LaneId | null;
  /** Pull lane fighters closer together. */
  cinemaApproach?: boolean;
  highlightObjective?: boolean;
  objectiveAnim?: ObjectiveAnimPhase;
  objectiveWinner?: TeamColor | null;
  attackBeams?: AttackBeam[];
  combatFloats?: CombatFloat[];
  /** Objetivo del golpe activo (anillo de impacto). */
  impactTargetId?: string | null;
  /** Atacante del golpe activo (lunge hacia el objetivo). */
  lungeFromId?: string | null;
  /** Colorea el impacto activo como daño o curación. */
  activeEffectKind?: CombatFloat['kind'] | null;
};

type Pt = { x: number; y: number };

/** Approximate Summoner's Rift lane polylines (blue bottom-left, red top-right). */
const TOP_PATH: Pt[] = [
  { x: 0.14, y: 0.78 },
  { x: 0.12, y: 0.45 },
  { x: 0.18, y: 0.18 },
  { x: 0.45, y: 0.12 },
  { x: 0.72, y: 0.12 },
];

const MID_PATH: Pt[] = [
  { x: 0.22, y: 0.78 },
  { x: 0.38, y: 0.62 },
  { x: 0.5, y: 0.5 },
  { x: 0.62, y: 0.38 },
  { x: 0.78, y: 0.22 },
];

const BOT_PATH: Pt[] = [
  { x: 0.28, y: 0.88 },
  { x: 0.55, y: 0.88 },
  { x: 0.82, y: 0.82 },
  { x: 0.88, y: 0.55 },
  { x: 0.88, y: 0.28 },
];

function pointOnPath(path: Pt[], t: number): Pt {
  const clamped = Math.max(0, Math.min(1, t));
  const segCount = path.length - 1;
  const scaled = clamped * segCount;
  const i = Math.min(segCount - 1, Math.floor(scaled));
  const local = scaled - i;
  return {
    x: path[i].x + (path[i + 1].x - path[i].x) * local,
    y: path[i].y + (path[i + 1].y - path[i].y) * local,
  };
}

function pathToSvg(path: Pt[]): string {
  return path.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * 100} ${p.y * 100}`).join(' ');
}

function roleHomeLane(role: string): LaneId {
  if (role === 'top') return 0;
  if (role === 'adc' || role === 'support') return 2;
  return 1;
}

function getEffectiveLane(c: Champion, plan?: TeamPlan | null): LaneId {
  const def = champDef(c);
  if (plan?.bootsLane?.[c.instanceId] !== undefined && c.items.some(i => i.defId === 'boots')) {
    return plan.bootsLane[c.instanceId];
  }
  if (def.role === 'jungle' && plan && c.isAlive && c.stats.hp > 0 && (c.skipTurns || 0) <= 0) {
    const jt = plan.jungleTarget;
    if (jt === 'objective') return 1;
    if (jt === 0 || jt === 1 || jt === 2) return jt;
  }
  return (c.position.lane as LaneId) ?? roleHomeLane(def.role);
}

function champMapPos(
  c: Champion,
  plan?: TeamPlan | null,
  objective?: ObjectiveType,
  cinemaApproach?: boolean,
  focusLane?: LaneId | null,
): Pt {
  // Sin maná / en base: junto al nexo propio
  if (c.recallingForMana) {
    return c.team === 'blue' ? { x: 0.1, y: 0.9 } : { x: 0.9, y: 0.1 };
  }

  const def = champDef(c);
  const effectiveLane = getEffectiveLane(c, plan);
  if (def.role === 'jungle' && plan?.jungleTarget === 'objective' && c.isAlive && c.stats.hp > 0 && (c.skipTurns || 0) <= 0) {
    if (objectiveIsBaronSide(objective ?? null)) {
      return c.team === 'blue' ? { x: 0.34, y: 0.34 } : { x: 0.42, y: 0.38 };
    }
    return c.team === 'blue' ? { x: 0.58, y: 0.62 } : { x: 0.66, y: 0.66 };
  }

  if (
    plan?.jungleTarget === 'objective'
    && plan.objectiveAssistId === c.instanceId
    && c.isAlive
    && c.stats.hp > 0
  ) {
    if (objectiveIsBaronSide(objective ?? null)) {
      return c.team === 'blue' ? { x: 0.36, y: 0.4 } : { x: 0.44, y: 0.36 };
    }
    return c.team === 'blue' ? { x: 0.56, y: 0.66 } : { x: 0.64, y: 0.6 };
  }

  const path = effectiveLane === 0 ? TOP_PATH : effectiveLane === 2 ? BOT_PATH : MID_PATH;
  let t = Math.max(0.12, Math.min(0.88, c.position.x ?? 0.5));

  if (cinemaApproach && focusLane !== null && focusLane !== undefined && effectiveLane === focusLane) {
    t = c.team === 'blue' ? Math.min(0.62, t + 0.18) : Math.max(0.38, t - 0.18);
  }

  const p = pointOnPath(path, t);

  if (def.role === 'support') return { x: p.x + 0.02, y: p.y + 0.025 };
  if (def.role === 'adc') return { x: p.x - 0.015, y: p.y - 0.01 };
  if (def.role === 'jungle') return { x: p.x + 0.03, y: p.y - 0.03 };
  return p;
}

function structurePos(s: { type: string; team: string; lane: number; position: { x: number } }): Pt {
  if (s.type === 'nexus') {
    return s.team === 'blue' ? { x: 0.1, y: 0.9 } : { x: 0.9, y: 0.1 };
  }
  const path = s.lane === 0 ? TOP_PATH : s.lane === 2 ? BOT_PATH : MID_PATH;
  return pointOnPath(path, s.position.x);
}

function BloodDropSvg({
  cx,
  cy,
  scale = 1,
  anim = 'minimap-blood-pop 0.55s ease-out forwards',
}: {
  cx: number;
  cy: number;
  scale?: number;
  anim?: string;
}) {
  return (
    <g
      transform={`translate(${cx} ${cy}) scale(${scale})`}
      style={{ animation: anim, transformOrigin: 'center' }}
    >
      <path
        d="M0 -3.2 C0 -3.2 -2.4 0.4 -2.4 2.6 A2.6 2.6 0 0 0 2.4 2.6 C2.4 0.4 0 -3.2 0 -3.2 Z"
        fill="#C0392B"
        stroke="#922B21"
        strokeWidth="0.4"
      />
      <ellipse cx="0" cy="1.8" rx="1.1" ry="0.7" fill="#E74C3C" opacity="0.55" />
    </g>
  );
}

function HealSparkSvg({ cx, cy }: { cx: number; cy: number }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r="2.4"
      fill="#7DFFAE"
      opacity="0.95"
      style={{ animation: 'minimap-impact-dot 0.55s ease-out infinite' }}
    />
  );
}

function ActionBadge({ action, size }: { action: CombatAction; size: number }) {
  return (
    <div
      className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-[#0A0E1A]/95 border border-[#C9A84C]/70 flex items-center justify-center text-[#C9A84C]"
      style={{ width: size, height: size }}
    >
      {action === 'attack' && <Swords style={{ width: size * 0.55, height: size * 0.55 }} />}
      {action === 'ability' && <Sparkles style={{ width: size * 0.55, height: size * 0.55 }} />}
      {action === 'defend' && <Shield style={{ width: size * 0.55, height: size * 0.55 }} />}
    </div>
  );
}

function objectivePitPos(objective: ObjectiveType | null | undefined): Pt {
  if (objectiveIsBaronSide(objective ?? null)) return { x: 0.38, y: 0.36 };
  return { x: 0.62, y: 0.64 };
}

export default function Minimap({
  blueChampions,
  redChampions,
  structures,
  objective = null,
  bluePlan = null,
  redPlan = null,
  className = '',
  size = 168,
  showActions = false,
  showHp = false,
  focusLane = null,
  cinemaApproach = false,
  highlightObjective = false,
  objectiveAnim = 'none',
  objectiveWinner = null,
  attackBeams = [],
  combatFloats = [],
  impactTargetId = null,
  lungeFromId = null,
  activeEffectKind = null,
}: MinimapProps) {
  const livingBlue = blueChampions.filter(c => c.isAlive);
  const livingRed = redChampions.filter(c => c.isAlive);
  const uid = useId().replace(/:/g, '');
  const pit = objectivePitPos(objective);

  const posById = new Map<string, Pt>();
  for (const c of [...livingBlue, ...livingRed]) {
    const plan = c.team === 'blue' ? bluePlan : redPlan;
    posById.set(c.instanceId, champMapPos(c, plan, objective, cinemaApproach, focusLane));
  }
  for (const s of structures) {
    if (s.isDestroyed) continue;
    posById.set(s.id, structurePos(s));
  }

  // Lunge: desplazar al atacante un poco hacia el objetivo
  if (lungeFromId && impactTargetId) {
    const from = posById.get(lungeFromId);
    const to = posById.get(impactTargetId);
    if (from && to) {
      posById.set(lungeFromId, {
        x: from.x + (to.x - from.x) * 0.22,
        y: from.y + (to.y - from.y) * 0.22,
      });
    }
  }

  const impactPos = impactTargetId ? posById.get(impactTargetId) : undefined;

  const laneHighlight =
    focusLane === 0 ? TOP_PATH : focusLane === 1 ? MID_PATH : focusLane === 2 ? BOT_PATH : null;

  return (
    <div
      className={`relative shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      aria-label="Minimapa"
    >
      <div
        className="absolute inset-0 rounded-sm border-2"
        style={{
          borderColor: '#6B5A2E',
          boxShadow: 'inset 0 0 0 1px #2A2410, 0 0 0 1px #1A1508, 0 4px 18px rgba(0,0,0,0.55)',
          background: 'linear-gradient(145deg, #3A3420 0%, #1E1A10 40%, #2A2418 100%)',
        }}
      />
      <div className="absolute inset-[4px] overflow-hidden rounded-[1px]" style={{ background: '#0C1A0C' }}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden>
          <defs>
            <radialGradient id={`${uid}-blue`} cx="12%" cy="88%" r="28%">
              <stop offset="0%" stopColor="#1A4A8A" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#0D2A55" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#0C1A0C" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`${uid}-red`} cx="88%" cy="12%" r="28%">
              <stop offset="0%" stopColor="#7A2A2A" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#4A1515" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#0C1A0C" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${uid}-river`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2E6BAA" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#3E8AD4" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#2E6BAA" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          <rect width="100" height="100" fill="#0C1A0C" />
          <path d="M8,55 Q25,40 35,55 Q45,70 28,82 Q12,78 8,55Z" fill="#132613" />
          <path d="M55,8 Q70,20 82,28 Q78,45 62,38 Q48,22 55,8Z" fill="#132613" />
          <path d="M58,55 Q75,48 88,60 Q80,78 62,72 Q52,65 58,55Z" fill="#152A15" />
          <path d="M12,20 Q28,12 42,28 Q30,42 18,35 Q10,28 12,20Z" fill="#152A15" />

          <circle cx="12" cy="88" r="22" fill={`url(#${uid}-blue)`} />
          <circle cx="88" cy="12" r="22" fill={`url(#${uid}-red)`} />

          <path
            d="M8,28 C28,38 38,48 50,50 C62,52 72,62 92,72"
            fill="none"
            stroke={`url(#${uid}-river)`}
            strokeWidth="7"
            strokeLinecap="round"
          />

          <path
            d={pathToSvg(TOP_PATH)}
            fill="none"
            stroke="#C4B89A"
            strokeWidth={focusLane === 0 ? 4.2 : 3.2}
            strokeOpacity={focusLane !== null && focusLane !== 0 ? 0.35 : 1}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={pathToSvg(MID_PATH)}
            fill="none"
            stroke="#C4B89A"
            strokeWidth={focusLane === 1 ? 4.2 : 3.2}
            strokeOpacity={focusLane !== null && focusLane !== 1 ? 0.35 : 1}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={pathToSvg(BOT_PATH)}
            fill="none"
            stroke="#C4B89A"
            strokeWidth={focusLane === 2 ? 4.2 : 3.2}
            strokeOpacity={focusLane !== null && focusLane !== 2 ? 0.35 : 1}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {laneHighlight && (
            <path
              d={pathToSvg(laneHighlight)}
              fill="none"
              stroke="#C9A84C"
              strokeWidth="1.6"
              strokeOpacity="0.7"
              strokeDasharray="2 2"
            />
          )}

          {[
            [22, 32], [30, 48], [28, 68],
            [70, 28], [72, 48], [78, 68],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.1" fill="#C9A84C" opacity="0.55" />
          ))}

          {attackBeams.map((beam, i) => {
            const a = posById.get(beam.fromId);
            const b = posById.get(beam.toId);
            if (!a || !b) return null;
            const midX = (a.x + b.x) * 50;
            const midY = (a.y + b.y) * 50;
            const thick = beam.toKind === 'structure' ? 3.4 : 2.6;
            const isHealBeam = beam.effectKind === 'heal';
            const beamColor = isHealBeam ? '#2ECC71' : '#E74C3C';
            return (
              <g key={`beam-${beam.fromId}-${beam.toId}-${i}`}>
                <line
                  x1={a.x * 100}
                  y1={a.y * 100}
                  x2={b.x * 100}
                  y2={b.y * 100}
                  stroke={isHealBeam ? '#1D8F50' : '#922B21'}
                  strokeWidth={thick + 2.2}
                  strokeOpacity="0.35"
                  strokeLinecap="round"
                />
                <line
                  x1={a.x * 100}
                  y1={a.y * 100}
                  x2={b.x * 100}
                  y2={b.y * 100}
                  stroke={beamColor}
                  strokeWidth={thick}
                  strokeOpacity="0.98"
                  strokeLinecap="round"
                  style={{
                    filter: `drop-shadow(0 0 5px ${beamColor})`,
                    animation: 'minimap-beam 0.4s ease-in-out infinite alternate',
                  }}
                />
                {isHealBeam ? (
                  <HealSparkSvg cx={b.x * 100} cy={b.y * 100} />
                ) : (
                  <BloodDropSvg
                    cx={b.x * 100}
                    cy={b.y * 100}
                    scale={beam.toKind === 'structure' ? 1.35 : 1.05}
                  />
                )}
                {!isHealBeam && (
                  <BloodDropSvg cx={midX} cy={midY} scale={0.65} anim="minimap-blood-trail 0.45s ease-out infinite" />
                )}
              </g>
            );
          })}

          {impactPos && (
            <g key={`impact-${impactTargetId}`}>
              {activeEffectKind === 'heal' ? (
                <>
                  <circle
                    cx={impactPos.x * 100}
                    cy={impactPos.y * 100}
                    r="6"
                    fill="none"
                    stroke="#2ECC71"
                    strokeWidth="1.8"
                    style={{ animation: 'minimap-impact-ring 0.7s ease-out infinite' }}
                  />
                  <circle
                    cx={impactPos.x * 100}
                    cy={impactPos.y * 100}
                    r="3.5"
                    fill="rgba(46,204,113,0.45)"
                    style={{ animation: 'minimap-impact-flash 0.55s ease-out infinite' }}
                  />
                </>
              ) : (
                <>
                  <BloodDropSvg cx={impactPos.x * 100} cy={impactPos.y * 100} scale={1.5} />
                  <BloodDropSvg
                    cx={impactPos.x * 100 - 4}
                    cy={impactPos.y * 100 + 3}
                    scale={0.85}
                    anim="minimap-blood-pop 0.7s ease-out 0.08s forwards"
                  />
                  <BloodDropSvg
                    cx={impactPos.x * 100 + 4}
                    cy={impactPos.y * 100 + 2}
                    scale={0.75}
                    anim="minimap-blood-pop 0.7s ease-out 0.14s forwards"
                  />
                </>
              )}
            </g>
          )}
        </svg>

        {structures.filter(s => !s.isDestroyed).map(s => {
          const p = structurePos(s);
          const isBlue = s.team === 'blue';
          const isNexus = s.type === 'nexus';
          const dim = focusLane !== null && !isNexus && s.lane !== focusLane;
          const hpPct = Math.max(0, Math.min(1, s.hp / Math.max(1, s.maxHp)));
          const beingHit = impactTargetId === s.id;
          const lowHp = hpPct <= 0.35;
          const glow = beingHit
            ? '0 0 14px rgba(241,196,15,0.95), 0 0 28px rgba(231,76,60,0.7)'
            : lowHp
              ? `0 0 10px ${isBlue ? 'rgba(52,152,219,0.85)' : 'rgba(231,76,60,0.85)'}`
              : `0 0 6px ${isBlue ? 'rgba(46,134,193,0.7)' : 'rgba(192,57,43,0.7)'}`;
          return (
            <div
              key={s.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-700"
              style={{
                left: `${p.x * 100}%`,
                top: `${p.y * 100}%`,
                opacity: dim ? 0.35 : 1,
                zIndex: beingHit ? 12 : 5,
                animation: beingHit ? 'minimap-struct-hit 0.45s ease-out' : undefined,
              }}
              title={`${isBlue ? 'Azul' : 'Rojo'} ${isNexus ? 'Nexo' : 'Torre'} · ${Math.floor(s.hp)}/${s.maxHp}`}
            >
              {isNexus ? (
                <div
                  className="rounded-full border-2"
                  style={{
                    width: size * (beingHit ? 0.085 : 0.07),
                    height: size * (beingHit ? 0.085 : 0.07),
                    backgroundColor: isBlue ? '#2E86C1' : '#C0392B',
                    borderColor: beingHit ? '#F1C40F' : isBlue ? '#85C1E9' : '#F1948A',
                    boxShadow: glow,
                    transition: 'width 0.25s ease, height 0.25s ease',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: size * (beingHit ? 0.07 : 0.055),
                    height: size * (beingHit ? 0.07 : 0.055),
                    backgroundColor: isBlue ? '#2471A3' : '#922B21',
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    boxShadow: glow,
                    transition: 'width 0.25s ease, height 0.25s ease',
                  }}
                />
              )}
              {showHp && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 rounded-sm overflow-hidden bg-black/70"
                  style={{
                    top: isNexus ? size * 0.075 : size * 0.06,
                    width: size * (isNexus ? 0.09 : 0.07),
                    height: 3,
                  }}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${hpPct * 100}%`,
                      backgroundColor: hpPct > 0.5 ? '#27AE60' : hpPct > 0.25 ? '#F1C40F' : '#E74C3C',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}

        {objective && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: `${pit.x * 100}%`,
              top: `${pit.y * 100}%`,
              zIndex: highlightObjective || objectiveAnim !== 'none' ? 8 : 3,
            }}
            title={objectiveName(objective)}
          >
            {(objectiveAnim === 'pulse' || highlightObjective) && (
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#F1C40F]"
                style={{
                  width: size * 0.16,
                  height: size * 0.16,
                  animation: 'minimap-obj-pulse 1s ease-out infinite',
                  opacity: 0.85,
                }}
              />
            )}
            {objectiveAnim === 'clash' && (
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: size * 0.22,
                  height: size * 0.22,
                  background: 'radial-gradient(circle, rgba(241,196,15,0.85) 0%, transparent 70%)',
                  animation: 'minimap-obj-clash 0.45s ease-out',
                }}
              />
            )}
            {objectiveAnim === 'claim' && (
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px]"
                style={{
                  width: size * 0.2,
                  height: size * 0.2,
                  borderColor: objectiveWinner === 'blue' ? '#3498DB' : objectiveWinner === 'red' ? '#E74C3C' : '#F1C40F',
                  boxShadow: `0 0 14px ${
                    objectiveWinner === 'blue' ? 'rgba(52,152,219,0.85)' :
                    objectiveWinner === 'red' ? 'rgba(231,76,60,0.85)' :
                    'rgba(241,196,15,0.7)'
                  }`,
                  animation: 'minimap-obj-claim 0.8s ease-out forwards',
                }}
              />
            )}
            <div
              className="rounded-sm rotate-45 border border-[#F1C40F] relative z-[1]"
              style={{
                width: size * (highlightObjective || objectiveAnim !== 'none' ? 0.055 : 0.045),
                height: size * (highlightObjective || objectiveAnim !== 'none' ? 0.055 : 0.045),
                backgroundColor:
                  objective === 'baron' ? '#9B59B6' :
                  objective === 'dragon_ancestral' ? '#F1C40F' :
                  objective === 'dragon_water' ? '#3498DB' :
                  '#E67E22',
                boxShadow: '0 0 8px rgba(241,196,15,0.7)',
                transition: 'width 0.6s ease, height 0.6s ease',
              }}
            />
          </div>
        )}

        {[
          ...livingBlue.map(c => ({ c, plan: bluePlan, team: 'blue' as const })),
          ...livingRed.map(c => ({ c, plan: redPlan, team: 'red' as const })),
        ].map(({ c, plan, team }) => {
          const p = posById.get(c.instanceId) ?? champMapPos(c, plan, objective, cinemaApproach, focusLane);
          const def = champDef(c);
          const lane = getEffectiveLane(c, plan);
          const onObj =
            (def.role === 'jungle' && plan?.jungleTarget === 'objective') ||
            plan?.objectiveAssistId === c.instanceId;
          const dim =
            focusLane !== null
              ? lane !== focusLane && !(highlightObjective && onObj)
              : highlightObjective
                ? !onObj
                : false;
          const isLunging = lungeFromId === c.instanceId;
          const isImpacted = impactTargetId === c.instanceId;
          const isHealing = isImpacted && activeEffectKind === 'heal';
          const icon = size * (isLunging || isImpacted ? 0.115 : 0.095);
          const action = showActions ? plan?.actions?.[c.instanceId] : undefined;
          return (
            <div
              key={c.instanceId}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${p.x * 100}%`,
                top: `${p.y * 100}%`,
                zIndex: dim ? 4 : isLunging || isImpacted ? 14 : 6,
                opacity: dim ? 0.22 : 1,
                transition: 'left 0.45s cubic-bezier(0.22, 1.2, 0.36, 1), top 0.45s cubic-bezier(0.22, 1.2, 0.36, 1), opacity 0.45s ease',
              }}
              title={`${c.playerName ? `${c.playerName} · ` : ''}${def.name}${c.playerAffinity != null ? ` · ${c.playerAffinity}%` : ''}${c.recallingForMana ? ' · BASE' : ''}${action ? ` · ${actionLabelEs(action)}` : ''} · MN ${Math.floor(c.stats.mana)}/${c.stats.maxMana}`}
            >
              <div
                className="rounded-full overflow-hidden border-2 relative"
                style={{
                  width: icon,
                  height: icon,
                  borderColor: c.recallingForMana
                    ? '#8B9BB4'
                    : isLunging
                      ? '#F1C40F'
                      : isImpacted
                        ? isHealing ? '#2ECC71' : '#E74C3C'
                        : team === 'blue' ? '#5DADE2' : '#F1948A',
                  boxShadow: isLunging
                    ? '0 0 12px rgba(241,196,15,0.9)'
                    : isImpacted
                      ? isHealing
                        ? '0 0 14px rgba(46,204,113,0.9)'
                        : '0 0 14px rgba(231,76,60,0.9)'
                      : `0 0 0 1px ${team === 'blue' ? '#1A5276' : '#7B241C'}, 0 1px 4px rgba(0,0,0,0.7)`,
                  backgroundColor: def.color || '#333',
                  animation: isLunging
                    ? 'minimap-lunge 0.5s ease-out'
                    : isImpacted
                      ? 'minimap-hit-bounce 0.5s ease-out'
                      : dim || c.recallingForMana
                        ? undefined
                        : 'minimap-idle-bob 2.2s ease-in-out infinite',
                  filter: c.recallingForMana ? 'grayscale(0.45)' : undefined,
                }}
              >
                {def.image ? (
                  <img src={def.image} alt={def.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white">
                    {def.initials}
                  </div>
                )}
              </div>
              {isImpacted && !isHealing && (
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ animation: 'minimap-blood-pop 0.55s ease-out forwards', zIndex: 16 }}
                >
                  <Droplet
                    className="fill-[#C0392B] text-[#922B21] drop-shadow-[0_0_6px_rgba(192,57,43,0.9)]"
                    style={{ width: icon * 0.62, height: icon * 0.62 }}
                    strokeWidth={2}
                  />
                </div>
              )}
              {/* Badge definitiva / BASE */}
              <div
                className="absolute -top-1 -right-1 rounded-full flex items-center justify-center font-black leading-none border border-black/50"
                style={{
                  width: Math.max(12, icon * 0.38),
                  height: Math.max(12, icon * 0.38),
                  fontSize: Math.max(7, icon * 0.22),
                  backgroundColor: c.recallingForMana
                    ? '#4A5570'
                    : (c.ultimateCooldown || 0) > 0
                      ? '#2C3E50'
                      : '#9B59B6',
                  color: '#F0E6D2',
                }}
              >
                {c.recallingForMana ? 'B' : (c.ultimateCooldown || 0) > 0 ? c.ultimateCooldown : 'R'}
              </div>
              {showHp && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 rounded-sm overflow-hidden bg-black/75"
                  style={{ top: icon + 1, width: icon * 1.05, height: 3 }}
                >
                  <div
                    className="h-full transition-[width] duration-500"
                    style={{
                      width: `${Math.max(0, Math.min(100, (c.stats.hp / Math.max(1, c.stats.maxHp)) * 100))}%`,
                      backgroundColor:
                        c.stats.hp / c.stats.maxHp > 0.5 ? '#27AE60' :
                        c.stats.hp / c.stats.maxHp > 0.25 ? '#F1C40F' : '#E74C3C',
                    }}
                  />
                </div>
              )}
              {showHp && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 rounded-sm overflow-hidden bg-black/75"
                  style={{ top: icon + 5, width: icon * 1.05, height: 2 }}
                >
                  <div
                    className="h-full transition-[width] duration-500"
                    style={{
                      width: `${Math.max(0, Math.min(100, (c.stats.mana / Math.max(1, c.stats.maxMana)) * 100))}%`,
                      backgroundColor: '#3498DB',
                    }}
                  />
                </div>
              )}
              {showActions && action && !dim && !c.recallingForMana && (
                <ActionBadge action={action} size={icon * 0.42} />
              )}
              {c.playerName && !dim && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-0.5 font-bold leading-none pointer-events-none"
                  style={{
                    top: icon + (showHp ? 8 : 2),
                    fontSize: Math.max(6, icon * 0.18),
                    color: (c.playerAffinity ?? 0) >= 90 ? '#F1C40F' : '#8B9BB4',
                    backgroundColor: 'rgba(10,14,26,0.75)',
                  }}
                >
                  {c.playerAffinity != null ? `${c.playerAffinity}%` : c.playerName}
                </div>
              )}
            </div>
          );
        })}

        {combatFloats.map((f, i) => {
          let p: Pt | undefined;
          if (f.targetType === 'champ') {
            p = posById.get(f.targetId);
          } else {
            const s = structures.find(x => x.id === f.targetId);
            if (s) p = structurePos(s);
          }
          if (!p) return null;
          const isHeal = f.kind === 'heal';
          const palette = combatFloatStyle(f.kind, f.sourceTeam);
          return (
            <div
              key={`${f.id}-${i}`}
              className="absolute -translate-x-1/2 pointer-events-none rounded-md border-2 border-transparent p-0.5 font-black leading-none"
              style={{
                left: `${p.x * 100}%`,
                top: `${p.y * 100}%`,
                fontSize: Math.max(14, size * 0.055),
                background: `linear-gradient(rgba(10,14,26,0.88), rgba(10,14,26,0.88)) padding-box, ${palette.fill} border-box`,
                animation: 'minimap-float-big 1.4s cubic-bezier(0.22, 1.4, 0.36, 1) forwards',
                zIndex: 22,
              }}
            >
              <span style={{ textShadow: `0 2px 4px #000, 0 0 10px ${palette.glow}99` }}>
                <span style={{ color: palette.signColor }}>{isHeal ? '+' : '−'}</span>
                <span style={{ color: palette.numberColor }}>{f.amount}</span>
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes minimap-beam {
          from { stroke-opacity: 0.55; }
          to { stroke-opacity: 1; }
        }
        @keyframes minimap-beam-spark {
          0% { opacity: 0.3; transform: scale(0.6); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0.3; transform: scale(0.6); }
        }
        @keyframes minimap-blood-pop {
          0% { opacity: 0; transform: scale(0.35); }
          35% { opacity: 1; transform: scale(1.15); }
          100% { opacity: 0.85; transform: scale(1); }
        }
        @keyframes minimap-blood-trail {
          0%, 100% { opacity: 0.45; transform: scale(0.75); }
          50% { opacity: 0.95; transform: scale(1.05); }
        }
        @keyframes minimap-impact-dot {
          0%, 100% { opacity: 0.7; r: 2; }
          50% { opacity: 1; }
        }
        @keyframes minimap-impact-ring {
          0% { opacity: 0.95; transform: scale(0.4); }
          100% { opacity: 0; transform: scale(1.8); }
        }
        @keyframes minimap-impact-flash {
          0% { opacity: 0.8; }
          100% { opacity: 0.15; }
        }
        @keyframes minimap-float-big {
          0% { transform: translate(-50%, 4px) scale(0.4); opacity: 0; }
          20% { transform: translate(-50%, -6px) scale(1.35); opacity: 1; }
          70% { transform: translate(-50%, -22px) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -36px) scale(0.9); opacity: 0; }
        }
        @keyframes minimap-idle-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes minimap-lunge {
          0% { transform: scale(0.85); }
          40% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes minimap-hit-bounce {
          0% { transform: scale(1.25); }
          50% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        @keyframes minimap-struct-hit {
          0% { transform: translate(-50%, -50%) scale(1.3); filter: brightness(1.4); }
          100% { transform: translate(-50%, -50%) scale(1); filter: brightness(1); }
        }
        @keyframes minimap-obj-pulse {
          0% { transform: translate(-50%, -50%) scale(0.7); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(1.35); opacity: 0; }
        }
        @keyframes minimap-obj-clash {
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
        }
        @keyframes minimap-obj-claim {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          60% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
