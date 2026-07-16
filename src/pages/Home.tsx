import { useState } from 'react';
import { useGame } from '@/hooks/useGameState';
import { Sparkles } from 'lucide-react';
import { playClickSound } from '@/lib/sounds';

export default function Home() {
  const { dispatch } = useGame();
  const [name, setName] = useState('');
  const [keyboardUp, setKeyboardUp] = useState(false);

  const trimmed = name.trim();
  const canStart = trimmed.length >= 2;

  const handleStart = () => {
    if (!canStart) return;
    playClickSound();
    dispatch({ type: 'SET_TEAM_NAME', name: trimmed });
    dispatch({ type: 'SET_SCREEN', screen: 'rosterSelect' });
  };

  return (
    <div className="flex-1 min-h-0 w-full bg-[#0A0E1A] flex flex-col overflow-hidden">
      <div
        className={`flex-1 min-h-0 flex flex-col items-center overflow-y-auto overscroll-contain px-4 safe-top safe-chrome-x pb-6 safe-bottom ${
          keyboardUp ? 'justify-start pt-4 md:justify-center md:pt-0' : 'justify-center'
        }`}
      >
        <div
          className={`w-full max-w-md space-y-4 text-center md:space-y-6 ${
            keyboardUp ? 'translate-y-0' : '-translate-y-8 md:-translate-y-6'
          }`}
        >
          <div>
            <h1
              className="text-2xl md:text-3xl font-bold text-[#C9A84C] leading-tight"
              style={{ fontFamily: 'Cinzel, Georgia, serif' }}
            >
              Nombre de equipo
            </h1>
            <p className="text-xs md:text-sm text-[#8B9BB4] mt-1.5 md:mt-2">
              Escríbelo tú. Luego eliges 5 integrantes y 5 campeones.
            </p>
          </div>

          <label className="block text-left space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B9BB4]">
              Nombre de equipo
            </span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value.slice(0, 24))}
              onFocus={() => setKeyboardUp(true)}
              onBlur={() => setKeyboardUp(false)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleStart();
              }}
              placeholder="Ej. Los Invencibles"
              maxLength={24}
              className="w-full min-h-11 scroll-mt-28 md:min-h-12 md:scroll-mt-0 rounded-xl border-2 border-[#2A3550] bg-[#141B2D] px-4 text-[#F0E6D2] placeholder:text-[#4A5570] focus:outline-none focus:border-[#C9A84C]"
              autoFocus
            />
          </label>

          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            className="w-full font-bold text-base md:text-lg py-3.5 md:py-4 rounded-xl flex items-center justify-center gap-3 disabled:opacity-40"
            style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
          >
            <Sparkles className="w-5 h-5" />
            ELEGIR INTEGRANTES
          </button>
        </div>
      </div>
    </div>
  );
}
