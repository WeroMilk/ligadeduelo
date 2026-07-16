import { useId } from 'react';
import type { Champion, Structure, TeamPlan, LaneId, ObjectiveType, CombatAction, TeamColor, CombatFloat } from '@/types/game';
import { actionLabelEs, champDef } from '@/lib/turn-engine';
import { objectiveIsBaronSide, objectiveName } from '@/lib/game-data';
import { Swords, Shield, Sparkles } from 'lucide-react';

export type ObjectiveAnimPhase = 'none' | 'pulse' | 'clash' | 'claim';

export type AttackBeam = { blueId: string; redId: string };

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
  if (def.role === 'jungle' && plan) {
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
  const def = champDef(c);
  const effectiveLane = getEffectiveLane(c, plan);
  if (def.role === 'jungle' && plan?.jungleTarget === 'objective') {
    if (objectiveIsBaronSide(objective ?? null)) {
      return c.team === 'blue' ? { x: 0.34, y: 0.34 } : { x: 0.42, y: 0.38 };
    }
    return c.team === 'blue' ? { x: 0.58, y: 0.62 } : { x: 0.66, y: 0.66 };
  }

  if (plan?.jungleTarget === 'objective' && plan.objectiveAssistId === c.instanceId) {
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
            const a = posById.get(beam.blueId);
            const b = posById.get(beam.redId);
            if (!a || !b) return null;
            return (
              <line
                key={`beam-${i}`}
                x1={a.x * 100}
                y1={a.y * 100}
                x2={b.x * 100}
                y2={b.y * 100}
                stroke="#F1C40F"
                strokeWidth="1.4"
                strokeOpacity="0.9"
                strokeLinecap="round"
                style={{
                  filter: 'drop-shadow(0 0 2px #F1C40F)',
                  animation: 'minimap-beam 0.7s ease-in-out infinite alternate',
                }}
              />
            );
          })}
        </svg>

        {structures.filter(s => !s.isDestroyed).map(s => {
          const p = structurePos(s);
          const isBlue = s.team === 'blue';
          const isNexus = s.type === 'nexus';
          const dim = focusLane !== null && !isNexus && s.lane !== focusLane;
          const hpPct = Math.max(0, Math.min(1, s.hp / Math.max(1, s.maxHp)));
          return (
            <div
              key={s.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-700"
              style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, opacity: dim ? 0.35 : 1 }}
              title={`${isBlue ? 'Azul' : 'Rojo'} ${isNexus ? 'Nexo' : 'Torre'} · ${Math.floor(s.hp)}/${s.maxHp}`}
            >
              {isNexus ? (
                <div
                  className="rounded-full border-2"
                  style={{
                    width: size * 0.07,
                    height: size * 0.07,
                    backgroundColor: isBlue ? '#2E86C1' : '#C0392B',
                    borderColor: isBlue ? '#85C1E9' : '#F1948A',
                    boxShadow: `0 0 6px ${isBlue ? 'rgba(46,134,193,0.7)' : 'rgba(192,57,43,0.7)'}`,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: size * 0.055,
                    height: size * 0.055,
                    backgroundColor: isBlue ? '#2471A3' : '#922B21',
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    boxShadow: '0 0 3px rgba(0,0,0,0.6)',
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
          const icon = size * 0.095;
          const action = showActions ? plan?.actions?.[c.instanceId] : undefined;
          return (
            <div
              key={c.instanceId}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${p.x * 100}%`,
                top: `${p.y * 100}%`,
                zIndex: dim ? 4 : 6,
                opacity: dim ? 0.28 : 1,
                transition: 'left 1s ease, top 1s ease, opacity 0.6s ease',
              }}
              title={`${def.name}${action ? ` · ${actionLabelEs(action)}` : ''}`}
            >
              <div
                className="rounded-full overflow-hidden border-2"
                style={{
                  width: icon,
                  height: icon,
                  borderColor: team === 'blue' ? '#5DADE2' : '#F1948A',
                  boxShadow: `0 0 0 1px ${team === 'blue' ? '#1A5276' : '#7B241C'}, 0 1px 4px rgba(0,0,0,0.7)`,
                  backgroundColor: def.color || '#333',
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
              {showActions && action && !dim && <ActionBadge action={action} size={icon * 0.42} />}
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
          return (
            <div
              key={`${f.id}-${i}`}
              className="absolute -translate-x-1/2 pointer-events-none font-black text-[10px] leading-none"
              style={{
                left: `${p.x * 100}%`,
                top: `${p.y * 100}%`,
                color: isHeal ? '#2ECC71' : '#E74C3C',
                textShadow: '0 1px 2px #000, 0 0 4px rgba(0,0,0,0.9)',
                animation: 'minimap-float 1.1s ease-out forwards',
                animationDelay: `${(i % 4) * 0.08}s`,
                zIndex: 20,
              }}
            >
              {isHeal ? '+' : '−'}{f.amount}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes minimap-beam {
          from { stroke-opacity: 0.45; }
          to { stroke-opacity: 1; }
        }
        @keyframes minimap-float {
          0% { transform: translate(-50%, 0); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate(-50%, -18px); opacity: 0; }
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
