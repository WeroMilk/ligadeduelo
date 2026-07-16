import { useGame } from '@/hooks/useGameState';
import { Coffee, Copy, Check, X } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { playClickSound } from '@/lib/sounds';

const CLABE = '127760021065535929';
const CLABE_DISPLAY = '1277 6002 1065 5359 29';
const BANK_LABEL = 'Banco Azteca · Débito';

export default function CoffeeTipButton() {
  const { state } = useGame();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (state.currentScreen !== 'modeSelect') return null;

  const copyClabe = async () => {
    playClickSound();
    try {
      await navigator.clipboard.writeText(CLABE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback para contextos sin clipboard API
      const el = document.createElement('textarea');
      el.value = CLABE;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          playClickSound();
          setOpen(true);
          setCopied(false);
        }}
        className="fixed left-3 z-[80] grid h-9 w-9 place-items-center rounded-full border border-[#2A3550]/80 bg-[#0A0E1A]/80 text-[#8B9BB4] hover:text-[#C9A84C] hover:border-[#C9A84C] hover:bg-[#141B2D] transition-colors backdrop-blur-sm md:left-5"
        style={{
          top: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
          padding: 0,
          lineHeight: 0,
        }}
        aria-label="Invítame un café"
      >
        <Coffee size={16} strokeWidth={2.25} className="pointer-events-none" aria-hidden />
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[95] flex items-center justify-center px-4"
            style={{
              background:
                'radial-gradient(ellipse at 50% 30%, rgba(201,168,76,0.18), transparent 55%), rgba(0,0,0,0.78)',
            }}
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="coffee-tip-title"
          >
            <div
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-[#C9A84C]/55 bg-[#0A0F1C] p-5 shadow-[0_0_50px_rgba(201,168,76,0.25),inset_0_1px_0_rgba(255,255,255,0.06)]"
              onClick={e => e.stopPropagation()}
              style={{
                backgroundImage:
                  'linear-gradient(145deg, rgba(20,30,55,0.95) 0%, rgba(8,12,24,0.98) 55%, rgba(14,18,32,0.98) 100%)',
              }}
            >
              <div
                className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full opacity-40"
                style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.45), transparent 70%)' }}
              />
              <div
                className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full opacity-30"
                style={{ background: 'radial-gradient(circle, rgba(52,152,219,0.35), transparent 70%)' }}
              />

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setOpen(false);
                }}
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-[#2A3550] text-[#8B9BB4] hover:text-[#F0E6D2]"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative space-y-4">
                <div className="flex items-center gap-3 pr-8">
                  <div
                    className="grid h-12 w-12 place-items-center rounded-xl border border-[#C9A84C]/50"
                    style={{
                      background: 'linear-gradient(145deg, #C9A84C 0%, #8B6914 100%)',
                      boxShadow: '0 0 24px rgba(201,168,76,0.45)',
                    }}
                  >
                    <Coffee className="h-6 w-6 text-[#0A0E1A]" strokeWidth={2.25} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#C9A84C]">
                      Soporte
                    </p>
                    <h2
                      id="coffee-tip-title"
                      className="text-xl font-bold text-[#F0E6D2]"
                      style={{ fontFamily: 'Cinzel, serif' }}
                    >
                      Invítame un café
                    </h2>
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-[#8B9BB4]">
                  Si te gusta Liga de Duelo, puedes apoyarme con un café. Transferencia SPEI a esta CLABE:
                </p>

                <div
                  className="rounded-xl border border-[#C9A84C]/35 p-3 space-y-2"
                  style={{
                    background: 'linear-gradient(180deg, rgba(201,168,76,0.08), rgba(10,14,26,0.6))',
                    boxShadow: 'inset 0 0 0 1px rgba(201,168,76,0.12)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
                      CLABE
                    </span>
                    <span className="text-[10px] text-[#8B9BB4]">{BANK_LABEL}</span>
                  </div>
                  <p
                    className="text-center text-lg font-bold tracking-wider text-[#F0E6D2] tabular-nums"
                    style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
                  >
                    {CLABE_DISPLAY}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={copyClabe}
                  className="w-full min-h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{
                    background: copied
                      ? 'linear-gradient(90deg, #27AE60, #1E8449)'
                      : 'linear-gradient(90deg, #C9A84C, #E8C86A, #C9A84C)',
                    color: '#0A0E1A',
                    boxShadow: copied
                      ? '0 0 24px rgba(39,174,96,0.35)'
                      : '0 0 28px rgba(201,168,76,0.4)',
                  }}
                >
                  {copied ? (
                    <>
                      <Check className="h-5 w-5" />
                      CLABE copiada
                    </>
                  ) : (
                    <>
                      <Copy className="h-5 w-5" />
                      Copiar CLABE
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-[#4A5570]">
                  Gracias por el café · HOMEBOYS PROD ® 2026
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
