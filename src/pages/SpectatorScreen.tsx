import { useEffect, useRef, useCallback, useState } from 'react';
import { useGame } from '@/hooks/useGameState';
import { getChampionDef } from '@/lib/game-engine';
import { CHAMPIONS } from '@/lib/game-data';
import CombatFeed from '@/components/CombatFeed';
import {
  playKillSound, playFirstBloodSound, playMultiKillSound, playTowerSound,
} from '@/lib/sounds';
import { Eye, FastForward } from 'lucide-react';

const CANVAS_W = 400;
const CANVAS_H = 420;

const imageCache = new Map<string, HTMLImageElement>();

function getCachedImage(src: string): HTMLImageElement | null {
  const cached = imageCache.get(src);
  if (cached) return cached.complete && cached.naturalWidth > 0 ? cached : null;
  const img = new Image();
  img.src = src;
  imageCache.set(src, img);
  return null;
}

export default function SpectatorScreen() {
  const { state, spectatorStep } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastEventCount = useRef(0);
  const [imagesReady, setImagesReady] = useState(0);
  const snapshot = state.simulationSnapshot;
  const match = state.currentMatch;

  useEffect(() => {
    for (const champ of CHAMPIONS) {
      if (champ.image && !imageCache.has(champ.image)) {
        const img = new Image();
        img.src = champ.image;
        imageCache.set(champ.image, img);
        img.onload = () => setImagesReady(n => n + 1);
      }
    }
  }, []);

  useEffect(() => {
    if (!snapshot) return;
    const events = snapshot.events;
    if (events.length > lastEventCount.current) {
      const newOnes = events.slice(lastEventCount.current);
      for (const e of newOnes) {
        if (e.type === 'first_blood') playFirstBloodSound();
        else if (e.type === 'double_kill' || e.type === 'triple_kill' || e.type === 'quadra_kill') playMultiKillSound();
        else if (e.type === 'kill') playKillSound();
        else if (e.type === 'tower_destroyed' || e.type === 'inhibitor_destroyed') playTowerSound();
      }
      lastEventCount.current = events.length;
    }
  }, [snapshot?.events]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshot) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(CANVAS_W * dpr);
    canvas.height = Math.floor(CANVAS_H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#0F1525';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const laneY = [90, 210, 330];
    ctx.strokeStyle = '#2A3550';
    ctx.lineWidth = 2;
    for (const y of laneY) {
      ctx.beginPath();
      ctx.moveTo(16, y);
      ctx.lineTo(CANVAS_W - 16, y);
      ctx.stroke();
    }

    for (const s of snapshot.structures) {
      if (s.isDestroyed) continue;
      const x = s.position.x * CANVAS_W;
      const y = s.lane === -1 ? laneY[1] : laneY[s.position.lane];
      ctx.fillStyle = s.team === 'blue' ? '#4DA6FF' : '#FF4D4D';
      if (s.type === 'nexus') {
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(x - 6, y - 16, 12, 28);
      }
    }

    for (const c of snapshot.champions) {
      const def = getChampionDef(c.defId);
      const x = c.position.x * CANVAS_W;
      const y = laneY[c.position.lane] ?? laneY[1];
      if (!c.isAlive) {
        ctx.globalAlpha = 0.35;
      }
      const img = def.image ? getCachedImage(def.image) : null;
      const r = 12;
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
        ctx.restore();
      } else {
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = c.team === 'blue' ? '#3498DB' : '#E74C3C';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }, [snapshot, imagesReady]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    let alive = true;
    let raf = 0;
    const tick = () => {
      if (!alive) return;
      const result = spectatorStep();
      if (result === 'continue') {
        raf = window.setTimeout(tick, 80);
      }
    };
    raf = window.setTimeout(tick, 200);
    return () => {
      alive = false;
      clearTimeout(raf);
    };
  }, [spectatorStep]);

  return (
    <div className="h-app bg-[#0A0E1A] flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 py-3 safe-top border-b border-[#1E2740] max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2 text-[#C9A84C] text-xs uppercase tracking-wider">
          <Eye className="w-4 h-4" />
          Modo espectador
          <span className="ml-auto flex items-center gap-1 text-[#E67E22]">
            <FastForward className="w-3.5 h-3.5" /> ×3
          </span>
        </div>
        <div className="flex items-center justify-between mt-2 gap-2">
          <span className="text-[#3498DB] font-bold text-sm truncate">{match?.teamA.name}</span>
          <span className="text-[#C9A84C] font-bold shrink-0">
            {snapshot?.blueKills ?? 0} – {snapshot?.redKills ?? 0}
          </span>
          <span className="text-[#E74C3C] font-bold text-sm truncate text-right">{match?.teamB.name}</span>
        </div>
      </div>

      <div className="shrink-0 px-3 pt-2 max-w-lg mx-auto w-full">
        <div className="rounded-xl overflow-hidden border-2 border-[#1E2740]">
          <canvas
            ref={canvasRef}
            style={{ width: '100%', aspectRatio: `${CANVAS_W}/${CANVAS_H}`, maxHeight: '42dvh' }}
            className="block w-full bg-[#0F1525]"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 max-w-lg mx-auto w-full safe-bottom">
        <p className="text-[#8B9BB4] text-[10px] uppercase tracking-wider mb-1.5">Feed</p>
        <CombatFeed events={snapshot?.events || []} max={8} />
      </div>
    </div>
  );
}
