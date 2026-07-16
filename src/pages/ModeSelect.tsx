import { useGame } from '@/hooks/useGameState';
import type { GameMode } from '@/types/game';
import { Bot, Users, Hash, Swords } from 'lucide-react';

const MODES: { id: GameMode; title: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: 'ai',
    title: 'Contra la IA',
    desc: 'Torneo de 16 equipos. Tú decides en tu partida; el resto se simula.',
    icon: <Bot className="w-7 h-7" />,
  },
  {
    id: 'coop_local',
    title: 'Cooperativo · misma pantalla',
    desc: '2 a 4 jugadores en este dispositivo. Decisiones compartidas en partida.',
    icon: <Users className="w-7 h-7" />,
  },
  {
    id: 'coop_code',
    title: 'Cooperativo · con código',
    desc: 'Código de sala local: añade hasta 16 amigos en este dispositivo (sin red).',
    icon: <Hash className="w-7 h-7" />,
  },
];

export default function ModeSelect() {
  const { dispatch } = useGame();

  return (
    <div className="flex-1 min-h-0 w-full bg-[#0A0E1A] flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-8 pb-3 safe-top text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#8B6914] flex items-center justify-center mb-3">
          <Swords className="w-8 h-8 text-[#0A0E1A]" />
        </div>
        <h1 className="text-3xl font-bold text-[#C9A84C]" style={{ fontFamily: 'Cinzel, serif' }}>
          LIGA DE DUELO
        </h1>
        <p className="text-[#8B9BB4] text-sm mt-2 tracking-wide uppercase">Elige cómo quieres jugar</p>
      </div>

      <div className="flex-1 min-h-0 px-4 pb-6 max-w-5xl mx-auto w-full overflow-y-auto md:overflow-hidden md:flex md:items-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full md:gap-4">
          {MODES.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => dispatch({ type: 'SET_GAME_MODE', mode: m.id })}
              className="w-full text-left rounded-2xl border-2 border-[#1E2740] bg-[#141B2D] hover:border-[#C9A84C] p-4 md:p-6 flex md:flex-col gap-4 transition-all active:scale-[0.99] md:min-h-[220px]"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-[#0A0E1A] border border-[#2A3550] flex items-center justify-center text-[#C9A84C] shrink-0">
                {m.icon}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[#F0E6D2] text-lg">{m.title}</p>
                <p className="text-xs text-[#8B9BB4] mt-1 leading-snug">{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <p className="shrink-0 text-[11px] text-center text-[#4A5570] pb-4 px-4">
        16 equipos · combate 100% simulado · HOMEBOYS PROD.
      </p>
    </div>
  );
}
