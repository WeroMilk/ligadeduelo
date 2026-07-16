import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { PendingObjective, TeamColor } from '@/types/game';
import { objectiveName } from '@/lib/game-data';

export type ObjectiveQtePayload = {
  skirmishWinner: TeamColor | null;
  attackingTeam: TeamColor;
  monsterTaken: boolean;
};

type Zone = { id: number; x: number; y: number; expires: number };

type Props = {
  pending: PendingObjective;
  onComplete: (result: ObjectiveQtePayload) => void;
};

const ZONE_MS = 1200;
const SKIRMISH_GOAL = 100;
const MONSTER_HP = 100;

export default function ObjectiveMinigame({ pending, onComplete }: Props) {
  const contested = pending.contested;
  const [phase, setPhase] = useState<'skirmish' | 'monster'>(contested ? 'skirmish' : 'monster');
  const [blueBar, setBlueBar] = useState(0);
  const [redBar, setRedBar] = useState(0);
  const [monsterHp, setMonsterHp] = useState(MONSTER_HP);
  const [allyHp, setAllyHp] = useState(100);
  const [skirmishWinner, setSkirmishWinner] = useState<TeamColor | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null);
  const [log, setLog] = useState<string>('¡Toca las zonas a tiempo!');

  const attackingTeam: TeamColor =
    phase === 'monster' && skirmishWinner
      ? skirmishWinner
      : 'blue';

  const spawnZone = useCallback(() => {
    setZone({
      id: Date.now(),
      x: 18 + Math.random() * 64,
      y: 22 + Math.random() * 50,
      expires: Date.now() + ZONE_MS,
    });
  }, []);

  useEffect(() => {
    spawnZone();
    const iv = window.setInterval(spawnZone, ZONE_MS + 200);
    return () => window.clearInterval(iv);
  }, [phase, spawnZone]);

  useEffect(() => {
    if (!zone) return;
    const t = window.setTimeout(() => {
      // Zona expiró = fallo
      setFlash('miss');
      if (phase === 'skirmish') {
        setRedBar(v => Math.min(SKIRMISH_GOAL, v + 14));
        setLog('Fallaste · el rival golpea');
      } else {
        setAllyHp(v => Math.max(0, v - 16));
        setLog('El objetivo te golpea');
      }
      setZone(null);
      window.setTimeout(() => setFlash(null), 280);
    }, ZONE_MS);
    return () => window.clearTimeout(t);
  }, [zone, phase]);

  // Fin escaramuza
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
      // Auto-result: rival pelea monstruo sin QTE del jugador
      window.setTimeout(() => {
        onComplete({
          skirmishWinner: 'red',
          attackingTeam: 'red',
          monsterTaken: Math.random() < 0.55,
        });
      }, 900);
    }
  }, [blueBar, redBar, phase, onComplete]);

  // Fin monstruo (jugador atacando)
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
      setBlueBar(v => Math.min(SKIRMISH_GOAL, v + 18));
      setLog('¡Acierto! Aliados golpean');
    } else {
      setMonsterHp(v => Math.max(0, v - 18));
      setLog('¡Acierto! Aliados dañan al objetivo');
    }
    setZone(null);
    window.setTimeout(() => setFlash(null), 280);
    window.setTimeout(spawnZone, 180);
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
          className={`relative h-64 sm:h-72 bg-[#141B2D] ${
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

          {zone && (
            <button
              type="button"
              onClick={onZoneClick}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-4 border-[#F1C40F] bg-[#F1C40F]/25 animate-obj-zone"
              style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
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
