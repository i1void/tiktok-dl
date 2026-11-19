// Theme Toggle
const themeToggle = document.getElementById('themeToggle');

function setTheme(mode) {
    document.documentElement.dataset.theme = mode;
    themeToggle.textContent = mode === 'dark' ? 'Light' : 'Dark';
    try { localStorage.setItem('theme', mode); } catch (e) {}
}

themeToggle.textContent = document.documentElement.dataset.theme === 'dark' ? 'Light' : 'Dark';

themeToggle.addEventListener('click', () => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

// Main App
const form = document.getElementById('form');
const urlInput = document.getElementById('url');
const submitBtn = document.getElementById('submit');
const content = document.getElementById('content');

const HINT_HTML = `<p class="hint">Works with public videos and photo posts.</p>`;

const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const TIKTOK_HOSTS = ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'];
const TIKTOK_PATHS = [
    /^\/@[\w.-]+\/(video|photo)\/\d+\/?$/,
    /^\/t\/[\w-]+\/?$/,
    /^\/v\/\d+(\.html)?\/?$/
];
const TIKTOK_SHORT_PATH = /^\/[\w-]+\/?$/;

const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

const isValidTikTokUrl = (input) => {
    let u;
    try { u = new URL(String(input).trim()); } catch { return false; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const host = u.hostname.toLowerCase();
    if (!TIKTOK_HOSTS.includes(host)) return false;
    if (TIKTOK_PATHS.some(re => re.test(u.pathname))) return true;
    return (host === 'vm.tiktok.com' || host === 'vt.tiktok.com') && TIKTOK_SHORT_PATH.test(u.pathname);
};
const showInstructions = () => { content.innerHTML = HINT_HTML; };

const showLoading = () => {
    content.innerHTML = `
        <div class="loading">
            <div class="loading-label">Processing…</div>
            <div class="loading-bar-wrap"><div class="loading-bar"></div></div>
        </div>
    `;
};

const showError = (message) => {
    content.innerHTML = `<div class="messageError">${escapeHtml(message)}</div>`;
};

const formatBytes = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1024).toFixed(0) + ' KB';
};

const directDownload = async (url, filename, onProgress) => {
    try {
        const response = await fetch(url);
        if (!response.ok || !response.body) throw new Error('Bad response');

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        let loaded = 0;

        const reader = response.body.getReader();
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            loaded += value.length;
            if (onProgress) {
                const percent = total ? Math.round((loaded / total) * 100) : null;
                onProgress(percent, loaded);
            }
        }

        const blob = new Blob(chunks);
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
        if (onProgress) onProgress(100, loaded);
    } catch (error) {
        console.error('Download error:', error);
        alert('Download failed. Try again, or long-press the file and choose Save.');
        if (onProgress) onProgress(null, 0, true);
    }
};

const createDownloadButton = (url, filename, text, extraClass = '') => {
    const uid = Math.random().toString(36).substr(2, 9);
    const buttonId = `btn-${uid}`;
    const barId = `bar-${uid}`;
    const wrapId = `wrap-${uid}`;
    const labelId = `label-${uid}`;

    setTimeout(() => {
        const btn = document.getElementById(buttonId);
        const wrap = document.getElementById(wrapId);
        const bar = document.getElementById(barId);
        const label = document.getElementById(labelId);
        if (!btn) return;

        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (btn.disabled) return;
            btn.disabled = true;
            wrap.classList.add('active');
            label.classList.add('active');
            bar.classList.add('indeterminate');
            label.textContent = 'Starting…';

            await directDownload(url, filename, (percent, loaded, failed) => {
                if (failed) {
                    label.textContent = 'Download failed';
                    bar.classList.remove('indeterminate');
                    btn.disabled = false;
                    return;
                }
                if (percent === null) {
                    label.textContent = `Downloading… ${formatBytes(loaded)}`;
                } else {
                    bar.classList.remove('indeterminate');
                    bar.style.width = percent + '%';
                    label.textContent = percent < 100 ? `Downloading… ${percent}%` : 'Done ✓';
                }
                if (percent === 100) {
                    btn.disabled = false;
                    setTimeout(() => {
                        wrap.classList.remove('active');
                        label.classList.remove('active');
                        bar.style.width = '0%';
                    }, 1200);
                }
            });
        });
    }, 100);

    return `<div class="download-item">
        <button id="${buttonId}" class="btn ${extraClass}">
            ${text}
        </button>
        <div class="dl-progress-wrap" id="${wrapId}"><div class="dl-progress-bar" id="${barId}"></div></div>
        <div class="dl-progress-label" id="${labelId}"></div>
    </div>`;
};

const buildInfoBlock = (data) => `
    <div class="video-info">
        <h3>${escapeHtml(data.title || 'TikTok Video')}</h3>
        ${data.author ? `<p>@${escapeHtml(data.author)}</p>` : ''}
        ${data.duration ? `<p>${escapeHtml(data.duration)}s</p>` : ''}
        ${data.likes ? `<p>${formatNumber(data.likes)} likes</p>` : ''}
    </div>
`;

