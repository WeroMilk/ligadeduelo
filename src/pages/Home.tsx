import { useState, useEffect } from 'react';
import { useGame } from '@/hooks/useGameState';
import { preloadChampionImages } from '@/lib/preload-images';
import { Swords, Sparkles } from 'lucide-react';

export default function Home() {
  const { dispatch } = useGame();
  const [name, setName] = useState('');
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; delay: number; size: number }[]>([]);

  useEffect(() => {
    preloadChampionImages();
    const p = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      size: 2 + Math.random() * 4,
    }));
    setParticles(p);
  }, []);

  const handleStart = () => {
    dispatch({ type: 'SET_TEAM_NAME', name: name.trim() || 'Mi Equipo' });
    dispatch({ type: 'SET_SCREEN', screen: 'championSelect' });
  };

  return (
    <div className="min-h-app bg-[#0A0E1A] flex flex-col items-center justify-center relative overflow-y-auto px-4 py-8 safe-top safe-bottom">
      {/* Animated particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full bg-[#C9A84C] opacity-20 animate-float"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${4 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Decorative top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#C9A84C] opacity-5 blur-[120px] rounded-full" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#8B6914] flex items-center justify-center shadow-[0_0_40px_rgba(201,168,76,0.3)]">
            <Swords className="w-10 h-10 text-[#0A0E1A]" />
          </div>
          <h1 className="text-4xl font-bold text-[#C9A84C] tracking-wider text-center" style={{ fontFamily: 'Cinzel, serif', textShadow: '0 2px 20px rgba(201,168,76,0.4)' }}>
            LIGA DE DUELO
          </h1>
          <p className="text-[#8B9BB4] text-lg tracking-[0.3em] uppercase">
            Torneo de la Grieta
          </p>
        </div>

        {/* Divider */}
        <div className="w-32 h-px bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />

        {/* Input */}
        <div className="w-full flex flex-col gap-3">
          <label className="text-[#8B9BB4] text-sm uppercase tracking-wider text-center">
            Nombre de tu Equipo
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Alpha Squad"
            maxLength={20}
            className="w-full bg-[#141B2D] border-2 border-[#2A3550] rounded-xl px-5 py-4 text-[#F0E6D2] text-center text-lg placeholder:text-[#4A5570] focus:border-[#C9A84C] focus:outline-none focus:shadow-[0_0_20px_rgba(201,168,76,0.15)] transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          />
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          className="w-full bg-gradient-to-r from-[#C9A84C] to-[#B8953E] hover:from-[#D4B85C] hover:to-[#C9A84C] text-[#0A0E1A] font-bold text-lg py-4 rounded-xl shadow-[0_4px_20px_rgba(201,168,76,0.3)] hover:shadow-[0_4px_30px_rgba(201,168,76,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
        >
          <Sparkles className="w-5 h-5" />
          INICIAR TORNEO
        </button>

        {/* Info */}
        <p className="text-[#4A5570] text-xs text-center mt-4">
          16 equipos · 4 rondas · 1 campeón
        </p>
      </div>

      {/* Bottom decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0A0E1A] to-transparent pointer-events-none" />
    </div>
  );
}
