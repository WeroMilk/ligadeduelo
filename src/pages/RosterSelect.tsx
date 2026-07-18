import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useGame } from '@/hooks/useGameState';
import CoopSetupBanner from '@/components/CoopSetupBanner';
import { FAN_ORGS, fanOrgDisplayName, ROLE_COLORS, ROLE_NAMES } from '@/lib/game-data';
import { buildAllRosters } from '@/lib/rosters';
import type { Role, RosterMember } from '@/types/game';
import { Check, ChevronLeft, ChevronRight, User } from 'lucide-react';
import NameSearch, { matchesNameQuery } from '@/components/NameSearch';

/** Fila con flechas que cambian la opción seleccionada (izq/der) y la centran en pantalla. */
function FilterNavRow({
  className = '',
  onStepLeft,
  onStepRight,
  children,
  activeKey,
}: {
  className?: string;
  onStepLeft: () => void;
  onStepRight: () => void;
  children: ReactNode;
  /** Cambia al navegar: centra el chip activo. */
  activeKey: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const active = scroller.querySelector<HTMLElement>('[data-filter-active="true"]');
    if (!active) return;
    const left =
      active.offsetLeft - (scroller.clientWidth - active.offsetWidth) / 2;
    scroller.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [activeKey]);

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        type="button"
        aria-label="Anterior"
        onClick={onStepLeft}
        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#C9A84C] text-[#0A0E1A] shadow-[0_1px_6px_rgba(201,168,76,0.35)] active:scale-95"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={3} />
      </button>
      <div
        ref={scrollerRef}
        className="flex flex-1 min-w-0 gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide touch-pan-x"
      >
        {children}
      </div>
      <button
        type="button"
        aria-label="Siguiente"
        onClick={onStepRight}
        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#C9A84C] text-[#0A0E1A] shadow-[0_1px_6px_rgba(201,168,76,0.35)] active:scale-95"
      >
        <ChevronRight className="h-4 w-4" strokeWidth={3} />
      </button>
    </div>
  );
}

function stepIndex<T>(list: readonly T[], current: T, dir: -1 | 1): T {
  if (list.length === 0) return current;
  const idx = list.indexOf(current);
  const from = idx < 0 ? 0 : idx;
  return list[(from + dir + list.length) % list.length]!;
}

const ROLES: Role[] = ['top', 'jungle', 'mid', 'adc', 'support'];
const REGIONS = ['LEC', 'LCK', 'LPL', 'LCS', 'PCS/LJL'] as const;
const ROLE_INDEX: Record<Role, number> = {
  top: 0,
  jungle: 1,
  mid: 2,
  adc: 3,
  support: 4,
};

