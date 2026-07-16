import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

export default function NameSearch({
  value,
  onChange,
  placeholder = 'Buscar...',
  pinned = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** En cabecera fija: no se pierde al hacer scroll. */
  pinned?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    // Enfocar tras abrir: abre el teclado sin zoom (input ≥16px).
    const id = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  // Toque fuera de la lupa/campo → cierra teclado y pliega la búsqueda
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (root.contains(e.target as Node)) return;
      inputRef.current?.blur();
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  const close = () => {
    inputRef.current?.blur();
    onChange('');
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={
        pinned
          ? 'pointer-events-auto relative z-30 shrink-0'
          : 'pointer-events-auto absolute right-3 top-2 z-20 flex items-center md:right-4'
      }
    >
      {open ? (
        <div
          className={`flex items-center gap-1 rounded-lg border border-[#2A3550] bg-[#141B2D]/95 py-0.5 pl-2 pr-1 shadow-lg backdrop-blur-sm ${
            pinned ? 'absolute right-0 top-0 w-[min(calc(100vw-2rem),17rem)]' : ''
          }`}
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-[#8B9BB4]" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                inputRef.current?.blur();
                setOpen(false);
              }
            }}
            placeholder={placeholder}
            /* text-base (16px): evita zoom automático de iOS/Android al enfocar */
            className="w-[9rem] bg-transparent text-base leading-tight text-[#F0E6D2] outline-none placeholder:text-[#4A5570] sm:w-36 md:text-sm"
            style={{ fontSize: '16px' }}
            aria-label={placeholder}
          />
          <button
            type="button"
            onClick={close}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#8B9BB4] hover:text-[#F0E6D2]"
            aria-label="Cerrar búsqueda"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A3550] bg-[#141B2D]/90 text-[#8B9BB4] backdrop-blur-sm hover:border-[#C9A84C]/50 hover:text-[#C9A84C]"
          aria-label={placeholder}
        >
          <Search className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function matchesNameQuery(name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return name.toLowerCase().includes(q);
}