const buildPhotoResult = (data) => {
    const randomId = Math.floor(Math.random() * 1000000000);
    const images = data.images || [];

    const gallery = `
        <div class="photo-gallery">
            ${images.map((img, i) => `
                <div class="photo-item">
                    <img src="${img}" alt="Slide ${i + 1}" loading="lazy">
                    <button class="btn-photo-dl" data-url="${img}" data-name="TikDL_Slide_${randomId}_${i + 1}.jpg" aria-label="Download slide ${i + 1}">Save</button>
                </div>
            `).join('')}
        </div>
    `;

    const buttons = [];

    buttons.push(createDownloadAllPhotosButton(images, randomId));

    if (data.audioUrl) {
        buttons.push(createDownloadButton(
            data.audioUrl, `TikDL_Audio_${randomId}.mp3`,
            "Download audio"
        ));
    }

    const downloadSection = `
        <div class="download-section">
            <div class="download-options">${buttons.join('')}</div>
            <p class="download-hint">Use Save on a slide to download it individually.</p>
        </div>
    `;

    return `<div class="result-wrap">${buildInfoBlock(data)}${gallery}${downloadSection}</div>`;
};

const createDownloadAllPhotosButton = (images, randomId) => {
    const buttonId = `btn-all-${randomId}`;
    setTimeout(() => {
        const btn = document.getElementById(buttonId);
        if (!btn) return;
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            btn.disabled = true;
            const originalText = btn.textContent;
            for (let i = 0; i < images.length; i++) {
                btn.textContent = `Downloading ${i + 1}/${images.length}…`;
                await directDownload(images[i], `TikDL_Slide_${randomId}_${i + 1}.jpg`);
                await new Promise(r => setTimeout(r, 400)); // avoid browser blocking multi-downloads
            }
            btn.textContent = originalText;
            btn.disabled = false;
        });
    }, 100);
    return `<button id="${buttonId}" class="btn btn-hd">Download all (${images.length})</button>`;
};

// Event delegation for individual slide download buttons
document.getElementById('content').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-photo-dl');
    if (!btn) return;
    e.preventDefault();
    directDownload(btn.dataset.url, btn.dataset.name);
});

const buildVideoResult = (data) => {
    if (data.type === 'image' && Array.isArray(data.images) && data.images.length > 0) {
        return buildPhotoResult(data);
    }

    const randomId = Math.floor(Math.random() * 1000000000);
    const videoInfo = buildInfoBlock(data);

    const videoPlayer = data.videoUrl ? `
        <div class="video-container">
            <video controls crossorigin="anonymous" preload="metadata">
                <source src="${data.videoUrl}" type="video/mp4">
            </video>
        </div>
    ` : '';

    const buttons = [];

    if (data.videoUrl) {
        buttons.push(createDownloadButton(
            data.videoUrl, `TikDL_HD_${randomId}.mp4`,
            "Download HD", "btn-hd"
        ));
    }

    if (data.videoUrlSD && data.videoUrlSD !== data.videoUrl) {
        buttons.push(createDownloadButton(
            data.videoUrlSD, `TikDL_SD_${randomId}.mp4`,
            "Download SD"
        ));
    }

    if (data.audioUrl) {
        buttons.push(createDownloadButton(
            data.audioUrl, `TikDL_Audio_${randomId}.mp3`,
            "Download audio"
        ));
    }

    const downloadSection = `
        <div class="download-section">
            <div class="download-options">${buttons.join('')}</div>
            
        </div>
    `;

    return `<div class="result-wrap">${videoInfo}${videoPlayer}${downloadSection}</div>`;
};

const downloadTikTokVideo = async (url) => {
    try {
        showLoading();
        submitBtn.disabled = true;

        const response = await fetch(`/api/download?url=${encodeURIComponent(url)}`);
        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch {
            throw new Error('Server returned an unexpected response. Please try again.');
        }

        if (result.success && result.data) {
            content.innerHTML = buildVideoResult(result.data);
        } else {
            showError(result.message || 'Unable to fetch video. Make sure the video is public.');
        }
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'Failed to process. Please check your internet connection.');
    } finally {
        submitBtn.disabled = false;
    }
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url) { showError('Please enter a TikTok URL'); return; }
    if (!isValidTikTokUrl(url)) { showError('Please enter a valid TikTok URL'); return; }
    await downloadTikTokVideo(url);
});

urlInput.addEventListener('focus', () => {
    if (content.querySelector('.messageError')) showInstructions();
});

// Clear Button
const clearBtn = document.getElementById('clearBtn');
const syncClear = () => {
    const hasValue = Boolean(urlInput.value);
    clearBtn.hidden = !hasValue;
    pasteBtn.hidden = hasValue;
};

urlInput.addEventListener('input', syncClear);
clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    syncClear();
    urlInput.focus();
    showInstructions();
});

// Paste Button
const pasteBtn = document.getElementById('pasteBtn');
const ICON_PASTE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/></svg>';
const ICON_CHECK = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

pasteBtn.addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (!text) return;
        urlInput.value = text.trim();
        syncClear();
        urlInput.focus();

        pasteBtn.innerHTML = ICON_CHECK;
        setTimeout(() => { pasteBtn.innerHTML = ICON_PASTE; }, 1000);

        if (isValidTikTokUrl(urlInput.value.trim())) {
            form.dispatchEvent(new Event('submit'));
        }
    } catch (error) {
        console.error('Clipboard read failed:', error);
        showError('Could not access clipboard. Please paste manually.');
    }
});

urlInput.addEventListener('paste', (e) => {
    setTimeout(() => {
        const pastedUrl = e.target.value.trim();
        if (pastedUrl && isValidTikTokUrl(pastedUrl)) {
            setTimeout(() => form.dispatchEvent(new Event('submit')), 500);
        }
    }, 100);
});
