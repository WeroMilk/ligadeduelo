import { useId } from 'react';
import type { Champion, Structure, TeamPlan, LaneId, ObjectiveType, CombatAction } from '@/types/game';
import { actionLabelEs, champDef } from '@/lib/turn-engine';
import { objectiveIsBaronSide, objectiveName } from '@/lib/game-data';
import { Swords, Shield, Sparkles } from 'lucide-react';

type MinimapProps = {
  blueChampions: Champion[];
  redChampions: Champion[];
  structures: Structure[];
  objective?: ObjectiveType;
  /** If provided, blue champ positions use plan (jungle/boots). */
  bluePlan?: TeamPlan | null;
  /** If provided, red champ positions use plan. */
  redPlan?: TeamPlan | null;
  className?: string;
  size?: number;
  showActions?: boolean;
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

function champMapPos(c: Champion, plan?: TeamPlan | null, objective?: ObjectiveType): Pt {
  const def = champDef(c);
  const effectiveLane = getEffectiveLane(c, plan);

  if (def.role === 'jungle' && plan?.jungleTarget === 'objective') {
    if (objectiveIsBaronSide(objective ?? null)) return { x: 0.38, y: 0.36 };
    return { x: 0.62, y: 0.64 };
  }

  // Assist leaves for objective pit too
  if (plan?.jungleTarget === 'objective' && plan.objectiveAssistId === c.instanceId) {
    if (objectiveIsBaronSide(objective ?? null)) return { x: 0.4, y: 0.4 };
    return { x: 0.6, y: 0.6 };
  }

  const path = effectiveLane === 0 ? TOP_PATH : effectiveLane === 2 ? BOT_PATH : MID_PATH;
  const t = Math.max(0.12, Math.min(0.88, c.position.x ?? 0.5));
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
}: MinimapProps) {
  const livingBlue = blueChampions.filter(c => c.isAlive);
  const livingRed = redChampions.filter(c => c.isAlive);
  const uid = useId().replace(/:/g, '');

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

          <path d={pathToSvg(TOP_PATH)} fill="none" stroke="#C4B89A" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={pathToSvg(MID_PATH)} fill="none" stroke="#C4B89A" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={pathToSvg(BOT_PATH)} fill="none" stroke="#C4B89A" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />

          {[
            [22, 32], [30, 48], [28, 68],
            [70, 28], [72, 48], [78, 68],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.1" fill="#C9A84C" opacity="0.55" />
          ))}
        </svg>

        {structures.filter(s => !s.isDestroyed).map(s => {
          const p = structurePos(s);
          const isBlue = s.team === 'blue';
          const isNexus = s.type === 'nexus';
          return (
            <div
              key={s.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
              title={`${isBlue ? 'Azul' : 'Rojo'} ${isNexus ? 'Nexo' : 'Torre'}`}
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
            </div>
          );
        })}

        {objective && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: objectiveIsBaronSide(objective) ? '38%' : '62%',
              top: objectiveIsBaronSide(objective) ? '36%' : '64%',
            }}
            title={objectiveName(objective)}
          >
            <div
              className="rounded-sm rotate-45 border border-[#F1C40F]"
              style={{
                width: size * 0.045,
                height: size * 0.045,
                backgroundColor:
                  objective === 'baron' ? '#9B59B6' :
                  objective === 'dragon_ancestral' ? '#F1C40F' :
                  objective === 'dragon_water' ? '#3498DB' :
                  '#E67E22',
                boxShadow: '0 0 8px rgba(241,196,15,0.7)',
              }}
            />
          </div>
        )}

        {[
          ...livingBlue.map(c => ({ c, plan: bluePlan, team: 'blue' as const })),
          ...livingRed.map(c => ({ c, plan: redPlan, team: 'red' as const })),
        ].map(({ c, plan, team }) => {
          const p = champMapPos(c, plan, objective);
          const def = champDef(c);
          const icon = size * 0.095;
          const action = showActions ? plan?.actions?.[c.instanceId] : undefined;
          return (
            <div
              key={c.instanceId}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, zIndex: 5 }}
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
              {showActions && action && <ActionBadge action={action} size={icon * 0.42} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
