import { Share2 } from 'lucide-react';
import { useGame } from '@/hooks/useGameState';
import { ROLE_NAMES, ROLE_COLORS, CHAMPIONS } from '@/lib/game-data';
import type { Role } from '@/types/game';

const ROUND_PLACE: Record<number, string> = {
  0: '9º–16º · Octavos',
  1: '5º–8º · Cuartos',
  2: '3º–4º · Semifinal',
  3: '2º · Subcampeón',
};

export function getPlayerPlacement(playerWon: boolean, eliminatedRound: number | null): string {
  if (playerWon) return '1º · Campeón del torneo';
  if (eliminatedRound === null) return 'Eliminado';
  return ROUND_PLACE[eliminatedRound] ?? 'Eliminado';
}

const ROLE_ORDER: Role[] = ['top', 'jungle', 'mid', 'adc', 'support'];

export function buildShareText(opts: {
  playerWon: boolean;
  teamName: string;
  placement: string;
  tournamentChampion?: string;
  lines: { player: string; champ: string; role: string }[];
}): string {
  const header = opts.playerWon
    ? `¡Soy campeón de Liga de Duelo con ${opts.teamName}!`
    : `Terminé el torneo de Liga de Duelo con ${opts.teamName}`;
  const place = `Posición: ${opts.placement}`;
  const champLine = opts.tournamentChampion && !opts.playerWon
    ? `Campeón del torneo: ${opts.tournamentChampion}`
    : null;
  const roster = opts.lines
    .map(l => `• ${l.role}: ${l.player} → ${l.champ}`)
    .join('\n');
  return [header, place, champLine, '', 'Mi equipo:', roster, '', '¿Te atreves a jugar?']
    .filter(Boolean)
    .join('\n');
}

export default function TournamentRecap({ playerWon }: { playerWon: boolean }) {
  const { state } = useGame();
  const placement = getPlayerPlacement(playerWon, state.playerEliminatedRound);
  const teamName = state.playerTeamName || 'Mi equipo';

  const lines = ROLE_ORDER.map(role => {
    const member = state.selectedRoster.find(r => r.role === role);
    const champ = state.selectedChampions.find(c => {
      const def = CHAMPIONS.find(d => d.id === c.defId);
      return def?.role === role;
    });
    const def = champ ? CHAMPIONS.find(d => d.id === champ.defId) : null;
    return {
      role,
      roleLabel: ROLE_NAMES[role],
      player: member?.name || '—',
      playerImage: member?.image,
      champ: def?.name || '—',
      champImage: def?.image || null,
      champColor: def?.color || '#333',
      initials: def?.initials || '?',
    };
  });

  const share = () => {
    const text = buildShareText({
      playerWon,
      teamName,
      placement,
      tournamentChampion: state.tournament?.champion?.name,
      lines: lines.map(l => ({ player: l.player, champ: l.champ, role: l.roleLabel })),
    });
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full space-y-3">
      <div className="rounded-xl border border-[#2A3550] bg-[#141B2D] px-4 py-3 text-center">
        <p className="text-[10px] uppercase tracking-wider text-[#8B9BB4]">Tu posición</p>
        <p className="text-xl font-bold text-[#C9A84C] mt-0.5" style={{ fontFamily: 'Cinzel, serif' }}>
          {placement}
        </p>
        <p className="text-xs text-[#8B9BB4] mt-1 truncate">{teamName}</p>
      </div>

      <div className="rounded-xl border border-[#1E2740] bg-[#0D1220] p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-[#8B9BB4] text-center">
          Integrantes y campeones
        </p>
        {lines.map(l => (
          <div
            key={l.role}
            className="flex items-center gap-2 rounded-lg border border-[#1E2740] bg-[#141B2D] px-2.5 py-2"
          >
            <div
              className="w-9 h-9 rounded-full overflow-hidden border-2 shrink-0 flex items-center justify-center bg-[#0A0E1A]"
              style={{ borderColor: ROLE_COLORS[l.role] }}
            >
              {l.playerImage ? (
                <img src={l.playerImage} alt={l.player} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-bold text-[#8B9BB4]">{l.player.slice(0, 2)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase" style={{ color: ROLE_COLORS[l.role] }}>
                {l.roleLabel}
              </p>
              <p className="text-sm font-bold text-[#F0E6D2] truncate">{l.player}</p>
            </div>
            <span className="text-[#4A5570] text-xs shrink-0">→</span>
            <div className="flex items-center gap-1.5 min-w-0 shrink-0">
              {l.champImage ? (
                <img src={l.champImage} alt={l.champ} className="w-8 h-8 rounded-full object-cover border border-[#2A3550]" />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ backgroundColor: l.champColor }}
                >
                  {l.initials}
                </div>
              )}
              <span className="text-xs font-bold text-[#C9A84C] truncate max-w-[72px]">{l.champ}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={share}
        className="w-full min-h-12 rounded-xl font-bold flex items-center justify-center gap-2 bg-[#25D366] text-[#0A0E1A] active:scale-[0.98] transition-transform"
      >
        <Share2 className="w-5 h-5" />
        COMPARTIR POR WHATSAPP
      </button>
    </div>
  );
}
