import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  champName: string;
  ultName: string;
  ultDescription: string;
  cooldownTurns: number;
};

export default function UltDetailPopup({
  open,
  onClose,
  champName,
  ultName,
  ultDescription,
  cooldownTurns,
}: Props) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Definitiva de ${champName}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border-2 border-[#9B59B6]/50 bg-[#0D1220] p-4 shadow-[0_0_40px_rgba(155,89,182,0.25)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9B59B6]">
              Definitiva
            </p>
            <h3 className="text-base font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
              {champName} · {ultName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2A3550] text-[#8B9BB4]"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm leading-relaxed text-[#C5D0E0]">{ultDescription}</p>
        <p className="mt-2 text-xs text-[#8B9BB4]">Enfriamiento: {cooldownTurns} turnos</p>
      </div>
    </div>,
    document.body,
  );
}
