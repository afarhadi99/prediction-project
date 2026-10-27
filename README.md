# Formline

Formline is a live multi-sport scoreboard and prediction dashboard built with Next.js, shadcn/ui, Lucide, MongoDB, Stripe, and OpenRouter.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and configure the services you want to enable.
3. Start the app with `npm run dev` and open `http://localhost:3000`.

The public ESPN scoreboard and news endpoints do not require an API key. When ESPN is unavailable or has no events for today, the board shows clearly labeled preview fixtures. MongoDB, OpenRouter, and Stripe are optional for local exploration; account creation requires MongoDB and a production `SESSION_SECRET`.

## Integrations

- ESPN scoreboard and news data covers NBA, NFL, NHL, MLB, Premier League, La Liga, Serie A, and UEFA Champions League. Feeds are requested without caching on page load/manual refresh and refreshed in the browser every two minutes.
- The baseline prediction is a transparent logistic model using season win rate, home advantage, available injury notes, and live score margin. OpenRouter can refine up to 12 non-final games with a strict JSON Schema response. AI analysis runs on initial load and manual refresh only; periodic refreshes use the baseline model.
- Completed ESPN games are written once to MongoDB `historicalGames`, keyed by ESPN event ID. `$setOnInsert` preserves the original archived result. User records in `users` store bcrypt password hashes, favorites, colorway, and Stripe subscription metadata.
- Guest favorites and colors stay in the current browser. Signing in syncs those preferences to MongoDB. Sessions use an HTTP-only signed cookie.
- Stripe Checkout is configured as a subscription using `STRIPE_PRICE_ID`. Configure the webhook at `/api/stripe/webhook` for `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`.

ESPN availability varies by event and sport. Starting lineups, injury reports, records, and team news are only included when present in the public feed; unconfirmed information is not inferred. Prediction probabilities are estimates, not guarantees or betting advice.

## Environment variables

See `.env.example`. Keep `.env.local` private and never commit API keys or secrets.