import { useMemo, useState } from 'react';
import { useGame } from '@/hooks/useGameState';
import { FAN_ORGS, fanOrgDisplayName, ROLE_COLORS, ROLE_NAMES } from '@/lib/game-data';
import { buildAllRosters } from '@/lib/rosters';
import type { Role } from '@/types/game';
import { Check, ChevronRight, User } from 'lucide-react';

const ROLES: Role[] = ['top', 'jungle', 'mid', 'adc', 'support'];
const REGIONS = ['LEC', 'LCK', 'LPL', 'LCS', 'PCS/LJL'] as const;

export default function RosterSelect() {
  const { state, dispatch } = useGame();
  const allMembers = useMemo(() => buildAllRosters(FAN_ORGS), []);
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [regionFilter, setRegionFilter] = useState<(typeof REGIONS)[number] | 'all'>('all');
  const [orgFilter, setOrgFilter] = useState<string | 'all'>('all');

  const selectedByRole = state.selectedRoster.reduce((acc, m) => {
    acc[m.role] = m.id;
    return acc;
  }, {} as Record<string, string>);

  const orgsInRegion = useMemo(() => {
    if (regionFilter === 'all') return FAN_ORGS;
    return FAN_ORGS.filter(
      o => o.region === regionFilter || o.region.includes(regionFilter.split('/')[0]),
    );
  }, [regionFilter]);

  const list = useMemo(() => {
    let pool = allMembers;
    if (regionFilter !== 'all') {
      const ids = new Set(orgsInRegion.map(o => o.id));
      pool = pool.filter(m => ids.has(m.orgId));
    }
    if (orgFilter !== 'all') pool = pool.filter(m => m.orgId === orgFilter);
    if (roleFilter !== 'all') pool = pool.filter(m => m.role === roleFilter);
    return pool;
  }, [allMembers, regionFilter, orgFilter, roleFilter, orgsInRegion]);

  const canConfirm = state.selectedRoster.length === 5 && ROLES.every(r => selectedByRole[r]);

  if (!state.playerTeamName) {
    return (
      <div className="screen-center p-6 text-center">
        <p className="text-[#8B9BB4]">Escribe primero el nombre de tu equipo.</p>
        <button
          type="button"
          className="mt-4 text-[#C9A84C] font-bold"
          onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 w-full bg-[#0A0E1A] flex flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[#1E2740] px-4 py-2.5 safe-top md:pt-4 max-w-6xl mx-auto w-full pr-14">
        <p className="text-[#C9A84C] text-xs uppercase tracking-wider">Integrantes</p>
        <h1 className="text-lg font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
          Dream team · {state.playerTeamName}
        </h1>
        <p className="text-xs text-[#8B9BB4]">
          Elige 1 por rol de cualquier equipo ({state.selectedRoster.length}/5)
        </p>

        <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            type="button"
            onClick={() => { setRegionFilter('all'); setOrgFilter('all'); }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${regionFilter === 'all' ? 'bg-[#C9A84C] text-[#0A0E1A]' : 'bg-[#141B2D] text-[#8B9BB4]'}`}
          >
            Todas
          </button>
          {REGIONS.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => { setRegionFilter(r); setOrgFilter('all'); }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${regionFilter === r ? 'bg-[#C9A84C] text-[#0A0E1A]' : 'bg-[#141B2D] text-[#8B9BB4]'}`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 mt-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <button
            type="button"
            onClick={() => setOrgFilter('all')}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 ${orgFilter === 'all' ? 'bg-[#2A3550] text-[#F0E6D2]' : 'bg-[#0D1220] text-[#8B9BB4]'}`}
          >
            Cualquier equipo
          </button>
          {orgsInRegion.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => setOrgFilter(o.id)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 max-w-[140px] truncate ${orgFilter === o.id ? 'bg-[#2A3550] text-[#F0E6D2]' : 'bg-[#0D1220] text-[#8B9BB4]'}`}
            >
              {fanOrgDisplayName(o)}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 mt-1.5 overflow-x-auto pb-1 scrollbar-hide md:overflow-visible">
          <button
            type="button"
            onClick={() => setRoleFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${roleFilter === 'all' ? 'bg-[#C9A84C] text-[#0A0E1A]' : 'bg-[#141B2D] text-[#8B9BB4]'}`}
          >
            Roles
          </button>
          {ROLES.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${roleFilter === r ? 'text-white' : 'bg-[#141B2D] text-[#8B9BB4]'}`}
              style={roleFilter === r ? { backgroundColor: ROLE_COLORS[r] } : undefined}
            >
              {ROLE_NAMES[r]}
              {selectedByRole[r] ? ' ✓' : ''}
            </button>
          ))}
        </div>

        {state.selectedRoster.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {ROLES.map(r => {
              const m = state.selectedRoster.find(x => x.role === r);
              if (!m) return null;
              return (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 rounded-full border border-[#2A3550] bg-[#141B2D] px-2 py-0.5 text-[10px] text-[#F0E6D2]"
                >
                  <span style={{ color: ROLE_COLORS[r] }}>{ROLE_NAMES[r]}</span>
                  {m.name}
                  <span className="text-[#8B9BB4]">· {m.orgName}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 px-4 py-3 max-w-6xl mx-auto w-full overflow-y-auto">
        <div className="grid grid-cols-1 gap-2 pb-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.map(m => {
            const active = state.selectedRoster.some(x => x.id === m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  if (active) dispatch({ type: 'DESELECT_ROSTER', memberId: m.id });
                  else dispatch({ type: 'SELECT_ROSTER', member: m });
                }}
                className={`relative w-full flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                  active ? 'border-[#C9A84C] bg-[#C9A84C]/10' : 'border-[#1E2740] bg-[#141B2D]'
                }`}
              >
                <div
                  className="w-11 h-11 rounded-full overflow-hidden border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: ROLE_COLORS[m.role], backgroundColor: '#0A0E1A' }}
                >
                  <img
                    src={m.image}
                    alt={m.name}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <User className="w-5 h-5 text-[#8B9BB4]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#F0E6D2] truncate">{m.name}</p>
                  <p className="text-[10px] font-bold uppercase" style={{ color: ROLE_COLORS[m.role] }}>
                    {ROLE_NAMES[m.role]}
                  </p>
                  <p className="text-[10px] text-[#8B9BB4] truncate">{m.orgName}</p>
                </div>
                {active && (
                  <span className="w-7 h-7 rounded-full bg-[#C9A84C] flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-[#0A0E1A]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 px-4 py-2.5 max-w-6xl mx-auto w-full border-t border-[#1E2740]">
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => dispatch({ type: 'CONFIRM_ROSTER' })}
          className="w-full md:max-w-sm md:ml-auto min-h-12 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
        >
          ELEGIR CAMPEONES
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
