# Kids Content — Stremio Addon

A Stremio addon that provides age-appropriate movie and TV show catalogs for children. Instead of scrolling through an endless mix of content, your kids get curated catalogs organized by age group — all powered by real MPAA and TV Parental Guidelines ratings.

## What it does

This addon adds **8 catalogs** to Stremio, organized into four age brackets:

| Age Group | Movies | TV Shows | Ratings Allowed |
|-----------|--------|----------|-----------------|
| **0+** | Toddler & preschool films | Shows for the youngest viewers | G / TV-Y |
| **6+** | Family-friendly films | Kids & family shows | G, PG / TV-Y, TV-Y7, TV-G |
| **9+** | Broader family content | Older kids shows | G, PG / TV-Y through TV-PG |
| **12+** | Pre-teen appropriate | Pre-teen shows | G through PG-13 / TV-Y through TV-14 |

Every catalog supports **genre filtering** (Animation, Adventure, Comedy, Family, Fantasy, Music, Documentary), **pagination**, and **search**.

### How filtering works

- Content ratings come from [TMDB](https://www.themoviedb.org/) using official US certification data (MPAA for movies, TV Parental Guidelines for series).
- Only content with an **explicit rating** is included — unrated content is excluded by default, which prevents older films with missing classifications from slipping through.
- The **Horror genre is excluded** across all age groups.
- Catalogs for ages 0+ and 6+ are further restricted to **Animation and Family** genres to keep results focused on genuine children's content.
- Age 9+ expands to include Adventure, Fantasy, and Comedy.
- Age 12+ has no genre restriction since PG-13/TV-14 ratings filter effectively on their own.

### What it doesn't do

This addon provides **catalogs and metadata only**. It does not provide streams — those come from whatever streaming addons you already have installed (Torrentio, etc.). When you click on a title from the Kids Content catalog, Stremio will find available streams from your other addons as usual.

It also **does not block** other content in Stremio. Your existing catalogs and addons remain accessible. This is a limitation of the Stremio addon system — addons can add content but cannot restrict the interface.

## Installation

### From a hosted instance

Install directly in Stremio using the addon URL:

```
https://your-hosted-url/manifest.json
```

### Self-hosted

1. Clone the repository:
   ```bash
   git clone https://github.com/manuelford/stremio-kids-addon.git
   cd stremio-kids-addon
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Get a free TMDB API token:
   - Create an account at [themoviedb.org](https://www.themoviedb.org/signup)
   - Go to Settings > API > Request an API Key
   - Choose the Developer plan (free)
   - Copy your **Read Access Token** (the long one starting with `eyJ...`)

4. Configure environment:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and paste your TMDB token.

5. Start the addon:
   ```bash
   npm start
   ```

6. Add to Stremio:
   - Open Stremio
   - Go to Addons (puzzle icon)
   - Paste: `http://localhost:7777/manifest.json`
   - Click Install

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `TMDB_API_TOKEN` | — | Required. Your TMDB v4 Read Access Token |
| `PORT` | `7777` | Port the addon server listens on |

## Technical details

- Built with the official [Stremio Addon SDK](https://github.com/Stremio/stremio-addon-sdk)
- Uses [TMDB API v3](https://developer.themoviedb.org/docs) for content discovery and metadata
- In-memory cache with configurable TTLs (4h for catalogs, 24h for metadata, 7d for ID mappings)
- All content IDs are IMDb IDs (`tt` prefixed), ensuring compatibility with all major stream addons
- Series metadata includes full episode listings with season/episode structure

## Deployment

The addon runs as a standard Node.js HTTP server. Deploy it anywhere that supports Node:

- **Render / Railway / Fly.io** — free tiers available, set `TMDB_API_TOKEN` as an environment variable
- **Any VPS** — run with `npm start` behind a reverse proxy with HTTPS
- **Beamup** — Stremio's free addon hosting

For public installations, HTTPS is required (Stremio rejects non-HTTPS addon URLs except localhost).

## License

MIT
