const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const manifest = require('./lib/manifest');
const catalogHandler = require('./lib/catalogHandler');
const metaHandler = require('./lib/metaHandler');
const { PORT, TMDB_API_TOKEN } = require('./lib/config');

if (!TMDB_API_TOKEN) {
    console.error('ERROR: TMDB_API_TOKEN is required. Copy .env.example to .env and set your token.');
    process.exit(1);
}

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(catalogHandler);
builder.defineMetaHandler(metaHandler);

serveHTTP(builder.getInterface(), { port: PORT });
