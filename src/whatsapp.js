const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

const config = require('./config');

let qrInterval = null;

async function connectToWhatsApp(onMessage) {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false, // We handle QR as PNG
    logger: pino({ level: 'silent' }),
    browser: ['WhatsApp Bot', 'Chrome', '4.0.0'],
    markOnlineOnConnect: true,
  });

  // Handle QR code
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('[QR] New QR code received, generating PNG...');

      // Clear previous interval
      if (qrInterval) clearInterval(qrInterval);

      // Generate QR PNG
      try {
        await QRCode.toFile(config.QR_IMAGE_PATH, qr, {
          type: 'png',
          width: 512,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        });
        console.log(`[QR] QR code saved to: ${config.QR_IMAGE_PATH}`);
        console.log('[QR] Download it from the File Manager panel to scan.');
      } catch (err) {
        console.error('[QR] Failed to generate QR PNG:', err.message);
      }

      // Countdown log in console
      let countdown = Math.floor(config.QR_REGEN_INTERVAL / 1000);
      console.log(`[QR] Regenerating in ${countdown}s...`);

      qrInterval = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          clearInterval(qrInterval);
          console.log('[QR] QR expired, waiting for new one...');
        } else if (countdown % 5 === 0 || countdown <= 3) {
          console.log(`[QR] Regenerating in ${countdown}s...`);
        }
      }, 1000);
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`[CONN] Connection closed. Status: ${statusCode}`);

      if (qrInterval) clearInterval(qrInterval);

      if (shouldReconnect) {
        console.log(`[CONN] Reconnecting in ${config.RECONNECT_DELAY / 1000}s...`);
        setTimeout(() => connectToWhatsApp(onMessage), config.RECONNECT_DELAY);
      } else {
        console.log('[CONN] Logged out. Deleting session and waiting for restart...');
        try {
          fs.rmSync('./auth_info', { recursive: true, force: true });
        } catch {}
        setTimeout(() => connectToWhatsApp(onMessage), config.RECONNECT_DELAY);
      }
    }

    if (connection === 'open') {
      console.log('[CONN] WhatsApp connected successfully!');
      if (qrInterval) clearInterval(qrInterval);
      if (fs.existsSync(config.QR_IMAGE_PATH)) {
        fs.unlinkSync(config.QR_IMAGE_PATH);
      }
    }
  });

  // Save credentials on update
  sock.ev.on('creds.update', saveCreds);

  // Handle incoming messages
  sock.ev.on('messages.upsert', async (msg) => {
    if (msg.type !== 'notify') return;
    for (const m of msg.messages) {
      if (m.key.fromMe) return;
      if (!m.message) return;
      if (!onMessage) return;
      try {
        await onMessage(sock, m);
      } catch (err) {
        console.error('[MSG] Error handling message:', err.message);
      }
    }
  });

  return sock;
}

module.exports = { connectToWhatsApp };
