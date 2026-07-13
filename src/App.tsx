import { GameProvider, useGame } from '@/hooks/useGameState';
import Home from '@/pages/Home';
import ChampionSelect from '@/pages/ChampionSelect';
import BracketScreen from '@/pages/BracketScreen';
import SimulationScreen from '@/pages/SimulationScreen';
import ItemSelect from '@/pages/ItemSelect';
import VictoryScreen from '@/pages/VictoryScreen';
import DefeatScreen from '@/pages/DefeatScreen';
import TournamentWin from '@/pages/TournamentWin';
import BuffSelect from '@/pages/BuffSelect';
import SpectatorScreen from '@/pages/SpectatorScreen';
import SpectatorVote from '@/pages/SpectatorVote';

function GameRouter() {
  const { state } = useGame();

  switch (state.currentScreen) {
    case 'home':
      return <Home />;
    case 'championSelect':
      return <ChampionSelect />;
    case 'bracket':
      return <BracketScreen />;
    case 'buffSelect':
      return <BuffSelect />;
    case 'simulation':
      return <SimulationScreen />;
    case 'itemSelect':
      return (
        <>
          <SimulationScreen />
          <ItemSelect />
        </>
      );
    case 'spectator':
      return <SpectatorScreen />;
    case 'spectatorVote':
      return <SpectatorVote />;
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
    <GameProvider>
      <div className="min-h-app bg-[#0A0E1A] text-[#F0E6D2] safe-x">
        <GameRouter />
      </div>
    </GameProvider>
  );
}
