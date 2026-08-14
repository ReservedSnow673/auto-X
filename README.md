# auto-x

Vercel-hosted X (Twitter) home-feed engagement bot. No UI. Scrolls your feed, likes posts, and leaves short human-like replies using OpenAI `gpt-5-nano`. Does **not** use the X API.

## How it works

```text
Vercel Cron (daily) → GET /api/cron
  → Playwright + Chromium (cookie session)
  → scroll x.com/home
  → safety filter + gpt-5-nano decide
  → like and/or short reply
```

| Piece | Choice |
| --- | --- |
| Host | Vercel Functions + Cron |
| Browser | `playwright-core` + `@sparticuz/chromium` |
| Auth | `auth_token` + `ct0` cookies (not username/password) |
| Model | `gpt-5-nano` (cheapest current OpenAI text model) |
| Actions | Likes + short replies |

## Important risk

Automating X through the web UI (instead of the official API) **violates X's Terms of Service** and can get the account suspended. Keep volume low, start with `DRY_RUN=true`, and use this only on an account you accept may be banned.

## Setup

### 1. Install

```bash
npm install
cp .env.example .env
```

### 2. X cookies

1. Log into [x.com](https://x.com) in Chrome.
2. DevTools → **Application** → **Cookies** → `https://x.com`
3. Copy `auth_token` and `ct0` into `.env` as `X_AUTH_TOKEN` and `X_CT0`.

Refresh these if the bot starts redirecting to login.

### 3. Secrets

Set in `.env` (local) and Vercel Project → Settings → Environment Variables (production):

| Variable | Required | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | yes | OpenAI key |
| `OPENAI_MODEL` | no | Default `gpt-5-nano` |
| `X_AUTH_TOKEN` | yes | Session cookie |
| `X_CT0` | yes | CSRF cookie |
| `CRON_SECRET` | yes | Protects `/api/cron` and `/api/engage` |
| `DRY_RUN` | no | Default `true` — set `false` to actually like/reply |
| `MAX_LIKES` | no | Default `3` per run |
| `MAX_REPLIES` | no | Default `2` per run |
| `MAX_CANDIDATES` | no | Default `8` posts scanned |
| `MIN_DELAY_MS` / `MAX_DELAY_MS` | no | Human-like pauses |
| `SCROLL_ROUNDS` | no | Default `3` |

### 4. Deploy on Vercel

```bash
npx vercel --prod
```

Or connect the GitHub repo in the Vercel dashboard and add the env vars.

Cron is configured in [`vercel.json`](vercel.json) as **once daily at 15:00 UTC** (Hobby-compatible). On Pro you can change the schedule to run more often (e.g. `0 */6 * * *`).

When `CRON_SECRET` is set, Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically.

### 5. Manual run

```bash
curl -X POST "https://YOUR_DEPLOYMENT.vercel.app/api/engage" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dryRun":true,"maxLikes":1,"maxReplies":1}'
```

Local (needs Chromium via Playwright):

```bash
npx playwright install chromium
npm run engage
```

## Behavior

- Skips empty / very short / shouting / multi-link / keyword-risky posts (politics, hostility, NSFW, etc.)
- Asks `gpt-5-nano` for a structured decide: engage? like? reply text?
- Replies are capped ~220 chars and prompted to stay crisp, specific, and non-controversial
- Caps likes/replies per run and inserts random delays

## Project layout

```text
app/api/cron/route.ts    # Vercel Cron entry
app/api/engage/route.ts  # Manual trigger
src/engage.ts            # Orchestrator
src/browser.ts           # Chromium session + cookies
src/feed.ts              # Scroll + extract posts
src/interact.ts          # Like / reply via UI
src/llm.ts               # gpt-5-nano decisions
src/safety.ts            # Pre-filter
src/config.ts            # Env parsing
```

## Limits to expect

- Vercel Hobby: cron max **once per day**; function max **300s**
- X UI selectors (`data-testid`) can change and break the bot — update `src/feed.ts` / `src/interact.ts` if that happens
- Datacenter IPs may hit extra challenges; cookie sessions expire
