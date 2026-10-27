import type { Game } from "@/lib/sports";

type AiPick = { eventId: string; homeProbability: number; confidence: number; summary: string };

const responseSchema = {
  type: "object",
  properties: {
    predictions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          eventId: { type: "string" },
          homeProbability: { type: "number" },
          confidence: { type: "number" },
          summary: { type: "string" },
        },
        required: ["eventId", "homeProbability", "confidence", "summary"],
        additionalProperties: false,
      },
    },
  },
  required: ["predictions"],
  additionalProperties: false,
};

export async function refinePredictions(games: Game[]): Promise<Game[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || games.length === 0) return games;

  const eligible = games.filter((game) => game.statusState !== "post").slice(0, 12);
  if (!eligible.length) return games;
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
      "X-Title": "Courtside Predictions",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_schema", json_schema: { name: "game_predictions", strict: true, schema: responseSchema } },
      messages: [
        { role: "system", content: "Assess sports outcomes using only the supplied records, scores, availability notes, and news. Return calibrated home win probability as a percentage. Do not invent facts, lineups, or news. Treat uncertainty honestly and do not give wagering advice." },
        { role: "user", content: JSON.stringify(eligible.map((game) => ({
          eventId: game.id,
          league: game.league,
          status: game.status,
          home: { name: game.home.name, record: game.home.record, score: game.home.score, availability: game.home.injuries },
          away: { name: game.away.name, record: game.away.record, score: game.away.score, availability: game.away.injuries },
          latestTeamNews: game.news,
          baseline: game.prediction,
        }))) },
      ],
    }),
  });

  if (!response.ok) throw new Error(`OpenRouter request failed: ${response.status}`);
  const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned no structured prediction");
  const parsed = JSON.parse(content) as { predictions?: AiPick[] };
  const byId = new Map((parsed.predictions ?? []).map((pick) => [pick.eventId, pick]));

  return games.map((game) => {
    const pick = byId.get(game.id);
    if (!pick || !Number.isFinite(pick.homeProbability)) return game;
    const homeProbability = Math.round(Math.max(5, Math.min(95, pick.homeProbability)));
    return {
      ...game,
      prediction: {
        ...game.prediction,
        homeProbability,
        awayProbability: 100 - homeProbability,
        confidence: Math.round(Math.max(25, Math.min(95, pick.confidence))),
        pick: homeProbability >= 50 ? "home" : "away",
        reason: pick.summary.slice(0, 400),
        source: "openrouter",
      },
    };
  });
}