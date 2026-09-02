const YTDlpWrap = require('yt-dlp-wrap').default;
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// Ensure temp directory exists
if (!fs.existsSync(config.TEMP_DIR)) {
  fs.mkdirSync(config.TEMP_DIR, { recursive: true });
}

// Initialize yt-dlp-wrap (auto-downloads yt-dlp binary on first run)
const ytdlp = new YTDlpWrap();

/**
 * Get the list of existing files in temp dir (for tracking new downloads).
 */
function getTempFiles() {
  return new Set(fs.readdirSync(config.TEMP_DIR));
}

/**
 * Find the most recently created/modified file that wasn't there before.
 */
function findNewFile(beforeSet) {
  const files = fs.readdirSync(config.TEMP_DIR)
    .filter(f => !beforeSet.has(f))
    .map(f => ({
      name: f,
      full: path.join(config.TEMP_DIR, f),
      time: fs.statSync(path.join(config.TEMP_DIR, f)).mtimeMs,
    }))
    .sort((a, b) => b.time - a.time);
  return files.length > 0 ? files[0].full : null;
}

/**
 * Build yt-dlp arguments for downloading a video.
 * Includes fallback player clients and quality cap at 720p.
 */
function buildDownloadArgs(url, outputPath) {
  const args = [
    url,
    '-o', outputPath,
    '--format', 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]',
    '--merge-output-format', 'mp4',
    '--ffmpeg-location', path.dirname(ffmpegPath),
    '--concurrent-fragments', '4',
    ...config.YTDLP_EXTRA_ARGS,
  ];

  // Add player client fallbacks (handles SABR, PO token, YouTube blocks)
  const clients = config.PLAYER_CLIENTS.join(',');
  args.push('--extractor-args', `youtube:player_client=${clients}`);

  // Add cookies if available
  if (fs.existsSync(config.COOKIES_FILE)) {
    args.push('--cookies', config.COOKIES_FILE);
  }

  return args;
}

/**
 * Build yt-dlp arguments for searching YouTube.
 */
function buildSearchArgs(query, outputPath) {
  const searchUrl = `ytsearch1:${query}`;
  const args = [
    searchUrl,
    '-o', outputPath,
    '--format', 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]',
    '--merge-output-format', 'mp4',
    '--ffmpeg-location', path.dirname(ffmpegPath),
    '--no-playlist',
    ...config.YTDLP_EXTRA_ARGS,
  ];

  const clients = config.PLAYER_CLIENTS.join(',');
  args.push('--extractor-args', `youtube:player_client=${clients}`);

  if (fs.existsSync(config.COOKIES_FILE)) {
    args.push('--cookies', config.COOKIES_FILE);
  }

  return args;
}

/**
 * Get video info (title, duration) from URL without downloading.
 */
async function getVideoInfo(url) {
  const infoArgs = [url, '--dump-json', '--no-download', '--no-warnings'];
  if (fs.existsSync(config.COOKIES_FILE)) {
    infoArgs.push('--cookies', config.COOKIES_FILE);
  }
  const clients = config.PLAYER_CLIENTS.join(',');
  infoArgs.push('--extractor-args', `youtube:player_client=${clients}`);

  const infoJson = await ytdlp.execPromise(infoArgs);
  return JSON.parse(infoJson);
}

/**
 * Format seconds to mm:ss or hh:mm:ss
 */
function formatDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Download a video from URL.
 * Returns { filePath, title, duration }
 */
async function downloadVideo(url) {
  const outputPath = path.join(config.TEMP_DIR, '%(id)s.%(ext)s');
  const args = buildDownloadArgs(url, outputPath);

  console.log(`[YT] Downloading: ${url}`);

  const beforeFiles = getTempFiles();

  try {
    await ytdlp.execPromise(args);

    const filePath = findNewFile(beforeFiles);
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('Download completed but output file not found');
    }

    // Get video info for caption
    let title = path.basename(filePath, path.extname(filePath));
    let duration = '';
    try {
      const info = await getVideoInfo(url);
      title = info.title || title;
      duration = formatDuration(info.duration);
      console.log(`[YT] Title: ${title} | Duration: ${duration}`);
    } catch {
      console.log('[YT] Could not fetch video info, using filename as title');
    }

    return { filePath, title, duration };
  } catch (err) {
    console.error('[YT] Download error:', err.message);
    throw err;
  }
}

/**
 * Search YouTube and download the top result.
 */
async function searchVideo(query) {
  const searchUrl = `ytsearch1:${encodeURIComponent(query)}`;
  return downloadVideo(searchUrl);
}

/**
 * Delete a file safely.
 */
function deleteFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[YT] Cleaned up: ${filePath}`);
    }
  } catch (err) {
    console.error(`[YT] Failed to delete ${filePath}:`, err.message);
  }
}

module.exports = { downloadVideo, searchVideo, deleteFile };
