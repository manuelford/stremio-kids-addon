# Project Context for AI Agents

> This file contains everything an AI agent needs to understand, maintain, and extend this project without prior context.

## What is this project?

A **Stremio addon** that provides children-only content catalogs. It adds 8 catalogs to Stremio organized by age range (0+, 6+, 9+, 12+), each with Movies and Series. Content is filtered using real MPAA/TV Parental Guidelines ratings from the TMDB API. Horror is excluded across all age ranges.

**This addon does NOT provide streams** — only catalogs and metadata. Streams come from other addons the user has installed (Torrentio, etc.).

## Live URLs

| What | URL |
|------|-----|
| Addon (live) | https://stremio-kids-addon.onrender.com |
| Manifest | https://stremio-kids-addon.onrender.com/manifest.json |
| GitHub repo | https://github.com/manuelford/stremio-kids-addon |
| Render dashboard | https://dashboard.render.com (login as manuelford via GitHub) |
| Stremio store | Published via `publishToCentral` API |

## Architecture

```
server.js                  ← Express server (custom, NOT using SDK's serveHTTP)
├── getRouter (SDK)        ← Handles /manifest.json, /catalog/*, /meta/*
├── GET /                  ← Custom landing page (public/index.html)
└── /public/*              ← Static assets (favicon, etc.)

lib/
├── config.js              ← Loads env vars (TMDB_API_TOKEN, PORT)
├── manifest.js            ← Addon manifest definition (8 catalogs)
├── cache.js               ← In-memory cache with TTL (Map-based)
├── tmdb.js                ← TMDB API client (core logic)
├── catalogHandler.js      ← Handles Stremio catalog requests
└── metaHandler.js         ← Handles Stremio meta (detail) requests

public/
├── index.html             ← Custom landing page (replaces SDK default)
└── favicon.svg            ← SVG icon used as logo in Stremio
```

### Why custom Express instead of SDK's serveHTTP?

The SDK's `serveHTTP()` generates a hardcoded landing page from `landingTemplate.js` that cannot be customized (HTML/CSS is embedded). We use the SDK's `getRouter()` directly to get the API routes, and serve our own landing page on `/`.

```js
// What we do (server.js):
const getRouter = require('stremio-addon-sdk/src/getRouter');
app.get('/', (req, res) => res.sendFile('public/index.html'));
app.use('/public', express.static('public'));
app.use(getRouter(builder.getInterface()));

// What we DON'T use:
// serveHTTP(builder.getInterface(), { port: PORT });
```

**Important:** The landing page and static assets routes MUST be registered BEFORE `getRouter()`, otherwise the SDK's catch-all regex route intercepts them and returns 404.

## Content Filtering Logic

### Age ranges and certifications

```
Age 0+:  Movies: G          | TV: TV-Y
Age 6+:  Movies: G, PG      | TV: TV-Y, TV-Y7, TV-G
Age 9+:  Movies: G, PG      | TV: TV-Y, TV-Y7, TV-G, TV-PG
Age 12+: Movies: G, PG, PG-13 | TV: TV-Y, TV-Y7, TV-G, TV-PG, TV-14
```

### Genre restrictions by age

```
Age 0+:  Animation | Family only (TMDB genre IDs: 16|10751)
Age 6+:  Animation | Family only (16|10751)
Age 9+:  Animation | Family | Adventure | Fantasy | Comedy (16|10751|12|14|35)
Age 12+: No genre restriction (all genres allowed)
```

### Horror exclusion

All age ranges exclude Horror genre (TMDB genre ID 27) via `without_genres=27`.

### Critical: explicit certifications, NOT certification.lte

We use `certification=G|PG` (explicit pipe-separated values), **NOT** `certification.lte=PG`. The `.lte` parameter includes NR (Not Rated) content which lets inappropriate films through. This was a critical bug fix.

## TMDB API Details

- **API version**: v3
- **Auth**: Bearer token in `Authorization` header (not API key query param)
- **Token location**: `process.env.TMDB_API_TOKEN` (set in .env locally, Render env var in production)
- **Certification country**: Always `US` (MPAA for movies, TV Parental Guidelines for series)
- **Rate limiting**: TMDB allows ~40 requests/second. Our cache minimizes API calls.

### Key TMDB endpoints used

| Endpoint | Used for |
|----------|----------|
| `/discover/movie` | Catalog browsing with certification + genre filters |
| `/discover/tv` | Same for TV series |
| `/search/movie` | Search functionality (results verified against certifications) |
| `/search/tv` | Same for TV series |
| `/movie/{id}` | Full movie details + credits |
| `/tv/{id}` | Full series details + credits |
| `/tv/{id}/season/{n}` | Episode listings per season |
| `/find/{imdb_id}` | Resolve IMDb ID to TMDB ID |
| `/movie/{id}/external_ids` | Get IMDb ID from TMDB ID |
| `/tv/{id}/external_ids` | Same for TV series |

