# TikTok Downloader

Simple web application to download TikTok videos without watermark.

[![GitHub stars](https://img.shields.io/github/stars/i1void/tiktok-dl?style=flat-square&color=ff5e5b)](https://github.com/i1void/tiktok-dl/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/i1void/tiktok-dl?style=flat-square)](https://github.com/i1void/tiktok-dl/network/members)
[![License](https://img.shields.io/github/license/i1void/tiktok-dl?style=flat-square)](LICENSE)

> If this tool saved you some time, consider dropping a ⭐ — it genuinely helps the project get noticed, and it's free :)

## Features

- Download TikTok HD videos without watermark
- Download separate audio (if available)
- Slideshow / photo post support
- Responsive design, works on mobile & desktop
- Modern dark theme UI

## Setup

```bash
# Clone repository
git clone https://github.com/i1void/tiktok-dl.git
cd tiktok-dl

# Install dependencies
npm install

# Edit .env if needed (API_KEY is optional)

# Run development server
npm run dev

# Or run production
npm start
```

Visit `http://localhost:3000` to view the application.

## Environment Variables

| Variable       | Required | Default                          | Description                            |
| -------------- | -------- | -------------------------------- | -------------------------------------- |
| `API_KEY`      | No       | -                                | Optional API key for the 1void API     |
| `API_BASE_URL` | No       | `https://1void-api.is-a.dev`    | Base URL of the downloader API         |
| `ALLOWED_ORIGINS` | No    | empty (same-origin only)         | Comma-separated origins allowed by CORS |
| `CACHE_TTL_SECONDS` | No  | `300`                            | How long results are cached per URL    |
| `PORT`         | No       | `3000`                           | Port for local server                  |

`API_KEY` is optional. If set, it is sent to the API in the `x-api-key` header; if empty, the request is sent without it. Never commit your `.env` file (it is already in `.gitignore`).

## API Usage

```
GET /api/download?url=<tiktok_url>
```

## Powered By

This app uses the 1void API (`1void-api.is-a.dev`) to fetch and process TikTok video data.

## Notes

- URLs are strictly validated (exact TikTok hostnames only).
- Results are cached in memory for a few minutes to avoid repeated API calls.
- CORS is disabled by default; set `ALLOWED_ORIGINS` only if another site needs to call the API.
- `/health` is available locally and on Vercel (via `vercel.json` rewrite).

## Disclaimer

All videos belong to their respective creators. Download only content you own or have permission to use. This project is not affiliated with TikTok.

## Supported TikTok URL Formats

- `tiktok.com/@username/video/123456`
- `tiktok.com/t/shortcode`
- `vm.tiktok.com/shortcode`
- `vt.tiktok.com/shortcode`
- `m.tiktok.com/v/123456`

## Deploy to Vercel

1. Push the repository and import it in Vercel.
2. Go to **Settings > Environment Variables** and add `API_KEY` (optional) and `API_BASE_URL` if needed.
3. Redeploy.

Vercel does not read your local `.env`, so the variables must be set in the dashboard.
