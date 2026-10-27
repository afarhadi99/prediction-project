import { NextRequest } from "next/server";
import { getDemoGames } from "@/lib/demo-games";
import { archiveCompletedGames } from "@/lib/mongodb";
import { refinePredictions } from "@/lib/openrouter";
import { fetchGames } from "@/lib/sports";

export async function GET(request: NextRequest) {
  let games;
  let source: "espn" | "sample" = "espn";
  try {
    games = await fetchGames();
    if (!games.length) {
      games = getDemoGames();
      source = "sample";
    }
  } catch {
    games = getDemoGames();
    source = "sample";
  }

  let historySaved = false;
  try {
    await archiveCompletedGames(games);
    historySaved = Boolean(process.env.MONGODB_URI);
  } catch {
    historySaved = false;
  }

  let aiEnabled = false;
  if (request.nextUrl.searchParams.get("ai") === "1" && process.env.OPENROUTER_API_KEY) {
    try {
      games = await refinePredictions(games);
      aiEnabled = games.some((game) => game.prediction.source === "openrouter");
    } catch {
      aiEnabled = false;
    }
  }

  return Response.json({
    games,
    source,
    aiEnabled,
    historySaved,
    updatedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}