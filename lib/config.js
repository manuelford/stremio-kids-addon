require('dotenv').config();

module.exports = {
    TMDB_API_TOKEN: process.env.TMDB_API_TOKEN,
    TMDB_BASE_URL: 'https://api.themoviedb.org/3',
    TMDB_IMAGE_BASE: 'https://image.tmdb.org/t/p',
    PORT: parseInt(process.env.PORT, 10) || 7000
};
