module.exports = {
  // Bot command prefix
  PREFIX: '.',

  // YouTube download settings
  MAX_QUALITY: '720',
  COOKIES_FILE: './cookies.txt',

  // QR code settings
  QR_IMAGE_PATH: './qr.png',
  QR_REGEN_INTERVAL: 30000, // Regenerate QR every 30 seconds

  // File cleanup
  TEMP_DIR: './temp',

  // Reconnection
  RECONNECT_DELAY: 5000,
  MAX_RECONNECT_ATTEMPTS: 10,

  // yt-dlp player clients (fallback order for YouTube extraction)
  // Handles SABR, PO token, and other recent YouTube changes
  PLAYER_CLIENTS: ['web', 'android', 'web_creator', 'android_vr', 'tv'],

  // yt-dlp extra arguments
  YTDLP_EXTRA_ARGS: [
    '--no-warnings',
    '--no-playlist',
    '--socket-timeout', '30',
    '--retries', '3',
  ],
};
