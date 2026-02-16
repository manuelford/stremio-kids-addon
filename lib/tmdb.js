const fetch = require('node-fetch');
const cache = require('./cache');
const { TMDB_API_TOKEN, TMDB_BASE_URL, TMDB_IMAGE_BASE } = require('./config');

const TTL = {
    CATALOG: 4 * 60 * 60 * 1000,       // 4 hours
    DETAILS: 24 * 60 * 60 * 1000,       // 24 hours
    EXTERNAL_IDS: 7 * 24 * 60 * 60 * 1000, // 7 days
    SEARCH: 1 * 60 * 60 * 1000,         // 1 hour
    FIND: 7 * 24 * 60 * 60 * 1000,      // 7 days
    SEASON: 24 * 60 * 60 * 1000,        // 24 hours
};

const CERT_COUNTRY = 'US';

// Certifications per age range
const AGE_CERTS = {
    0:  { movie: ['G'],             tv: ['TV-Y'] },
    6:  { movie: ['G', 'PG'],      tv: ['TV-Y', 'TV-Y7', 'TV-G'] },
    9:  { movie: ['G', 'PG'],      tv: ['TV-Y', 'TV-Y7', 'TV-G', 'TV-PG'] },
    12: { movie: ['G', 'PG', 'PG-13'], tv: ['TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14'] },
};

const MOVIE_GENRE_MAP = {
    'Animation': 16,
    'Adventure': 12,
    'Comedy': 35,
    'Family': 10751,
    'Fantasy': 14,
    'Music': 10402,
    'Documentary': 99
};

const TV_GENRE_MAP = {
    'Animation': 16,
    'Action & Adventure': 10759,
    'Comedy': 35,
    'Family': 10751,
    'Kids': 10762,
    'Documentary': 99
};

async function tmdbFetch(path, params = {}, ttl) {
    const url = new URL(path, TMDB_BASE_URL + '/');
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });

    const cacheKey = url.toString();
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${TMDB_API_TOKEN}` }
    });

    if (!res.ok) {
        throw new Error(`TMDB API error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (ttl) cache.set(cacheKey, data, ttl);
    else cache.set(cacheKey, data);
    return data;
}

// Default genre restrictions per age range (when no genre filter is selected)
// Uses pipe (|) = OR in TMDB API
const AGE_DEFAULT_GENRES = {
    0:  '16|10751',                // Animation | Family
    6:  '16|10751',                // Animation | Family
    9:  '16|10751|12|14|35',       // Animation | Family | Adventure | Fantasy | Comedy
    // 12+: no genre restriction — PG-13/TV-14 certs filter well enough
};

// Genres to exclude per age range (TMDB uses without_genres param)
// Horror = 27
const AGE_EXCLUDED_GENRES = {
    0:  '27',
    6:  '27',
    9:  '27',
    12: '27',
};

async function discoverMovies({ page = 1, genreId, language = 'en-US', ageRange = 6 } = {}) {
    const certs = AGE_CERTS[ageRange] || AGE_CERTS[6];
    const params = {
        certification_country: CERT_COUNTRY,
        certification: certs.movie.join('|'),
        include_adult: false,
        sort_by: 'popularity.desc',
        'vote_count.gte': 50,
        page,
        language,
    };
    if (genreId) {
        params.with_genres = genreId;
    } else if (AGE_DEFAULT_GENRES[ageRange]) {
        params.with_genres = AGE_DEFAULT_GENRES[ageRange];
    }
    if (AGE_EXCLUDED_GENRES[ageRange]) {
        params.without_genres = AGE_EXCLUDED_GENRES[ageRange];
    }
    return tmdbFetch('discover/movie', params, TTL.CATALOG);
}

async function discoverTV({ page = 1, genreId, language = 'en-US', ageRange = 6 } = {}) {
    const certs = AGE_CERTS[ageRange] || AGE_CERTS[6];
    const params = {
        certification_country: CERT_COUNTRY,
        certification: certs.tv.join('|'),
        include_adult: false,
        sort_by: 'popularity.desc',
        'vote_count.gte': 20,
        page,
        language,
    };
    if (genreId) params.with_genres = genreId;
    if (AGE_EXCLUDED_GENRES[ageRange]) {
        params.without_genres = AGE_EXCLUDED_GENRES[ageRange];
    }
    return tmdbFetch('discover/tv', params, TTL.CATALOG);
}

async function searchMovies(query, page = 1, language = 'en-US') {
    return tmdbFetch('search/movie', {
        query,
        page,
        include_adult: false,
        language,
    }, TTL.SEARCH);
}

