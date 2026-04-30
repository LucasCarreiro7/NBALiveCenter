import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // NBA Data Endpoints Proxy
  app.get('/api/scores/today', async (req, res) => {
  try {
    // Primeiro tenta o scoreboard ao vivo da NBA (usa data UTC deles)
    const response = await fetch('https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json');
    const data: any = await response.json();

    // Verifica se a data do scoreboard bate com a data local enviada pelo cliente
    const clientDate = req.query.date as string | undefined;
    const nbaDate = data.scoreboard?.gameDate; // formato "YYYY-MM-DD"

    // Se a data da NBA não bater com a data local do cliente, usa o endpoint histórico
    if (clientDate && nbaDate && nbaDate !== clientDate) {
      const [year, month, day] = clientDate.split('-');
      const url = `https://stats.nba.com/stats/scoreboardv2?DayOffset=0&LeagueID=00&gameDate=${month}/${day}/${year}`;
      const histRes = await fetch(url, {
        headers: {
          'Host': 'stats.nba.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:72.0) Gecko/20100101 Firefox/72.0',
          'Accept': 'application/json, text/plain, */*',
          'x-nba-stats-origin': 'stats',
          'x-nba-stats-token': 'true',
          'Referer': 'https://stats.nba.com/',
        }
      });
      const histData: any = await histRes.json();
      const gameHeader = histData.resultSets?.find((rs: any) => rs.name === 'GameHeader');
      const lineScore = histData.resultSets?.find((rs: any) => rs.name === 'LineScore');
      if (!gameHeader || !lineScore) return res.json({ games: [] });

      const headers = gameHeader.headers;
      const games = await Promise.all(gameHeader.rowSet.map(async (row: any) => {
        const h = (key: string) => row[headers.indexOf(key)];
        const gameId = h('GAME_ID');
        const status = h('GAME_STATUS_TEXT');
        const homeTeamId = h('HOME_TEAM_ID');
        const visitorTeamId = h('VISITOR_TEAM_ID');
        const gameScores = lineScore.rowSet.filter((lsRow: any) => lsRow[lineScore.headers.indexOf('GAME_ID')] === gameId);
        const homeLine = gameScores.find((ls: any) => ls[lineScore.headers.indexOf('TEAM_ID')]?.toString() === homeTeamId?.toString());
        const awayLine = gameScores.find((ls: any) => ls[lineScore.headers.indexOf('TEAM_ID')]?.toString() === visitorTeamId?.toString());
        const getLS = (row: any, key: string) => { const idx = lineScore.headers.indexOf(key); return (row && idx !== -1) ? row[idx] : null; };
        let homeScore = getLS(homeLine, 'PTS');
        let awayScore = getLS(awayLine, 'PTS');
        if (homeScore === null || awayScore === null) {
          try {
            const boxRes = await fetch(`https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`);
            if (boxRes.ok) { const boxData: any = await boxRes.json(); const box = boxData?.game; if (box) { homeScore = box.homeTeam?.score ?? homeScore; awayScore = box.awayTeam?.score ?? awayScore; } }
          } catch {}
        }
        return {
          id: gameId, status: status.trim() || 'Final',
          homeTeam: { id: homeTeamId, name: getLS(homeLine, 'TEAM_NAME') || 'Home Team', city: getLS(homeLine, 'TEAM_CITY_NAME') || getLS(homeLine, 'TEAM_CITY') || '', abbreviation: getLS(homeLine, 'TEAM_ABBREVIATION') || '', score: homeScore ?? 0 },
          awayTeam: { id: visitorTeamId, name: getLS(awayLine, 'TEAM_NAME') || 'Away Team', city: getLS(awayLine, 'TEAM_CITY_NAME') || getLS(awayLine, 'TEAM_CITY') || '', abbreviation: getLS(awayLine, 'TEAM_ABBREVIATION') || '', score: awayScore ?? 0 }
        };
      }));
      return res.json({ games });
    }

    // Data bate — usa o scoreboard ao vivo normalmente
    const games = data.scoreboard.games.map((g: any) => ({
      id: g.gameId,
      status: g.gameStatusText,
      period: g.period,
      time: g.gameStatusText,
      homeTeam: { id: g.homeTeam.teamId, name: g.homeTeam.teamName, city: g.homeTeam.teamCity, abbreviation: g.homeTeam.teamTricode, score: g.homeTeam.score, wins: g.homeTeam.wins, losses: g.homeTeam.losses },
      awayTeam: { id: g.awayTeam.teamId, name: g.awayTeam.teamName, city: g.awayTeam.teamCity, abbreviation: g.awayTeam.teamTricode, score: g.awayTeam.score, wins: g.awayTeam.wins, losses: g.awayTeam.losses }
    }));
    res.json({ games });
  } catch (error) {
    console.error('Error fetching today scores:', error);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
  });

  app.get('/api/scores/date/:date', async (req, res) => {
    const { date } = req.params;
    try {
      const [year, month, day] = date.split('-');
      const url = `https://stats.nba.com/stats/scoreboardv2?DayOffset=0&LeagueID=00&gameDate=${month}/${day}/${year}`;
      
      const response = await fetch(url, {
        headers: {
          'Host': 'stats.nba.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:72.0) Gecko/20100101 Firefox/72.0',
          'Accept': 'application/json, text/plain, */*',
          'x-nba-stats-origin': 'stats',
          'x-nba-stats-token': 'true',
          'Referer': 'https://stats.nba.com/',
        }
      });
      
      const data: any = await response.json();
      
      // stats.nba.com returns ResultSets
      // [0] is GameHeader, [1] is LineScore
      const gameHeader = data.resultSets.find((rs: any) => rs.name === 'GameHeader');
      const lineScore = data.resultSets.find((rs: any) => rs.name === 'LineScore');

      if (!gameHeader || !lineScore) {
        return res.json({ games: [] });
      }

      const headers = gameHeader.headers;

      const games = await Promise.all(gameHeader.rowSet.map(async (row: any) => {
        const h = (key: string) => row[headers.indexOf(key)];
        const gameId = h('GAME_ID');
        const status = h('GAME_STATUS_TEXT');

        const gameScores = lineScore.rowSet.filter(
          (lsRow: any) => lsRow[lineScore.headers.indexOf('GAME_ID')] === gameId
        );

        const homeTeamId = h('HOME_TEAM_ID');
        const visitorTeamId = h('VISITOR_TEAM_ID');

        const homeLine = gameScores.find(
          (ls: any) => ls[lineScore.headers.indexOf('TEAM_ID')]?.toString() === homeTeamId?.toString()
        );
        const awayLine = gameScores.find(
          (ls: any) => ls[lineScore.headers.indexOf('TEAM_ID')]?.toString() === visitorTeamId?.toString()
        );

        const getLS = (row: any, key: string) => {
          const idx = lineScore.headers.indexOf(key);
          return (row && idx !== -1) ? row[idx] : null;
        };

        let homeScore = getLS(homeLine, 'PTS');
        let awayScore = getLS(awayLine, 'PTS');

        // Fallback: se o placar vier null (jogo finalizado), busca do boxscore
        if (homeScore === null || awayScore === null) {
          try {
            const boxRes = await fetch(
              `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`
            );
            if (boxRes.ok) {
              const boxData: any = await boxRes.json();
              const box = boxData?.game;
              if (box) {
                homeScore = box.homeTeam?.score ?? homeScore;
                awayScore = box.awayTeam?.score ?? awayScore;
              }
            }
          } catch {
            // mantém os valores anteriores se o boxscore falhar
          }
        }

        return {
          id: gameId,
          status: status.trim() || 'Final',
          homeTeam: {
            id: homeTeamId,
            name: getLS(homeLine, 'TEAM_NAME') || 'Home Team',
            city: getLS(homeLine, 'TEAM_CITY_NAME') || getLS(homeLine, 'TEAM_CITY') || '',
            abbreviation: getLS(homeLine, 'TEAM_ABBREVIATION') || '',
            score: homeScore ?? 0,
          },
          awayTeam: {
            id: visitorTeamId,
            name: getLS(awayLine, 'TEAM_NAME') || 'Away Team',
            city: getLS(awayLine, 'TEAM_CITY_NAME') || getLS(awayLine, 'TEAM_CITY') || '',
            abbreviation: getLS(awayLine, 'TEAM_ABBREVIATION') || '',
            score: awayScore ?? 0,
          }
        };
      }));

      res.json({ games });



    } catch (error) {
      console.error('Error fetching scores for date:', error);
      res.status(500).json({ error: 'Failed to fetch scores for date' });
    }
  });

  app.get('/api/standings', async (req, res) => {
    try {
      const url = 'https://stats.nba.com/stats/leaguestandingsv3?LeagueID=00&Season=2025-26&SeasonType=Regular+Season';
      const response = await fetch(url, {
        headers: {
          'Host': 'stats.nba.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:72.0) Gecko/20100101 Firefox/72.0',
          'Accept': 'application/json, text/plain, */*',
          'x-nba-stats-origin': 'stats',
          'x-nba-stats-token': 'true',
          'Referer': 'https://stats.nba.com/',
        }
      });
      const data: any = await response.json();
      const standingsRS = data.resultSets.find((rs: any) => rs.name === 'Standings');
      
      if (!standingsRS) return res.json({ standings: [] });

      const headers = standingsRS.headers;
      const standings = standingsRS.rowSet.map((row: any) => {
        const h = (key: string) => row[headers.indexOf(key)];
        return {
          teamId: h('TeamID'),
          teamName: h('TeamName'),
          teamCity: h('TeamCity'),
          abbreviation: h('TeamAbbreviation'),
          conference: h('Conference'),
          wins: h('WINS'),
          losses: h('LOSSES'),
          winPct: h('WinPCT'),
          rank: h('PlayoffRank'),
          last10: h('L10'),
          streak: h('CurrentStreak'),
          pointsFor: h('PointsPG'),
          pointsAgainst: h('OppPointsPG')
        };
      });

      res.json({ standings });
    } catch (error) {
      console.error('Error fetching standings:', error);
      res.status(500).json({ error: 'Failed to fetch standings' });
    }
  });

  app.get('/api/teams', async (req, res) => {
    try {
      const url = 'https://stats.nba.com/stats/commonteamyears?LeagueID=00';
      const response = await fetch(url, {
        headers: {
          'Host': 'stats.nba.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:72.0) Gecko/20100101 Firefox/72.0',
          'Accept': 'application/json, text/plain, */*',
          'x-nba-stats-origin': 'stats',
          'x-nba-stats-token': 'true',
          'Referer': 'https://stats.nba.com/',
        }
      });
      const data: any = await response.json();
      const teamsRS = data.resultSets.find((rs: any) => rs.name === 'TeamYears');
      
      if (!teamsRS) return res.json({ teams: [] });

      const headers = teamsRS.headers;
      const currentSeason = '2025'; // For 2025-26
      const teams = teamsRS.rowSet
        .filter((row: any) => row[headers.indexOf('MAX_YEAR')] >= currentSeason && row[headers.indexOf('TEAM_ID')] > 0)
        .map((row: any) => {
          const h = (key: string) => row[headers.indexOf(key)];
          return {
            teamId: h('TEAM_ID'),
            abbreviation: h('ABBREVIATION'),
          };
        });

      res.json({ teams });
    } catch (error) {
      console.error('Error fetching teams:', error);
      res.status(500).json({ error: 'Failed to fetch teams' });
    }
  });

  app.get('/api/team/:teamId/roster', async (req, res) => {
  const { teamId } = req.params;
  const nbaHeaders = {
    'Host': 'stats.nba.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:72.0) Gecko/20100101 Firefox/72.0',
    'Accept': 'application/json, text/plain, */*',
    'x-nba-stats-origin': 'stats',
    'x-nba-stats-token': 'true',
    'Referer': 'https://stats.nba.com/',
  };

  try {
    // Busca roster e detalhes do time em paralelo
    const [rosterRes, detailsRes] = await Promise.all([
      fetch(`https://stats.nba.com/stats/commonteamroster?LeagueID=00&Season=2025-26&TeamID=${teamId}`, { headers: nbaHeaders }),
      fetch(`https://stats.nba.com/stats/teamdetails?TeamID=${teamId}`, { headers: nbaHeaders }),
    ]);

    const rosterData = await rosterRes.json();
    const detailsData = await detailsRes.json();

    // Extrai detalhes do time (arena, coach, etc.)
    const bgRS = detailsData.resultSets?.find((rs: any) => rs.name === 'TeamBackground');
    const champsRS = detailsData.resultSets?.find((rs: any) => rs.name === 'TeamAwardsChampionships');
    const retiredRS = detailsData.resultSets?.find((rs: any) => rs.name === 'TeamRetired');

    let teamDetails = null;
    if (bgRS && bgRS.rowSet.length > 0) {
      const h = (key: string) => bgRS.rowSet[0][bgRS.headers.indexOf(key)];
      teamDetails = {
        arena: h('ARENA'),
        arenaCapacity: h('ARENACAPACITY'),
        yearFounded: h('YEARFOUNDED'),
        headCoach: h('HEADCOACH'),
        generalManager: h('GENERALMANAGER'),
        owner: h('OWNER'),
        championships: champsRS?.rowSet?.length ?? 0,
        retiredNumbers: retiredRS?.rowSet?.map((row: any) => ({
          player: row[retiredRS.headers.indexOf('PLAYER')],
          jersey: row[retiredRS.headers.indexOf('JERSEY')],
          seasons: row[retiredRS.headers.indexOf('SEASONSWITHTEAM')],
        })) ?? [],
      };
    }

    res.json({ ...rosterData, teamDetails });
  } catch (error) {
    console.error('Error fetching roster:', error);
    res.status(500).json({ error: 'Failed to fetch roster' });
  }
  });

  app.get('/api/playoffs', async (req, res) => {
  const nbaHeaders = {
    'Host': 'stats.nba.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:72.0) Gecko/20100101 Firefox/72.0',
    'Accept': 'application/json, text/plain, */*',
    'x-nba-stats-origin': 'stats',
    'x-nba-stats-token': 'true',
    'Referer': 'https://stats.nba.com/',
  };

  try {
    // Busca jogos e standings em paralelo
    const [gamesRes, standingsRes] = await Promise.all([
      fetch('https://stats.nba.com/stats/leaguegamefinder?LeagueID=00&Season=2025-26&SeasonType=Playoffs&PlayerOrTeam=T', { headers: nbaHeaders }),
      fetch('https://stats.nba.com/stats/leaguestandingsv3?LeagueID=00&Season=2025-26&SeasonType=Regular+Season', { headers: nbaHeaders }),
    ]);

    const gamesData: any   = await gamesRes.json();
    const standingsData: any = await standingsRes.json();

    const gamesRS    = gamesData.resultSets?.find((rs: any) => rs.name === 'LeagueGameFinderResults');
    const standingsRS = standingsData.resultSets?.find((rs: any) => rs.name === 'Standings');

    if (!gamesRS || gamesRS.rowSet.length === 0) {
      return res.status(404).json({ error: 'No playoff games found' });
    }

    // Monta mapa de conferência e seed por TEAM_ID (mais confiável que abreviação)
    const teamConferenceById: Record<number, string> = {};
    const teamSeedById: Record<number, number>       = {};
    const teamAbbrById: Record<number, string>       = {};

    if (standingsRS) {
      const sh = standingsRS.headers;
      // Log dos primeiros headers para ver os nomes reais
      console.log('STANDINGS HEADERS:', sh.slice(0, 10));
      for (const row of standingsRS.rowSet) {
        const teamId = row[sh.indexOf('TeamID')];
        const abbr   = row[sh.indexOf('TeamAbbreviation')];
        const conf   = row[sh.indexOf('Conference')];
        const seed   = row[sh.indexOf('PlayoffRank')];
        if (teamId) {
          teamConferenceById[teamId] = conf;
          teamSeedById[teamId]       = seed;
          teamAbbrById[teamId]       = abbr;
        }
      }
    }

    console.log('Sample standings entry:', JSON.stringify(
      Object.entries(teamConferenceById).slice(0, 3).map(([id, conf]) => ({ id, conf, seed: teamSeedById[Number(id)] }))
    ));

    // Processa jogos — agrupa por par canônico de times
    const h   = gamesRS.headers;
    const idx = (key: string) => h.indexOf(key);

    const canonicalMap: Record<string, any> = {};

    for (const row of gamesRS.rowSet) {
      const teamId   = row[idx('TEAM_ID')];
      const teamName = row[idx('TEAM_NAME')] ?? '';
      const abbr     = row[idx('TEAM_ABBREVIATION')] ?? '';
      const matchup  = row[idx('MATCHUP')] ?? '';
      const wl       = row[idx('WL')] ?? '';
      const gameDate = row[idx('GAME_DATE')] ?? '';
      const gameId   = String(row[idx('GAME_ID')] ?? '');

      // Extrai roundNum da posição 7 do GAME_ID
      const roundNum = parseInt(gameId.charAt(7)) || 1;

      const oppAbbr = matchup.includes(' vs. ')
        ? matchup.split(' vs. ')[1]?.trim()
        : matchup.split(' @ ')[1]?.trim();

      if (!oppAbbr || !abbr) continue;

      const abbrs    = [abbr, oppAbbr].sort();
      const canonKey = `${roundNum}_${abbrs[0]}_${abbrs[1]}`;

      if (!canonicalMap[canonKey]) {
        canonicalMap[canonKey] = {
          roundNum,
          latestDate: gameDate,
          teams: {}
        };
      }
      if (gameDate > canonicalMap[canonKey].latestDate) {
        canonicalMap[canonKey].latestDate = gameDate;
      }
      if (!canonicalMap[canonKey].teams[teamId]) {
        canonicalMap[canonKey].teams[teamId] = { teamId, teamName, abbreviation: abbr, wins: 0, losses: 0 };
      }
      if (wl === 'W') canonicalMap[canonKey].teams[teamId].wins++;
      else            canonicalMap[canonKey].teams[teamId].losses++;
    }

    const series = Object.values(canonicalMap).map((s: any) => {
      const teams = Object.values(s.teams) as any[];
      if (teams.length < 2) return null;

      teams.sort((a: any, b: any) => b.wins - a.wins);
      const [topTeam, bottomTeam] = teams;

      // Usa teamId para buscar conferência — mais confiável
      const topConf  = teamConferenceById[topTeam.teamId];
      const botConf  = teamConferenceById[bottomTeam.teamId];

      let conference: string;
      if (s.roundNum === 4)                          conference = 'Finals';
      else if (topConf && topConf === botConf)       conference = topConf;
      else if (topConf && !botConf)                  conference = topConf;
      else if (botConf && !topConf)                  conference = botConf;
      else                                           conference = 'Finals';

      return {
        conference,
        roundNum:   s.roundNum,
        topSeed:    teamSeedById[topTeam.teamId]    ?? null,
        bottomSeed: teamSeedById[bottomTeam.teamId] ?? null,
        topWins:    topTeam.wins,
        bottomWins: bottomTeam.wins,
        isOver:     topTeam.wins === 4 || bottomTeam.wins === 4,
        latestDate: s.latestDate,
        topTeam:    { teamId: topTeam.teamId,    teamName: topTeam.teamName,    abbreviation: topTeam.abbreviation },
        bottomTeam: { teamId: bottomTeam.teamId, teamName: bottomTeam.teamName, abbreviation: bottomTeam.abbreviation },
      };
    }).filter(Boolean);

    console.log('FINAL SERIES:', series.map((s: any) =>
      `${s.conference} R${s.roundNum}: ${s.topTeam.abbreviation}(${s.topSeed}) ${s.topWins}-${s.bottomWins} ${s.bottomTeam.abbreviation}(${s.bottomSeed})`
    ));

    res.json({ series });
  } catch (error) {
    console.error('Error fetching playoffs:', error);
    res.status(500).json({ error: 'Failed to fetch playoffs' });
  }
  });

  app.get('/api/game/:gameId', async (req, res) => {
    const { gameId } = req.params;
    try {
      const url = `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`;
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error fetching boxscore:', error);
      res.status(500).json({ error: 'Failed to fetch boxscore' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
