import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '@/hooks/useGameState';
import type { GameMode } from '@/types/game';
import { Bot, Users, Hash, Swords, BookOpen, X } from 'lucide-react';
import { playClickSound } from '@/lib/sounds';

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

function RulesModal({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 px-4"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-title"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border-2 border-[#C9A84C]/50 bg-[#0D1220] shadow-[0_0_40px_rgba(201,168,76,0.2)]"
        style={{ maxHeight: 'min(36rem, calc(100dvh - 2rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#2A3550] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <BookOpen className="h-5 w-5 shrink-0 text-[#C9A84C]" />
            <h2
              id="rules-title"
              className="truncate text-lg font-bold text-[#C9A84C]"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Cómo jugar
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2A3550] text-[#8B9BB4] hover:text-[#F0E6D2]"
            aria-label="Cerrar reglas"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4 text-sm leading-relaxed text-[#C5D0E0]">
          <p>
            No necesitas saber League of Legends. Es un torneo por turnos: eliges equipo,
            campeones y tomas decisiones clave en cada ronda.
          </p>

          <section className="space-y-1.5">
            <h3 className="font-bold text-[#F0E6D2]">1. Prepara tu equipo</h3>
            <p>Ponle nombre, elige 5 integrantes y 5 campeones (uno por línea: top, jungla, mid, adc y support).</p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-bold text-[#F0E6D2]">2. Torneo de 16</h3>
            <p>Avanzas ronda a ronda. En tu partido tú juegas; las otras partidas se resuelven solas.</p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-bold text-[#F0E6D2]">3. Cada partida tiene 8 turnos</h3>
            <ul className="list-disc space-y-1 pl-5 text-[#8B9BB4]">
              <li>Turnos impares (1, 3, 5, 7): pelean en las líneas, sin monstruo.</li>
              <li>Turnos pares (2, 4, 6, 8): aparece un objetivo grande.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-bold text-[#F0E6D2]">4. Objetivos</h3>
            <ul className="list-disc space-y-1 pl-5 text-[#8B9BB4]">
              <li>Turno 2: Dragón de Agua · +15% Maná a aliados vivos</li>
              <li>Turno 4: Dragón de Fuego · +15% vida a aliados vivos</li>
              <li>Turno 6: Barón Nashor · +10% daño físico y mágico</li>
              <li>Turno 8: Dragón Ancestral · +15% robo de vida</li>
            </ul>
            <p>Si mandas a la jungla al objetivo, juegas un minijuego: toca las zonas amarillas a tiempo.</p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-bold text-[#F0E6D2]">5. Tus decisiones</h3>
            <ul className="list-disc space-y-1 pl-5 text-[#8B9BB4]">
              <li><span className="text-[#F0E6D2]">Jungla:</span> gankear una línea o ir al objetivo.</li>
              <li><span className="text-[#F0E6D2]">Asedio:</span> en turnos pares puedes empujar torres/nexo.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-bold text-[#F0E6D2]">6. Cómo ganar una partida</h3>
            <p>
              Destruye el <span className="text-[#F0E6D2]">Nexo</span> rival (la base) o termina con más
              <span className="text-[#F0E6D2]"> kills</span> al llegar al turno 8. El marcador son las kills.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-bold text-[#F0E6D2]">Consejo</h3>
            <p>
              No dejes vacías todas las líneas cuando vayas a por el dragón: el rival puede asediar
              tus torres. Equilibra pelear el objetivo y defender.
            </p>
          </section>
        </div>

        <div className="shrink-0 border-t border-[#2A3550] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl py-3 font-bold"
            style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function ModeSelect() {
  const { dispatch } = useGame();
  const [showRules, setShowRules] = useState(false);

  return (
    <div className="flex-1 min-h-0 w-full bg-[#0A0E1A] flex flex-col overflow-y-auto">
      <div className="shrink-0 px-4 pt-16 pb-2 safe-top text-center sm:pt-20 md:pt-14">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#8B6914] flex items-center justify-center mb-3">
          <Swords className="w-8 h-8 text-[#0A0E1A]" />
        </div>
        <h1 className="text-3xl font-bold text-[#C9A84C]" style={{ fontFamily: 'Cinzel, serif' }}>
          LIGA DE DUELO
        </h1>
        <p className="text-[#8B9BB4] text-sm mt-2 tracking-wide uppercase">Elige cómo quieres jugar</p>
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setShowRules(true);
          }}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#2A3550] bg-transparent px-4 py-2 text-sm text-[#C9A84C] hover:border-[#C9A84C]/60 hover:bg-[#141B2D] transition-colors"
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          Reglas
        </button>
      </div>

      <div className="min-h-0 px-4 py-3 pt-5 max-w-5xl mx-auto w-full md:flex md:items-start md:flex-1 md:pb-4 md:pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full md:gap-4">
          {MODES.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                playClickSound();
                dispatch({ type: 'SET_GAME_MODE', mode: m.id });
              }}
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

      <p className="shrink-0 text-[11px] text-center text-[#4A5570] px-4 pt-2 pb-3">
        Todos los derechos reservados · HOMEBOYS PROD ® 2026
      </p>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
