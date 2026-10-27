import { compare, hash } from "bcryptjs";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { createSession, getSessionUserId, SESSION_COOKIE } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 14,
};

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return Response.json({ user: null });
  try {
    const user = await (await getDb()).collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { email: 1, favorites: 1, theme: 1 } },
    );
    if (!user) return Response.json({ user: null });
    return Response.json({ user: { id: user._id.toString(), email: user.email, favorites: user.favorites ?? [], theme: user.theme ?? null } });
  } catch {
    return Response.json({ error: "Account storage is not configured." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: { action?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || password.length > 128) {
    return Response.json({ error: "Use a valid email and a password of at least 8 characters." }, { status: 400 });
  }

  try {
    const users = (await getDb()).collection("users");
    await users.createIndex({ email: 1 }, { unique: true });
    let user;
    if (body.action === "register") {
      const result = await users.insertOne({ email, passwordHash: await hash(password, 12), favorites: [], theme: null, createdAt: new Date() });
      user = { _id: result.insertedId };
    } else {
      user = await users.findOne({ email });
      if (!user || typeof user.passwordHash !== "string" || !(await compare(password, user.passwordHash))) {
        return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
      }
    }

    const token = await createSession(user._id.toString());
    (await cookies()).set(SESSION_COOKIE, token, cookieOptions);
    return Response.json({ user: { id: user._id.toString(), email } });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return Response.json({ error: "An account with that email already exists." }, { status: 409 });
    }
    return Response.json({ error: "Unable to sign in. Check MongoDB and session configuration." }, { status: 503 });
  }
}

export async function DELETE() {
  (await cookies()).set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return Response.json({ ok: true });
}