import { useState } from 'react';
import { useGame } from '@/hooks/useGameState';
import { UserPlus, Trash2, Copy, Play } from 'lucide-react';

export default function LobbyScreen() {
  const { state, dispatch } = useGame();
  const [name, setName] = useState('');
  const isCode = state.gameMode === 'coop_code';
  const minPlayers = 2;
  const canStart = state.lobbyPlayers.length >= minPlayers;

  const add = () => {
    dispatch({ type: 'ADD_LOBBY_PLAYER', name });
    setName('');
  };

  return (
    <div className="flex-1 min-h-0 w-full bg-[#0A0E1A] flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 py-4 safe-top border-b border-[#1E2740] max-w-4xl mx-auto w-full">
        <h1 className="text-xl font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
          {isCode ? 'Sala con código' : 'Lobby compartido'}
        </h1>
        <p className="text-xs text-[#8B9BB4] mt-1">
          {isCode
            ? 'Mismo dispositivo: el código es decorativo. Añade amigos aquí (máx. 16).'
            : 'Añade 2–4 jugadores en esta pantalla.'}
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

      <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden px-4 py-3 max-w-4xl mx-auto w-full flex flex-col gap-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:flex-1 md:min-h-0 md:content-start md:overflow-hidden">
          {state.lobbyPlayers.map(p => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-[#1E2740] bg-[#141B2D] px-3 py-2.5"
            >
              <div className="w-9 h-9 rounded-full bg-[#2A3550] flex items-center justify-center text-xs font-bold text-[#F0E6D2]">
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#F0E6D2] truncate">{p.name}</p>
                <p className="text-[10px] text-[#8B9BB4]">{p.isHost ? 'Anfitrión' : 'Invitado'}</p>
              </div>
              {!p.isHost && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'REMOVE_LOBBY_PLAYER', id: p.id })}
                  className="p-2 text-[#E74C3C]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {state.lobbyPlayers.length < 16 && (
          <div className="flex gap-2 pt-2 shrink-0 max-w-md">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder={isCode ? 'Nombre del amigo' : 'Jugador 2…'}
              maxLength={18}
              className="flex-1 rounded-xl border-2 border-[#2A3550] bg-[#141B2D] px-3 py-2.5 text-[#F0E6D2] focus:border-[#C9A84C] outline-none"
            />
            <button
              type="button"
              onClick={add}
              className="px-3 rounded-xl bg-[#C9A84C] text-[#0A0E1A] font-bold"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 py-3 safe-bottom max-w-4xl mx-auto w-full space-y-2 border-t border-[#1E2740] flex flex-col md:flex-row md:items-center md:gap-3">
        <button
          type="button"
          disabled={!canStart}
          onClick={() => dispatch({ type: 'CONFIRM_LOBBY' })}
          className="w-full md:flex-1 min-h-12 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
        >
          <Play className="w-5 h-5" />
          CONTINUAR · NOMBRE DE EQUIPO
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
