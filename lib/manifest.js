const movieGenres = ['Animation', 'Adventure', 'Comedy', 'Family', 'Fantasy', 'Music', 'Documentary'];
const tvGenres = ['Animation', 'Action & Adventure', 'Comedy', 'Family', 'Kids', 'Documentary'];

function makeCatalog(type, id, name, genres) {
    return {
        type,
        id,
        name,
        extra: [
            { name: 'genre', options: genres },
            { name: 'skip' },
            { name: 'search' },
        ],
        extraSupported: ['genre', 'skip', 'search'],
    };
}

module.exports = {
    id: 'community.kidscontent',
    version: '1.1.0',
    name: 'Kids Content',
    description: 'Safe, age-appropriate movie and TV catalogs for children. Four age groups (0+, 6+, 9+, 12+) powered by official MPAA and TV Parental Guidelines ratings. Genre filtering, search, and horror-free browsing included.',
    logo: 'https://raw.githubusercontent.com/manuelford/stremio-kids-addon/main/logo.png',
    contactEmail: 'hola@manuelford.com',
    resources: ['catalog', 'meta'],
    types: ['movie', 'series'],
    idPrefixes: ['tt'],
    catalogs: [
        // Age 0+ (toddlers/preschool)
        makeCatalog('movie', 'kids-movies-0', 'Movies 0+', movieGenres),
        makeCatalog('series', 'kids-series-0', 'Series 0+', tvGenres),
        // Age 6+
        makeCatalog('movie', 'kids-movies-6', 'Movies 6+', movieGenres),
        makeCatalog('series', 'kids-series-6', 'Series 6+', tvGenres),
        // Age 9+
        makeCatalog('movie', 'kids-movies-9', 'Movies 9+', movieGenres),
        makeCatalog('series', 'kids-series-9', 'Series 9+', tvGenres),
        // Age 12+
        makeCatalog('movie', 'kids-movies-12', 'Movies 12+', movieGenres),
        makeCatalog('series', 'kids-series-12', 'Series 12+', tvGenres),
    ],
    behaviorHints: {
        adult: false,
    },
};
