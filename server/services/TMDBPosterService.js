/*
  TMDBPOSTERSERVICE.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Utility functions
function cleanTVShowName(showName) {
    let name = showName
        .replace(/\b(19|20)\d{2}\b/g, '')
        .replace(/\b(S\d+|Season\s+\d+)\b/gi, '')
        .replace(/\b(Complete|Collection|Series)\b/gi, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/[._-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return name;
}

function cleanMovieTitle(filename) {
    let name = path.basename(filename, path.extname(filename));
    name = name.replace(/[._]/g, ' ');
    const yearMatch = name.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? yearMatch[0] : null;
    name = name.replace(/\b(720p|1080p|2160p|4k|bluray|brrip|web-dl|web|hdtv|dvdrip|yify|x264|x265|aac|mp3|dts|eac3|ac3|flac|truehd|atmos|10bit|5\.1|7\.1|yts|yts\.mx|yts\.ag|yts\.am|rarbg|hdrip|bdrip|repack|extended|remastered|uncut|proper|limited|internal|dual|audio|subs|eng|ita|spa|fre|ger|rus|jpn|kor|chi|fr|es|de|ru|jp|kr|cn|mx|am|ag|lt|gaz|bokutox|lama|ptp|h264|h265|hevc|web-dl|webdl|web-rip|webrip|dvdr|dvdscr|dvdscreener|cam|ts|tc|r5|scr|unrated|director\.s\.cut|remux|criterion|multi|multi\.audio|multi\.subs|multi\.language|multi\.lang|fixed|amzn|dd|h\.264|playweb)\b/gi, '');
    name = name.replace(/\W+/g, ' ');
    name = name.replace(/\s+/g, ' ').trim();
    return { title: name, year: year };
}

function extractYear(str) {
    const match = str.match(/(19|20)\d{2}/);
    return match ? match[0] : null;
}

// TMDB API functions
async function searchTVShowOptions(showName) {
    if (!TMDB_API_KEY) throw new Error('TMDB_API_KEY not set');
    const cleanName = cleanTVShowName(showName);
    const year = extractYear(showName);
    let searchUrl = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanName)}`;
    if (year) searchUrl += `&first_air_date_year=${year}`;
    const response = await fetch(searchUrl);
    const data = await response.json();
    if (data.results && data.results.length > 0) {
        const shows = data.results.slice(0, 5);
        const options = [];
        for (const show of shows) {
            if (show.poster_path) {
                const imagesUrl = `${TMDB_BASE_URL}/tv/${show.id}/images?api_key=${TMDB_API_KEY}`;
                const imagesResponse = await fetch(imagesUrl);
                const imagesData = await imagesResponse.json();
                options.push({
                    id: show.id,
                    name: show.name,
                    year: show.first_air_date ? show.first_air_date.split('-')[0] : 'Unknown',
                    poster_path: show.poster_path,
                    poster_url: `https://image.tmdb.org/t/p/w500${show.poster_path}`,
                    vote_average: show.vote_average,
                    overview: show.overview,
                    type: 'main'
                });
                if (imagesData.posters && imagesData.posters.length > 1) {
                    const altPosters = imagesData.posters.filter(p => p.file_path !== show.poster_path).slice(0, 3);
                    for (const altPoster of altPosters) {
                        options.push({
                            id: show.id,
                            name: show.name,
                            year: show.first_air_date ? show.first_air_date.split('-')[0] : 'Unknown',
                            poster_path: altPoster.file_path,
                            poster_url: `https://image.tmdb.org/t/p/w500${altPoster.file_path}`,
                            vote_average: show.vote_average,
                            overview: show.overview,
                            type: 'alternative'
                        });
                    }
                }
            }
        }
        return options;
    }
    return [];
}

async function searchMovieOptions(title, year) {
    if (!TMDB_API_KEY) throw new Error('TMDB_API_KEY not set');
    let searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
    if (year) searchUrl += `&year=${year}`;
    const response = await fetch(searchUrl);
    const data = await response.json();
    if (data.results && data.results.length > 0) {
        const movies = data.results.slice(0, 5);
        const options = [];
        for (const movie of movies) {
            if (movie.poster_path) {
                const imagesUrl = `${TMDB_BASE_URL}/movie/${movie.id}/images?api_key=${TMDB_API_KEY}`;
                const imagesResponse = await fetch(imagesUrl);
                const imagesData = await imagesResponse.json();
                options.push({
                    id: movie.id,
                    title: movie.title,
                    year: movie.release_date ? movie.release_date.split('-')[0] : 'Unknown',
                    poster_path: movie.poster_path,
                    poster_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
                    vote_average: movie.vote_average,
                    overview: movie.overview,
                    type: 'main'
                });
                if (imagesData.posters && imagesData.posters.length > 1) {
                    const altPosters = imagesData.posters.filter(p => p.file_path !== movie.poster_path).slice(0, 3);
                    for (const altPoster of altPosters) {
                        options.push({
                            id: movie.id,
                            title: movie.title,
                            year: movie.release_date ? movie.release_date.split('-')[0] : 'Unknown',
                            poster_path: altPoster.file_path,
                            poster_url: `https://image.tmdb.org/t/p/w500${altPoster.file_path}`,
                            vote_average: movie.vote_average,
                            overview: movie.overview,
                            type: 'alternative'
                        });
                    }
                }
            }
        }
        return options;
    }
    return [];
}

async function searchMovieById(tmdbId) {
    if (!TMDB_API_KEY) throw new Error('TMDB_API_KEY not set');
    const movieUrl = `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const imagesUrl = `${TMDB_BASE_URL}/movie/${tmdbId}/images?api_key=${TMDB_API_KEY}`;
    const response = await fetch(movieUrl);
    const movie = await response.json();
    if (!movie || !movie.poster_path) return [];
    const imagesResponse = await fetch(imagesUrl);
    const imagesData = await imagesResponse.json();
    const options = [];
    // Main poster
    options.push({
        id: movie.id,
        title: movie.title,
        year: movie.release_date ? movie.release_date.split('-')[0] : 'Unknown',
        poster_path: movie.poster_path,
        poster_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
        vote_average: movie.vote_average,
        overview: movie.overview,
        type: 'main'
    });
    // Alternative posters
    if (imagesData.posters && imagesData.posters.length > 1) {
        const altPosters = imagesData.posters.filter(p => p.file_path !== movie.poster_path).slice(0, 3);
        for (const altPoster of altPosters) {
            options.push({
                id: movie.id,
                title: movie.title,
                year: movie.release_date ? movie.release_date.split('-')[0] : 'Unknown',
                poster_path: altPoster.file_path,
                poster_url: `https://image.tmdb.org/t/p/w500${altPoster.file_path}`,
                vote_average: movie.vote_average,
                overview: movie.overview,
                type: 'alternative'
            });
        }
    }
    return options;
}

// Poster override helpers (JSON for now)
function loadOverrides(filepath) {
    if (fs.existsSync(filepath)) {
        try {
            return JSON.parse(fs.readFileSync(filepath, 'utf8'));
        } catch (error) {
            return {};
        }
    }
    return {};
}

function saveOverrides(filepath, overrides) {
    try {
        fs.writeFileSync(filepath, JSON.stringify(overrides, null, 2));
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    cleanTVShowName,
    cleanMovieTitle,
    extractYear,
    searchTVShowOptions,
    searchMovieOptions,
    searchMovieById,
    loadOverrides,
    saveOverrides
}; 