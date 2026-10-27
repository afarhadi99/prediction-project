"use client";

import Image from "next/image";
import { startTransition, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { Activity, ArrowUpRight, Check, Clock3, Heart, LoaderCircle, LogOut, RefreshCw, Search, Settings2, ShieldCheck, Sparkles, Star, Trophy, UserRound, X, Zap } from "lucide-react";
import type { Game, LeagueId } from "@/lib/sports";

type Theme = { primary: string; accent: string };
type User = { id: string; email: string };
type View = "all" | "live" | "upcoming" | "final" | "following";
const DEFAULT_THEME: Theme = { primary: "#006BB6", accent: "#F58426" };
const THEMES = [
  { name: "Knicks", primary: "#006BB6", accent: "#F58426" },
  { name: "Celtics", primary: "#007A33", accent: "#BA9653" },
  { name: "Lakers", primary: "#552583", accent: "#FDB927" },
  { name: "Heat", primary: "#98002E", accent: "#F9A01B" },
  { name: "Mavericks", primary: "#00538C", accent: "#B8C4CA" },
];
const LEAGUES: { id: LeagueId; label: string; mark: string }[] = [
  { id: "nba", label: "NBA", mark: "B" }, { id: "nfl", label: "NFL", mark: "F" },
  { id: "nhl", label: "NHL", mark: "H" }, { id: "mlb", label: "MLB", mark: "M" },
  { id: "pl", label: "Premier League", mark: "PL" }, { id: "laliga", label: "La Liga", mark: "LL" },
  { id: "seriea", label: "Serie A", mark: "SA" }, { id: "ucl", label: "Champions League", mark: "UCL" },
];

function isTheme(value: unknown): value is Theme {
  if (!value || typeof value !== "object") return false;
  const colors = value as Record<string, unknown>;
  return [colors.primary, colors.accent].every((color) => typeof color === "string" && /^#[\da-f]{6}$/i.test(color));
}

function TeamMark({ team }: { team: Game["home"] }) {
  const [failed, setFailed] = useState(false);
  return <span className="team-mark">{team.logo && !failed ? <Image src={team.logo} alt="" fill sizes="40px" unoptimized onError={() => setFailed(true)} /> : team.abbreviation}</span>;
}

function GameCard({ game, favorites, onFavorite }: { game: Game; favorites: Set<string>; onFavorite: (id: string) => void }) {
  const live = game.statusState === "in";
  return (
    <article className={`game-card${live ? " is-live" : ""}`}>
      <header className="game-card-head"><div className="game-meta"><span className="league-tag">{game.league}</span><span className={`game-state${live ? " state-live" : ""}`}>{live && <i className="live-dot" />}{live ? game.status : game.statusState === "post" ? "Final" : new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(game.date))}</span></div><span className={`source-tag${game.prediction.source === "openrouter" ? " source-ai" : ""}`}>{game.prediction.source === "openrouter" ? <Sparkles size={12} /> : <Activity size={12} />}{game.prediction.source === "openrouter" ? "AI model" : "Formline model"}</span></header>
      <div className="matchup">
        {[game.away, game.home].map((team) => <div className="team-row" key={team.id}><TeamMark team={team} /><div className="team-copy"><b className="team-name">{team.name}</b><span className="team-record">{team.record || "Record unavailable"}</span></div><button className={`team-follow${favorites.has(team.id) ? " followed" : ""}`} aria-label={`${favorites.has(team.id) ? "Unfollow" : "Follow"} ${team.name}`} aria-pressed={favorites.has(team.id)} onClick={() => onFavorite(team.id)}><Star size={15} fill={favorites.has(team.id) ? "currentColor" : "none"} /></button><strong className={`team-score${team.winner ? " winner-score" : ""}`}>{team.score ?? "—"}</strong></div>)}
      </div>
      <div className="prediction-block"><div className="prediction-caption"><span>WIN PROBABILITY</span><span className="confidence-label"><ShieldCheck size={13} /> {game.prediction.confidence}% confidence</span></div><div className="probability-line"><span className="probability-home" style={{ width: `${game.prediction.homeProbability}%` }} /><span className="probability-away" style={{ width: `${game.prediction.awayProbability}%` }} /></div><div className="probability-labels"><span><b>{game.prediction.awayProbability}%</b> {game.away.abbreviation}</span><span>{game.home.abbreviation} <b>{game.prediction.homeProbability}%</b></span></div></div>
      <p className="game-reason">{game.prediction.reason}</p>
      {game.news[0] && <div className="news-note"><Zap size={13} /><span>{game.news[0]}</span></div>}
    </article>
  );
}

export function Dashboard({ initialGames }: { initialGames: Game[] }) {
  const [games, setGames] = useState(initialGames);
  const [league, setLeague] = useState<"all" | LeagueId>("all");
  const [view, setView] = useState<View>("all");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [draftTheme, setDraftTheme] = useState(DEFAULT_THEME);
  const [user, setUser] = useState<User | null>(null);
  const [updated, setUpdated] = useState("");
  const [source, setSource] = useState<"espn" | "sample">("sample");
  const [ai, setAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<"account" | "colors" | "upgrade" | null>(null);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh(withAi: boolean) {
    try {
      const response = await fetch(`/api/games${withAi ? "?ai=1" : ""}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json() as { games: Game[]; source: "espn" | "sample"; aiEnabled: boolean; updatedAt: string };
      setGames(data.games); setSource(data.source); setAi(data.aiEnabled); setUpdated(data.updatedAt);
    } catch { setMessage("Could not reach the live scoreboard. Showing the last available slate."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem("formline:favorites");
      const savedTheme = localStorage.getItem("formline:theme");
      if (savedFavorites) startTransition(() => setFavorites(new Set(JSON.parse(savedFavorites) as string[])));
      if (savedTheme) { const parsed: unknown = JSON.parse(savedTheme); if (isTheme(parsed)) startTransition(() => setTheme(parsed)); }
    } catch { localStorage.removeItem("formline:favorites"); localStorage.removeItem("formline:theme"); }
    void Promise.resolve().then(() => refresh(true));
    void fetch("/api/auth", { cache: "no-store" }).then((response) => response.json()).then((data: { user?: (User & { favorites?: string[]; theme?: Theme | null }) | null }) => {
      if (!data.user) return;
      setUser({ id: data.user.id, email: data.user.email });
      if (data.user.favorites) setFavorites(new Set(data.user.favorites));
      if (isTheme(data.user.theme)) setTheme(data.user.theme);
    }).catch(() => undefined);
    const timer = window.setInterval(() => void refresh(false), 120000);
    return () => window.clearInterval(timer);
  }, []);

  const liveCount = games.filter((game) => game.statusState === "in").length;
  const followingCount = games.filter((game) => favorites.has(game.home.id) || favorites.has(game.away.id)).length;
  const filtered = useMemo(() => games.filter((game) => {
    const leagueMatches = league === "all" || game.leagueId === league;
    const viewMatches = view === "all" || (view === "live" && game.statusState === "in") || (view === "upcoming" && game.statusState === "pre") || (view === "final" && game.statusState === "post") || (view === "following" && (favorites.has(game.home.id) || favorites.has(game.away.id)));
    return leagueMatches && viewMatches && `${game.home.name} ${game.away.name} ${game.league}`.toLowerCase().includes(query.trim().toLowerCase());
  }), [games, league, view, favorites, query]);
  const featured = games.find((game) => game.statusState === "in") ?? games[0];
  const style = { "--theme-primary": theme.primary, "--theme-accent": theme.accent } as CSSProperties;

  async function toggleFavorite(id: string) {
    const next = new Set(favorites);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFavorites(next); localStorage.setItem("formline:favorites", JSON.stringify([...next]));
    if (user) await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ favorites: [...next] }) });
  }

  async function saveTheme(next: Theme) {
    setTheme(next); localStorage.setItem("formline:theme", JSON.stringify(next));
    if (user) await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: next }) });
    setDialog(null);
  }

  function openColors() {
    setDraftTheme(theme);
    setDialog("colors");
  }

  async function accountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const values = new FormData(event.currentTarget);
    const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: registering ? "register" : "login", email: values.get("email"), password: values.get("password") }) });
    const data = await response.json() as { user?: User; error?: string };
    if (!response.ok || !data.user) { setMessage(data.error ?? "Unable to sign in."); return; }
    setUser(data.user); setDialog(null); setMessage("Signed in. Preferences are ready to sync.");
    const profileResponse = await fetch("/api/profile", { cache: "no-store" });
    if (profileResponse.ok) {
      const profile = await profileResponse.json() as { favorites?: string[]; theme?: Theme | null };
      if (profile.favorites) {
        setFavorites(new Set(profile.favorites));
        localStorage.setItem("formline:favorites", JSON.stringify(profile.favorites));
      }
      if (isTheme(profile.theme)) {
        setTheme(profile.theme);
        localStorage.setItem("formline:theme", JSON.stringify(profile.theme));
      }
    }
  }

  async function checkout() {
    const response = await fetch("/api/checkout", { method: "POST" });
    const data = await response.json() as { url?: string; error?: string };
    if (data.url) window.location.assign(data.url); else setMessage(data.error ?? "Checkout is unavailable.");
  }

  async function signOut() {
    await fetch("/api/auth", { method: "DELETE" }); setUser(null); setDialog(null);
  }

  return (
    <div className="app-shell" style={style}>
      <aside className="sidebar">
        <a className="brand" href="#top"><span className="brand-mark">F<span>.</span></span><span className="brand-name">formline</span></a>
        <div className="side-label">YOUR BOARD</div>
        <nav className="primary-nav" aria-label="Scoreboard views">
          <button className={`nav-item${view === "all" ? " nav-active" : ""}`} onClick={() => { setView("all"); setLeague("all"); }}><Activity size={17} /><span>Today&apos;s slate</span><span className="nav-count">{games.length}</span></button>
          <button className={`nav-item${view === "live" ? " nav-active" : ""}`} onClick={() => { setView("live"); setLeague("all"); }}><i className="nav-live-dot" /><span>Live now</span><span className="nav-count">{liveCount}</span></button>
          <button className={`nav-item${view === "following" ? " nav-active" : ""}`} onClick={() => { setView("following"); setLeague("all"); }}><Heart size={17} /><span>Following</span><span className="nav-count">{followingCount}</span></button>
        </nav>
        <div className="side-label league-heading">LEAGUES</div>
        <nav className="league-nav" aria-label="Sports leagues">{LEAGUES.map((item) => <button className={`league-item${league === item.id ? " league-active" : ""}`} key={item.id} onClick={() => { setLeague(item.id); setView("all"); }}><span className="league-mark">{item.mark}</span><span>{item.label}</span></button>)}</nav>
        <div className="sidebar-bottom"><button className="sidebar-tool" onClick={openColors}><Settings2 size={16} />Team colors</button><div className="side-account"><span className="account-avatar">{user ? user.email.slice(0, 1).toUpperCase() : <UserRound size={17} />}</span><span className="account-copy"><b>{user ? user.email.split("@")[0] : "Guest"}</b><small>{user ? "Account synced" : "Preferences on device"}</small></span>{user ? <button className="account-action" onClick={signOut} aria-label="Sign out"><LogOut size={16} /></button> : <button className="account-action" onClick={() => setDialog("account")} aria-label="Sign in"><ArrowUpRight size={17} /></button>}</div></div>
      </aside>

      <main id="top" className="main-stage">
        <header className="topbar"><div className="date-stamp"><span className="date-kicker">THE DAILY BOARD</span><span>{updated ? new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(updated)) : "Loading today's board"}</span></div><div className="topbar-actions"><div className="sync-status"><i className="sync-dot" />{updated ? `Updated ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(updated))}` : "Connecting to scoreboard"}</div><button className="icon-button" onClick={() => { setBusy(true); void refresh(true); }} disabled={busy} aria-label="Refresh scores and predictions" title="Refresh scores and predictions">{busy ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />}</button><button className="theme-button" onClick={openColors}><span className="theme-swatch" />Colors</button>{user ? <button className="signin-button" onClick={() => setDialog("upgrade")}><Sparkles size={15} />Upgrade</button> : <button className="signin-button" onClick={() => setDialog("account")}><UserRound size={15} />Sign in</button>}</div></header>
        <div className="content-wrap">
          {source === "sample" && <div className="preview-banner"><span className="preview-icon"><Zap size={15} /></span><span><b>Preview board</b> · Live ESPN data will appear when the feed is available.</span><button onClick={() => { setBusy(true); void refresh(true); }}>Try again <ArrowUpRight size={13} /></button></div>}
          {message && <div className="status-banner" role="status"><span>{message}</span><button onClick={() => setMessage("")} aria-label="Dismiss"><X size={14} /></button></div>}
          <section className="welcome-row"><div><div className="eyebrow"><i className="eyebrow-line" /> SPORTS, WITH SIGNAL</div><h1>The daily slate<span className="title-period">.</span></h1><p className="welcome-copy">Live scores and transparent predictions across the games you follow.</p></div><div className="quick-stats"><div className="quick-stat"><span className="stat-icon live-stat-icon"><Activity size={16} /></span><b>{liveCount.toString().padStart(2, "0")}</b><small>LIVE GAMES</small></div><i className="stat-rule" /><div className="quick-stat"><span className="stat-icon"><Trophy size={16} /></span><b>{games.length.toString().padStart(2, "0")}</b><small>ON THE BOARD</small></div></div></section>
          <div className="feature-strip"><div className="feature-copy"><span className="feature-icon"><Sparkles size={16} /></span><div><b>{ai ? "AI analysis is on" : "Explainable predictions"}</b><small>{ai ? "Structured OpenRouter analysis refined this slate." : "Team records, home advantage, availability and live score."}</small></div></div><span className="feature-note">{ai ? "OPENROUTER" : "BASELINE MODEL"}</span>{featured && <div className="feature-pick"><span>TOP EDGE</span><b>{featured.prediction.pick === "home" ? featured.home.shortName : featured.away.shortName}</b><strong>{featured.prediction.confidence}%</strong></div>}</div>
          <section className="board-section" aria-label="Games and predictions"><div className="board-heading"><div><h2>Games &amp; predictions</h2><span className="board-count">{filtered.length} {filtered.length === 1 ? "matchup" : "matchups"}</span></div><label className="search-field"><Search size={16} /><input aria-label="Search teams" placeholder="Find a team" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
            <div className="filter-row"><div className="filter-tabs" role="tablist" aria-label="Filter games">{(["all", "live", "upcoming", "final", "following"] as View[]).map((item) => <button role="tab" aria-selected={view === item} className={`filter-tab${view === item ? " filter-selected" : ""}`} key={item} onClick={() => setView(item)}>{item === "all" ? "All games" : item[0].toUpperCase() + item.slice(1)}{item === "live" && liveCount > 0 && <span className="tab-live-count">{liveCount}</span>}</button>)}</div><span className="refresh-note"><Clock3 size={13} />Auto refresh · 2 min</span></div>
            {filtered.length ? <div className="games-grid">{filtered.map((game) => <GameCard key={game.id} game={game} favorites={favorites} onFavorite={(id) => void toggleFavorite(id)} />)}</div> : <div className="empty-state"><span className="empty-icon"><Heart size={20} /></span><b>No matchups in this view</b><p>Try another league or filter, or follow a team to build your board.</p><button onClick={() => { setView("all"); setLeague("all"); setQuery(""); }}>Show all games <ArrowUpRight size={14} /></button></div>}
          </section>
          <footer className="page-footer"><span>FORMLINE · DATA FROM ESPN</span><span>Predictions are estimates, not guarantees.</span><span>{ai ? <><Sparkles size={12} />OpenRouter structured output</> : <><Check size={12} />Model updates with the scoreboard</>}</span></footer>
        </div>
      </main>

      {dialog && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setDialog(null); setMessage(""); } }}><section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={() => setDialog(null)} aria-label="Close"><X size={18} /></button>
        {dialog === "account" && <><span className="modal-kicker"><UserRound size={15} /> YOUR FORMLINE</span><h2 id="modal-title">{registering ? "Create your account" : "Welcome back"}</h2><p className="modal-description">Sync followed teams and your colorway across devices.</p><form className="account-form" onSubmit={(event) => void accountSubmit(event)}><label>Email address<input autoComplete="email" name="email" type="email" placeholder="you@example.com" required /></label><label>Password<input autoComplete={registering ? "new-password" : "current-password"} name="password" type="password" placeholder="At least 8 characters" minLength={8} required /></label>{message && <p className="form-error" role="alert">{message}</p>}<button className="modal-primary" type="submit">{registering ? "Create account" : "Sign in"}<ArrowUpRight size={16} /></button></form><p className="modal-toggle">{registering ? "Already have an account?" : "New to Formline?"} <button onClick={() => { setRegistering(!registering); setMessage(""); }}>{registering ? "Sign in" : "Create an account"}</button></p></>}
        {dialog === "colors" && <><span className="modal-kicker"><Settings2 size={15} /> PERSONALIZE</span><h2 id="modal-title">Pick your colors</h2><p className="modal-description">{user ? "Saved to your account and used across your board." : "Saved on this device. Sign in to sync your colorway."}</p><div className="theme-options">{THEMES.map((choice) => { const selected = choice.primary === theme.primary && choice.accent === theme.accent; return <button key={choice.name} className={`theme-option${selected ? " theme-option-selected" : ""}`} onClick={() => void saveTheme(choice)} aria-pressed={selected}><span className="theme-colors"><i style={{ backgroundColor: choice.primary }} /><i style={{ backgroundColor: choice.accent }} /></span><span>{choice.name}</span>{selected && <Check size={16} />}</button>; })}</div><div className="custom-colors"><label>Primary<input aria-label="Primary color" type="color" value={draftTheme.primary} onChange={(event) => setDraftTheme({ ...draftTheme, primary: event.target.value })} /></label><label>Accent<input aria-label="Accent color" type="color" value={draftTheme.accent} onChange={(event) => setDraftTheme({ ...draftTheme, accent: event.target.value })} /></label></div><button className="modal-primary custom-save" onClick={() => void saveTheme(draftTheme)}>Save custom colors</button><button className="reset-theme" onClick={() => void saveTheme(DEFAULT_THEME)}>Reset to Knicks colors</button></>}
        {dialog === "upgrade" && <><span className="modal-kicker"><Sparkles size={15} /> FORMLINE PLUS</span><h2 id="modal-title">More signal, less noise.</h2><p className="modal-description">Get deeper matchup breakdowns and keep your board in sync.</p><div className="upgrade-points"><span><Check size={15} />AI matchup analysis</span><span><Check size={15} />Follow teams across devices</span><span><Check size={15} />Full historic game archive</span></div>{message && <p className="form-error" role="alert">{message}</p>}<button className="modal-primary" onClick={() => void checkout()}><CreditCardIcon />Continue to secure checkout</button><p className="fine-print">Subscription pricing is shown securely in Stripe Checkout.</p></>}
      </section></div>}
    </div>
  );
}

function CreditCardIcon() {
  return <Sparkles size={16} />;
}