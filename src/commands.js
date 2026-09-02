const { downloadVideo, searchVideo, deleteFile } = require('./youtube');
const config = require('./config');
const fs = require('fs');

const PREFIX = config.PREFIX;

const HELP_TEXT = `🎬 *YouTube Bot - Aide*

*Commandes disponibles :*

${PREFIX}help
  Affiche cette aide

${PREFIX}link <URL>
  Télécharge et envoie la vidéo depuis un lien YouTube
  Ex: ${PREFIX}link https://youtube.com/watch?v=...

${PREFIX}search <mots-clés>
  Recherche et envoie la première vidéo correspondante
  Ex: ${PREFIX}search funny cat compilation

*Limites :*
- Qualité maximale : 720p
- Format : MP4
- Un seul envoi à la fois`;

/**
 * Get the text content from a message, handling different message types.
 */
function getMessageText(msg) {
  const m = msg.message;
  if (!m) return '';

  if (m.conversation) return m.conversation;
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
  if (m.imageMessage?.caption) return m.imageMessage.caption;
  if (m.videoMessage?.caption) return m.videoMessage.caption;

  return '';
}

/**
 * Get the quoted message's text (for .link and .search on quoted messages).
 */
function getQuotedText(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted) return '';
  return quoted.conversation || quoted.extendedTextMessage?.text || '';
}

/**
 * Send a text reply to a message.
 */
async function sendReply(sock, msg, text) {
  await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
}

/**
 * Send a video file to a message.
 */
async function sendVideo(sock, msg, filePath, caption) {
  const buffer = fs.readFileSync(filePath);
  await sock.sendMessage(
    msg.key.remoteJid,
    {
      video: buffer,
      caption: caption || '',
      mimetype: 'video/mp4',
      fileName: require('path').basename(filePath),
    },
    { quoted: msg }
  );
}

/**
 * Handle .help command.
 */
async function handleHelp(sock, msg) {
  await sendReply(sock, msg, HELP_TEXT);
}

/**
 * Handle .link <URL> command.
 */
async function handleLink(sock, msg, args) {
  const url = args.trim();

  if (!url) {
    await sendReply(sock, msg, `❌ Veuillez fournir un lien.\nEx: ${PREFIX}link https://youtube.com/watch?v=...`);
    return;
  }

  // Basic URL validation
  if (!url.match(/^https?:\/\//)) {
    await sendReply(sock, msg, '❌ URL invalide. Elle doit commencer par http:// ou https://');
    return;
  }

  await sendReply(sock, msg, '⏳ Téléchargement en cours...');

  let filePath;
  try {
    const result = await downloadVideo(url);
    filePath = result.filePath;

    const caption = `🎬 ${result.title}${result.duration ? ' (' + result.duration + ')' : ''}`;
    await sendVideo(sock, msg, filePath, caption);
    console.log(`[CMD] Video sent: ${result.title}`);
  } catch (err) {
    console.error('[CMD] Link error:', err.message);
    let errMsg = '❌ Erreur lors du téléchargement.';
    if (err.message.includes('Sign in to confirm')) {
      errMsg = '❌ YouTube demande une vérification. Vérifiez le fichier cookies.txt.';
    } else if (err.message.includes('Video unavailable')) {
      errMsg = '❌ Vidéo introuvable ou non disponible.';
    } else if (err.message.includes('Private video')) {
      errMsg = '❌ Cette vidéo est privée.';
    } else if (err.message.includes('Premieres in')) {
      errMsg = '❌ Cette vidéo n\'est pas encore disponible.';
    } else {
      errMsg += '\n' + err.message.substring(0, 200);
    }
    await sendReply(sock, msg, errMsg);
  } finally {
    if (filePath) deleteFile(filePath);
  }
}

/**
 * Handle .search <query> command.
 */
async function handleSearch(sock, msg, args) {
  const query = args.trim();

  if (!query) {
    await sendReply(sock, msg, `❌ Veuillez fournir des mots-clés.\nEx: ${PREFIX}search funny cats`);
    return;
  }

  await sendReply(sock, msg, `🔍 Recherche : "${query}"...`);

  let filePath;
  try {
    const result = await searchVideo(query);
    filePath = result.filePath;

    const caption = `🎬 ${result.title}${result.duration ? ' (' + result.duration + ')' : ''}`;
    await sendVideo(sock, msg, filePath, caption);
    console.log(`[CMD] Search result sent: ${result.title}`);
  } catch (err) {
    console.error('[CMD] Search error:', err.message);
    let errMsg = '❌ Erreur lors de la recherche.';
    if (err.message.includes('No results')) {
      errMsg = '❌ Aucun résultat trouvé pour cette recherche.';
    } else {
      errMsg += '\n' + err.message.substring(0, 200);
    }
    await sendReply(sock, msg, errMsg);
  } finally {
    if (filePath) deleteFile(filePath);
  }
}

/**
 * Main message handler - routes to the correct command.
 */
async function handleMessage(sock, msg) {
  const text = getMessageText(msg);
  if (!text.startsWith(PREFIX)) return;

  const fullCommand = text.slice(PREFIX.length).trim();
  const [command, ...rest] = fullCommand.split(/\s+/);
  const args = rest.join(' ');
  const cmd = command.toLowerCase();

  console.log(`[CMD] Command: ${cmd} | Args: ${args || '(none)'}`);

  switch (cmd) {
    case 'help':
    case 'aide':
      await handleHelp(sock, msg);
      break;
    case 'link':
    case 'dl':
    case 'download':
      await handleLink(sock, msg, args);
      break;
    case 'search':
    case 'recherche':
    case 's':
      await handleSearch(sock, msg, args);
      break;
    default:
      break; // Ignore unknown commands silently
  }
}

module.exports = { handleMessage };
