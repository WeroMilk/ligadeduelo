import { useGame } from '@/hooks/useGameState';
import { X, Volume2, VolumeX, Music2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  playClickSound,
  getAudioPrefs,
  setMusicMuted,
  setSfxMuted,
  subscribeAudioPrefs,
} from '@/lib/sounds';

function AudioToggles({ prefs }: { prefs: { musicMuted: boolean; sfxMuted: boolean } }) {
  return (
    <div className="rounded-xl border border-[#2A3550] bg-[#0A0E1A] p-3 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B9BB4]">Audio</p>
      <button
        type="button"
        onClick={() => {
          playClickSound();
          setMusicMuted(!prefs.musicMuted);
        }}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-[#2A3550] px-3 py-2.5 text-sm text-[#F0E6D2] hover:border-[#C9A84C]/50"
      >
        <span className="inline-flex items-center gap-2">
          <Music2 className="w-4 h-4 text-[#C9A84C]" />
          Música
        </span>
        <span className={`text-xs font-bold ${prefs.musicMuted ? 'text-[#E74C3C]' : 'text-[#27AE60]'}`}>
          {prefs.musicMuted ? 'Silenciada' : 'Activa'}
        </span>
      </button>
      <button
        type="button"
        onClick={() => {
          const next = !prefs.sfxMuted;
          setSfxMuted(next);
          if (!next) playClickSound();
        }}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-[#2A3550] px-3 py-2.5 text-sm text-[#F0E6D2] hover:border-[#C9A84C]/50"
      >
        <span className="inline-flex items-center gap-2">
          {prefs.sfxMuted ? (
            <VolumeX className="w-4 h-4 text-[#E74C3C]" />
          ) : (
            <Volume2 className="w-4 h-4 text-[#C9A84C]" />
          )}
          Efectos
        </span>
        <span className={`text-xs font-bold ${prefs.sfxMuted ? 'text-[#E74C3C]' : 'text-[#27AE60]'}`}>
          {prefs.sfxMuted ? 'Silenciados' : 'Activos'}
        </span>
      </button>
    </div>
  );
}

export default function ExitGameButton() {
  const { state, dispatch } = useGame();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(getAudioPrefs);
  const onHome = state.currentScreen === 'modeSelect';

  useEffect(() => subscribeAudioPrefs(setPrefs), []);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          playClickSound();
          setOpen(true);
        }}
        className="fixed right-3 z-[80] grid h-9 w-9 place-items-center rounded-full border border-[#2A3550]/80 bg-[#0A0E1A]/80 text-[#8B9BB4] hover:text-[#C9A84C] hover:border-[#C9A84C] hover:bg-[#141B2D] transition-colors backdrop-blur-sm md:right-5"
        style={{
          top: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
          padding: 0,
          lineHeight: 0,
        }}
        aria-label={onHome ? 'Ajustes de audio' : 'Salir del juego'}
      >
        {onHome ? (
          prefs.musicMuted && prefs.sfxMuted ? (
            <VolumeX size={16} strokeWidth={2.25} className="pointer-events-none" aria-hidden />
          ) : (
            <Volume2 size={16} strokeWidth={2.25} className="pointer-events-none" aria-hidden />
          )
        ) : (
          <X size={16} strokeWidth={2.25} className="pointer-events-none" aria-hidden />
        )}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 px-4"
          style={{
            paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
          }}
        >
          <div className="modal-panel flex w-full max-w-sm max-h-[min(36rem,calc(100dvh-2rem))] flex-col overflow-hidden rounded-2xl border-2 border-[#2A3550] bg-[#141B2D] shadow-[0_0_40px_rgba(0,0,0,0.5)]">
            <div className="modal-scroll space-y-4 p-5">
              {onHome ? (
                <>
                  <h2 className="text-lg font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
                    Audio
                  </h2>
                  <p className="text-sm text-[#8B9BB4]">Silencia la música o los efectos cuando quieras.</p>
                  <AudioToggles prefs={prefs} />
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setOpen(false);
                    }}
                    className="w-full min-h-11 rounded-xl font-bold"
                    style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
                  >
                    Listo
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
                    ¿Salir al menú?
                  </h2>
                  <p className="text-sm text-[#8B9BB4]">Se pierden el torneo y la partida actuales.</p>
                  <AudioToggles prefs={prefs} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setOpen(false);
                      }}
                      className="flex-1 min-h-11 rounded-xl border border-[#2A3550] text-[#8B9BB4] font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setOpen(false);
                        dispatch({ type: 'EXIT_TO_MODE' });
                      }}
                      className="flex-1 min-h-11 rounded-xl font-bold bg-[#E74C3C] text-white"
                    >
                      Salir
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
