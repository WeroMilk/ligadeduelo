import { useGame } from '@/hooks/useGameState';
import { isCoopLocal } from '@/lib/coop';
import { Users } from 'lucide-react';

export default function CoopSetupBanner() {
  const { state } = useGame();
  if (!isCoopLocal(state.gameMode)) return null;

  const player = state.lobbyPlayers[state.coopSetupPlayerIndex];
  const label = player?.name ?? `Jugador ${state.coopSetupPlayerIndex + 1}`;

  return (
    <div className="mx-auto mb-2 flex max-w-6xl justify-center px-4 md:mb-3">
      <div className="inline-flex items-center gap-2 rounded-lg border border-[#3498DB]/40 bg-[#3498DB]/10 px-3 py-1.5">
        <Users className="h-4 w-4 shrink-0 text-[#3498DB]" />
        <span className="text-xs font-bold text-[#3498DB]">
          Jugador {state.coopSetupPlayerIndex + 1} · {label}
        </span>
      </div>
    </div>
  );
}
