import { CHAMPIONS } from '@/lib/game-data';

const preloaded = new Set<string>();

/** Precarga imágenes de campeones en caché del navegador. */
export function preloadChampionImages(sources?: (string | null | undefined)[]) {
  const urls = sources
    ? sources.filter((s): s is string => !!s)
    : CHAMPIONS.map(c => c.image).filter((s): s is string => !!s);

  for (const src of urls) {
    if (preloaded.has(src)) continue;
    preloaded.add(src);
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  }
}
