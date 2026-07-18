import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PendingObjective, TeamColor } from '@/types/game';
import { objectiveName } from '@/lib/game-data';
import type { ObjectiveQtePayload } from '@/components/ObjectiveMinigame';

const COUNTDOWN_STEPS = ['3', '2', '1', '¡YA!'] as const;
const COUNTDOWN_STEP_MS = 700;
const BATTLE_MS = 10_000;

type Phase = 'countdown' | 'battle' | 'done';

type Props = {
  leftLabel: string;
  rightLabel: string;
  leftTeam: TeamColor;
  rightTeam: TeamColor;
  pending: PendingObjective;
  onComplete: (result: ObjectiveQtePayload) => void;
  paused?: boolean;
};

function resolveAttackingTeam(pending: PendingObjective): TeamColor {
  if (pending.kind === 'nexus_assault') return 'blue';
  if (pending.kind === 'nexus_defense') return 'red';
  if (pending.contested || pending.kind === 'gank') return 'blue';
  return 'blue';
}

export default function CoopClickBattle({
  leftLabel,
  rightLabel,
  leftTeam,
  rightTeam,
  pending,
  onComplete,
  paused = false,
}: Props) {
  const [phase, setPhase] = useState<Phase>('countdown');
  const [countdownIdx, setCountdownIdx] = useState(0);
  const [leftClicks, setLeftClicks] = useState(0);
  const [rightClicks, setRightClicks] = useState(0);
  const [battleLeftMs, setBattleLeftMs] = useState(BATTLE_MS);
  const leftClicksRef = useRef(0);
  const rightClicksRef = useRef(0);
  const completedRef = useRef(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const finish = useCallback((leftWins: boolean) => {
    if (completedRef.current) return;
    completedRef.current = true;
    setPhase('done');

    const skirmishWinner: TeamColor = leftWins ? leftTeam : rightTeam;
    const isSkirmishOnly =
      pending.kind === 'gank' || pending.kind === 'nexus_defense' || pending.contested;
    const attackingTeam = isSkirmishOnly ? skirmishWinner : resolveAttackingTeam(pending);
    const attackerWins = skirmishWinner === attackingTeam;

    let monsterTaken: boolean;
    if (pending.kind === 'nexus_assault' || pending.kind === 'nexus_defense') {
      monsterTaken = attackerWins;
    } else if (isSkirmishOnly) {
      monsterTaken = true;
    } else {
      monsterTaken = attackerWins;
    }

    onComplete({
      skirmishWinner: pending.contested || pending.kind === 'gank' ? skirmishWinner : null,
      attackingTeam,
      monsterTaken,
      loserFate: skirmishWinner === 'blue' ? 'killed' : undefined,
    });
  }, [leftTeam, rightTeam, pending, onComplete]);

  useEffect(() => {
    if (phase !== 'countdown' || paused) return;
    if (countdownIdx >= COUNTDOWN_STEPS.length) {
      setPhase('battle');
      return;
    }
    const t = window.setTimeout(() => setCountdownIdx(i => i + 1), COUNTDOWN_STEP_MS);
    return () => window.clearTimeout(t);
  }, [phase, countdownIdx, paused]);

  useEffect(() => {
    if (phase !== 'battle' || paused) return;
    const started = Date.now();
    const iv = window.setInterval(() => {
      const left = Math.max(0, BATTLE_MS - (Date.now() - started));
      setBattleLeftMs(left);
      if (left <= 0) {
        window.clearInterval(iv);
        finish(leftClicksRef.current >= rightClicksRef.current);
      }
    }, 100);
    return () => window.clearInterval(iv);
  }, [phase, paused, finish]);

  const label =
    pending.kind === 'gank'
      ? `Choque · ${pending.lane === 0 ? 'Superior' : pending.lane === 2 ? 'Inferior' : 'Central'}`
      : pending.kind === 'nexus_assault'
        ? 'Asalto al nexo'
        : pending.kind === 'nexus_defense'
          ? 'Defensa del nexo'
          : pending.objective
            ? objectiveName(pending.objective)
            : 'Objetivo';

  const body = (
    <div className="fixed inset-0 z-[95] flex flex-col bg-black/90">
      <div className="shrink-0 border-b border-[#2A3550] px-4 py-3 text-center">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C]">
          PvP · Combate rápido
        </p>
        <h2 className="text-lg font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
          {label}
        </h2>
        {phase === 'battle' && (
          <p className="mt-1 text-xs font-mono text-[#F1C40F]">
            {Math.ceil(battleLeftMs / 1000)}s
          </p>
        )}
      </div>

      {phase === 'countdown' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C]">
            {paused ? 'Pausa' : 'Prepárense'}
          </p>
          <p
            key={countdownIdx}
            className="text-6xl font-black text-[#F1C40F] drop-shadow-[0_0_24px_rgba(241,196,15,0.55)]"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            {COUNTDOWN_STEPS[Math.min(countdownIdx, COUNTDOWN_STEPS.length - 1)]}
          </p>
          <p className="text-sm text-[#8B9BB4] text-center">
            {leftLabel} vs {rightLabel} · Toca tu mitad lo más rápido posible
          </p>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          <button
            type="button"
            disabled={phase === 'done' || paused}
            onClick={() => {
              leftClicksRef.current += 1;
              setLeftClicks(leftClicksRef.current);
            }}
            className="flex flex-1 flex-col items-center justify-center gap-2 border-r border-[#2A3550] bg-[#3498DB]/15 active:bg-[#3498DB]/30 touch-manipulation select-none"
            style={{ touchAction: 'manipulation' }}
          >
            <span className="text-4xl font-black text-[#3498DB]">{leftClicks}</span>
            <span className="max-w-[90%] truncate text-sm font-bold text-[#F0E6D2]">{leftLabel}</span>
          </button>
          <button
            type="button"
            disabled={phase === 'done' || paused}
            onClick={() => {
              rightClicksRef.current += 1;
              setRightClicks(rightClicksRef.current);
            }}
            className="flex flex-1 flex-col items-center justify-center gap-2 bg-[#E74C3C]/15 active:bg-[#E74C3C]/30 touch-manipulation select-none"
            style={{ touchAction: 'manipulation' }}
          >
            <span className="text-4xl font-black text-[#E74C3C]">{rightClicks}</span>
            <span className="max-w-[90%] truncate text-sm font-bold text-[#F0E6D2]">{rightLabel}</span>
          </button>
        </div>
      )}
    </div>
  );

  return createPortal(body, document.body);
}
