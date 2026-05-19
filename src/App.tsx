import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  RefreshCw, 
  Trophy, 
  Clock,
  ExternalLink,
  Search,
  Activity,
  History,
  X,
  Users,
  Grid3X3,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TeamInfo {
  id: string | number;
  name: string;
  city: string;
  abbreviation: string;
  score: number;
  wins?: number;
  losses?: number;
}

interface Game {
  id: string;
  status: string;
  period?: number;
  time?: string;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
}

interface StandingsEntry {
  teamId: number;
  teamName: string;
  teamCity: string;
  abbreviation: string;
  conference: string;
  wins: number;
  losses: number;
  winPct: number;
  rank: number;
  last10: string;
  streak: string;
}

type ViewType = 'SCORES' | 'STANDINGS' | 'PLAYOFFS' | 'TEAMS';

const TEAM_COLORS: Record<string, string> = {
  ATL: '#E03A3E', BOS: '#007A33', BKN: '#000000', CHA: '#1D1160', CHI: '#CE1141',
  CLE: '#860038', DAL: '#00538C', DEN: '#0D2240', DET: '#C8102E', GSW: '#1D428A',
  HOU: '#CE1141', IND: '#FDBB30', LAC: '#C8102E', LAL: '#552583', MEM: '#5D76A9',
  MIA: '#98002E', MIL: '#00471B', MIN: '#0C2340', NOP: '#0C2340', NYK: '#006BB6',
  OKC: '#007AC1', ORL: '#0077C0', PHI: '#006BB6', PHX: '#1D1160', POR: '#E03A3E',
  SAC: '#5A2D81', SAS: '#C4CED4', TOR: '#CE1141', UTA: '#002B5C', WAS: '#002B5C'
};

const getTeamLogo = (abbreviation: string) => {
  return `https://cdn.nba.com/logos/nba/${abbreviation}/global/L/logo.svg`;
};

interface ScoreCardProps {
  game: Game;
  onClick?: (gameId: string) => void;
}

const ScoreCard = React.forwardRef<HTMLDivElement, ScoreCardProps>(({ game, onClick }, ref) => {
  const isFinal = game.status.toLowerCase().includes('final');
  const isLive = !isFinal && (game.status.toLowerCase().includes('q') || game.status.toLowerCase().includes('halftime') || game.status.toLowerCase().includes('live'));

  return (
    <motion.div 
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      onClick={() => onClick?.(game.id)}
      className="relative bg-gradient-to-b from-white/10 to-transparent border border-white/10 rounded-3xl p-6 group overflow-hidden h-full flex flex-col justify-between cursor-pointer active:scale-95 transition-transform"
    >
      {isLive && (
        <div className="absolute top-4 right-4">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-red-600/20 border border-red-500/50 text-red-500 rounded-full text-[9px] font-bold uppercase tracking-[0.2em]">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            Live
          </div>
        </div>
      )}

      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
            {game.status}
          </span>
          {!isLive && !isFinal && (
             <span className="text-[10px] font-bold text-white/20">
               
             </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          {/* Away Team */}
          <div className="flex-1 flex flex-col items-center gap-3">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-2xl relative group-hover:scale-105 transition-transform">
               <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <img 
                src={`https://cdn.nba.com/logos/nba/${game.awayTeam.id}/global/L/logo.svg`} 
                alt={game.awayTeam.name} 
                className="w-12 h-12 object-contain relative z-10"
                onError={(e) => { e.currentTarget.src = `https://via.placeholder.com/64?text=${game.awayTeam.abbreviation}`; e.currentTarget.style.filter = 'grayscale(1)'; }}
              />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-xs tracking-tight uppercase whitespace-nowrap">{game.awayTeam.city}</h3>
              <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">{game.awayTeam.name}</p>
            </div>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-0">
            <div className="flex items-center gap-2 text-italic-black">
              <span className={`text-4xl ${isFinal && game.awayTeam.score > game.homeTeam.score ? 'text-white' : 'text-white/60'}`}>
                {game.awayTeam.score}
              </span>
              <span className="text-white/10 text-2xl">:</span>
              <span className={`text-4xl ${isFinal && game.homeTeam.score > game.awayTeam.score ? 'text-white' : 'text-white/60'}`}>
                {game.homeTeam.score}
              </span>
            </div>
            <div className="mt-4 flex gap-1.5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`w-1.5 h-1 rounded-full ${isLive && (game.period || 0) > i ? 'bg-red-500' : 'bg-white/10'}`} />
              ))}
            </div>
          </div>

          {/* Home Team */}
          <div className="flex-1 flex flex-col items-center gap-3">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-2xl relative group-hover:scale-105 transition-transform">
               <div className="absolute inset-0 bg-red-500/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <img 
                src={`https://cdn.nba.com/logos/nba/${game.homeTeam.id}/global/L/logo.svg`} 
                alt={game.homeTeam.name} 
                className="w-12 h-12 object-contain relative z-10"
                onError={(e) => { e.currentTarget.src = `https://via.placeholder.com/64?text=${game.homeTeam.abbreviation}`; e.currentTarget.style.filter = 'grayscale(1)'; }}
              />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-xs tracking-tight uppercase whitespace-nowrap">{game.homeTeam.city}</h3>
              <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">{game.homeTeam.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-white/5 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Broadcasting</span>
          <span className="text-[10px] font-medium text-white/50">League Pass • TNT</span>
        </div>
        <button className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
          Stats
        </button>
      </div>
    </motion.div>
  );
});