### Cache TTLs (lib/cache.js)

| Content | TTL |
|---------|-----|
| Catalog results | 4 hours |
| Movie/TV details | 24 hours |
| External ID mappings | 7 days |
| Search results | 1 hour |

## Hosting & Deployment

### Render.com (current)

- **Plan**: Free ($0/month)
- **Auto-deploy**: NO (public repo, not connected via Git provider). Must use Manual Deploy.
- **Cold start**: Server sleeps after ~15 min inactivity. First request takes ~30s to wake up.
- **PORT**: Render sets its own PORT env var (usually 10000). Our config.js reads it.
- **Env vars**: `TMDB_API_TOKEN` is set in Render's Environment section.

### How to redeploy

1. Make changes locally
2. `git add <files> && git commit -m "message"`
3. `git push origin main`
4. Go to Render dashboard → Manual Deploy → Deploy latest commit
5. Wait ~1-2 minutes for build + deploy

### Beamup (Stremio's hosting) — NOT WORKING

Beamup uses SSH/Dokku for deployment. The SSH server at `beamup.dev:22` was unreachable ("No route to host") as of Feb 2026. Config saved at `/Users/manuel/beamup-config.json`. If it comes back online, deploy with `beamup deploy`.

## Publishing to Stremio Store

The addon is published to Stremio's central addon registry. To re-publish (e.g., after URL change):

```bash
curl -X POST "https://api.strem.io/api/addonPublish" \
  -H "Content-Type: application/json" \
  -d '{"transportUrl":"https://stremio-kids-addon.onrender.com/manifest.json","transportName":"http"}'
```

Expected response: `{"result":{"success":true}}`

## Key Design Decisions & Why

1. **No `certification.lte`**: Using explicit cert values prevents unrated (NR) content from appearing. This was the biggest content safety fix.

2. **Genre restrictions for young ages**: Old movies like "Gone with the Wind" have G ratings but aren't suitable for toddlers. Restricting 0+ and 6+ to Animation/Family genres solves this.

3. **Horror excluded everywhere**: Even PG-13 horror films (like "Five Nights at Freddy's") are inappropriate for kids. We exclude genre ID 27 across all age ranges.

4. **No sort options exposed to Stremio**: Stremio treats `sort` extras as separate catalog tabs instead of combinable filters. We hardcode `popularity.desc` as the default sort.

5. **IMDb IDs as canonical IDs**: Stremio matches streams by IMDb ID (`tt` prefix). All our catalog items resolve TMDB IDs to IMDb IDs so streams from other addons (Torrentio, etc.) work seamlessly.

6. **In-memory cache**: Simple Map-based cache avoids external dependencies (Redis, etc.). Acceptable for a single-instance free tier deployment. Cache is lost on restart but rebuilds quickly.

## Common Tasks

### Add a new age range

1. Add certification mapping in `lib/tmdb.js` → `AGE_CERTS`
2. Optionally add genre restriction in `AGE_DEFAULT_GENRES`
3. Add horror exclusion in `AGE_EXCLUDED_GENRES`
4. Add catalogs in `lib/manifest.js` (movie + series)
5. Update `public/index.html` landing page with new age card
6. Bump version in `manifest.js`

### Exclude a new genre

Add the TMDB genre ID to `AGE_EXCLUDED_GENRES` in `lib/tmdb.js`. Use pipe separator for multiple: `'27|53'` (Horror + Thriller).

TMDB movie genre IDs: https://api.themoviedb.org/3/genre/movie/list
TMDB TV genre IDs: https://api.themoviedb.org/3/genre/tv/list

### Change the landing page

Edit `public/index.html`. All CSS is inline (no external stylesheets). No build step needed — just edit and deploy.

### Update TMDB token

- **Local**: Edit `.env` file
- **Render**: Dashboard → Environment → Edit TMDB_API_TOKEN → Save → Redeploy

### Debug content appearing that shouldn't

1. Find the title on TMDB (themoviedb.org)
2. Check its US certification (Releases section for movies, Content Ratings for TV)
3. Check its genres — is it in a genre we allow for that age range?
4. If it has NR/unrated certification, it should already be excluded (we use explicit certs)
5. If it's a genre issue, consider adding genre restrictions

## Dependencies

| Package | Version | Why |
|---------|---------|-----|
| `stremio-addon-sdk` | ^1.6.10 | Official SDK for building Stremio addons |
| `node-fetch` | ^2.7.0 | HTTP client for TMDB API (v2 for CommonJS compatibility) |
| `dotenv` | ^16.4.5 | Loads .env file for local development |

Express.js is NOT a direct dependency — it comes bundled with `stremio-addon-sdk`.

## Contact

- **Email**: hola@manuelford.com
- **GitHub**: manuelford
