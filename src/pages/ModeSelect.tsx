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
          <p className="rounded-xl border border-[#C9A84C]/35 bg-[#C9A84C]/10 px-3 py-2.5 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#C9A84C] md:text-sm md:tracking-[0.16em]">
            Cada mes integraremos 2 campeones más
          </p>

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
    <div className="relative flex-1 min-h-0 w-full flex flex-col overflow-hidden bg-[#0A0E1A]">
      {/* Fondo full-bleed: móvil portrait; desktop cover sin recuadro visible */}
      <div
        className="pointer-events-none absolute inset-0 z-0 left-1/2 w-screen max-w-none -translate-x-1/2 overflow-hidden bg-[#0A0E1A]"
        aria-hidden
      >
        <img
          src="/backgrounds/rift-portrait.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center md:hidden"
          draggable={false}
        />

        <img
          src="/backgrounds/rift-landscape.png"
          alt=""
          className="absolute inset-0 hidden h-full w-full object-cover object-[center_42%] md:block"
          style={{ transform: 'scale(1.06)' }}
          draggable={false}
        />

        {/* Grado de color + viñeta cinematográfica */}
        <div className="absolute inset-0 bg-[#0A0E1A]/35 md:bg-[#0A0E1A]/28" />
        <div
          className="absolute inset-0"
          style={{
            background: [
              'radial-gradient(ellipse 90% 75% at 50% 36%, transparent 0%, rgba(10,14,26,0.35) 58%, rgba(10,14,26,0.98) 100%)',
              'linear-gradient(180deg, rgba(10,14,26,0.94) 0%, rgba(10,14,26,0.12) 32%, rgba(10,14,26,0.18) 68%, rgba(10,14,26,0.97) 100%)',
              'linear-gradient(90deg, rgba(10,14,26,0.88) 0%, transparent 16%, transparent 84%, rgba(10,14,26,0.88) 100%)',
            ].join(', '),
          }}
        />
      </div>

      {/* Hero / banner superior */}
      <div className="relative z-10 shrink-0 safe-top safe-chrome-x">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0A0E1A]/98 via-[#0A0E1A]/72 to-transparent md:h-52"
          aria-hidden
        />
        <div className="relative mx-auto max-w-4xl px-4 pb-2 pt-0 text-center md:pb-6 md:pt-2">
          <div className="relative mx-auto mb-2 w-fit md:mb-4">
            <div
              className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C9A84C]/25 blur-2xl md:h-24 md:w-24"
              aria-hidden
            />
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#C9A84C]/30 bg-gradient-to-br from-[#C9A84C] to-[#8B6914] shadow-[0_0_32px_rgba(201,168,76,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] md:h-[4.5rem] md:w-[4.5rem]">
              <Swords className="h-6 w-6 text-[#0A0E1A] md:h-8 md:w-8" />
            </div>
          </div>

          <h1
            className="text-xl font-bold leading-tight text-[#C9A84C] drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)] md:text-[2rem] md:tracking-[0.06em]"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            LIGA DE DUELO
          </h1>
          <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.18em] text-[#B8C4D8] drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)] md:mt-2 md:text-xs md:tracking-[0.28em]">
            Elige cómo quieres jugar
          </p>

          <div className="mx-auto mt-2 hidden items-center justify-center gap-2.5 sm:flex md:mt-4" aria-hidden>
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#C9A84C]/45 md:w-14" />
            <span className="h-1 w-1 rounded-full bg-[#C9A84C]/55" />
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#C9A84C]/45 md:w-14" />
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setShowRules(true);
            }}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#C9A84C]/35 bg-[#0A0E1A]/65 px-3 py-1 text-[11px] text-[#C9A84C] backdrop-blur-sm transition-colors hover:border-[#C9A84C]/70 hover:bg-[#0A0E1A]/85 md:mt-4 md:gap-2 md:px-4 md:py-2 md:text-sm"
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" />
            Reglas
          </button>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-y-auto px-4 py-1 scrollbar-hide md:overflow-y-auto md:px-6 md:py-4 lg:max-w-6xl">
        <div className="grid w-full grid-cols-1 gap-2 md:auto-rows-min md:grid-cols-3 md:gap-5 md:flex-none">
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
              className={`relative flex w-full gap-2.5 rounded-2xl border-2 p-2.5 text-left backdrop-blur-md transition-all md:min-h-[228px] md:flex-col md:gap-4 md:p-6 ${
                m.enabled
                  ? 'border-[#C9A84C]/40 bg-[#0D1220]/82 hover:border-[#C9A84C] hover:bg-[#0D1220]/90 active:scale-[0.99] shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)]'
                  : 'border-[#2A3550]/55 bg-[#0A0E1A]/58 opacity-55 cursor-not-allowed'
              }`}
              aria-disabled={!m.enabled}
            >
              {!m.enabled && (
                <span className="absolute right-2 top-2 md:right-3 md:top-3 rounded-md border border-[#2A3550] bg-[#0A0E1A]/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#8B9BB4]">
                  Próximamente
                </span>
              )}
              <div className={`w-9 h-9 md:w-14 md:h-14 rounded-xl bg-[#0A0E1A]/80 border border-[#2A3550] flex items-center justify-center shrink-0 ${m.enabled ? 'text-[#C9A84C]' : 'text-[#4A5570]'}`}>
                {m.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-bold text-sm md:text-lg ${m.enabled ? 'text-[#F0E6D2]' : 'text-[#8B9BB4]'}`}>{m.title}</p>
                <p className="text-[10px] md:text-xs text-[#C5D0E0]/90 mt-0.5 md:mt-1 leading-snug line-clamp-2 md:line-clamp-none">{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <p className="relative z-10 shrink-0 px-4 pb-1 pt-2 text-center text-[9px] text-[#8B9BB4]/70 md:pb-3 md:pt-1 md:text-[11px]">
        Todos los derechos reservados · HOMEBOYS PROD ® 2026
      </p>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
