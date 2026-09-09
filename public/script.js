// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

function setTheme(mode) {
    if (mode === 'light') {
        document.body.classList.add('light');
        themeIcon.className = "bx bx-sun";
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.remove('light');
        themeIcon.className = "bx bx-moon";
        localStorage.setItem('theme', 'dark');
    }
}

setTheme(localStorage.getItem('theme') || 'dark');

themeToggle.addEventListener('click', () => {
    setTheme(document.body.classList.contains('light') ? 'dark' : 'light');
});

// Burger Menu
const burgerBtn = document.getElementById('burgerBtn');
const sideMenu = document.getElementById('sideMenu');
const menuOverlay = document.getElementById('menuOverlay');
const closeMenu = document.getElementById('closeMenu');

function openMenu() {
    sideMenu.classList.add('open');
    menuOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMenuFn() {
    sideMenu.classList.remove('open');
    menuOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

burgerBtn.addEventListener('click', openMenu);
closeMenu.addEventListener('click', closeMenuFn);
menuOverlay.addEventListener('click', closeMenuFn);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenuFn(); });

// Main App
const form = document.getElementById('form');
const urlInput = document.getElementById('url');
const submitBtn = document.getElementById('submit');
const content = document.getElementById('content');

const INSTRUCTIONS_HTML = `
    <ol>
        <li>Copy a link from <b>TikTok</b></li>
        <li>Paste it in the box above</li>
        <li>Click <b>GENERATE</b></li>
        <li>Download your video without watermark ✓</li>
    </ol>
`;

const TIKTOK_PATTERNS = [
    /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com|m\.tiktok\.com|vt\.tiktok\.com)/,
    /tiktok\.com\/@[\w\.-]+\/video\/\d+/,
    /tiktok\.com\/t\/[\w\d]+/,
    /vm\.tiktok\.com\/[\w\d]+/,
    /vt\.tiktok\.com\/[\w\d]+/,
    /m\.tiktok\.com\/v\/\d+/,
    /tiktok\.com\/.*\/video\/\d+/
];

const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

const isValidTikTokUrl = (url) => TIKTOK_PATTERNS.some(p => p.test(url));
const showInstructions = () => { content.innerHTML = INSTRUCTIONS_HTML; };

const showLoading = () => {
    content.innerHTML = `
        <div class="loading">
            <div class="loading-label">Processing</div>
            <div class="loading-bar-wrap">
                <div class="loading-bar"></div>
            </div>
            <div class="loading-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
};

const showError = (message) => {
    content.innerHTML = `
        <div style="width:100%">
            <div class="messageError">
                <i class='bx bx-error-circle'></i>
                <span>${message}</span>
            </div>
            ${INSTRUCTIONS_HTML}
        </div>
    `;
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
        alert('Download failed. Please try right-click and "Save as"');
        if (onProgress) onProgress(null, 0, true);
    }
};

const createDownloadButton = (url, filename, icon, text, extraClass = '') => {
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
            <i class='bx ${icon}'></i>${text}
        </button>
        <div class="dl-progress-wrap" id="${wrapId}"><div class="dl-progress-bar" id="${barId}"></div></div>
        <div class="dl-progress-label" id="${labelId}"></div>
    </div>`;
};

const buildInfoBlock = (data) => `
    <div class="video-info">
        <h3>${data.title || 'TikTok Video'}</h3>
        ${data.author ? `<p><i class='bx bx-user'></i> @${data.author}</p>` : ''}
        ${data.duration ? `<p><i class='bx bx-time'></i> ${data.duration}s</p>` : ''}
        ${data.likes ? `<p><i class='bx bx-heart'></i> ${formatNumber(data.likes)}</p>` : ''}
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
                    <button class="btn-photo-dl" data-url="${img}" data-name="TikDL_Slide_${randomId}_${i + 1}.jpg" aria-label="Download slide ${i + 1}">
                        <i class='bx bx-download'></i>
                    </button>
                </div>
            `).join('')}
        </div>
    `;

    const buttons = [];

    buttons.push(createDownloadAllPhotosButton(images, randomId));

    if (data.audioUrl) {
        buttons.push(createDownloadButton(
            data.audioUrl, `TikDL_Audio_${randomId}.mp3`,
            "bx-music", " Audio Only"
        ));
    }

    const downloadSection = `
        <div class="download-section">
            <div class="download-options">${buttons.join('')}</div>
            <p class="download-hint"><i class='bx bx-info-circle'></i> Tap a slide to download it individually</p>
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
            const originalText = btn.innerHTML;
            for (let i = 0; i < images.length; i++) {
                btn.innerHTML = `<i class='bx bx-download'></i> Downloading ${i + 1}/${images.length}…`;
                await directDownload(images[i], `TikDL_Slide_${randomId}_${i + 1}.jpg`);
                await new Promise(r => setTimeout(r, 400)); // avoid browser blocking multi-downloads
            }
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    }, 100);
    return `<button id="${buttonId}" class="btn btn-hd">
        <i class='bx bx-download'></i> Download All (${images.length})
    </button>`;
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
            "bx-download", " Download HD", "btn-hd"
        ));
    }

    if (data.videoUrlSD && data.videoUrlSD !== data.videoUrl) {
        buttons.push(createDownloadButton(
            data.videoUrlSD, `TikDL_SD_${randomId}.mp4`,
            "bx-download", " Download SD"
        ));
    }

    if (data.audioUrl) {
        buttons.push(createDownloadButton(
            data.audioUrl, `TikDL_Audio_${randomId}.mp3`,
            "bx-music", " Audio Only"
        ));
    }

    const downloadSection = `
        <div class="download-section">
            <div class="download-options">${buttons.join('')}</div>
            <p class="download-hint"><i class='bx bx-info-circle'></i> Tap to download directly</p>
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

// Paste Button
const pasteBtn = document.getElementById('pasteBtn');

pasteBtn.addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (!text) return;
        urlInput.value = text.trim();
        urlInput.focus();

        pasteBtn.classList.add('pasted');
        const icon = pasteBtn.querySelector('i');
        icon.className = 'bx bx-check';
        setTimeout(() => {
            icon.className = 'bx bx-paste';
            pasteBtn.classList.remove('pasted');
        }, 1000);

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