function MemberCard({
  member,
  active,
  onToggle,
}: {
  member: RosterMember;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative w-full h-full min-h-[4.5rem] flex items-center gap-2.5 rounded-xl border-2 px-2.5 py-2 text-left transition-all ${
        active ? 'border-[#C9A84C] bg-[#C9A84C]/10' : 'border-[#1E2740] bg-[#141B2D]'
      }`}
    >
      <div
        className="w-10 h-10 rounded-full overflow-hidden border-2 flex items-center justify-center shrink-0"
        style={{ borderColor: ROLE_COLORS[member.role], backgroundColor: '#0A0E1A' }}
      >
        <img
          src={member.image}
          alt={member.name}
          className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <User className="w-5 h-5 text-[#8B9BB4]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[#F0E6D2] truncate text-sm">{member.name}</p>
        <p className="text-[10px] font-bold uppercase" style={{ color: ROLE_COLORS[member.role] }}>
          {ROLE_NAMES[member.role]}
        </p>
        <p className="text-[10px] text-[#8B9BB4] truncate">{member.orgName}</p>
      </div>
      {active && (
        <span className="w-6 h-6 rounded-full bg-[#C9A84C] flex items-center justify-center shrink-0">
          <Check className="w-3.5 h-3.5 text-[#0A0E1A]" />
        </span>
      )}
    </button>
  );
}

export default function RosterSelect() {
  const { state, dispatch } = useGame();
  const allMembers = useMemo(() => buildAllRosters(FAN_ORGS), []);
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [regionFilter, setRegionFilter] = useState<(typeof REGIONS)[number] | 'all'>('all');
  const [orgFilter, setOrgFilter] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
    if (searchQuery.trim()) pool = pool.filter(m => matchesNameQuery(m.name, searchQuery));
    return [...pool].sort((a, b) => {
      const roleDiff = ROLE_INDEX[a.role] - ROLE_INDEX[b.role];
      if (roleDiff !== 0) return roleDiff;
      return a.orgName.localeCompare(b.orgName) || a.name.localeCompare(b.name);
    });
  }, [allMembers, regionFilter, orgFilter, roleFilter, orgsInRegion, searchQuery]);

  /** Filas por equipo con columnas fijas por rol (evita desalineación con rosters incompletos). */
  const teamRows = useMemo(() => {
    if (roleFilter !== 'all') return null;

    const orgOrder =
      orgFilter !== 'all'
        ? orgsInRegion.filter(o => o.id === orgFilter)
        : orgsInRegion;

    return orgOrder
      .map(org => {
        const members = list.filter(m => m.orgId === org.id);
        if (members.length === 0) return null;
        const byRole = Object.fromEntries(ROLES.map(r => [r, [] as RosterMember[]])) as Record<
          Role,
          RosterMember[]
        >;
        for (const m of members) {
          if (matchesNameQuery(m.name, searchQuery)) byRole[m.role].push(m);
        }
        return {
          orgId: org.id,
          orgName: fanOrgDisplayName(org),
          byRole,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }, [roleFilter, orgFilter, orgsInRegion, list, searchQuery]);

  const regionOptions = useMemo(
    () => ['all' as const, ...REGIONS],
    [],
  );
  const orgOptions = useMemo(
    () => ['all' as const, ...orgsInRegion.map(o => o.id)],
    [orgsInRegion],
  );
  const roleOptions = useMemo(
    () => ['all' as const, ...ROLES] as const,
    [],
  );

  const stepRegion = (dir: -1 | 1) => {
    const next = stepIndex(regionOptions, regionFilter, dir);
    setRegionFilter(next);
    setOrgFilter('all');
  };

  const stepOrg = (dir: -1 | 1) => {
    setOrgFilter(stepIndex(orgOptions, orgFilter, dir));
  };

  const stepRole = (dir: -1 | 1) => {
    setRoleFilter(stepIndex(roleOptions, roleFilter, dir));
  };

  const canConfirm = state.selectedRoster.length === 5 && ROLES.every(r => selectedByRole[r]);

  const toggleMember = (member: RosterMember, active: boolean) => {
    if (active) dispatch({ type: 'DESELECT_ROSTER', memberId: member.id });
    else dispatch({ type: 'SELECT_ROSTER', member });
  };

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
      <CoopSetupBanner />
      <div className="relative shrink-0 border-b border-[#1E2740] px-4 pb-1.5 pt-0 select-screen-top safe-chrome-x max-w-6xl mx-auto w-full md:py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[#C9A84C] text-xs uppercase tracking-wider">Integrantes</p>
            <h1 className="text-base font-bold text-[#F0E6D2] md:text-lg" style={{ fontFamily: 'Cinzel, serif' }}>
              Dream team · {state.playerTeamName}
            </h1>
            <p className="text-[11px] text-[#8B9BB4] md:text-xs">
              Elige 1 por rol de cualquier equipo ({state.selectedRoster.length}/5)
            </p>
          </div>
          <NameSearch
            pinned
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar integrante..."
          />
        </div>

        <FilterNavRow
          className="mt-1.5 md:mt-2"
          activeKey={`region-${regionFilter}`}
          onStepLeft={() => stepRegion(-1)}
          onStepRight={() => stepRegion(1)}
        >
          <button
            type="button"
            data-filter-active={regionFilter === 'all' ? 'true' : undefined}
            onClick={() => { setRegionFilter('all'); setOrgFilter('all'); }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${regionFilter === 'all' ? 'bg-[#C9A84C] text-[#0A0E1A]' : 'bg-[#141B2D] text-[#8B9BB4]'}`}
          >
            Todas
          </button>
          {REGIONS.map(r => (
            <button
              key={r}
              type="button"
              data-filter-active={regionFilter === r ? 'true' : undefined}
              onClick={() => { setRegionFilter(r); setOrgFilter('all'); }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${regionFilter === r ? 'bg-[#C9A84C] text-[#0A0E1A]' : 'bg-[#141B2D] text-[#8B9BB4]'}`}
            >
              {r}
            </button>
          ))}
        </FilterNavRow>

        <FilterNavRow
          className="mt-1"
          activeKey={`org-${orgFilter}`}
          onStepLeft={() => stepOrg(-1)}
          onStepRight={() => stepOrg(1)}
        >
          <button
            type="button"
            data-filter-active={orgFilter === 'all' ? 'true' : undefined}
            onClick={() => setOrgFilter('all')}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 ${orgFilter === 'all' ? 'bg-[#2A3550] text-[#F0E6D2]' : 'bg-[#0D1220] text-[#8B9BB4]'}`}
          >
            Cualquier equipo
          </button>
          {orgsInRegion.map(o => (
            <button
              key={o.id}
              type="button"
              data-filter-active={orgFilter === o.id ? 'true' : undefined}
              onClick={() => setOrgFilter(o.id)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 max-w-[140px] truncate ${orgFilter === o.id ? 'bg-[#2A3550] text-[#F0E6D2]' : 'bg-[#0D1220] text-[#8B9BB4]'}`}
            >
              {fanOrgDisplayName(o)}
            </button>
          ))}
        </FilterNavRow>

        <FilterNavRow
          className="mt-1"
          activeKey={`role-${roleFilter}`}
          onStepLeft={() => stepRole(-1)}
          onStepRight={() => stepRole(1)}
        >
          <button
            type="button"
            data-filter-active={roleFilter === 'all' ? 'true' : undefined}
            onClick={() => setRoleFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${roleFilter === 'all' ? 'bg-[#C9A84C] text-[#0A0E1A]' : 'bg-[#141B2D] text-[#8B9BB4]'}`}
          >
            Roles
          </button>
          {ROLES.map(r => (
            <button
              key={r}
              type="button"
              data-filter-active={roleFilter === r ? 'true' : undefined}
              onClick={() => setRoleFilter(r)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${roleFilter === r ? 'text-white' : 'bg-[#141B2D] text-[#8B9BB4]'}`}
              style={roleFilter === r ? { backgroundColor: ROLE_COLORS[r] } : undefined}
            >
              {ROLE_NAMES[r]}
              {selectedByRole[r] ? ' ✓' : ''}
            </button>
          ))}
        </FilterNavRow>

        {state.selectedRoster.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5 md:mt-2">
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

      <div className="flex-1 min-h-0 px-4 py-1 max-w-6xl mx-auto w-full overflow-y-auto scrollbar-hide md:py-3">
        {roleFilter === 'all' && teamRows ? (
          teamRows.length === 0 && searchQuery.trim() ? (
            <p className="pt-10 text-center text-sm text-[#8B9BB4]">Ningún integrante coincide con la búsqueda.</p>
          ) : (
          <div className="space-y-2 pb-2">
            <div className="hidden md:grid grid-cols-5 gap-2 px-0.5">
              {ROLES.map(r => (
                <p
                  key={r}
                  className="text-[10px] font-bold uppercase tracking-wider text-center"
                  style={{ color: ROLE_COLORS[r] }}
                >
                  {ROLE_NAMES[r]}
                </p>
              ))}
            </div>
            {teamRows.map(row => (
              <div
                key={row.orgId}
                className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-5"
              >
                {ROLES.map(role => {
                  const members = row.byRole[role];
                  if (members.length === 0) {
                    return (
                      <div
                        key={`${row.orgId}-${role}`}
                        className="hidden md:block min-h-[4.5rem] rounded-xl border border-dashed border-[#1E2740]/80"
                        aria-hidden
                      />
                    );
                  }
                  return (
                    <div key={`${row.orgId}-${role}`} className="flex flex-col gap-2">
                      {members.map(m => {
                        const active = state.selectedRoster.some(x => x.id === m.id);
                        return (
                          <MemberCard
                            key={m.id}
                            member={m}
                            active={active}
                            onToggle={() => toggleMember(m, active)}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          )
        ) : list.length === 0 ? (
          <p className="pt-10 text-center text-sm text-[#8B9BB4]">Ningún integrante coincide con la búsqueda.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 pb-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {list.map(m => {
              const active = state.selectedRoster.some(x => x.id === m.id);
              return (
                <MemberCard
                  key={m.id}
                  member={m}
                  active={active}
                  onToggle={() => toggleMember(m, active)}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 py-1.5 max-w-6xl mx-auto w-full border-t border-[#1E2740] md:py-2.5">
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => dispatch({ type: 'CONFIRM_ROSTER' })}
          className="w-full md:max-w-sm md:ml-auto min-h-11 md:min-h-12 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
        >
          ELEGIR CAMPEONES
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
