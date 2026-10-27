import type { Game, LeagueId } from "@/lib/sports";
import { calculatePrediction } from "@/lib/sports";

const examples = [
  { id: "preview-nba", leagueId: "nba", league: "NBA", sport: "Basketball", home: ["New York Knicks", "NYK", "NY", "4-1"], away: ["Boston Celtics", "BOS", "BOS", "3-2"] },
  { id: "preview-nfl", leagueId: "nfl", league: "NFL", sport: "Football", home: ["Buffalo Bills", "BUF", "BUF", "4-2"], away: ["Kansas City Chiefs", "KC", "KC", "5-1"] },
  { id: "preview-nhl", leagueId: "nhl", league: "NHL", sport: "Hockey", home: ["New York Rangers", "NYR", "NYR", "5-2"], away: ["New Jersey Devils", "NJ", "NJ", "4-3"] },
  { id: "preview-pl", leagueId: "pl", league: "Premier League", sport: "Soccer", home: ["Arsenal", "ARS", "ARS", "6-1"], away: ["Liverpool", "LIV", "LIV", "5-2"] },
] as const;

export function getDemoGames(): Game[] {
  return examples.map((item, index) => {
    const start = new Date(Date.now() + (index + 2) * 60 * 60 * 1000);
    const home = {
      id: `${item.id}-home`, name: item.home[0], shortName: item.home[1], abbreviation: item.home[2],
      logo: `https://a.espncdn.com/i/teamlogos/${item.sport === "Soccer" ? "soccer" : item.leagueId}/500/${item.home[2].toLowerCase()}.png`,
      score: null, record: item.home[3], winner: false, injuries: [],
    };
    const away = {
      id: `${item.id}-away`, name: item.away[0], shortName: item.away[1], abbreviation: item.away[2],
      logo: `https://a.espncdn.com/i/teamlogos/${item.sport === "Soccer" ? "soccer" : item.leagueId}/500/${item.away[2].toLowerCase()}.png`,
      score: null, record: item.away[3], winner: false, injuries: [],
    };
    const core = {
      id: item.id,
      leagueId: item.leagueId as LeagueId,
      league: item.league,
      sport: item.sport,
      date: start.toISOString(),
      status: "Preview fixture",
      statusState: "pre" as const,
      statusDetail: "Sample data",
      period: null,
      clock: "",
      venue: "",
      home,
      away,
      news: [],
      source: "sample" as const,
    };
    return { ...core, prediction: calculatePrediction(core) };
  });
}