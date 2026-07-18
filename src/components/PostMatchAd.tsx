/**
 * Interstitial fullscreen tras cada partida (8s).
 * No se puede cerrar; los clics no hacen nada.
 * No se muestra al ganar la final del torneo.
 */
import { useEffect, useState, useSyncExternalStore, useCallback } from 'react';
import { useGame } from '@/hooks/useGameState';
import { getAdsDisabledForever, subscribeAdsDisabledForever } from '@/lib/ad-premium';
import { getBracketTimings, isExpressMode } from '@/lib/express-mode';
import AdInterstitial, { POST_MATCH_AD_MS } from '@/components/AdInterstitial';

export { POST_MATCH_AD_MS };

function shouldShowPostMatchAd(
  screen: string,
  round: number | undefined,
  roundsLen: number | undefined,
  result: string | null | undefined,
) {
  if (screen !== 'victory' && screen !== 'defeat') return false;
  if (screen === 'victory' && result === 'win') {
    const last = (roundsLen ?? 4) - 1;
    if ((round ?? 0) >= last) return false;
  }
  return true;
}

export default function PostMatchAd() {
  const { state } = useGame();
  const [visible, setVisible] = useState(false);
  const adsOff = useSyncExternalStore(subscribeAdsDisabledForever, getAdsDisabledForever, () => false);

  const screen = state.currentScreen;
  const round = state.tournament?.currentRound;
  const roundsLen = state.tournament?.rounds.length;
  const result = state.matchResult;
  const matchKey = `${screen}:${state.currentMatch?.id ?? 'm'}:${result}:${round}`;

  useEffect(() => {
    const bracket = getBracketTimings(state.gameMode);
    if (
      adsOff
      || isExpressMode(state.gameMode)
      || bracket.skipPostMatchAds
      || !shouldShowPostMatchAd(screen, round, roundsLen, result)
    ) {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [matchKey, screen, round, roundsLen, result, adsOff, state.gameMode]);

  const onComplete = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <AdInterstitial
      open={visible}
      durationMs={POST_MATCH_AD_MS}
      onComplete={onComplete}
      respectPremium
    />
  );
}
