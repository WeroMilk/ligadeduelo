import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '@/hooks/useGameState';
import type { GameMode } from '@/types/game';
import { Bot, Users, Hash, Swords, BookOpen, X } from 'lucide-react';
import { playClickSound } from '@/lib/sounds';

const MODES: { id: GameMode; title: string; desc: string; icon: React.ReactNode; enabled: boolean }[] = [
  {
    id: 'ai',
    title: 'Contra la IA',
    desc: 'Torneo de 16 equipos. Tú decides en tu partida; el resto se simula.',
    icon: <Bot className="w-7 h-7" />,
    enabled: true,
  },
  {
    id: 'coop_local',
    title: 'Cooperativo · misma pantalla',
    desc: '2 a 4 jugadores en este dispositivo. Decisiones compartidas en partida.',
    icon: <Users className="w-7 h-7" />,
    enabled: false,
  },
  {
    id: 'coop_code',
    title: 'Cooperativo · con código',
    desc: 'Código de sala local: añade hasta 16 amigos en este dispositivo (sin red).',
    icon: <Hash className="w-7 h-7" />,
    enabled: false,
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
    <div className="relative flex-1 min-h-0 w-full flex flex-col overflow-hidden bg-[#05080f]">
      {/* Fondo: por debajo de todo; portrait móvil / landscape desktop */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <img
          src="/backgrounds/rift-portrait.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center md:hidden"
          draggable={false}
        />
        <img
          src="/backgrounds/rift-landscape.png"
          alt=""
          className="absolute inset-0 hidden h-full w-full object-cover object-center md:block"
          draggable={false}
        />
        {/* Velo suave para legibilidad del UI sin tapar el arte */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#05080f]/55 via-[#05080f]/35 to-[#05080f]/75 md:from-[#05080f]/45 md:via-[#05080f]/25 md:to-[#05080f]/70" />
      </div>

      <div className="relative z-10 shrink-0 px-4 safe-top safe-chrome-x pb-2 text-center md:pb-2">
        <div className="mx-auto w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#8B6914] flex items-center justify-center mb-2 md:mb-3 shadow-[0_0_28px_rgba(201,168,76,0.35)]">
          <Swords className="w-6 h-6 md:w-8 md:h-8 text-[#0A0E1A]" />
        </div>
        <h1
          className="text-2xl md:text-3xl font-bold text-[#C9A84C] leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          LIGA DE DUELO
        </h1>
        <p className="text-[#E8EEF8] text-xs md:text-sm mt-1 md:mt-2 tracking-wide uppercase drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
          Elige cómo quieres jugar
        </p>
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setShowRules(true);
          }}
          className="mt-2 md:mt-3 inline-flex items-center gap-2 rounded-lg border border-[#C9A84C]/45 bg-[#0A0E1A]/55 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm text-[#C9A84C] hover:border-[#C9A84C]/80 hover:bg-[#0A0E1A]/75 transition-colors"
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          Reglas
        </button>
      </div>

      <div className="relative z-10 min-h-0 flex-1 overflow-hidden px-4 py-2 max-w-5xl mx-auto w-full flex flex-col md:overflow-y-auto md:scrollbar-hide md:pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 w-full flex-1 min-h-0 md:flex-none md:auto-rows-min">
          {MODES.map(m => (
            <button
              key={m.id}
              type="button"
              disabled={!m.enabled}
              onClick={() => {
                if (!m.enabled) return;
                playClickSound();
                dispatch({ type: 'SET_GAME_MODE', mode: m.id });
              }}
              className={`relative w-full text-left rounded-2xl border-2 p-3 md:p-6 flex md:flex-col gap-3 md:gap-4 transition-all min-h-0 md:min-h-[220px] backdrop-blur-md ${
                m.enabled
                  ? 'border-[#C9A84C]/35 bg-[#0D1220]/78 hover:border-[#C9A84C] hover:bg-[#0D1220]/88 active:scale-[0.99] shadow-[0_8px_32px_rgba(0,0,0,0.45)]'
                  : 'border-[#2A3550]/60 bg-[#0A0E1A]/55 opacity-60 cursor-not-allowed'
              }`}
              aria-disabled={!m.enabled}
            >
              {!m.enabled && (
                <span className="absolute right-2 top-2 md:right-3 md:top-3 rounded-md border border-[#2A3550] bg-[#0A0E1A]/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#8B9BB4]">
                  Próximamente
                </span>
              )}
              <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl bg-[#0A0E1A]/80 border border-[#2A3550] flex items-center justify-center shrink-0 ${m.enabled ? 'text-[#C9A84C]' : 'text-[#4A5570]'}`}>
                {m.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-bold text-base md:text-lg ${m.enabled ? 'text-[#F0E6D2]' : 'text-[#8B9BB4]'}`}>{m.title}</p>
                <p className="text-[11px] md:text-xs text-[#C5D0E0]/90 mt-0.5 md:mt-1 leading-snug line-clamp-2 md:line-clamp-none">{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <p className="relative z-10 shrink-0 text-[10px] md:text-[11px] text-center text-[#A8B4C8]/80 px-4 pt-1 pb-2 md:pb-3 drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
        Todos los derechos reservados · HOMEBOYS PROD ® 2026
      </p>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
