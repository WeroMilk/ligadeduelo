import { useState } from 'react';
import { useGame } from '@/hooks/useGameState';
import { COOP_MAX_FRIENDS, COOP_MAX_PLAYERS, COOP_MIN_PLAYERS, hasDuplicateTeamNames, isCoopLocal, isDuplicateTeamNameAt } from '@/lib/coop';
import { UserPlus, Trash2, Copy, Play } from 'lucide-react';

function teamNameOk(name: string) {
  return name.trim().length >= 2;
}

export default function LobbyScreen() {
  const { state, dispatch } = useGame();
  const [friendName, setFriendName] = useState('');
  const [friendTeam, setFriendTeam] = useState('');
  const isCode = state.gameMode === 'coop_code';
  const isCoop = isCoopLocal(state.gameMode);
  const maxPlayers = isCoop ? COOP_MAX_PLAYERS : 16;
  const minPlayers = isCoop ? COOP_MIN_PLAYERS : 2;
  const allTeamsNamed = state.lobbyPlayers.every(p => teamNameOk(p.teamName));
  const duplicateTeams = isCoop && hasDuplicateTeamNames(state.lobbyPlayers);
  const canStart = state.lobbyPlayers.length >= minPlayers && allTeamsNamed && !duplicateTeams;

  const addFriend = () => {
    if (state.lobbyPlayers.length >= maxPlayers) return;
    if (isCoop) {
      if (!teamNameOk(friendTeam)) return;
      dispatch({ type: 'ADD_LOBBY_PLAYER', name: '', teamName: friendTeam });
      setFriendTeam('');
      return;
    }
    dispatch({ type: 'ADD_LOBBY_PLAYER', name: friendName, teamName: friendTeam });
    setFriendName('');
    setFriendTeam('');
  };

  return (
    <div className="flex-1 min-h-0 w-full bg-[#0A0E1A] flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 py-2.5 safe-top safe-chrome-x border-b border-[#1E2740] max-w-4xl mx-auto w-full md:py-4">
        <h1 className="text-lg md:text-xl font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
          {isCode ? 'Sala con código' : 'Lobby compartido'}
        </h1>
        <p className="text-xs text-[#8B9BB4] mt-1">
          {isCode
            ? 'Mismo dispositivo: el código es decorativo. Añade amigos aquí (máx. 16).'
            : `Mínimo ${COOP_MIN_PLAYERS} equipos · máximo ${COOP_MAX_FRIENDS} amigos. Escribe el nombre de cada equipo.`}
        </p>
        {isCode && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-3 py-2">
            <span className="font-mono text-2xl tracking-[0.35em] text-[#C9A84C] font-bold flex-1 text-center">
              {state.roomCode}
            </span>
            <button
              type="button"
              className="p-2 text-[#C9A84C]"
              onClick={() => navigator.clipboard?.writeText(state.roomCode)}
              aria-label="Copiar código"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="coop-lobby flex-1 min-h-0 overflow-y-auto scrollbar-hide md:overflow-hidden px-4 py-2 max-w-4xl mx-auto w-full flex flex-col gap-3 md:py-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
          {state.lobbyPlayers.map((p, i) => {
            const dup = isCoop && isDuplicateTeamNameAt(state.lobbyPlayers, i);
            const slotLabel = `Equipo ${i + 1}${p.isHost ? ' · Host' : ''}`;
            return (
            <div
              key={p.id}
              className="rounded-xl border border-[#1E2740] bg-[#141B2D] px-3 py-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-[#2A3550] flex items-center justify-center text-xs font-bold text-[#F0E6D2] shrink-0">
                  {(p.teamName.trim() || `E${i + 1}`).slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C]">
                    {isCoop ? slotLabel : (p.isHost ? 'Jugador 1 · Host' : `Jugador ${i + 1}`)}
                  </p>
                </div>
                {!p.isHost && (
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'REMOVE_LOBBY_PLAYER', id: p.id })}
                    className="p-2 text-[#E74C3C] shrink-0"
                    aria-label="Quitar jugador"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isCoop ? (
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B9BB4]">
                    Nombre del equipo <span className="text-[#C9A84C]">*</span>
                  </span>
                  <input
                    value={p.teamName}
                    onChange={e => dispatch({ type: 'UPDATE_LOBBY_PLAYER', id: p.id, teamName: e.target.value })}
                    maxLength={24}
                    placeholder="Ej. Los Invictos"
                    className={`w-full rounded-lg border bg-[#0A0E1A] px-2.5 py-2 text-base text-[#F0E6D2] outline-none ${
                      dup
                        ? 'border-[#E74C3C] focus:border-[#E74C3C]'
                        : teamNameOk(p.teamName)
                          ? 'border-[#2A3550] focus:border-[#C9A84C]'
                          : 'border-[#E74C3C]/50 focus:border-[#E74C3C]'
                    }`}
                  />
                  {dup ? (
                    <span className="text-[10px] text-[#E74C3C]">Este nombre ya lo usa otro equipo</span>
                  ) : !teamNameOk(p.teamName) ? (
                    <span className="text-[10px] text-[#E74C3C]">Mínimo 2 caracteres</span>
                  ) : null}
                </label>
              ) : (
                <>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B9BB4]">
                      Nombre del jugador
                    </span>
                    <input
                      value={p.name}
                      onChange={e => dispatch({ type: 'UPDATE_LOBBY_PLAYER', id: p.id, name: e.target.value })}
                      maxLength={18}
                      placeholder={`Jugador ${i + 1}`}
                      className="w-full rounded-lg border border-[#2A3550] bg-[#0A0E1A] px-2.5 py-2 text-sm text-[#F0E6D2] focus:border-[#C9A84C] outline-none"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B9BB4]">
                      Nombre del equipo <span className="text-[#C9A84C]">*</span>
                    </span>
                    <input
                      value={p.teamName}
                      onChange={e => dispatch({ type: 'UPDATE_LOBBY_PLAYER', id: p.id, teamName: e.target.value })}
                      maxLength={24}
                      placeholder="Ej. Los Invictos"
                      className={`w-full rounded-lg border bg-[#0A0E1A] px-2.5 py-2 text-sm text-[#F0E6D2] outline-none ${
                        dup
                          ? 'border-[#E74C3C] focus:border-[#E74C3C]'
                          : teamNameOk(p.teamName)
                            ? 'border-[#2A3550] focus:border-[#C9A84C]'
                            : 'border-[#E74C3C]/50 focus:border-[#E74C3C]'
                      }`}
                    />
                  </label>
                </>
              )}
            </div>
            );
          })}
        </div>

        {isCoop && state.lobbyPlayers.length < maxPlayers && (
          <div className="rounded-xl border border-dashed border-[#2A3550] bg-[#0D1220] p-3 space-y-2 shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B9BB4]">
              Añadir equipo ({state.lobbyPlayers.length - 1}/{COOP_MAX_FRIENDS})
            </p>
            <input
              value={friendTeam}
              onChange={e => setFriendTeam(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addFriend()}
              placeholder="Nombre del equipo"
              maxLength={24}
              className="w-full rounded-lg border border-[#2A3550] bg-[#141B2D] px-3 py-2.5 text-base text-[#F0E6D2] focus:border-[#C9A84C] outline-none"
            />
            <button
              type="button"
              onClick={addFriend}
              disabled={!teamNameOk(friendTeam)}
              className="w-full min-h-11 rounded-xl bg-[#C9A84C] text-[#0A0E1A] font-bold flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <UserPlus className="w-5 h-5" />
              Añadir equipo
            </button>
          </div>
        )}

        {!isCoop && state.lobbyPlayers.length < maxPlayers && (
          <div className="flex gap-2 pt-2 shrink-0 max-w-md">
            <input
              value={friendName}
              onChange={e => setFriendName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addFriend()}
              placeholder="Jugador 2…"
              maxLength={18}
              className="flex-1 rounded-xl border-2 border-[#2A3550] bg-[#141B2D] px-3 py-2.5 text-[#F0E6D2] focus:border-[#C9A84C] outline-none"
            />
            <button
              type="button"
              onClick={addFriend}
              className="px-3 rounded-xl bg-[#C9A84C] text-[#0A0E1A] font-bold"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 py-2.5 max-w-4xl mx-auto w-full space-y-2 border-t border-[#1E2740] flex flex-col md:flex-row md:items-center md:gap-3">
        {!allTeamsNamed && isCoop && state.lobbyPlayers.length >= minPlayers && (
          <p className="text-[11px] text-[#E74C3C] md:flex-1">
            Escribe el nombre de equipo de todos (mín. 2 caracteres).
          </p>
        )}
        {duplicateTeams && (
          <p className="text-[11px] text-[#E74C3C] md:flex-1">
            Cada equipo debe tener un nombre distinto (no se admiten duplicados).
          </p>
        )}
        <button
          type="button"
          disabled={!canStart}
          onClick={() => dispatch({ type: 'CONFIRM_LOBBY' })}
          className="w-full md:flex-1 min-h-12 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
        >
          <Play className="w-5 h-5" />
          {isCoop ? 'CONTINUAR · ARMAR EQUIPOS' : 'CONTINUAR · NOMBRE DE EQUIPO'}
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'EXIT_TO_MODE' })}
          className="w-full md:w-auto text-sm text-[#8B9BB4] py-2 px-4"
        >
          Volver a modos
        </button>
      </div>
    </div>
  );
}
