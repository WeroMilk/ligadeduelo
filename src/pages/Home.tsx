import { useMemo, useState } from 'react';
import { useGame } from '@/hooks/useGameState';
import { FAN_ORGS, fanOrgDisplayName, type FanOrg } from '@/lib/game-data';
import { Sparkles, Check } from 'lucide-react';

const REGIONS = ['LEC', 'LCK', 'LPL', 'LCS', 'PCS/LJL'] as const;

export default function Home() {
  const { dispatch } = useGame();
  const [selected, setSelected] = useState<FanOrg | null>(null);
  const [region, setRegion] = useState<(typeof REGIONS)[number] | 'all'>('all');

  const filtered = useMemo(() => {
    if (region === 'all') return FAN_ORGS;
    return FAN_ORGS.filter(o => o.region === region || o.region.includes(region.split('/')[0]));
  }, [region]);

  const byRegion = useMemo(() => {
    const map: Record<string, FanOrg[]> = {};
    for (const o of FAN_ORGS) {
      const key = REGIONS.find(r => o.region === r || o.region.includes(r.split('/')[0])) || 'Otros';
      if (!map[key]) map[key] = [];
      map[key].push(o);
    }
    return map;
  }, []);

  const handleStart = () => {
    if (!selected) return;
    dispatch({
      type: 'SET_TEAM_NAME',
      name: fanOrgDisplayName(selected),
      orgId: selected.id,
    });
    dispatch({ type: 'SET_SCREEN', screen: 'rosterSelect' });
  };

  return (
    <div className="flex-1 min-h-0 w-full bg-[#0A0E1A] flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-6 pb-2 safe-top text-center max-w-6xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-[#C9A84C]" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
          Elige tu org
        </h1>
        <p className="text-sm text-[#8B9BB4] mt-1">
          Luego eliges 5 integrantes y 5 campeones.
        </p>
        <div className="flex flex-wrap justify-center gap-1.5 mt-3">
          <button
            type="button"
            onClick={() => setRegion('all')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${region === 'all' ? 'bg-[#C9A84C] text-[#0A0E1A]' : 'bg-[#141B2D] text-[#8B9BB4]'}`}
          >
            Todas
          </button>
          {REGIONS.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRegion(r)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${region === r ? 'bg-[#C9A84C] text-[#0A0E1A]' : 'bg-[#141B2D] text-[#8B9BB4]'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: lista con scroll. Desktop: columnas por región sin scroll */}
      <div className="flex-1 min-h-0 px-4 pb-2 max-w-6xl mx-auto w-full overflow-y-auto md:overflow-hidden">
        <div className="md:hidden grid grid-cols-1 gap-2">
          {filtered.map(org => {
            const active = selected?.id === org.id;
            return (
              <button
                key={org.id}
                type="button"
                onClick={() => setSelected(org)}
                className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all flex items-center gap-3 ${
                  active ? 'border-[#C9A84C] bg-[#C9A84C]/10' : 'border-[#1E2740] bg-[#141B2D]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#F0E6D2] truncate">{org.name}</p>
                  <p className="text-xs text-[#8B9BB4]">{org.era} · {org.region}</p>
                </div>
                {active && (
                  <span className="shrink-0 w-7 h-7 rounded-full bg-[#C9A84C] flex items-center justify-center">
                    <Check className="w-4 h-4 text-[#0A0E1A]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 h-full min-h-0">
          {(region === 'all' ? REGIONS : [region]).map(reg => {
            const orgs = region === 'all' ? (byRegion[reg] || []) : filtered;
            return (
              <div key={reg} className="flex flex-col min-h-0 rounded-xl border border-[#1E2740] bg-[#0D1220] overflow-hidden">
                <p className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] px-3 py-2 border-b border-[#1E2740]">
                  {reg}
                </p>
                <div className="flex-1 min-h-0 p-2 space-y-1.5 overflow-hidden flex flex-col">
                  {orgs.map(org => {
                    const active = selected?.id === org.id;
                    return (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => setSelected(org)}
                        className={`w-full text-left rounded-lg border px-2.5 py-2 transition-all flex-1 min-h-0 ${
                          active ? 'border-[#C9A84C] bg-[#C9A84C]/10' : 'border-[#1E2740] bg-[#141B2D] hover:border-[#2A3550]'
                        }`}
                      >
                        <p className="font-bold text-[#F0E6D2] text-sm truncate">{org.name}</p>
                        <p className="text-[10px] text-[#8B9BB4] truncate">{org.era}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 px-4 py-3 safe-bottom max-w-6xl mx-auto w-full border-t border-[#1E2740]">
        <button
          type="button"
          onClick={handleStart}
          disabled={!selected}
          className="w-full md:max-w-md md:mx-auto font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-3 disabled:opacity-40"
          style={{ backgroundColor: '#C9A84C', color: '#0A0E1A' }}
        >
          <Sparkles className="w-5 h-5" />
          ELEGIR INTEGRANTES
        </button>
      </div>
    </div>
  );
}
