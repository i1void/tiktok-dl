require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// API config (set in .env locally, or in Vercel > Settings > Environment Variables)
const API_BASE_URL = process.env.API_BASE_URL || 'https://1void-api.is-a.dev';
const API_KEY = process.env.API_KEY || '';

// CORS: empty = same-origin only (no CORS headers). Comma-separated list to allow other origins.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

// Cache
const CACHE_TTL_MS = (parseInt(process.env.CACHE_TTL_SECONDS, 10) || 300) * 1000;
const CACHE_MAX_ENTRIES = 500;
const cache = new Map();

function cacheGet(key) {
    const hit = cache.get(key);
    if (!hit) return null;
    if (hit.expires < Date.now()) {
        cache.delete(key);
        return null;
    }
    return hit.value;
}

function cacheSet(key, value) {
    if (cache.size >= CACHE_MAX_ENTRIES) {
        cache.delete(cache.keys().next().value); // drop oldest
    }
    cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

// Middleware
if (ALLOWED_ORIGINS.length > 0) {
    app.use(cors({ origin: ALLOWED_ORIGINS }));
}
app.use(express.json());

// Strict TikTok URL validation: parse the URL, check the exact hostname, then the path
const TIKTOK_HOSTS = new Set([
    'tiktok.com',
    'www.tiktok.com',
    'm.tiktok.com',
    'vm.tiktok.com',
    'vt.tiktok.com'
]);

const TIKTOK_PATHS = [
    /^\/@[\w.-]+\/(video|photo)\/\d+\/?$/,
    /^\/t\/[\w-]+\/?$/,
    /^\/v\/\d+(\.html)?\/?$/,
    /^\/[\w-]+\/?$/ // short links on vm./vt.
];

function isValidTikTokUrl(input) {
    if (typeof input !== 'string' || input.length > 300) return false;

    let u;
    try {
        u = new URL(input.trim());
    } catch {
        return false;
    }

    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    if (u.username || u.password) return false;

    const host = u.hostname.toLowerCase();
    if (!TIKTOK_HOSTS.has(host)) return false;

    const isShortHost = host === 'vm.tiktok.com' || host === 'vt.tiktok.com';
    const paths = isShortHost ? TIKTOK_PATHS : TIKTOK_PATHS.slice(0, 3);
    return paths.some(re => re.test(u.pathname));
}

// Main download endpoint
app.get('/api/download', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'URL parameter is required'
            });
        }

        if (!isValidTikTokUrl(url)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid TikTok URL'
            });
        }

        const cacheKey = url.trim();
        const cached = cacheGet(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        console.log('Processing URL:', url);

        // Call API
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json'
        };
        if (API_KEY) headers['x-api-key'] = API_KEY;

        const response = await axios.get(`${API_BASE_URL}/downloader/tiktok?url=${encodeURIComponent(url)}`, {
            headers,
            timeout: 15000
        });

        if (!response.data || !response.data.status) {
            return res.status(404).json({
                success: false,
                message: 'Video not found or unable to process'
            });
        }

        const data = response.data.result;

        // Detect slideshow/photo posts (TikTok "images" carousel instead of a video)
        // NOTE: field names below cover the most common shapes returned by
        // TikTok downloader APIs. If your slide links come back empty, log
        // `data` here for a real slideshow URL and adjust the keys below.
        const rawImages =
            data.images ||
            data.media?.images ||
            data.slides ||
            (Array.isArray(data.media) ? data.media : null);

        const isSlideshow = data.type === 'image' || data.type === 'slide' || (Array.isArray(rawImages) && rawImages.length > 0);

        const images = isSlideshow
            ? (rawImages || []).map(img => (typeof img === 'string' ? img : img.url || img.image || img.src)).filter(Boolean)
            : null;

        // Map response to match expected format
        const payload = {
            success: true,
            data: {
                type: isSlideshow ? 'image' : 'video',
                title: data.title || 'TikTok Video',
                author: data.music?.author || null,
                duration: null,
                likes: null,
                videoUrl: isSlideshow ? null : (data.media?.video_hd || data.media?.video),
                videoUrlSD: isSlideshow ? null : data.media?.video,
                audioUrl: data.music?.url || null,
                thumbnail: data.thumbnail || data.cover || null,
                images
            }
        };

        cacheSet(cacheKey, payload);
        return res.json(payload);

    } catch (error) {
        console.error('API Error:', error.response?.data?.message || error.message);
        
        if (error.code === 'ECONNABORTED') {
            return res.status(408).json({
                success: false,
                message: 'Request timeout. Please try again.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to process video. Please try again later.'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// Start server (only when run directly; Vercel imports the app as a serverless function)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`TikTok Downloader API running on port ${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/health`);
        console.log(`Download endpoint: http://localhost:${PORT}/api/download?url=<tiktok_url>`);
    });
}

module.exports = app;
