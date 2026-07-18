import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, X, ChevronRight, ChevronLeft, Users, Share2, Trash2 } from 'lucide-react';
import {
  clearAllRuns,
  deleteRun,
  formatPlayTime,
  getLeaderboard,
  shareRunOnWhatsApp,
  type PlayerRunRecord,
} from '@/lib/player-leaderboard';
import { playClickSound } from '@/lib/sounds';

const PAGE_SIZE = 2;

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
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 px-3"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
      }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="modal-panel flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border-2 border-[#C9A84C]/50 bg-[#0D1220] shadow-[0_0_40px_rgba(201,168,76,0.2)]"
        style={{ maxHeight: 'min(36rem, calc(100dvh - 1.5rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#2A3550] px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Trophy className="h-4 w-4 shrink-0 text-[#C9A84C]" />
            <h2 className="truncate text-base font-bold text-[#C9A84C]" style={{ fontFamily: 'Cinzel, serif' }}>
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2A3550] text-[#8B9BB4] hover:text-[#F0E6D2]"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-3 py-2 text-sm">
          {children}
        </div>
        {footer && (
          <div className="modal-footer shrink-0 border-t border-[#2A3550]">
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
      className={`flex min-h-9 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-xs font-bold text-[#0A0E1A] active:scale-[0.98] ${className}`}
    >
      <Share2 className="h-3.5 w-3.5" />
      WhatsApp
    </button>
  );
}

function RunCard({
  entry,
  onClick,
  onDelete,
}: {
  entry: PlayerRunRecord;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border border-[#2A3550] bg-[#141B2D] p-2 transition-colors hover:border-[#C9A84C]/50">
      <div className="flex items-start gap-1">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onClick();
          }}
          className="min-w-0 flex-1 text-left active:scale-[0.99]"
        >
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#F0E6D2] truncate">{entry.teamName}</p>
              {entry.placement && (
                <p className="text-[9px] font-bold text-[#C9A84C] mt-0.5 truncate">{entry.placement}</p>
              )}
              <p className="text-[9px] text-[#8B9BB4] mt-0.5 truncate">
                {entry.players.join(' · ')}
              </p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#C9A84C] mt-0.5" />
          </div>
          <p className="text-[9px] text-[#8B9BB4] mt-1 truncate">
            {entry.champions.join(' · ')}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1 text-[9px]">
            <span className="rounded bg-[#3498DB]/15 px-1.5 py-0.5 text-[#3498DB] font-bold">
              {entry.kills} bajas
            </span>
            <span className="rounded bg-[#E74C3C]/15 px-1.5 py-0.5 text-[#E74C3C] font-bold">
              {entry.deaths} recibidas
            </span>
            <span className="rounded bg-[#2A3550] px-1.5 py-0.5 text-[#8B9BB4]">
              {formatPlayTime(entry.playTimeMs)}
            </span>
          </div>
        </button>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            playClickSound();
            onDelete();
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E74C3C]/40 text-[#E74C3C] active:scale-95"
          aria-label={`Borrar jugada de ${entry.teamName}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <ShareWhatsAppButton entry={entry} className="mt-2 w-full" />
    </div>
  );
}

function DetailView({
  entry,
  onBack,
  onDelete,
}: {
  entry: PlayerRunRecord;
  onBack: () => void;
  onDelete: () => void;
}) {
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
            className="w-full rounded-xl py-2.5 text-sm font-bold"
            style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
          >
            Volver a la lista
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              if (window.confirm(`¿Borrar la jugada de ${entry.teamName}?`)) {
                deleteRun(entry.id);
                onDelete();
              }
            }}
            className="w-full rounded-xl border border-[#E74C3C]/50 py-2 text-sm font-bold text-[#E74C3C]"
          >
            Borrar esta jugada
          </button>
        </div>
      }
    >
      <div className="space-y-2 text-xs">
        <section className="rounded-lg border border-[#2A3550] bg-[#141B2D] p-2 space-y-1">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[#C9A84C]">Equipo</p>
          <p className="text-[#F0E6D2] font-bold">{entry.teamName}</p>
          {entry.placement && (
            <p className="text-[10px] font-bold text-[#C9A84C]">{entry.placement}</p>
          )}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <p className="text-[#8B9BB4]">Integrantes</p>
              <ul className="text-[#C5D0E0] mt-0.5 space-y-0.5">
                {entry.players.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
            <div>
              <p className="text-[#8B9BB4]">Campeones</p>
              <ul className="text-[#C5D0E0] mt-0.5 space-y-0.5">
                {entry.champions.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 pt-0.5 text-[9px]">
            <span className="text-[#3498DB] font-bold">{entry.kills} bajas</span>
            <span className="text-[#E74C3C] font-bold">{entry.deaths} recibidas</span>
            <span className="text-[#8B9BB4]">{formatPlayTime(entry.playTimeMs)}</span>
          </div>
        </section>

        <section className="space-y-1">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[#C9A84C]">
            Partidas ({entry.matches.length})
          </p>
          {entry.matches.length === 0 ? (
            <p className="text-[#8B9BB4] text-[10px]">Sin partidas registradas.</p>
          ) : (
            entry.matches.map((m, i) => (
              <div
                key={i}
                className="rounded-lg border border-[#2A3550] bg-[#0A0E1A] p-2 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#F0E6D2] truncate">vs {m.opponent}</p>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      m.won ? 'bg-[#27AE60]/20 text-[#2ECC71]' : 'bg-[#E74C3C]/20 text-[#E74C3C]'
                    }`}
                  >
                    {m.won ? 'Victoria' : 'Derrota'}
                  </span>
                </div>
                <p className="text-[10px] text-[#8B9BB4]">
                  Marcador: <span className="text-[#3498DB] font-bold">{m.playerKills}</span>
                  {' – '}
                  <span className="text-[#E74C3C] font-bold">{m.enemyKills}</span>
                </p>
              </div>
            ))
          )}
        </section>
      </div>
    </Shell>
  );
}

