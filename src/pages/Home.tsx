import { useState } from 'react';
import { useGame } from '@/hooks/useGameState';
import { Swords, Sparkles } from 'lucide-react';

export default function Home() {
  const { dispatch } = useGame();
  const [name, setName] = useState('');

  const handleStart = () => {
    dispatch({ type: 'SET_TEAM_NAME', name: name.trim() || 'Mi Equipo' });
    dispatch({ type: 'SET_SCREEN', screen: 'championSelect' });
  };

  return (
    <div className="screen-center relative bg-[#0A0E1A] px-4 py-8 safe-top safe-bottom">
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#8B6914] flex items-center justify-center shadow-[0_0_40px_rgba(201,168,76,0.3)]">
            <Swords className="w-10 h-10 text-[#0A0E1A]" />
          </div>
          <h1
            className="text-4xl font-bold tracking-wider text-center"
            style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#C9A84C' }}
          >
            LIGA DE DUELO
          </h1>
          <p className="text-lg tracking-[0.3em] uppercase" style={{ color: '#8B9BB4' }}>
            Torneo de la Grieta
          </p>
        </div>

        <div className="w-32 h-px bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />

        <div className="w-full flex flex-col gap-3">
          <label className="text-sm uppercase tracking-wider text-center" style={{ color: '#8B9BB4' }}>
            Nombre de tu Equipo
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Alpha Squad"
            maxLength={20}
            autoComplete="off"
            className="w-full border-2 border-[#2A3550] rounded-xl px-5 py-4 text-center text-lg focus:border-[#C9A84C] focus:outline-none transition-all"
            style={{ color: '#F0E6D2', backgroundColor: '#141B2D' }}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          />
        </div>

        <button
          type="button"
          onClick={handleStart}
          className="w-full font-bold text-lg py-4 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
        >
          <Sparkles className="w-5 h-5" />
          INICIAR TORNEO
        </button>

        <p className="text-xs text-center mt-4" style={{ color: '#8B9BB4' }}>
          16 equipos · 4 rondas · 1 campeón
        </p>
      </div>
    </div>
  );
}
