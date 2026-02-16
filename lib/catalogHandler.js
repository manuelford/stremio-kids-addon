const tmdb = require('./tmdb');

// Parse catalog ID like "kids-movies-6" -> { type: "movie", ageRange: 6 }
function parseCatalogId(id) {
    const match = id.match(/^kids-(movies|series)-(\d+)$/);
    if (!match) return null;
    return {
        mediaType: match[1] === 'movies' ? 'movie' : 'series',
        ageRange: parseInt(match[2], 10),
    };
}

const ITEMS_PER_PAGE = 20;

module.exports = async function catalogHandler(args) {
    const { type, id, extra } = args;

    const parsed = parseCatalogId(id);
    if (!parsed) return { metas: [] };

    const { ageRange } = parsed;
    const skip = extra && extra.skip ? parseInt(extra.skip, 10) : 0;
    const page = Math.floor(skip / ITEMS_PER_PAGE) + 1;
    const genre = extra && extra.genre;
    const search = extra && extra.search;

    let items;

    if (search) {
        items = await handleSearch(type, search, page, ageRange);
    } else {
        items = await handleDiscover(type, page, genre, ageRange);
    }

    return { metas: items };
};

async function handleSearch(type, query, page, ageRange) {
    let results;
    if (type === 'movie') {
        results = await tmdb.searchMoviesFiltered(query, page, 'en-US', ageRange);
    } else {
        results = await tmdb.searchTVFiltered(query, page, 'en-US', ageRange);
    }
    return results.map(item => toMetaPreview(item, type, item.imdb_id));
}

async function handleDiscover(type, page, genre, ageRange) {
    const genreMap = tmdb.getGenreMap(type);
    const genreId = genre ? genreMap[genre] : undefined;

    let data;
    if (type === 'movie') {
        data = await tmdb.discoverMovies({ page, genreId, ageRange });
    } else {
        data = await tmdb.discoverTV({ page, genreId, ageRange });
    }

    const results = data.results || [];

    // Resolve IMDb IDs in parallel
    const metas = await Promise.all(
        results.map(async (item) => {
            const imdbId = await tmdb.getImdbId(type, item.id);
            if (!imdbId) return null;
            return toMetaPreview(item, type, imdbId);
        })
    );

    return metas.filter(Boolean);
}

function toMetaPreview(item, type, imdbId) {
    const name = item.title || item.name;
    const releaseDate = item.release_date || item.first_air_date;

    return {
        id: imdbId,
        type,
        name,
        poster: tmdb.posterUrl(item.poster_path),
        description: item.overview || undefined,
        releaseInfo: tmdb.getYear(releaseDate),
        imdbRating: item.vote_average ? String(item.vote_average.toFixed(1)) : undefined,
    };
}