export default function PlayerLeaderboardModal({ onClose }: { onClose: () => void }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<PlayerRunRecord | null>(null);

  const entries = useMemo(() => getLeaderboard(), [refreshKey]);
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageEntries = entries.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const refresh = () => {
    setRefreshKey(k => k + 1);
    setPage(0);
    setSelected(null);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('¿Borrar esta jugada?')) return;
    deleteRun(id);
    refresh();
  };

  const handleClearAll = () => {
    if (!window.confirm('¿Borrar todas las mejores jugadas?')) return;
    clearAllRuns();
    refresh();
  };

  if (selected) {
    return (
      <DetailView
        entry={selected}
        onBack={() => setSelected(null)}
        onDelete={() => {
          setSelected(null);
          refresh();
        }}
      />
    );
  }

  return (
    <Shell
      title="Mejores jugadas"
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2">
          {entries.length > 0 && (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                handleClearAll();
              }}
              className="w-full rounded-xl border border-[#E74C3C]/50 py-2 text-sm font-bold text-[#E74C3C]"
            >
              Borrar todas
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-full rounded-xl py-2.5 text-sm font-bold"
            style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
          >
            Cerrar
          </button>
        </div>
      }
    >
      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Users className="h-8 w-8 text-[#4A5570]" />
          <p className="text-xs text-[#8B9BB4]">
            Aún no hay jugadas. Completa un torneo y podrás verlas aquí.
          </p>
        </div>
      ) : (
        <div className="flex h-full flex-col gap-2">
          <div className="min-h-0 flex-1 space-y-2 overflow-hidden">
            {pageEntries.map(entry => (
              <RunCard
                key={entry.id}
                entry={entry}
                onClick={() => setSelected(entry)}
                onDelete={() => handleDelete(entry.id)}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[#2A3550] pt-2">
              <button
                type="button"
                disabled={safePage <= 0}
                onClick={() => {
                  playClickSound();
                  setPage(p => Math.max(0, p - 1));
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A3550] text-[#C9A84C] disabled:opacity-30"
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[10px] font-bold text-[#8B9BB4]">
                {safePage + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages - 1}
                onClick={() => {
                  playClickSound();
                  setPage(p => Math.min(totalPages - 1, p + 1));
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A3550] text-[#C9A84C] disabled:opacity-30"
                aria-label="Página siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
