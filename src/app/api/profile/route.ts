import { ObjectId } from "mongodb";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

function validTheme(value: unknown): value is { primary: string; accent: string } {
  if (!value || typeof value !== "object") return false;
  const theme = value as Record<string, unknown>;
  return [theme.primary, theme.accent].every((color) => typeof color === "string" && /^#[\da-f]{6}$/i.test(color));
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return Response.json({ error: "Sign in to sync your profile." }, { status: 401 });
  try {
    const user = await (await getDb()).collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { email: 1, favorites: 1, theme: 1 } },
    );
    if (!user) return Response.json({ error: "Account not found." }, { status: 404 });
    return Response.json({ email: user.email, favorites: user.favorites ?? [], theme: user.theme ?? null });
  } catch {
    return Response.json({ error: "Profile storage is unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return Response.json({ error: "Sign in to sync your profile." }, { status: 401 });
  let body: { favorites?: unknown; theme?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.favorites !== undefined) {
    if (!Array.isArray(body.favorites) || body.favorites.length > 100 || !body.favorites.every((item) => typeof item === "string" && item.length <= 100)) {
      return Response.json({ error: "Invalid favorites." }, { status: 400 });
    }
    updates.favorites = [...new Set(body.favorites)];
  }
  if (body.theme !== undefined) {
    if (body.theme !== null && !validTheme(body.theme)) return Response.json({ error: "Invalid team colors." }, { status: 400 });
    updates.theme = body.theme;
  }

  try {
    await (await getDb()).collection("users").updateOne({ _id: new ObjectId(userId) }, { $set: updates });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Profile storage is unavailable." }, { status: 503 });
  }
}