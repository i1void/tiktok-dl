# TikTok Downloader

Simple web application to download TikTok videos without watermark.

[![GitHub stars](https://img.shields.io/github/stars/i1void/tiktok-dl?style=flat-square&color=ff5e5b)](https://github.com/i1void/tiktok-dl/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/i1void/tiktok-dl?style=flat-square)](https://github.com/i1void/tiktok-dl/network/members)
[![License](https://img.shields.io/github/license/i1void/tiktok-dl?style=flat-square)](LICENSE)

> If this tool saved you some time, consider dropping a ⭐ — it genuinely helps the project get noticed, and it's free :)

## Features

- Download TikTok HD videos without watermark
- Download separate audio (if available)
- Responsive design - works on mobile & desktop
- Fast processing dengan API backend
- Modern dark theme UI

## How To

```bash
# Clone repository
git clone https://github.com/i1void/tiktok-dl.git
cd tiktok-dl

# Install dependencies
npm install

# Run development server
npm run dev

# Or run production
npm start
```


## API Usage

```
GET /api/download?url=<tiktok_url>
```

## Powered By

This app uses the [Void API](https://nodtvoid-api.vercel.app/) REST API to fetch and process TikTok video data.

## Supported TikTok URL Formats

- `tiktok.com/@username/video/123456`
- `vm.tiktok.com/shortcode`
- `vt.tiktok.com/shortcode`
- `m.tiktok.com/v/123456`

## Deploy

Ready to deploy to Vercel - just push to repository and connect to Vercel.

Visit `http://localhost:3000` to view the application.
