import Stripe from "stripe";
import { ObjectId } from "mongodb";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return Response.json({ error: "Sign in before starting a subscription." }, { status: 401 });
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
    return Response.json({ error: "Stripe is not configured yet." }, { status: 503 });
  }

  try {
    const users = (await getDb()).collection("users");
    const user = await users.findOne({ _id: new ObjectId(userId) }, { projection: { email: 1, stripeCustomerId: 1 } });
    if (!user) return Response.json({ error: "Account not found." }, { status: 404 });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      customer: typeof user.stripeCustomerId === "string" ? user.stripeCustomerId : undefined,
      customer_email: typeof user.stripeCustomerId === "string" ? undefined : user.email,
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
      metadata: { userId },
    });
    return Response.json({ url: session.url });
  } catch {
    return Response.json({ error: "Unable to create a checkout session." }, { status: 502 });
  }
}