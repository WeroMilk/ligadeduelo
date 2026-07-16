import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { closeEasterEggPrompt, submitEasterEggCode } from '@/lib/ad-easter-egg';
import { X } from 'lucide-react';

export default function AdUnlockModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setCode('');
      setError('');
      return;
    }
    inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const handleSubmit = () => {
    const result = submitEasterEggCode(code);
    if (result === 'ok') {
      onClose();
      return;
    }
    setError('Contraseña incorrecta');
    setCode('');
    inputRef.current?.focus();
  };

  const handleClose = () => {
    closeEasterEggPrompt();
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 px-4"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ad-unlock-title"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border-2 border-[#C9A84C]/45 bg-[#0D1220] p-5 shadow-[0_0_40px_rgba(201,168,76,0.18)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="ad-unlock-title"
              className="text-lg font-bold text-[#C9A84C]"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Sin publicidad
            </h2>
            <p className="mt-1 text-xs text-[#8B9BB4]">Introduce la contraseña numérica de 4 dígitos.</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2A3550] text-[#8B9BB4]"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={code}
          onChange={e => {
            setError('');
            setCode(e.target.value.replace(/\D/g, '').slice(0, 4));
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSubmit();
          }}
          placeholder="••••"
          className="w-full rounded-xl border-2 border-[#2A3550] bg-[#141B2D] px-4 py-3 text-center text-2xl tracking-[0.5em] text-[#F0E6D2] placeholder:text-[#4A5570] focus:border-[#C9A84C] focus:outline-none"
          autoComplete="off"
        />

        {error && (
          <p className="mt-2 text-center text-xs font-bold text-[#E74C3C]">{error}</p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={code.length !== 4}
          className="mt-4 w-full rounded-xl py-3 font-bold disabled:opacity-40"
          style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
        >
          Confirmar
        </button>
      </div>
    </div>,
    document.body,
  );
}
