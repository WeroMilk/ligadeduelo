import { useRef, useEffect, useCallback, useState } from 'react';
import { useGame } from '@/hooks/useGameState';
import { getChampionDef, getItemDef } from '@/lib/game-engine';
import { CHAMPIONS } from '@/lib/game-data';
import { Heart, Droplets, SkipForward, Play, User } from 'lucide-react';

// Canvas dimensions
const CANVAS_W = 400;
const CANVAS_H = 500;

const imageCache = new Map<string, HTMLImageElement>();

function getCachedImage(src: string): HTMLImageElement | null {
  const cached = imageCache.get(src);
  if (cached) return cached.complete && cached.naturalWidth > 0 ? cached : null;
  const img = new Image();
  img.src = src;
  imageCache.set(src, img);
  return null;
}

function preloadChampionImages() {
  for (const champ of CHAMPIONS) {
    if (champ.image && !imageCache.has(champ.image)) {
      const img = new Image();
      img.src = champ.image;
      imageCache.set(champ.image, img);
    }
  }
}

export default function SimulationScreen() {
  const { state, startSimulationStep } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const screenRef = useRef(state.currentScreen);
  const [imagesReady, setImagesReady] = useState(0);

  const snapshot = state.simulationSnapshot;
  const engine = state.simulationEngine;
  const isPaused = state.currentScreen === 'itemSelect';

  screenRef.current = state.currentScreen;

  useEffect(() => {
    preloadChampionImages();
    const onLoad = () => setImagesReady(n => n + 1);
    const pending: HTMLImageElement[] = [];
    for (const img of imageCache.values()) {
      if (!img.complete) {
        img.addEventListener('load', onLoad);
        pending.push(img);
      }
    }
    return () => {
      for (const img of pending) img.removeEventListener('load', onLoad);
    };
  }, []);

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshot) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    ctx.fillStyle = '#0F1525';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid
    ctx.strokeStyle = '#1A2035';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < CANVAS_W; i += 25) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_H);
      ctx.stroke();
    }
    for (let i = 0; i < CANVAS_H; i += 25) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_W, i);
      ctx.stroke();
    }

    // Lanes
    const laneY = [120, 250, 380];
    ctx.strokeStyle = '#2A3550';
    ctx.lineWidth = 3;
    for (const y of laneY) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(CANVAS_W - 20, y);
      ctx.stroke();
    }

    // Draw structures (crystal towers / nexus style)
    for (const s of snapshot.structures) {
      if (s.isDestroyed) continue;
      const x = s.position.x * CANVAS_W;
      const y = s.lane === -1 ? laneY[1] : laneY[s.position.lane];
      const hpPct = s.hp / s.maxHp;
      const glow = s.team === 'blue' ? '#4DA6FF' : '#FF4D4D';
      const glowLite = s.team === 'blue' ? '#A8D8FF' : '#FFB3B3';
      const stone = '#3A4258';
      const stoneDark = '#252B3A';

      if (s.type === 'tower' || s.type === 'inhibitor') {
        const h = s.type === 'inhibitor' ? 28 : 34;
        const w = s.type === 'inhibitor' ? 10 : 12;
        // Soft glow
        ctx.save();
        ctx.globalAlpha = 0.25 + hpPct * 0.35;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(x, y - h + 4, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Tiered body
        ctx.fillStyle = stoneDark;
        ctx.fillRect(x - w, y - 4, w * 2, 8);
        ctx.fillStyle = stone;
        ctx.beginPath();
        ctx.moveTo(x - w * 0.85, y - 4);
        ctx.lineTo(x - w * 0.55, y - h * 0.55);
        ctx.lineTo(x + w * 0.55, y - h * 0.55);
        ctx.lineTo(x + w * 0.85, y - 4);
        ctx.closePath();
        ctx.fill();
        // Upper shaft
        ctx.fillStyle = stoneDark;
        ctx.fillRect(x - w * 0.4, y - h * 0.85, w * 0.8, h * 0.35);
        // Crystal tip
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.moveTo(x, y - h - 6);
        ctx.lineTo(x - 5, y - h * 0.85);
        ctx.lineTo(x + 5, y - h * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = glowLite;
        ctx.beginPath();
        ctx.moveTo(x, y - h - 6);
        ctx.lineTo(x - 2, y - h * 0.92);
        ctx.lineTo(x + 2, y - h * 0.92);
        ctx.closePath();
        ctx.fill();
        // Tiny window lights
        ctx.fillStyle = glow;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(x - 2, y - h * 0.45, 4, 3);
        ctx.globalAlpha = 1;
      } else if (s.type === 'nexus') {
        // Crystal cluster nexus
        ctx.save();
        ctx.globalAlpha = 0.3 + hpPct * 0.4;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y - 8, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Outer shards
        const shards = [
          { dx: -14, dy: -28, w: 7, h: 22 },
          { dx: 12, dy: -30, w: 6, h: 24 },
          { dx: -6, dy: -36, w: 8, h: 28 },
          { dx: 4, dy: -34, w: 7, h: 26 },
          { dx: -18, dy: -18, w: 5, h: 16 },
          { dx: 16, dy: -16, w: 5, h: 14 },
        ];
        for (const sh of shards) {
          ctx.fillStyle = glow;
          ctx.globalAlpha = 0.55 + hpPct * 0.35;
          ctx.beginPath();
          ctx.moveTo(x + sh.dx, y + sh.dy);
          ctx.lineTo(x + sh.dx - sh.w / 2, y + sh.dy + sh.h);
          ctx.lineTo(x + sh.dx + sh.w / 2, y + sh.dy + sh.h);
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        // Core orb
        const grd = ctx.createRadialGradient(x, y - 6, 2, x, y - 6, 14);
        grd.addColorStop(0, '#FFFFFF');
        grd.addColorStop(0.35, glowLite);
        grd.addColorStop(1, glow);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(x, y - 6, 12, 0, Math.PI * 2);
        ctx.fill();
        // Base ring
        ctx.strokeStyle = glow;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x, y + 6, 16, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // HP bar for structures
      if (hpPct < 1) {
        ctx.fillStyle = '#333';
        ctx.fillRect(x - 15, y + 14, 30, 4);
        ctx.fillStyle = hpPct > 0.5 ? '#2ECC71' : hpPct > 0.25 ? '#F39C12' : '#E74C3C';
        ctx.fillRect(x - 15, y + 14, 30 * hpPct, 4);
      }
    }

    // Draw minions
    for (const m of snapshot.minions) {
      if (m.hp <= 0) continue;
      const x = m.position.x * CANVAS_W;
      const y = laneY[m.position.lane];
      ctx.fillStyle = m.team === 'blue' ? '#5DADE2' : '#EC7063';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw champions
    for (const c of snapshot.champions) {
      const def = getChampionDef(c.defId);
      let x: number, y: number;

      x = c.position.x * CANVAS_W;
      y = laneY[Math.max(0, Math.min(2, c.position.lane))];

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(x, y + 14, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      if (!c.isAlive) continue;

      // Avatar circle
      const teamColor = c.team === 'blue' ? '#3498DB' : '#E74C3C';
      const radius = 14;
      const img = def.image ? getCachedImage(def.image) : null;

      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
        ctx.restore();
      } else {
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F0E6D2';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(def.initials, x, y);
      }

      // Border by team
      ctx.strokeStyle = teamColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.stroke();

      // HP bar
      const hpPct = c.stats.hp / c.stats.maxHp;
      ctx.fillStyle = '#333';
      ctx.fillRect(x - 16, y - 22, 32, 5);
      ctx.fillStyle = hpPct > 0.5 ? '#2ECC71' : hpPct > 0.25 ? '#F39C12' : '#E74C3C';
      ctx.fillRect(x - 16, y - 22, 32 * hpPct, 5);

      // Name for player team
      if (c.team === 'blue') {
        ctx.fillStyle = '#F0E6D2';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(def.name, x, y - 26);
      }
    }
  }, [snapshot, imagesReady]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleStep = () => {
    if (isPaused || !engine) return;
    startSimulationStep();
  };

  const handleAutoPlay = () => {
    if (!engine || isPaused || screenRef.current !== 'simulation') return;
    cancelAnimationFrame(animationRef.current);
    let count = 0;
    const run = () => {
      if (count >= 3 || screenRef.current !== 'simulation') return;
      count++;
      startSimulationStep();
      if (screenRef.current === 'simulation' && count < 3) {
        animationRef.current = requestAnimationFrame(run);
      }
    };
    run();
  };

  // Get player champions
  const playerChampions = snapshot?.champions.filter(c => c.team === 'blue') || [];
  const blueTeam = snapshot ? { kills: snapshot.blueKills } : { kills: 0 };
  const redTeam = snapshot ? { kills: snapshot.redKills } : { kills: 0 };
  const isComplete = snapshot?.isComplete || false;

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex flex-col">
      {/* Header */}
      <div className="bg-[#0A0E1A]/95 backdrop-blur-sm border-b border-[#1E2740] px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[#3498DB] font-bold text-sm">
              {state.playerTeamName || 'Mi Equipo'}
            </span>
            <span className="text-[#C9A84C] font-bold">{blueTeam.kills}</span>
          </div>
          <span className="text-[#8B9BB4] text-xs">VS</span>
          <div className="flex items-center gap-2">
            <span className="text-[#E74C3C] font-bold">{redTeam.kills}</span>
            <span className="text-[#8B9BB4] font-bold text-sm">
              {state.currentMatch?.teamB.name || 'Rival'}
            </span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="px-4 pt-4 max-w-lg mx-auto w-full">
        <div className="rounded-xl overflow-hidden border-2 border-[#1E2740] shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <canvas
            ref={canvasRef}
            style={{ width: '100%', aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
            className="block"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 max-w-lg mx-auto w-full">
        <div className="flex gap-2">
          <button
            onClick={handleStep}
            disabled={isPaused || isComplete}
            className="flex-1 bg-[#141B2D] border border-[#2A3550] hover:border-[#C9A84C] text-[#F0E6D2] font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <SkipForward className="w-4 h-4" />
            SIGUIENTE
          </button>
          <button
            onClick={handleAutoPlay}
            disabled={isPaused || isComplete}
            className="flex-1 bg-gradient-to-r from-[#C9A84C] to-[#B8953E] text-[#0A0E1A] font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            AUTO
          </button>
        </div>
      </div>

      {/* Player Champions Panel */}
      <div className="flex-1 px-4 pb-4 max-w-lg mx-auto w-full">
        <h3 className="text-[#8B9BB4] text-xs uppercase tracking-wider mb-2">Tu Equipo</h3>
        <div className="flex flex-col gap-2">
          {playerChampions.map(champ => {
            const def = getChampionDef(champ.defId);
            const hpPct = champ.stats.hp / champ.stats.maxHp;
            const manaPct = champ.stats.mana / champ.stats.maxMana;

            return (
              <div
                key={champ.instanceId}
                className={`bg-[#141B2D] rounded-xl border border-[#1E2740] p-2.5 flex items-center gap-3 ${!champ.isAlive ? 'opacity-40' : ''}`}
              >
                {/* Avatar */}
                {def.image ? (
                  <img src={def.image} alt={def.name} className="w-10 h-10 rounded-full border-2 border-[#3498DB] object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full border-2 border-[#3498DB] flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: def.color }}>
                    <User className="w-4 h-4" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[#F0E6D2] font-bold text-sm truncate">{def.name}</span>
                    <span className="text-[#8B9BB4] text-[10px]">{champ.kills} kills</span>
                    {!champ.isAlive && <span className="text-[#E74C3C] text-[10px] font-bold">MUERTO</span>}
                  </div>

                  {/* HP Bar */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <Heart className="w-3 h-3 text-[#E74C3C] flex-shrink-0" />
                    <div className="flex-1 h-2 bg-[#0A0E1A] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${hpPct * 100}%`,
                          backgroundColor: hpPct > 0.5 ? '#2ECC71' : hpPct > 0.25 ? '#F39C12' : '#E74C3C',
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-[#8B9BB4] w-12 text-right">
                      {Math.floor(champ.stats.hp)}/{champ.stats.maxHp}
                    </span>
                  </div>

                  {/* Mana Bar */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Droplets className="w-3 h-3 text-[#3498DB] flex-shrink-0" />
                    <div className="flex-1 h-1.5 bg-[#0A0E1A] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#3498DB] rounded-full transition-all"
                        style={{ width: `${manaPct * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#8B9BB4] w-12 text-right">
                      {Math.floor(champ.stats.mana)}/{champ.stats.maxMana}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="grid grid-cols-3 gap-0.5 flex-shrink-0">
                  {Array.from({ length: 6 }).map((_, i) => {
                    const item = champ.items[i];
                    return (
                      <div
                        key={i}
                        className="w-6 h-6 rounded bg-[#0A0E1A] border border-[#2A3550] flex items-center justify-center overflow-hidden"
                      >
                        {item ? (
                          <img
                            src={getItemDef(item.defId).image}
                            alt={getItemDef(item.defId).name}
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
