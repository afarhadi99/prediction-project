export const LEAGUES = [
  { id: "nba", label: "NBA", path: "basketball/nba", sport: "Basketball" },
  { id: "nfl", label: "NFL", path: "football/nfl", sport: "Football" },
  { id: "nhl", label: "NHL", path: "hockey/nhl", sport: "Hockey" },
  { id: "mlb", label: "MLB", path: "baseball/mlb", sport: "Baseball" },
  { id: "pl", label: "Premier League", path: "soccer/eng.1", sport: "Soccer" },
  { id: "laliga", label: "La Liga", path: "soccer/esp.1", sport: "Soccer" },
  { id: "seriea", label: "Serie A", path: "soccer/ita.1", sport: "Soccer" },
  { id: "ucl", label: "Champions League", path: "soccer/uefa.champions", sport: "Soccer" },
] as const;

export type LeagueId = (typeof LEAGUES)[number]["id"];
export type Team = {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  logo: string;
  score: number | null;
  record: string;
  winner: boolean;
  injuries: string[];
};

export type Prediction = {
  homeProbability: number;
  awayProbability: number;
  confidence: number;
  pick: "home" | "away";
  reason: string;
  source: "model" | "openrouter";
};

export type Game = {
  id: string;
  leagueId: LeagueId;
  league: string;
  sport: string;
  date: string;
  status: string;
  statusState: "pre" | "in" | "post";
  statusDetail: string;
  period: number | null;
  clock: string;
  venue: string;
  home: Team;
  away: Team;
  news: string[];
  prediction: Prediction;
  source: "espn" | "sample";
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

function parseTeam(value: unknown): Team {
  const team = asRecord(value);
  const details = asRecord(team.team);
  const record = asArray(team.records)[0];
  const injuryNotes = asArray(team.injuries).map((item) => {
    const injury = asRecord(item);
    const athlete = asRecord(injury.athlete);
    const status = asRecord(injury.status);
    return [text(athlete.displayName), text(status.type), text(injury.details)].filter(Boolean).join(" ");
  }).filter(Boolean);

  return {
    id: text(details.id, text(team.id)),
    name: text(details.displayName, text(details.name, "Team")),
    shortName: text(details.shortDisplayName, text(details.name, "Team")),
    abbreviation: text(details.abbreviation, "--"),
    logo: text(details.logo),
    score: team.score === undefined || team.score === "" ? null : Number(team.score),
    record: text(asRecord(record).summary),
    winner: team.winner === true,
    injuries: injuryNotes,
  };
}

function parseRecord(record: string): number | null {
  const match = record.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (!match) return null;
  const wins = Number(match[1]);
  const losses = Number(match[2]);
  return wins + losses > 0 ? wins / (wins + losses) : null;
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

export function calculatePrediction(game: Omit<Game, "prediction">): Prediction {
  const homeRate = parseRecord(game.home.record);
  const awayRate = parseRecord(game.away.record);
  const recordEdge = ((homeRate ?? 0.5) - (awayRate ?? 0.5)) * 1.65;
  const homeEdge = game.sport === "Soccer" ? 0.13 : 0.16;
  const injuryPenalty = (game.home.injuries.length - game.away.injuries.length) * -0.07;
  const liveMargin = game.statusState === "in" && game.home.score !== null && game.away.score !== null
    ? Math.max(-1.4, Math.min(1.4, (game.home.score - game.away.score) / (game.sport === "Soccer" ? 2.8 : 18)))
    : 0;
  const probability = Math.max(0.05, Math.min(0.95, sigmoid(recordEdge + homeEdge + injuryPenalty + liveMargin)));
  const confidence = Math.min(0.91, 0.48 + Math.abs(probability - 0.5) * 0.72 + (homeRate !== null && awayRate !== null ? 0.08 : 0));
  const pick = probability >= 0.5 ? "home" : "away";
  const favorite = pick === "home" ? game.home : game.away;
  const reasons = [];

  if (homeRate !== null && awayRate !== null) {
    reasons.push(`${favorite.shortName} has the stronger season record (${favorite.record})`);
  } else {
    reasons.push("Season records are not available, so this leans on home advantage");
  }
  if (game.statusState === "in" && liveMargin !== 0) {
    reasons.push(`${game.home.shortName} leads ${game.home.score}-${game.away.score}`);
  }
  if (game.home.injuries.length || game.away.injuries.length) {
    reasons.push("reported availability is included as a small adjustment");
  }

  return {
    homeProbability: Math.round(probability * 100),
    awayProbability: 100 - Math.round(probability * 100),
    confidence: Math.round(confidence * 100),
    pick,
    reason: reasons.join("; ") + ".",
    source: "model",
  };
}

function parseEvent(eventValue: unknown, league: (typeof LEAGUES)[number], headlines: string[]): Game | null {
  const event = asRecord(eventValue);
  const competition = asRecord(asArray(event.competitions)[0]);
  const rawCompetitors = asArray(competition.competitors);
  const homeIndex = rawCompetitors.findIndex((item) => asRecord(item).homeAway === "home");
  const awayIndex = rawCompetitors.findIndex((item) => asRecord(item).homeAway === "away");
  if (homeIndex < 0 || awayIndex < 0) return null;
  const home = parseTeam(rawCompetitors[homeIndex]);
  const away = parseTeam(rawCompetitors[awayIndex]);
  const status = asRecord(asRecord(event.status).type);
  const venue = asRecord(competition.venue);
  const state = text(status.state, "pre");
  const matchedNews = headlines.filter((headline) =>
    headline.toLowerCase().includes(home.name.toLowerCase()) || headline.toLowerCase().includes(away.name.toLowerCase()),
  ).slice(0, 3);
  const gameWithoutPrediction: Omit<Game, "prediction"> = {
    id: text(event.id),
    leagueId: league.id,
    league: league.label,
    sport: league.sport,
    date: text(event.date),
    status: text(status.shortDetail, text(status.detail, "Scheduled")),
    statusState: state === "in" ? "in" : state === "post" ? "post" : "pre",
    statusDetail: text(status.detail),
    period: Number(asRecord(event.status).period) || null,
    clock: text(asRecord(event.status).displayClock),
    venue: text(venue.fullName),
    home,
    away,
    news: matchedNews,
    source: "espn",
  };
  return { ...gameWithoutPrediction, prediction: calculatePrediction(gameWithoutPrediction) };
}

async function fetchJson(url: string): Promise<UnknownRecord> {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error(`ESPN request failed: ${response.status}`);
  return asRecord(await response.json());
}

async function fetchLeague(league: (typeof LEAGUES)[number]): Promise<Game[]> {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const baseUrl = `https://site.api.espn.com/apis/site/v2/sports/${league.path}`;
  const [scoreboard, news] = await Promise.all([
    fetchJson(`${baseUrl}/scoreboard?dates=${date}&limit=100`).catch(() => ({} as UnknownRecord)),
    fetchJson(`${baseUrl}/news?limit=10`).catch(() => ({} as UnknownRecord)),
  ]);
  const headlines = asArray(news.articles).map((item) => text(asRecord(item).headline)).filter(Boolean);
  return asArray(scoreboard.events)
    .map((event) => parseEvent(event, league, headlines))
    .filter((game): game is Game => game !== null);
}

export async function fetchGames() {
  const results = await Promise.all(LEAGUES.map(fetchLeague));
  return results.flat().sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}