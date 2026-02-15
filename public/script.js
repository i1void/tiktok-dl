const form = document.getElementById('form');
const urlInput = document.getElementById('url');
const submitBtn = document.getElementById('submit');
const content = document.getElementById('content');

// Constants
const INSTRUCTIONS_HTML = `
    <ol>
        <li>Copy link of some tiktok video</li>
        <li>Paste link in text box</li>
        <li>Click the <b>GENERATE</b> button</li>
        <li>Watch and Download the video without watermark</li>
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

// Utility functions
const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

const isValidTikTokUrl = (url) => {
    return TIKTOK_PATTERNS.some(pattern => pattern.test(url));
};

const showInstructions = () => {
    content.innerHTML = INSTRUCTIONS_HTML;
};

const showLoading = () => {
    content.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Processing your TikTok video...</p>
        </div>
    `;
};

const showError = (message) => {
    content.innerHTML = `
        <div class="messageError">
            <i class='bx bx-error-circle'></i>
            <p>${message}</p>
        </div>
        ${INSTRUCTIONS_HTML}
    `;
};

// Direct download function
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

const createDownloadButton = (url, filename, icon, text) => {
    const buttonId = `btn-${Math.random().toString(36).substr(2, 9)}`;
    
    setTimeout(() => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                directDownload(url, filename);
            });
        }
    }, 100);
    
    return `<button id="${buttonId}" class="btn">
        <i class='bx ${icon}'></i>${text}
    </button>`;
};

const buildVideoResult = (data) => {
    const videoInfo = `
        <div class="video-info">
            <h3>${data.title}</h3>
            ${data.author ? `<p><strong>Author:</strong> @${data.author}</p>` : ''}
            ${data.duration ? `<p><strong>Duration:</strong> ${data.duration}s</p>` : ''}
            ${data.likes ? `<p><strong>Likes:</strong> ${formatNumber(data.likes)}</p>` : ''}
        </div>
    `;

    const videoPlayer = `
        <video controls crossorigin="anonymous" preload="metadata">
            <source src="${data.videoUrl}" type="video/mp4">
            Your browser does not support the video tag.
        </video>
    `;

    const downloadButtons = [
        createDownloadButton(data.videoUrl, "TikDL-HD.mp4", "bx-download", " Download HD Video")
    ];

    if (data.videoUrlSD && data.videoUrlSD !== data.videoUrl) {
        downloadButtons.push(
            createDownloadButton(data.videoUrlSD, "TikDL-SD.mp4", "bx-download", " Download SD Video")
        );
    }

    if (data.audioUrl) {
        downloadButtons.push(
            createDownloadButton(data.audioUrl, "TikDL-Audio.mp3", "bx-music", " Download Music")
        );
    }

    const downloadSection = `
        <div class="download-section">
            <div class="download-options">
                ${downloadButtons.join('')}
            </div>
            <p style="font-size: 12px; color: var(--color-text-secondary); margin-top: 1rem;">
                <i class='bx bx-info-circle'></i> Click to download directly
            </p>
        </div>
    `;

    return videoInfo + videoPlayer + downloadSection;
};

// Main download function
const downloadTikTokVideo = async (url) => {
    try {
        showLoading();
        submitBtn.disabled = true;

        console.log('Processing URL:', url);

        const response = await fetch(`/api/download?url=${encodeURIComponent(url)}`);
        const result = await response.json();

        if (result.success && result.data) {
            content.innerHTML = buildVideoResult(result.data);
        } else {
            showError(result.message || 'Unable to fetch video. Please try again or check if the video is public.');
        }

    } catch (error) {
        console.error('Error:', error);
        showError(`Failed to process video: ${error.message}. Please try again or check your internet connection.`);
    } finally {
        submitBtn.disabled = false;
    }
};

// Event listeners
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const url = urlInput.value.trim();
    
    if (!url) {
        showError('Please enter a TikTok URL');
        return;
    }

    if (!isValidTikTokUrl(url)) {
        showError('Please enter a valid TikTok URL');
        return;
    }

    await downloadTikTokVideo(url);
});

urlInput.addEventListener('focus', () => {
    if (content.querySelector('.messageError')) {
        showInstructions();
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
