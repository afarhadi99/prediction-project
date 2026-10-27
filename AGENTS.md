<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md for Formline

This repository is a Next.js 16 application using the App Router and React 19. The codebase is a sports prediction dashboard with live score data, AI-assisted forecasting, guest and authenticated user flows, and Stripe subscriptions. Any work here should be grounded in the actual project structure and should favor small, reviewable changes over broad rewrites.

## Project overview

Formline is a live multi-sport scoreboard and prediction dashboard. The main value proposition is:
- Display live sports data from ESPN for several leagues and competitions.
- Show transparent baseline predictions based on known signals like win rate, home advantage, injuries, and score margin.
- Optionally enhance predictions with OpenRouter-based AI analysis.
- Store historical game results in MongoDB.
- Support guest favorites/colors and authenticated user profiles.
- Offer a Stripe subscription flow for premium functionality.

This app is intentionally a hybrid of server-rendered pages, route handlers, cached data access, and client-side interactivity.

## Required reading before making code changes

Before editing files or implementing features, review the relevant Next.js docs in `node_modules/next/dist/docs/` to confirm the API shape for the version installed in this repo. In particular, understand the App Router conventions and the differences from older Next.js patterns. This project uses:
- Next.js 16
- React 19
- App Router (`src/app/`)
- TypeScript
- Tailwind CSS v4
- shadcn/ui patterns

Do not rely on patterns from older Next.js versions (Pages Router, legacy `getServerSideProps`, older route behavior, etc.) without checking the installed documentation.

## Repository structure

Key files and directories:
- `src/app/` — application routes and route handlers
  - `src/app/page.tsx` — home page
  - `src/app/layout.tsx` — root layout and metadata
  - `src/app/api/` — REST handlers for auth, games, profile, Stripe checkout, and webhook processing
- `src/components/` — UI components, especially the dashboard UI and shared primitives
- `src/lib/` — shared integration and utility modules
  - `sports.ts` — sports/game data types and prediction logic
  - `mongodb.ts` — MongoDB access and historical data archiving
  - `auth.ts` — signed-session cookie logic
  - `openrouter.ts` — AI prediction integration
  - `demo-games.ts` — fallback demo fixtures
  - `utils.ts` — shared helper functions
- `next.config.ts` — Next.js config, remote image patterns, and experimental flags
- `README.md` — product overview and environment expectations
- `.env.local` — local secrets, required but not committed

## Local development workflow

Use the following commands in order:

1. Install dependencies:
   - `npm install`
2. Configure environment variables in `.env.local` using the expected keys from the project docs and sample env setup.
3. Run the app locally:
   - `npm run dev`
4. Validate before finishing:
   - `npm run lint`
   - `npm run build` when the change affects app behavior, routing, or integration code

The app is normally served on `http://localhost:3000`.

## Environment and security expectations

- Keep `.env.local` private and never commit secrets.
- Do not hardcode API keys, session secrets, or Stripe values.
- `SESSION_SECRET` is required for authenticated behavior in production and is tolerated locally with a dev fallback.
- MongoDB, Stripe, and OpenRouter are optional for exploration but required for full account and payment flows.
- Webhooks and user-facing auth flows must be treated carefully; verify signatures and avoid trusting user input.

## Architecture guidance for agents

When implementing features or fixing bugs, follow these conventions:

### Prefer App Router patterns
- Use route handlers under `src/app/api/**/route.ts` for API endpoints.
- Keep page components in `src/app/**/page.tsx` as server-first unless interactivity truly requires a client component.
- Use server components by default and make client components explicit only when needed.
- Avoid legacy Next.js patterns such as pages-router files, `getServerSideProps`, or old `next/head` conventions unless explicitly required.

### Keep data access explicit and safe
- Access MongoDB through `src/lib/mongodb.ts` helpers instead of ad hoc connection logic.
- Respect typed models from `src/lib/sports.ts` and reuse existing interfaces instead of creating shape drift.
- Validate inputs at route boundaries and fail gracefully when data is missing or an upstream service fails.
- Treat ESPN/OpenRouter responses as external data: parse defensively and avoid assumptions about fields always being present.

### Styling and component conventions
- Use Tailwind utility classes as the default styling approach.
- Keep new UI in `src/components/` and reusable primitives in the UI folder if they are shared.
- Match the project’s dark, dashboard-style aesthetic and avoid introducing unrelated visual patterns.
- Prefer small targeted CSS modifications in `src/app/globals.css` or `src/app/dashboard.css` only when needed.

### Auth and user state
- Do not bypass the existing session utilities in `src/lib/auth.ts`.
- Preserve the signed-cookie workflow and avoid introducing insecure token behavior.
- Guest favorites and color preferences should remain scoped correctly to the browser unless the user signs in.

### Integrations
This app integrates with several external systems; make changes with respect to those contracts:
- ESPN scoreboard and news feeds
- OpenRouter AI prediction analysis
- MongoDB persistence for users and historical games
- Stripe Checkout and webhook processing

When modifying these flows, ensure the change remains compatible with the current environment variable usage and does not break the existing optional integration model.

## Coding expectations

- Make surgical changes. Avoid unrelated refactors or large formatting-only edits.
- Keep code readable and consistent with the repo’s existing TypeScript style.
- Preserve React keys, component boundaries, and server/client split decisions.
- Prefer the use of existing helper functions and libraries already present in the project.
- Do not add dependencies without a clear need.
- Keep all changes review-friendly and scoped to the task.

## Validation requirements

Before considering a task complete, verify the relevant behavior with the smallest appropriate command:
- `npm run lint` for code quality and TypeScript/ESLint issues
- `npm run build` for full project validation when routing or integration logic changes

If the repo is already passing and the fix is local, a focused validation is preferred over a broad suite.

## Working style

- Start by identifying the exact file and behavior to modify.
- Read the minimum relevant files needed for the change.
- Patch only the needed code and keep changes localized.
- Re-run validation after the patch.
- Report what changed and any caveats or follow-up work clearly.

## Important guardrails

- Do not remove the `nextjs-agent-rules` block above.
- Do not claim compatibility with old Next.js assumptions without checking the installed docs.
- Do not commit secrets or environment files.
- Do not broaden the scope beyond the requested task.
- Do not rewrite the application architecture unless the user explicitly asks for major refactoring.

This project is a modern Next.js application with a polished dashboard UI and multiple external integrations. Treat it as a production-oriented codebase that should remain understandable, secure, and easy to maintain.
