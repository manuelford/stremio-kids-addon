const express = require('express');
const path = require('path');
const { addonBuilder } = require('stremio-addon-sdk');
const getRouter = require('stremio-addon-sdk/src/getRouter');
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

const app = express();

// Custom landing page (before SDK router)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Static assets (before SDK router)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Stremio SDK API routes (manifest.json, catalog, meta)
app.use(getRouter(builder.getInterface()));

app.listen(PORT, () => {
    console.log(`Kids Content addon running on port ${PORT}`);
    console.log(`HTTP addon accessible at: http://127.0.0.1:${PORT}/manifest.json`);
});
