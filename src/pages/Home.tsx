import { useEffect, useRef, useState } from 'react';
import { useGame } from '@/hooks/useGameState';
import { Sparkles } from 'lucide-react';
import { playClickSound } from '@/lib/sounds';

type ViewportBox = {
  height: number;
  offsetTop: number;
  keyboard: boolean;
};

function readViewport(inputFocused: boolean): ViewportBox {
  const vv = window.visualViewport;
  const layoutH = window.innerHeight;
  const height = vv?.height ?? layoutH;
  const offsetTop = vv?.offsetTop ?? 0;
  // Teclado: el visual viewport se achica de forma clara respecto al layout.
  const keyboard = inputFocused || height < layoutH - 120;
  return { height, offsetTop, keyboard };
}

export default function Home() {
  const { dispatch } = useGame();
  const [name, setName] = useState('');
  const [vv, setVv] = useState<ViewportBox>(() => ({
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    offsetTop: 0,
    keyboard: false,
  }));
  const formRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(false);

  const trimmed = name.trim();
  const canStart = trimmed.length >= 2;
  const keyboardUp = vv.keyboard;

  useEffect(() => {
    const sync = () => setVv(readViewport(focusedRef.current));
    sync();
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', sync);
    viewport?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    return () => {
      viewport?.removeEventListener('resize', sync);
      viewport?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  // Con teclado abierto: mantener el bloque completo dentro del área visible.
  useEffect(() => {
    if (!keyboardUp || !formRef.current) return;
    const id = window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ block: 'start', inline: 'nearest' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [keyboardUp, vv.height, vv.offsetTop]);

  const handleStart = () => {
    if (!canStart) return;
    playClickSound();
    dispatch({ type: 'SET_TEAM_NAME', name: trimmed });
    dispatch({ type: 'SET_SCREEN', screen: 'rosterSelect' });
  };

  return (
    <div
      className="w-full bg-[#0A0E1A] flex flex-col overflow-hidden"
      style={
        keyboardUp
          ? {
              position: 'fixed',
              top: vv.offsetTop,
              left: 0,
              right: 0,
              height: vv.height,
              zIndex: 60,
            }
          : {
              flex: '1 1 0%',
              minHeight: 0,
            }
      }
    >
      <div
        className={`flex-1 min-h-0 flex flex-col items-center overflow-y-auto overscroll-contain px-4 safe-chrome-x ${
          keyboardUp
            ? 'justify-start pt-3 pb-3'
            : 'justify-center safe-top safe-bottom pb-6'
        }`}
      >
        <div
          ref={formRef}
          className={`w-full max-w-md text-center ${
            keyboardUp ? 'space-y-3' : 'space-y-4 md:space-y-6 -translate-y-8 md:-translate-y-6'
          }`}
        >
          <div>
            <h1
              className={`font-bold text-[#C9A84C] leading-tight ${
                keyboardUp ? 'text-xl' : 'text-2xl md:text-3xl'
              }`}
              style={{ fontFamily: 'Cinzel, Georgia, serif' }}
            >
              Nombre de equipo
            </h1>
            <p
              className={`text-[#8B9BB4] ${
                keyboardUp ? 'text-[11px] mt-1' : 'text-xs md:text-sm mt-1.5 md:mt-2'
              }`}
            >
              Escríbelo tú. Luego eliges 5 integrantes y 5 campeones.
            </p>
          </div>

          <label className="block text-left space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B9BB4]">
              Nombre de equipo
            </span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value.slice(0, 24))}
              onFocus={() => {
                focusedRef.current = true;
                setVv(readViewport(true));
              }}
              onBlur={() => {
                focusedRef.current = false;
                // Pequeño delay: iOS a veces dispara blur al tocar el botón.
                window.setTimeout(() => setVv(readViewport(false)), 120);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleStart();
              }}
              placeholder="Ej. Los Invencibles"
              maxLength={24}
              enterKeyHint="done"
              autoComplete="off"
              autoCorrect="off"
              className="w-full min-h-11 rounded-xl border-2 border-[#2A3550] bg-[#141B2D] px-4 text-[#F0E6D2] placeholder:text-[#4A5570] focus:outline-none focus:border-[#C9A84C] md:min-h-12"
              autoFocus
            />
          </label>

          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            className={`w-full font-bold rounded-xl flex items-center justify-center gap-3 disabled:opacity-40 ${
              keyboardUp ? 'text-sm py-3' : 'text-base md:text-lg py-3.5 md:py-4'
            }`}
            style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
          >
            <Sparkles className="w-5 h-5 shrink-0" />
            ELEGIR INTEGRANTES
          </button>
        </div>
      </div>
    </div>
  );
}
