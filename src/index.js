const { connectToWhatsApp } = require('./whatsapp');
const { handleMessage } = require('./commands');
const fs = require('fs');
const path = require('path');

// Ensure temp directory exists
const tempDir = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Cleanup stale temp files on startup
function cleanupTemp() {
  try {
    if (!fs.existsSync(tempDir)) return;
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stat = fs.statSync(filePath);
      // Delete files older than 1 hour
      if (Date.now() - stat.mtimeMs > 3600000) {
        fs.unlinkSync(filePath);
        console.log(`[CLEANUP] Removed stale file: ${file}`);
      }
    }
  } catch (err) {
    console.error('[CLEANUP] Error:', err.message);
  }
}

// Print startup banner
console.log('========================================');
console.log('  WhatsApp YouTube Bot');
console.log('========================================');
console.log(`[START] Date: ${new Date().toISOString()}`);
console.log(`[START] Node: ${process.version}`);
console.log(`[START] PID: ${process.pid}`);

cleanupTemp();

console.log('[START] Connecting to WhatsApp...');
connectToWhatsApp(handleMessage).catch((err) => {
  console.error('[START] Fatal error:', err.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[STOP] Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[STOP] Shutting down...');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('[ERROR] Uncaught exception:', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('[ERROR] Unhandled rejection:', err.message);
});