const StandingsView = () => {
  const [standings, setStandings] = useState<StandingsEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/standings')
      .then(res => res.json())
      .then(data => {
        setStandings(data.standings);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  if (loading) return <div className="py-20 text-center animate-pulse text-white/20 uppercase font-black tracking-widest">Loading standings...</div>;

  const conferences = ['East', 'West'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {conferences.map(conf => (
        <div key={conf} className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden">
          <div className="px-8 py-6 border-b border-white/10 bg-white/5">
            <h3 className="font-black italic tracking-tighter uppercase text-2xl"> {conf === 'East' ? 'East Conference' : 'West Conference'}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase font-black tracking-[0.3em] text-white/30 border-b border-white/5">
                  <th className="px-8 py-5">#</th>
                  <th className="px-4 py-5">Team</th>
                  <th className="px-4 py-5 text-center">W-L</th>
                  <th className="px-4 py-5 text-center">%</th>
                  <th className="px-8 py-5 text-right">L10</th>
                </tr>
              </thead>
              <tbody className="text-sm font-bold">
                {standings.filter(s => s.conference === conf).sort((a, b) => a.rank - b.rank).map(team => (
                  <tr key={team.teamId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-8 py-4 text-white/40">{team.rank}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={`https://cdn.nba.com/logos/nba/${team.teamId}/global/L/logo.svg`} 
                          className="w-8 h-8 object-contain" 
                          alt="" 
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <div className="flex flex-col">
                          <span className="uppercase tracking-tight whitespace-nowrap">{team.teamCity}</span>
                          <span className="text-[9px] text-white/30 uppercase tracking-widest">{team.teamName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center font-mono">{team.wins}-{team.losses}</td>
                    <td className="px-4 py-4 text-center text-white/60 font-mono">{Math.round(team.winPct * 100)}%</td>
                    <td className="px-8 py-4 text-right text-[10px] text-white/40 font-mono tracking-tighter uppercase">{team.last10}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

const GameStatsModal = ({ gameId, onClose }: { gameId: string, onClose: () => void }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/game/${gameId}`)
      .then(res => res.json())
      .then(data => {
        setStats(data.game);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [gameId]);

  if (!gameId) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 40 }}
        className="relative z-10 w-full max-w-5xl bg-[#08080a] border border-white/10 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-10 py-8 border-b border-white/10">
          <div className="flex items-center gap-6">
            <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Box Score <span className="text-white/20">Analysis</span></h2>
            {loading && <RefreshCw className="w-5 h-5 animate-spin text-red-600" />}
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/5 border border-white/5 rounded-full transition-all active:scale-90">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {loading ? (
            <div className="space-y-10">
              <div className="h-40 bg-white/5 rounded-[2rem] animate-pulse" />
              <div className="h-96 bg-white/5 rounded-[2rem] animate-pulse" />
            </div>
          ) : stats ? (
            <div className="space-y-16">
               {/* Team Summary */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {[stats.awayTeam, stats.homeTeam].map((team, idx) => (
                    <div key={team.teamId} className="space-y-8 bg-white/2 pb-8 rounded-[2.5rem]">
                       <div className="flex items-center gap-6 px-4">
                         <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-2xl">
                           <img src={`https://cdn.nba.com/logos/nba/${team.teamId}/global/L/logo.svg`} className="w-16 h-16" alt="" />
                         </div>
                         <div>
                           <p className="text-[10px] font-black uppercase text-red-500 tracking-[0.5em] mb-1">{idx === 0 ? 'Visitor' : 'Home'}</p>
                           <h3 className="text-4xl font-black italic tracking-tighter uppercase leading-tight">{team.teamCity}</h3>
                           <p className="text-sm font-bold text-white/30 uppercase tracking-widest">{team.teamName}</p>
                         </div>
                         <div className="ml-auto text-7xl font-black italic text-white leading-none">{team.score}</div>
                       </div>
                    </div>
                  ))}
               </div>

               {/* Stats Comparison */}
               <div className="bg-white/5 border border-white/10 rounded-[3rem] p-12 space-y-12">
                  <div className="flex items-center gap-4 text-center">
                    <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent to-white/10"></div>
                    <h3 className="text-[10px] font-black tracking-[1em] text-white/40 uppercase">Statistical Delta</h3>
                    <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent to-white/10"></div>
                  </div>

                  <div className="grid grid-cols-1 gap-12">
                    {[
                      { label: 'Field Goals', key: 'statistics.fieldGoalsPercentage', val1: Math.round((stats.awayTeam.statistics?.fieldGoalsPercentage || 0) * 100), val2: Math.round((stats.homeTeam.statistics?.fieldGoalsPercentage || 0) * 100), suffix: '%' },
                      { label: '3-Pointers', key: 'statistics.threePointersPercentage', val1: Math.round((stats.awayTeam.statistics?.threePointersPercentage || 0) * 100), val2: Math.round((stats.homeTeam.statistics?.threePointersPercentage || 0) * 100), suffix: '%' },
                      { label: 'Rebounds', key: 'statistics.reboundsTotal', val1: stats.awayTeam.statistics?.reboundsTotal, val2: stats.homeTeam.statistics?.reboundsTotal },
                      { label: 'Assists', key: 'statistics.assists', val1: stats.awayTeam.statistics?.assists, val2: stats.homeTeam.statistics?.assists },
                      { label: 'Steals', key: 'statistics.steals', val1: stats.awayTeam.statistics?.steals, val2: stats.homeTeam.statistics?.steals },
                      { label: 'Blocks', key: 'statistics.blocks', val1: stats.awayTeam.statistics?.blocks, val2: stats.homeTeam.statistics?.blocks }
                    ].map(stat => (
                      <div key={stat.key} className="space-y-4">
                        <div className="flex justify-between items-end mb-1 px-2">
                          <span className="text-2xl font-black italic">{stat.val1 || 0}{stat.suffix || ''}</span>
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">{stat.label}</span>
                          <span className="text-2xl font-black italic">{stat.val2 || 0}{stat.suffix || ''}</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden flex gap-1">
                          <div 
                            className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
                            style={{ width: `${(stat.val1 && stat.val2) ? (stat.val1 / (stat.val1 + stat.val2)) * 100 : 50}%` }}
                          />
                          <div 
                            className="h-full bg-red-600 rounded-full transition-all duration-1000 ml-auto" 
                            style={{ width: `${(stat.val1 && stat.val2) ? (stat.val2 / (stat.val1 + stat.val2)) * 100 : 50}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
               
               <div className="text-center">
                 <p className="text-white/20 text-[9px] font-black uppercase tracking-[0.4em] mb-6">Live Stream Synced</p>
                 <div className="inline-flex items-center gap-3 px-8 py-3 bg-white/5 border border-white/10 rounded-full text-[10px] font-black tracking-widest uppercase text-white/60">
                   <Users className="w-3.5 h-3.5" />
                   Rosters & Advanced Shot Charts coming soon
                 </div>
               </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center opacity-40">
              <Clock className="w-12 h-12 mb-6" />
              <h3 className="font-black uppercase tracking-tighter text-xl">Data Stream Dormant</h3>
              <p className="text-xs max-w-xs mt-2 font-bold uppercase tracking-widest text-white/50 leading-loose">Detailed stats are typically generated as the game progresses and finalized shortly after.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const TeamRosterModal = ({ teamId, onClose }: { teamId: number, onClose: () => void }) => {
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [teamDetails, setTeamDetails] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/team/${teamId}/roster`)
      .then(res => res.json())
      .then(data => {
        const rosterRS = data.resultSets.find((rs: any) => rs.name === 'CommonTeamRoster');
        const infoRS = data.resultSets.find((rs: any) => rs.name === 'TeamInfoCommon');

        if (rosterRS) {
          const headers = rosterRS.headers;
          const players = rosterRS.rowSet.map((row: any) => {
            const h = (key: string) => row[headers.indexOf(key)];
            return {
              id: h('PLAYER_ID'),
              // NUM e NUM_NR são os campos possíveis dependendo da versão da API
              num: h('NUM') ?? h('NUM_NR') ?? h('NUMBER') ?? '',
              name: h('PLAYER'),
              pos: h('POSITION'),
              height: h('HEIGHT'),
              weight: h('WEIGHT'),
              exp: h('EXP'),
              school: h('SCHOOL'),
            };
          });
          setRoster(players);
        }

        if (infoRS) {
          const headers = infoRS.headers;
          const info = infoRS.rowSet[0];
          const h = (key: string) => info[headers.indexOf(key)];
          setTeamInfo({
            city: h('TEAM_CITY'),
            name: h('TEAM_NAME'),
            id: h('TEAM_ID'),
            conference: h('TEAM_CONFERENCE'),
            division: h('TEAM_DIVISION'),
          });
        }

        if (data.teamDetails) {
          setTeamDetails(data.teamDetails);
        }

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [teamId]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-3xl"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 50 }}
        className="relative z-10 w-full max-w-6xl bg-[#08080a] border border-white/10 rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-10 py-8 border-b border-white/10 bg-white/2">
          <div className="flex items-center gap-8">
            <img
              src={`https://cdn.nba.com/logos/nba/${teamId}/global/L/logo.svg`}
              className="w-20 h-20 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              alt=""
            />
            <div>
              {loading ? (
                <div className="h-10 w-48 bg-white/5 animate-pulse rounded-lg" />
              ) : (
                <>
                  <p className="text-[10px] font-black uppercase text-red-600 tracking-[0.6em] mb-1">
                    {teamInfo?.conference} · {teamInfo?.division}
                  </p>
                  <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
                    {teamInfo?.city} <span className="text-white/20">{teamInfo?.name}</span>
                  </h2>
                  {teamDetails && (
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                      Est. {teamDetails.yearFounded} · {teamDetails.arena}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-4 hover:bg-white/10 border border-white/5 rounded-full transition-all active:scale-90 bg-white/5">
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(12)].map((_, i) => <div key={i} className="h-32 bg-white/5 rounded-3xl animate-pulse" />)}
            </div>
          ) : (
            <>
              {/* Info Cards */}
              {teamDetails && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Arena', value: teamDetails.arena },
                    { label: 'Capacity', value: teamDetails.arenaCapacity ? Number(teamDetails.arenaCapacity).toLocaleString('pt-BR') : '—' },
                    { label: 'Head Coach', value: teamDetails.headCoach || '—' },
                    { label: 'NBA Titles', value: teamDetails.championships > 0 ? `🏆 ${teamDetails.championships}x` : '—' },
                  ].map(item => (
                    <div key={item.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">{item.label}</span>
                      <span className="text-sm font-black uppercase tracking-tight text-white leading-tight">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Retired Numbers */}
              {teamDetails?.retiredNumbers?.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Retired Numbers</span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {teamDetails.retiredNumbers.map((r: any, i: number) => (
                      <div key={i} className="flex flex-col items-center gap-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 min-w-[80px]">
                        <span className="text-2xl font-black italic text-white">#{r.jersey}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wide text-white/40 text-center leading-tight">{r.player}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Roster */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">2025-26 Roster</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roster.map(player => (
                    <div key={player.id} className="group bg-white/5 border border-white/10 rounded-[2rem] p-5 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-5">
                      <div className="relative flex-shrink-0">
                        <div className="w-16 h-16 bg-black/40 rounded-full border border-white/10 overflow-hidden group-hover:scale-105 transition-transform">
                          <img
                            src={`https://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/latest/260x190/${player.id}.png`}
                            onError={(e) => { e.currentTarget.src = 'https://cdn.nba.com/manage/2021/08/default-headshot.png'; }}
                            className="w-full h-full object-cover translate-y-1 scale-110"
                            alt={player.name}
                          />
                        </div>
                        {/* FIX: exibe o número real do jogador */}
                        <div className="absolute -top-1 -right-1 w-7 h-7 bg-red-600 rounded-full border-2 border-[#08080a] flex items-center justify-center font-black text-[9px] italic">
                          {player.num !== '' && player.num != null ? player.num : '—'}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black uppercase tracking-tight text-white mb-1 leading-tight text-sm truncate">{player.name}</h4>
                        <div className="flex gap-1.5 flex-wrap">
                          {player.pos && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/30 px-2 py-0.5 bg-white/5 rounded-md border border-white/5">
                              {player.pos}
                            </span>
                          )}
                          {player.height && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/30 px-2 py-0.5 bg-white/5 rounded-md border border-white/5">
                              {player.height}
                            </span>
                          )}
                          {player.exp && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/30 px-2 py-0.5 bg-white/5 rounded-md border border-white/5">
                              {player.exp === 'R' ? 'Rookiei' : `${player.exp}a`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const TeamsView = () => {
  const [standings, setStandings] = useState<StandingsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/standings')
      .then(res => res.json())
      .then(data => {
        setStandings(data.standings);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="py-20 text-center animate-pulse text-white/20 uppercase font-black tracking-widest">Synchronizing Franchises...</div>;

  const conferences = ['East', 'West'];

  return (
    <div className="space-y-16">
      <div className="text-center space-y-4">
        <h3 className="text-6xl font-black italic tracking-tighter uppercase leading-none">NBA <span className="text-white/20">Franchises</span></h3>
        <p className="text-white/40 text-[10px] font-black tracking-[0.5em] uppercase">2025-26 Season Live Database</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {conferences.map(conf => (
          <div key={conf} className="space-y-8">
            <div className="flex items-center gap-4 px-6">
              <div className={`w-3 h-3 rounded-full ${conf === 'East' ? 'bg-red-600' : 'bg-blue-600'}`} />
              <h4 className="text-[12px] font-black tracking-[0.4em] uppercase text-white/40"> {conf === 'East' ? 'East Conference' : 'West Conference'}</h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {standings
                .filter(s => s.conference === conf)
                .sort((a, b) => a.teamCity.localeCompare(b.teamCity))
                .map(team => (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={team.teamId}
                    onClick={() => setSelectedTeamId(team.teamId)}
                    className="flex items-center gap-5 p-6 bg-white/5 border border-white/10 rounded-[2.5rem] hover:bg-white/10 hover:border-white/20 transition-all text-left"
                  >
                    <div className="w-16 h-16 bg-white/5 rounded-full p-3 flex items-center justify-center border border-white/10 shadow-xl group-hover:scale-110 transition-transform">
                      <img 
                        src={`https://cdn.nba.com/logos/nba/${team.teamId}/global/L/logo.svg`} 
                        className="w-full h-full object-contain" 
                        alt="" 
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black uppercase tracking-tight text-white">{team.teamCity}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{team.teamName}</span>
                    </div>
                  </motion.button>
                ))}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedTeamId && (
          <TeamRosterModal 
            teamId={selectedTeamId} 
            onClose={() => setSelectedTeamId(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const getLocalDateStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const PlayoffsView = () => {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    fetch('/api/playoffs')
      .then(res => res.json())
      .then(d  => { setData(d);    setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="py-20 text-center animate-pulse text-white/20 uppercase font-black tracking-widest">
      Loading Playoffs...
    </div>
  );
  if (error || !data?.series?.length) return (
    <div className="flex flex-col items-center justify-center py-32 text-center opacity-40">
      <Trophy className="w-12 h-12 mb-6" />
      <h3 className="font-black uppercase tracking-tighter text-xl">Dados indisponíveis</h3>
    </div>
  );

  const { series } = data;

  // Usa roundNum do Game ID — 100% confiável
  const by = (conf: string, round: number) =>
    series
      .filter((s: any) => s.conference === conf && s.roundNum === round)
      .sort((a: any, b: any) => (a.seriesNum ?? '').localeCompare(b.seriesNum ?? ''));

  const westR1    = by('West', 1);
  const eastR1    = by('East', 1);
  const westSemis = by('West', 2);
  const eastSemis = by('East', 2);
  const westCF    = by('West', 3);
  const eastCF    = by('East', 3);
  const finals    = series.find((s: any) => s.roundNum === 4) ?? null;

  const TeamRow = ({ team, wins, isWinner, isLoser, seed }: {
    team: any; wins: number; isWinner: boolean; isLoser: boolean; seed?: number;
  }) => (
    <div className={`flex items-center gap-2 py-2 px-3 ${isLoser ? 'opacity-30' : ''}`}>
      <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
        {team
          ? <img src={`https://cdn.nba.com/logos/nba/${team.teamId}/global/L/logo.svg`} className="w-full h-full object-contain" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          : <div className="w-5 h-5 rounded-full bg-white/10" />}
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-1">
        {seed != null && <span className="text-[9px] text-white/30 font-black flex-shrink-0">{seed}</span>}
        <span className="text-[11px] font-black uppercase tracking-tight text-white truncate">
          {team ? team.teamName.split(' ').pop() : 'TBD'}
        </span>
      </div>
      <span className={`text-lg font-black italic tabular-nums w-4 text-right ${isWinner ? 'text-white' : 'text-white/40'}`}>
        {wins}
      </span>
    </div>
  );

  const SeriesBox = ({ s }: { s: any | null }) => {
    if (!s) return (
      <div className="bg-white/3 border border-white/5 rounded-xl overflow-hidden">
        {[0, 1].map(i => (
          <div key={i}>
            {i === 1 && <div className="h-px bg-white/5" />}
            <div className="flex items-center gap-2 py-2 px-3 opacity-20">
              <div className="w-7 h-7 rounded-full bg-white/10 flex-shrink-0" />
              <span className="flex-1 text-[11px] font-black uppercase text-white">TBD</span>
              <span className="text-lg font-black italic text-white/40 w-4 text-right">—</span>
            </div>
          </div>
        ))}
      </div>
    );
    const topWon    = s.topWins    === 4;
    const bottomWon = s.bottomWins === 4;
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors">
        <TeamRow team={s.topTeam}    wins={s.topWins}    isWinner={topWon}    isLoser={bottomWon} seed={s.topSeed}    />
        <div className="h-px bg-white/10" />
        <TeamRow team={s.bottomTeam} wins={s.bottomWins} isWinner={bottomWon} isLoser={topWon}    seed={s.bottomSeed} />
      </div>
    );
  };

  const ColHeader = ({ label, sub }: { label: string; sub: string }) => (
    <div className="text-center mb-3">
      <div className="text-[8px] font-black tracking-[0.3em] uppercase text-white/20">{sub}</div>
      <div className="text-[10px] font-black tracking-[0.15em] uppercase text-white/60">{label}</div>
    </div>
  );

  const COL    = 'flex flex-col gap-3 w-[155px] flex-shrink-0';
  const COL_SM = 'flex flex-col gap-3 w-[140px] flex-shrink-0';

  return (
    <div className="space-y-10">
      <div className="text-center space-y-3">
        <h3 className="text-6xl font-black italic tracking-tighter uppercase leading-none">
          NBA <span className="text-white/20">Playoffs</span>
        </h3>
        <p className="text-white/40 text-[10px] font-black tracking-[0.5em] uppercase">
          Season 2025-26 · Live Bracket
        </p>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex items-start justify-center gap-3 min-w-[960px] px-4">

          <div className={COL}>
            <ColHeader label="First Round" sub="West" />
            <div className="flex flex-col gap-4">
              <SeriesBox s={westR1[0] ?? null} />
              <SeriesBox s={westR1[1] ?? null} />
              <SeriesBox s={westR1[2] ?? null} />
              <SeriesBox s={westR1[3] ?? null} />
            </div>
          </div>

          <div className={COL_SM}>
            <ColHeader label="Semifinals" sub="West" />
            <div className="flex flex-col gap-4 mt-[46px]">
              <SeriesBox s={westSemis[0] ?? null} />
              <SeriesBox s={westSemis[1] ?? null} />
            </div>
          </div>

          <div className={COL_SM}>
            <ColHeader label="Conf. Finals" sub="West" />
            <div className="flex flex-col gap-4 mt-[92px]">
              <SeriesBox s={westCF[0] ?? null} />
            </div>
          </div>

          <div className="flex flex-col items-center w-[170px] flex-shrink-0">
            <ColHeader label="NBA Finals" sub="🏆" />
            <div className="mt-[140px] w-full space-y-3">
              <div className="flex justify-center">
                <img src="https://cdn.nba.com/logos/leagues/logo-nba.svg" className="w-14 h-14 object-contain opacity-50" alt="NBA" />
              </div>
              <SeriesBox s={finals} />
            </div>
          </div>

          <div className={COL_SM}>
            <ColHeader label="Conf. Finals" sub="East" />
            <div className="flex flex-col gap-4 mt-[92px]">
              <SeriesBox s={eastCF[0] ?? null} />
            </div>
          </div>

          <div className={COL_SM}>
            <ColHeader label="Semifinals" sub="East" />
            <div className="flex flex-col gap-4 mt-[46px]">
              <SeriesBox s={eastSemis[0] ?? null} />
              <SeriesBox s={eastSemis[1] ?? null} />
            </div>
          </div>

          <div className={COL}>
            <ColHeader label="First Round" sub="East" />
            <div className="flex flex-col gap-4">
              <SeriesBox s={eastR1[0] ?? null} />
              <SeriesBox s={eastR1[1] ?? null} />
              <SeriesBox s={eastR1[2] ?? null} />
              <SeriesBox s={eastR1[3] ?? null} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};


export default function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(getLocalDateStr());
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [view, setView] = useState<ViewType>('SCORES');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  // Initialize with Brazilian timezone offset for NBA games if needed, but here we just use local/system time.
  const isToday = date === getLocalDateStr();

  const fetchGames = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setLoading(true);
    
    setError(null);
    try {
      const endpoint = isToday ? `/api/scores/today?date=${date}` : `/api/scores/date/${date}`;
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.games) {
        setGames(data.games);
      } else {
        setGames([]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Ocorreu um erro ao buscar os dados da NBA.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [date, isToday]);

  useEffect(() => {
    fetchGames();
    
    // Auto-refresh every 30s if viewing today's games
    let interval: NodeJS.Timeout;
    if (isToday) {
      interval = setInterval(() => fetchGames(true), 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchGames, isToday]);

  const changeDate = (days: number) => {
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    d.setUTCDate(d.getUTCDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  const formatDateLabel = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day); // sem UTC — interpreta no fuso local
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <div className="min-h-screen relative selection:bg-red-500 selection:text-white">
      {/* Immersive Background */}
      <div className="atmosphere-bg" />

      {/* Header */}
      <header className="relative z-50 flex items-center justify-between px-8 py-6 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center">
            <img 
              src="https://cdn.nba.com/logos/leagues/logo-nba.svg" 
              className="w-full h-full object-contain" 
              alt="NBA" 
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tighter uppercase leading-none">Live <span className="text-white/50">Center</span></h1>
            <span className="text-[8px] font-black tracking-[0.4em] text-white/30 uppercase mt-1">Live Data Stream</span>
          </div>
        </div>

        <nav className="hidden lg:flex gap-8 items-center text-[11px] font-black tracking-[0.2em] text-white/40">
          <button 
            onClick={() => {
              setView('SCORES');
              setDate(new Date().toISOString().split('T')[0]);
            }}
            className={`transition-colors hover:text-white ${view === 'SCORES' ? 'text-white border-b-2 border-red-500 pb-1' : ''}`}
          >
            SCORES
          </button>
          <button 
            onClick={() => setView('STANDINGS')}
            className={`transition-colors hover:text-white ${view === 'STANDINGS' ? 'text-white border-b-2 border-red-500 pb-1' : ''}`}
          >
            STANDINGS
          </button>
          <button 
            onClick={() => setView('PLAYOFFS')}
            className={`transition-colors hover:text-white ${view === 'PLAYOFFS' ? 'text-white border-b-2 border-red-500 pb-1' : ''}`}
          >
            PLAYOFFS
          </button>
          <button 
          
            onClick={() => setView('TEAMS')}
            className={`transition-colors hover:text-white ${view === 'TEAMS' ? 'text-white border-b-2 border-red-500 pb-1' : ''}`}
          >
            TEAMS
          </button>
        </nav>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
            <button onClick={() => changeDate(-1)} className="text-white/40 hover:text-white transition-colors" title="Dia Anterior">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-2 min-w-[100px] justify-center">
              <span className="text-[10px] font-black tracking-widest text-white whitespace-nowrap">
                {isToday ? 'TODAY' : date.replace(/-/g, '.')}
              </span>
            </div>
            <button onClick={() => changeDate(1)} className="text-white/40 hover:text-white transition-colors" title="Próximo Dia">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={() => fetchGames(true)}
            className={`p-2 bg-white/5 rounded-full hover:bg-white/10 transition-all ${isRefreshing ? 'animate-spin opacity-50' : ''}`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-white/60" />
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-[1400px] mx-auto px-8 my-8 pb-32">
        <div className="flex flex-col gap-10">
          {view === 'SCORES' && (
            <>
              {/* Hero Section / Label */}
              <div className="flex flex-col md:flex-row items-end justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-px flex-1 bg-gradient-to-r from-red-600 to-transparent"></div>
                    <span className="text-[10px] font-black tracking-[0.5em] text-red-500 uppercase">Arena Live</span>
                  </div>
                  <h2 className="text-6xl font-black italic tracking-tighter text-white uppercase leading-[0.8] drop-shadow-2xl">
                    {isToday ? 'Scheduled Games' : date > getLocalDateStr() ? 'Scheduled Games' : 'Historical Data'}
                  </h2>
                  <p className="text-white/40 text-sm font-medium mt-4 tracking-wide max-w-xl">
                    Real-time score updates and detailed statistics from across the league. Currently viewing matches for <span className="text-white">{formatDateLabel(date)}</span>.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-5 py-2 bg-red-600/10 border border-red-500/30 rounded-full flex items-center gap-2.5">
                    <div className={`w-2 h-2 bg-red-500 rounded-full ${isToday ? 'animate-pulse' : 'opacity-20'}`}></div>
                      <span className="text-[10px] font-black tracking-widest text-white uppercase">
                        {isToday
                          ? `${games.filter(g => !g.status.toLowerCase().includes('final')).length} Matches Live`
                          : date > getLocalDateStr()
                          ? 'Upcoming Games'
                          : 'No Live Events'}
                      </span>
                  </div>
                </div>
              </div>

              {/* Content Grid */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-[280px] bg-white/5 rounded-[2.5rem] animate-pulse border border-white/5" />
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-24 text-center bg-white/5 rounded-[2.5rem] border border-white/10">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <RefreshCw className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-white font-black text-xl uppercase tracking-tighter mb-2">{error}</h3>
                  <p className="text-white/40 text-sm mb-8">The request could not be completed at this time.</p>
                  <button 
                    onClick={() => fetchGames()}
                    className="px-10 py-3 bg-white text-black font-black text-xs uppercase tracking-[0.2em] rounded-full transition-all hover:bg-white/80"
                  >
                    Reconnect Stream
                  </button>
                </div>
              ) : games.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                  <Clock className="w-12 h-12 text-white/10 mb-6" />
                  <h3 className="text-white/40 font-black text-xl uppercase tracking-tighter">Dark Night</h3>
                  <p className="text-white/20 text-[11px] font-bold uppercase tracking-widest max-w-sm mt-3">
                    No games scheduled for the selected temporal coordinates.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout">
                    {games.map((game) => (
                      <ScoreCard key={game.id} game={game} onClick={setSelectedGameId} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}

          {view === 'STANDINGS' && <StandingsView />}
          {view === 'PLAYOFFS' && <PlayoffsView />}
          {view === 'TEAMS' && <TeamsView />}
        </div>
      </main>

      <AnimatePresence>
        {selectedGameId && (
          <GameStatsModal 
            gameId={selectedGameId} 
            onClose={() => setSelectedGameId(null)} 
          />
        )}
      </AnimatePresence>

      <footer className="mt-20 border-t border-white/5 py-10 px-8">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6 opacity-20 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-8">
             <div className="flex items-center gap-2">
               <Trophy className="w-4 h-4 text-red-600" />
               <span className="text-[10px] font-black uppercase tracking-[0.3em]">Real-Time Stats Engine</span>
             </div>
          </div>
          <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest text-center md:text-right">
            NBA Live Tracker • Powered by real-time feeds
          </p>
        </div>
      </footer>

      {/* Floating Refresh info (Mobile) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 md:hidden">
        <button 
          onClick={() => fetchGames(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-full font-bold shadow-[0_10px_30px_rgba(79,70,229,0.3)]"
        >
          {isRefreshing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Atualizar Placar
        </button>
      </div>
    </div>
  );
}
