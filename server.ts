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
    try {
      const url = `https://stats.nba.com/stats/commonteamroster?LeagueID=00&Season=2025-26&TeamID=${teamId}`;
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
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error fetching roster:', error);
      res.status(500).json({ error: 'Failed to fetch roster' });
    }
  });

  app.get('/api/playoffs', async (req, res) => {
  try {
    // Usa o seriesStandings dos playoffs — endpoint confiável da NBA
    const url = 'https://stats.nba.com/stats/leaguestandingsv3?LeagueID=00&Season=2025-26&SeasonType=Playoffs';
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

    if (!response.ok) throw new Error('standings failed');
    const data: any = await response.json();
    const standingsRS = data.resultSets?.find((rs: any) => rs.name === 'Standings');
    if (!standingsRS || standingsRS.rowSet.length === 0) {
      return res.status(404).json({ error: 'No playoff data' });
    }

    const headers = standingsRS.headers;
    const teams = standingsRS.rowSet.map((row: any) => {
      const h = (key: string) => row[headers.indexOf(key)];
      return {
        teamId: h('TeamID'),
        teamName: h('TeamName'),
        teamCity: h('TeamCity'),
        abbreviation: h('TeamAbbreviation'),
        conference: h('Conference'),
        wins: h('WINS'),
        losses: h('LOSSES'),
        rank: h('PlayoffRank'),
        clinchIndicator: h('ClinchIndicator') ?? '',
      };
    });

    // Monta as séries emparelhando seeds por conferência
    const buildSeries = (conf: string, seedA: number, seedB: number) => {
      const teamA = teams.find((t: any) => t.conference === conf && t.rank === seedA);
      const teamB = teams.find((t: any) => t.conference === conf && t.rank === seedB);
      if (!teamA && !teamB) return null;
      return {
        conference: conf,
        topSeed: seedA,
        bottomSeed: seedB,
        topTeam: teamA || null,
        bottomTeam: teamB || null,
        topWins: teamA?.wins ?? 0,
        bottomWins: teamB?.wins ?? 0,
      };
    };

    // Determina rodada pelo número de times restantes
    const remaining = teams.length;
    let series: any[] = [];

    if (remaining <= 2) {
      // Finals
      const east = teams.find((t: any) => t.conference === 'East');
      const west = teams.find((t: any) => t.conference === 'West');
      series = [{ conference: 'Finals', topTeam: east || null, bottomTeam: west || null, topWins: east?.wins ?? 0, bottomWins: west?.wins ?? 0 }];
    } else if (remaining <= 4) {
      // Conf Finals
      series = [
        buildSeries('East', 1, 2),
        buildSeries('West', 1, 2),
      ].filter(Boolean);
    } else if (remaining <= 8) {
      // Semifinals
      series = [
        buildSeries('East', 1, 4), buildSeries('East', 2, 3),
        buildSeries('West', 1, 4), buildSeries('West', 2, 3),
      ].filter(Boolean);
    } else {
      // First Round
      series = [
        buildSeries('East', 1, 8), buildSeries('East', 4, 5),
        buildSeries('East', 3, 6), buildSeries('East', 2, 7),
        buildSeries('West', 1, 8), buildSeries('West', 4, 5),
        buildSeries('West', 3, 6), buildSeries('West', 2, 7),
      ].filter(Boolean);
    }

    res.json({ series, teamsCount: remaining });
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
