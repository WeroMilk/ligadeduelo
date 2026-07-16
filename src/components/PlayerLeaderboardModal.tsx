import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, X, ChevronRight, Users, Share2 } from 'lucide-react';
import {
  formatPlayTime,
  getLeaderboard,
  shareRunOnWhatsApp,
  type PlayerRunRecord,
} from '@/lib/player-leaderboard';
import { playClickSound } from '@/lib/sounds';

function Shell({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 px-4"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
      }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border-2 border-[#C9A84C]/50 bg-[#0D1220] shadow-[0_0_40px_rgba(201,168,76,0.2)]"
        style={{ maxHeight: 'min(36rem, calc(100dvh - 2rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#2A3550] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Trophy className="h-5 w-5 shrink-0 text-[#C9A84C]" />
            <h2 className="truncate text-lg font-bold text-[#C9A84C]" style={{ fontFamily: 'Cinzel, serif' }}>
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2A3550] text-[#8B9BB4] hover:text-[#F0E6D2]"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-[#2A3550] px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function ShareWhatsAppButton({
  entry,
  className = '',
}: {
  entry: PlayerRunRecord;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        playClickSound();
        shareRunOnWhatsApp(entry);
      }}
      className={`flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#25D366] font-bold text-[#0A0E1A] active:scale-[0.98] ${className}`}
    >
      <Share2 className="h-4 w-4" />
      WhatsApp
    </button>
  );
}

function RunCard({
  entry,
  onClick,
}: {
  entry: PlayerRunRecord;
  onClick: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#2A3550] bg-[#141B2D] p-3 transition-colors hover:border-[#C9A84C]/50">
      <button
        type="button"
        onClick={() => {
          playClickSound();
          onClick();
        }}
        className="w-full text-left active:scale-[0.99]"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-[#F0E6D2] truncate">{entry.teamName}</p>
            {entry.placement && (
              <p className="text-[10px] font-bold text-[#C9A84C] mt-0.5 truncate">{entry.placement}</p>
            )}
            <p className="text-[10px] text-[#8B9BB4] mt-0.5">
              {entry.players.join(' · ')}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#C9A84C] mt-1" />
        </div>
        <p className="text-[10px] text-[#8B9BB4] mt-2 truncate">
          {entry.champions.join(' · ')}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
          <span className="rounded-md bg-[#3498DB]/15 px-2 py-0.5 text-[#3498DB] font-bold">
            {entry.kills} bajas
          </span>
          <span className="rounded-md bg-[#E74C3C]/15 px-2 py-0.5 text-[#E74C3C] font-bold">
            {entry.deaths} recibidas
          </span>
          <span className="rounded-md bg-[#2A3550] px-2 py-0.5 text-[#8B9BB4]">
            {formatPlayTime(entry.playTimeMs)}
          </span>
          <span className="rounded-md bg-[#2A3550] px-2 py-0.5 text-[#8B9BB4]">
            {entry.matches.length} partida{entry.matches.length !== 1 ? 's' : ''}
          </span>
        </div>
      </button>
      <ShareWhatsAppButton entry={entry} className="mt-2.5 w-full text-xs" />
    </div>
  );
}

function DetailView({ entry, onBack }: { entry: PlayerRunRecord; onBack: () => void }) {
  return (
    <Shell
      title={entry.teamName}
      onClose={onBack}
      footer={
        <div className="flex flex-col gap-2">
          <ShareWhatsAppButton entry={entry} className="w-full" />
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onBack();
            }}
            className="w-full rounded-xl py-3 font-bold"
            style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
          >
            Volver a la lista
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <section className="rounded-xl border border-[#2A3550] bg-[#141B2D] p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C]">Equipo</p>
          <p className="text-[#F0E6D2] font-bold">{entry.teamName}</p>
          {entry.placement && (
            <p className="text-xs font-bold text-[#C9A84C]">{entry.placement}</p>
          )}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <p className="text-[#8B9BB4]">Integrantes</p>
              <ul className="text-[#C5D0E0] mt-1 space-y-0.5">
                {entry.players.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
            <div>
              <p className="text-[#8B9BB4]">Campeones</p>
              <ul className="text-[#C5D0E0] mt-1 space-y-0.5">
                {entry.champions.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1 text-[10px]">
            <span className="text-[#3498DB] font-bold">{entry.kills} bajas totales</span>
            <span className="text-[#E74C3C] font-bold">{entry.deaths} bajas recibidas</span>
            <span className="text-[#8B9BB4]">{formatPlayTime(entry.playTimeMs)} jugando</span>
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C]">
            Partidas ({entry.matches.length})
          </p>
          {entry.matches.length === 0 ? (
            <p className="text-[#8B9BB4] text-xs">Sin partidas registradas.</p>
          ) : (
            entry.matches.map((m, i) => (
              <div
                key={i}
                className="rounded-xl border border-[#2A3550] bg-[#0A0E1A] p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-[#F0E6D2] truncate">vs {m.opponent}</p>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      m.won ? 'bg-[#27AE60]/20 text-[#2ECC71]' : 'bg-[#E74C3C]/20 text-[#E74C3C]'
                    }`}
                  >
                    {m.won ? 'Victoria' : 'Derrota'}
                  </span>
                </div>
                <p className="text-xs text-[#8B9BB4]">
                  Marcador: <span className="text-[#3498DB] font-bold">{m.playerKills}</span>
                  {' – '}
                  <span className="text-[#E74C3C] font-bold">{m.enemyKills}</span>
                </p>
                {m.objectives.length > 0 ? (
                  <ul className="space-y-1 text-[10px] text-[#8B9BB4]">
                    {m.objectives.map((o, j) => (
                      <li key={j} className="flex items-center gap-2">
                        <span className={o.taken ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}>
                          {o.taken ? '✓' : '✕'}
                        </span>
                        <span className="truncate">{o.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[10px] text-[#4A5570]">Sin objetivos en esta partida.</p>
                )}
              </div>
            ))
          )}
        </section>
      </div>
    </Shell>
  );
}

export default function PlayerLeaderboardModal({ onClose }: { onClose: () => void }) {
  const entries = useMemo(() => getLeaderboard(), []);
  const [selected, setSelected] = useState<PlayerRunRecord | null>(null);

  if (selected) {
    return <DetailView entry={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <Shell
      title="Mejores jugadas"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="w-full rounded-xl py-3 font-bold"
          style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
        >
          Cerrar
        </button>
      }
    >
      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Users className="h-10 w-10 text-[#4A5570]" />
          <p className="text-sm text-[#8B9BB4]">
            Aún no hay jugadas. Completa un torneo y podrás verlas y compartirlas aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => (
            <RunCard key={entry.id} entry={entry} onClick={() => setSelected(entry)} />
          ))}
        </div>
      )}
    </Shell>
  );
}
