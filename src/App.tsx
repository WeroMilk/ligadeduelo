import { Component, type ErrorInfo, type ReactNode, useEffect, useSyncExternalStore, useState } from 'react';
import { GameProvider, useGame } from '@/hooks/useGameState';
import ExitGameButton from '@/components/ExitGameButton';
import CoffeeTipButton from '@/components/CoffeeTipButton';
import AdBanner from '@/components/AdBanner';
import PostMatchAd from '@/components/PostMatchAd';
import AdUnlockModal from '@/components/AdUnlockModal';
import AudioBoot from '@/components/AudioBoot';
import { getEasterEggSnapshot, subscribeEasterEgg } from '@/lib/ad-easter-egg';
import ModeSelect from '@/pages/ModeSelect';
import LobbyScreen from '@/pages/LobbyScreen';
import Home from '@/pages/Home';
import RosterSelect from '@/pages/RosterSelect';
import ChampionSelect from '@/pages/ChampionSelect';
import BracketScreen from '@/pages/BracketScreen';
import LiveMatch from '@/pages/LiveMatch';
import VictoryScreen from '@/pages/VictoryScreen';
import DefeatScreen from '@/pages/DefeatScreen';
import TournamentWin from '@/pages/TournamentWin';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI crash', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: '#0A0E1A', color: '#F0E6D2', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ color: '#C9A84C', fontSize: 22 }}>Algo falló</h1>
          <p style={{ marginTop: 12, lineHeight: 1.5 }}>{this.state.error.message}</p>
          <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 20, padding: '12px 18px', background: '#C9A84C', color: '#0A0E1A', border: 0, borderRadius: 10, fontWeight: 700 }}>
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function GameRouter() {
  const { state } = useGame();

  switch (state.currentScreen) {
    case 'modeSelect':
      return <ModeSelect />;
    case 'lobby':
      return <LobbyScreen />;
    case 'home':
      return <Home />;
    case 'rosterSelect':
      return <RosterSelect />;
    case 'championSelect':
      return <ChampionSelect />;
    case 'bracket':
      return <BracketScreen />;
    case 'liveMatch':
      return <LiveMatch />;
    case 'victory':
      return <VictoryScreen />;
    case 'defeat':
      return <DefeatScreen />;
    case 'tournamentWin':
      return <TournamentWin />;
    default:
      return <ModeSelect />;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <AppShell />
      </GameProvider>
    </ErrorBoundary>
  );
}

function AppShell() {
  const egg = useSyncExternalStore(subscribeEasterEgg, getEasterEggSnapshot, getEasterEggSnapshot);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const showUnlockPrompt = egg.phase === 'prompt' && !promptDismissed;

  useEffect(() => {
    if (egg.phase === 'prompt') setPromptDismissed(false);
  }, [egg.phase]);

  return (
    <div className="flex h-app w-full flex-col overflow-hidden bg-[#0A0E1A] text-[#F0E6D2] safe-x md:px-4 lg:px-6">
      <ExitGameButton />
      <CoffeeTipButton />
      <AudioBoot />
      <main className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <div className="flex h-full min-h-0 w-full flex-col">
          <GameRouter />
        </div>
      </main>
      <AdBanner />
      <PostMatchAd />
      <AdUnlockModal open={showUnlockPrompt} onClose={() => setPromptDismissed(true)} />
    </div>
  );
}
