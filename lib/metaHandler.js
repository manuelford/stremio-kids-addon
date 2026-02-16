const tmdb = require('./tmdb');

module.exports = async function metaHandler(args) {
    const { type, id } = args;

    // id is an IMDb ID like tt1234567
    const findResult = await tmdb.findByImdbId(id);

    let tmdbItem;
    if (type === 'movie') {
        tmdbItem = findResult.movie_results && findResult.movie_results[0];
    } else {
        tmdbItem = findResult.tv_results && findResult.tv_results[0];
    }

    if (!tmdbItem) return { meta: null };

    const tmdbId = tmdbItem.id;

    let details;
    if (type === 'movie') {
        details = await tmdb.getMovieDetails(tmdbId);
    } else {
        details = await tmdb.getTVDetails(tmdbId);
    }

    const meta = buildMeta(details, type, id);

    // For series, fetch episodes
    if (type === 'series' && details.number_of_seasons) {
        meta.videos = await fetchAllEpisodes(tmdbId, details.number_of_seasons, id);
    }

    return { meta };
};

function buildMeta(details, type, imdbId) {
    const name = details.title || details.name;
    const releaseDate = details.release_date || details.first_air_date;
    const endDate = details.last_air_date;

    let releaseInfo = tmdb.getYear(releaseDate);
    if (type === 'series' && releaseInfo) {
        const status = details.status;
        const endYear = tmdb.getYear(endDate);
        if (status === 'Ended' || status === 'Canceled') {
            releaseInfo = endYear && endYear !== releaseInfo
                ? `${releaseInfo}-${endYear}`
                : releaseInfo;
        } else {
            releaseInfo = `${releaseInfo}-`;
        }
    }

    // Extract director (movies only)
    const directors = [];
    if (details.credits && details.credits.crew) {
        for (const person of details.credits.crew) {
            if (person.job === 'Director') directors.push(person.name);
        }
    }

    // Extract cast
    const cast = [];
    if (details.credits && details.credits.cast) {
        for (const person of details.credits.cast.slice(0, 5)) {
            cast.push(person.name);
        }
    }

    const meta = {
        id: imdbId,
        type,
        name,
        poster: tmdb.posterUrl(details.poster_path),
        background: tmdb.backdropUrl(details.backdrop_path),
        description: details.overview || undefined,
        releaseInfo,
        released: releaseDate ? new Date(releaseDate).toISOString() : undefined,
        imdbRating: details.vote_average ? String(details.vote_average.toFixed(1)) : undefined,
        genres: details.genres ? details.genres.map(g => g.name) : [],
        runtime: type === 'movie' && details.runtime ? `${details.runtime} min` : undefined,
    };

    if (directors.length) meta.director = directors;
    if (cast.length) meta.cast = cast;

    // Links
    meta.links = [];
    if (imdbId) {
        meta.links.push({
            name: `IMDb ${meta.imdbRating || ''}`.trim(),
            category: 'imdb',
            url: `https://imdb.com/title/${imdbId}`,
        });
    }

    return meta;
}

async function fetchAllEpisodes(tmdbId, numSeasons, imdbId) {
    const seasonNumbers = [];
    for (let i = 1; i <= numSeasons; i++) {
        seasonNumbers.push(i);
    }

    const seasons = await Promise.all(
        seasonNumbers.map(num => tmdb.getSeasonDetails(tmdbId, num).catch(() => null))
    );

    const videos = [];
    for (const season of seasons) {
        if (!season || !season.episodes) continue;
        for (const ep of season.episodes) {
            videos.push({
                id: `${imdbId}:${ep.season_number}:${ep.episode_number}`,
                title: ep.name,
                season: ep.season_number,
                episode: ep.episode_number,
                released: ep.air_date ? `${ep.air_date}T00:00:00.000Z` : undefined,
                overview: ep.overview || undefined,
                thumbnail: tmdb.posterUrl(ep.still_path, 'w300'),
            });
        }
    }

    return videos;
}
