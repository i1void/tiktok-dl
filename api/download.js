const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Function to validate TikTok URL
function isValidTikTokUrl(url) {
    const tiktokRegex = /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com|m\.tiktok\.com|vt\.tiktok\.com)/;
    const patterns = [
        /tiktok\.com\/@[\w\.-]+\/video\/\d+/,
        /tiktok\.com\/t\/[\w\d]+/,
        /vm\.tiktok\.com\/[\w\d]+/,
        /vt\.tiktok\.com\/[\w\d]+/,
        /m\.tiktok\.com\/v\/\d+/,
        /tiktok\.com\/.*\/video\/\d+/
    ];
    return tiktokRegex.test(url) || patterns.some(pattern => pattern.test(url));
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

        console.log('Processing URL:', url);

        // Call API
        const response = await axios.get(`https://api.ivoid.cfd/downloader/tiktok?url=${encodeURIComponent(url)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: 15000
        });

        if (!response.data || !response.data.status) {
            return res.status(404).json({
                success: false,
                message: 'Video not found or unable to process'
            });
        }

        const data = response.data.result;

        // Map response to match expected format
        return res.json({
            success: true,
            data: {
                title: data.title || 'TikTok Video',
                author: data.music?.author || null,
                duration: null,
                likes: null,
                videoUrl: data.media?.video_hd || data.media?.video,
                videoUrlSD: data.media?.video,
                audioUrl: data.music?.url || null,
                thumbnail: null
            }
        });

    } catch (error) {
        console.error('API Error:', error.message);
        
        if (error.code === 'ECONNABORTED') {
            return res.status(408).json({
                success: false,
                message: 'Request timeout. Please try again.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to process video. Please try again later.',
            error: error.response?.data?.message || error.message
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

// Start server
app.listen(PORT, () => {
    console.log(`TikTok Downloader API running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Download endpoint: http://localhost:${PORT}/api/download?url=<tiktok_url>`);
});

module.exports = app;
