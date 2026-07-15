import { Component, type ErrorInfo, type ReactNode } from 'react';
import { GameProvider, useGame } from '@/hooks/useGameState';
import Home from '@/pages/Home';
import ChampionSelect from '@/pages/ChampionSelect';
import BracketScreen from '@/pages/BracketScreen';
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
    case 'home':
      return <Home />;
    case 'championSelect':
      return <ChampionSelect />;
    case 'bracket':
      return <BracketScreen />;
    case 'victory':
      return <VictoryScreen />;
    case 'defeat':
      return <DefeatScreen />;
    case 'tournamentWin':
      return <TournamentWin />;
    default:
      return <Home />;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <div className="flex h-app w-full flex-col overflow-hidden bg-[#0A0E1A] text-[#F0E6D2] safe-x">
          <GameRouter />
        </div>
      </GameProvider>
    </ErrorBoundary>
  );
}
