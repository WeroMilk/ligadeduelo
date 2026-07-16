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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const close = () => {
    onChange('');
    setOpen(false);
  };

  return (
    <div
      className={
        pinned
          ? 'pointer-events-auto relative z-30 shrink-0'
          : 'pointer-events-auto absolute right-3 top-2 z-20 flex items-center md:right-4'
      }
    >
      {open ? (
        <div className={`flex items-center gap-1 rounded-lg border border-[#2A3550] bg-[#141B2D]/95 py-0.5 pl-2 pr-1 shadow-lg backdrop-blur-sm ${pinned ? 'absolute right-0 top-0 w-[min(calc(100vw-2rem),17rem)]' : ''}`}>
          <Search className="h-3.5 w-3.5 shrink-0 text-[#8B9BB4]" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-[9rem] bg-transparent text-xs text-[#F0E6D2] outline-none placeholder:text-[#4A5570] sm:w-36"
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
