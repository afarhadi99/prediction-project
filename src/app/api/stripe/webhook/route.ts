import Stripe from "stripe";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: "Stripe webhooks are not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return Response.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  try {
    const users = (await getDb()).collection("users");
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (userId && ObjectId.isValid(userId)) {
        await users.updateOne({ _id: new ObjectId(userId) }, { $set: {
          stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
          stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
          subscriptionStatus: "active",
          subscriptionUpdatedAt: new Date(),
        } });
      }
    } else if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      await users.updateOne({ stripeCustomerId: String(subscription.customer) }, { $set: {
        subscriptionStatus: subscription.status,
        subscriptionUpdatedAt: new Date(),
      } });
    }
    return Response.json({ received: true });
  } catch {
    return Response.json({ error: "Unable to update the subscription record." }, { status: 500 });
  }
}