# WhatsApp YouTube Bot - Pterodactyl

## Installation sur Pterodactyl

### 1. Upload des fichiers
- Uploadez tous les fichiers du projet via le File Manager du panel
- Assurez-vous que `package.json` est à la racine

### 2. Installer les dépendances
Dans le panel, allez dans la console (ou utilisez le File Manager) :
- Créez un fichier `install.sh` à la racine avec ce contenu :
```bash
npm install
rm -f install.sh
```
- Redémarrez le serveur → le script s'exécutera automatiquement

### 3. Configuration YouTube (cookies.txt)
**IMPORTANT** : Utilisez un compte Google **adulte standard** (pas Family Link/enfant).

1. Installez l'extension [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc) dans Chrome
2. Connectez-vous à YouTube avec votre compte Google adulte
3. Allez sur youtube.com
4. Cliquez sur l'extension → Exportez les cookies en format Netscape
5. Enregistrez le fichier sous `cookies.txt` à la racine du projet via le File Manager

### 4. Démarrer le bot
- Dans le panel, mettez la commande de démarrage : `npm start`
- Le bot génère un fichier `qr.png` à la racine

### 5. Scanner le QR code
1. Dans le File Manager du panel, téléchargez `qr.png`
2. Ouvrez l'image sur votre téléphone
3. Scannez-la avec WhatsApp (Paramètres → Appareils connectés → Connecter un appareil)
4. Si le QR expire, le bot en régénère un nouveau automatiquement

### 6. Commandes WhatsApp
| Commande | Description |
|----------|-------------|
| `.help` | Affiche la liste des commandes |
| `.link <URL>` | Télécharge et envoie une vidéo depuis un lien YouTube |
| `.search <mots-clés>` | Recherche et envoie la première vidéo correspondante |

### Aliases
- `.link` = `.dl` = `.download`
- `.search` = `.s` = `.recherche`
- `.help` = `.aide`

## Structure du projet
```
├── package.json          # Dépendances npm
├── cookies.txt           # Cookies YouTube (à créer manuellement)
├── src/
│   ├── index.js          # Point d'entrée
│   ├── config.js         # Configuration
│   ├── whatsapp.js       # Connexion WhatsApp + QR PNG
│   ├── youtube.js        # Téléchargement/Recherche YouTube
│   └── commands.js       # Gestionnaire de commandes
├── auth_info/            # Session WhatsApp (auto-généré)
└── temp/                 # Fichiers temporaires (auto-nettoyés)
```

## Fonctionnalités techniques

- **yt-dlp** : Binaire auto-téléchargé via `yt-dlp-wrap` (aucune dépendance Python/systeme)
- **ffmpeg-static** : Binaire ffmpeg inclus dans npm (fusion audio/vidéo)
- **Qualité max** : 720p MP4 (forcé via yt-dlp format selector)
- **Reconnexion auto** : Gère les déconnexions WhatsApp avec backoff
- **QR en PNG** : Pas d'affichage terminal, fichier image régénéré toutes les 30s
- **Nettoyage auto** : Fichiers temporaires supprimés après envoi
- **Fallback YouTube** : Plusieurs player_client (web, android, web_creator, android_vr, tv) pour contourner les blocages (SABR, PO token)
- **Cookies YouTube** : Requis pour éviter les restrictions de format (compte adulte standard recommandé)

## Fichiers exclus du repo
- `auth_info/` — Session WhatsApp
- `temp/` — Fichiers vidéo temporaires
- `cookies.txt` — Cookies YouTube (sensible)
- `qr.png` — QR code généré
- `node_modules/` — Dépendances
