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

const directDownload = async (url, filename) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error('Download error:', error);
        alert('Download failed. Please try right-click and "Save as"');
    }
};

const createDownloadButton = (url, filename, icon, text, extraClass = '') => {
    const buttonId = `btn-${Math.random().toString(36).substr(2, 9)}`;
    setTimeout(() => {
        const btn = document.getElementById(buttonId);
        if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); directDownload(url, filename); });
    }, 100);
    return `<button id="${buttonId}" class="btn ${extraClass}">
        <i class='bx ${icon}'></i>${text}
    </button>`;
};

const buildVideoResult = (data) => {
    const randomId = Math.floor(Math.random() * 1000000000);

    const videoInfo = `
        <div class="video-info">
            <h3>${data.title || 'TikTok Video'}</h3>
            ${data.author ? `<p><i class='bx bx-user'></i> @${data.author}</p>` : ''}
            ${data.duration ? `<p><i class='bx bx-time'></i> ${data.duration}s</p>` : ''}
            ${data.likes ? `<p><i class='bx bx-heart'></i> ${formatNumber(data.likes)}</p>` : ''}
        </div>
    `;

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

urlInput.addEventListener('paste', (e) => {
    setTimeout(() => {
        const pastedUrl = e.target.value.trim();
        if (pastedUrl && isValidTikTokUrl(pastedUrl)) {
            setTimeout(() => form.dispatchEvent(new Event('submit')), 500);
        }
    }, 100);
});