async function searchTV(query, page = 1, language = 'en-US') {
    return tmdbFetch('search/tv', {
        query,
        page,
        include_adult: false,
        language,
    }, TTL.SEARCH);
}

async function getMovieDetails(tmdbId, language = 'en-US') {
    return tmdbFetch(`movie/${tmdbId}`, {
        append_to_response: 'credits,external_ids,release_dates',
        language,
    }, TTL.DETAILS);
}

async function getTVDetails(tmdbId, language = 'en-US') {
    return tmdbFetch(`tv/${tmdbId}`, {
        append_to_response: 'credits,external_ids,content_ratings',
        language,
    }, TTL.DETAILS);
}

async function getExternalIds(type, tmdbId) {
    const path = type === 'movie' ? `movie/${tmdbId}/external_ids` : `tv/${tmdbId}/external_ids`;
    return tmdbFetch(path, {}, TTL.EXTERNAL_IDS);
}

async function getSeasonDetails(tmdbId, seasonNumber, language = 'en-US') {
    return tmdbFetch(`tv/${tmdbId}/season/${seasonNumber}`, { language }, TTL.SEASON);
}

async function findByImdbId(imdbId) {
    return tmdbFetch(`find/${imdbId}`, {
        external_source: 'imdb_id',
    }, TTL.FIND);
}

// Get IMDb ID for a TMDB item. Returns null if not found.
async function getImdbId(type, tmdbId) {
    try {
        const data = await getExternalIds(type === 'series' ? 'tv' : type, tmdbId);
        return data.imdb_id || null;
    } catch {
        return null;
    }
}

// Check if a movie has a certification within the allowed list
function isMovieCertAllowed(releaseDates, allowedCerts) {
    if (!releaseDates || !releaseDates.results) return false;
    const us = releaseDates.results.find(r => r.iso_3166_1 === 'US');
    if (!us || !us.release_dates) return false;
    return us.release_dates.some(rd => allowedCerts.includes(rd.certification));
}

// Check if a TV show has a certification within the allowed list
function isTVCertAllowed(contentRatings, allowedCerts) {
    if (!contentRatings || !contentRatings.results) return false;
    const us = contentRatings.results.find(r => r.iso_3166_1 === 'US');
    if (!us) return false;
    return allowedCerts.includes(us.rating);
}

// Search with certification filtering
async function searchMoviesFiltered(query, page = 1, language = 'en-US', ageRange = 6) {
    const certs = AGE_CERTS[ageRange] || AGE_CERTS[6];
    const searchResults = await searchMovies(query, page, language);

    const detailsPromises = searchResults.results.slice(0, 20).map(async (item) => {
        try {
            const details = await getMovieDetails(item.id, 'en-US');
            if (isMovieCertAllowed(details.release_dates, certs.movie)) {
                const imdbId = details.external_ids && details.external_ids.imdb_id;
                if (imdbId) return { ...item, imdb_id: imdbId };
            }
        } catch { /* skip on error */ }
        return null;
    });

    const results = await Promise.all(detailsPromises);
    return results.filter(Boolean);
}

async function searchTVFiltered(query, page = 1, language = 'en-US', ageRange = 6) {
    const certs = AGE_CERTS[ageRange] || AGE_CERTS[6];
    const searchResults = await searchTV(query, page, language);

    const detailsPromises = searchResults.results.slice(0, 20).map(async (item) => {
        try {
            const details = await getTVDetails(item.id, 'en-US');
            if (isTVCertAllowed(details.content_ratings, certs.tv)) {
                const imdbId = details.external_ids && details.external_ids.imdb_id;
                if (imdbId) return { ...item, imdb_id: imdbId };
            }
        } catch { /* skip on error */ }
        return null;
    });

    const results = await Promise.all(detailsPromises);
    return results.filter(Boolean);
}

function posterUrl(path, size = 'w500') {
    if (!path) return undefined;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

function backdropUrl(path) {
    if (!path) return undefined;
    return `${TMDB_IMAGE_BASE}/w1280${path}`;
}

function getYear(dateStr) {
    if (!dateStr) return undefined;
    return dateStr.split('-')[0];
}

function getGenreMap(type) {
    return type === 'movie' ? MOVIE_GENRE_MAP : TV_GENRE_MAP;
}

module.exports = {
    discoverMovies,
    discoverTV,
    searchMoviesFiltered,
    searchTVFiltered,
    getMovieDetails,
    getTVDetails,
    getExternalIds,
    getSeasonDetails,
    findByImdbId,
    getImdbId,
    posterUrl,
    backdropUrl,
    getYear,
    getGenreMap,
    AGE_CERTS,
    MOVIE_GENRE_MAP,
    TV_GENRE_MAP,
};
