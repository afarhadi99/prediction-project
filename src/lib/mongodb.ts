import { MongoClient, type Db } from "mongodb";
import type { Game } from "@/lib/sports";

const uri = process.env.MONGODB_URI;
const globalMongo = globalThis as typeof globalThis & { mongoClient?: MongoClient };

export async function getDb(): Promise<Db> {
  if (!uri) throw new Error("MONGODB_URI is not configured");
  const client = globalMongo.mongoClient ?? new MongoClient(uri);
  if (!globalMongo.mongoClient) {
    await client.connect();
    globalMongo.mongoClient = client;
  }
  return client.db(process.env.MONGODB_DB ?? "courtside");
}

export async function archiveCompletedGames(games: Game[]) {
  const finals = games.filter((game) => game.statusState === "post");
  if (!finals.length) return;
  const collection = (await getDb()).collection("historicalGames");
  await collection.createIndex({ eventId: 1 }, { unique: true });
  await Promise.all(finals.map((game) => collection.updateOne(
    { eventId: game.id },
    { $setOnInsert: { eventId: game.id, leagueId: game.leagueId, date: game.date, status: game.status, home: game.home, away: game.away, archivedAt: new Date() } },
    { upsert: true },
  )));
}