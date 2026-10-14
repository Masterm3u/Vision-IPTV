# Vision IPTV Player 📺✨

> Lecteur IPTV moderne et performant conçu pour le Web, Smart TV, Fire TV Stick, Mobile et Desktop. Inspiré par les meilleures interfaces TV comme TiviMate, avec support complet de la télécommande D-Pad, grille EPG en direct, enregistrement programmé et métadonnées TMDB cinéma.

---

## 🌟 Fonctionnalités Principales

### 📡 TV en direct & Grille EPG interactive
- **Grille de programmes (EPG)** fluide avec timeline horaire en temps réel.
- **Menu d'action rapide style TiviMate** :
  - **Appui long (3 secondes)** ou bouton Menu sur n'importe quelle émission pour ouvrir le pop-up :
    - 🔔 **Rappel 5 min** avant le début de l'émission
    - ⏺️ **Programmer un enregistrement** automatique
    - ❌ **Annuler** la programmation ou le rappel
- Recherche instantanée par chaîne ou catégorie.
- Gestion des chaînes favorites.

### 🎬 Films (VOD) & Séries
- Intégration de l'API **The Movie Database (TMDB)** :
  - Affiches officielles HD, bannières (backdrops), synopsis complets, notes, casting et genres.
- Navigation par saisons et épisodes pour les séries.
- Reprise de lecture automatique et mémorisation du temps visionné.

### 🎮 Compatibilité Télécommande Smart TV & Firestick
- Navigation 100% au clavier ou à la **télécommande D-Pad** (Flèches Haut/Bas/Gauche/Droite, OK/Entrée, Retour).
- Mode Plein écran automatique sans barres de navigation parasites.
- Interface adaptée à 3 mètres de distance (affichage 10-foot UI).

### ⚡ Relais de streaming & Contournement CORS
- Serveur proxy Node.js / Express intégré :
  - Contournement automatique des blocages CORS des fournisseurs IPTV.
  - Réécriture des flux HLS (.m3u8 et segments .ts).
  - Émulation de User-Agent personnalisable pour les serveurs IPTV restreints.

### 📱 Progressive Web App (PWA) & Multiplateforme
- Fichiers `manifest.json` et `sw.js` (Service Worker) inclus.
- Installable en 1 clic sur Chrome, Safari (iOS), Edge, Windows et Android.
- Emballable en fichier `.APK` Android pour Firestick via **PWABuilder**.

---

## 🚀 Installation & Démarrage en local

### Prérequis
- [Node.js](https://nodejs.org/) (version 18 ou supérieure recommandée)

- 2. Installer les dépendances
code
Bash
npm install
3. Lancer en mode développement
code
Bash
npm run dev
L'application démarre immédiatement sur : http://localhost:3000
4. Compiler pour la production
code
Bash
npm run build
npm run start
☁️ Déploiement en ligne (Pour créer l'APK Firestick)
Pour convertir l'application en .APK avec PWABuilder, l'application doit être hébergée sur un serveur public :
Déploiement sur Render (Gratuit & recommandé)
Créez un compte sur Render.com et liez votre compte GitHub.
Cliquez sur New + > Web Service.
Sélectionnez votre dépôt GitHub.
Renseignez les paramètres suivants :
Environment : Node
Build Command : npm install && npm run build
Start Command : npm run start
Cliquez sur Create Web Service. Vous obtiendrez votre URL publique (ex: https://mon-iptv.onrender.com).
📲 Création du fichier APK pour Fire TV Stick
Rendez-vous sur PWABuilder.com.
Entrez votre URL publique (ex: https://mon-iptv.onrender.com).
Cliquez sur Start (les indicateurs PWA et Manifest seront tous au vert).
Cliquez sur Package for Stores > Android > Download APK.
Transférez et installez l'APK sur votre Fire TV Stick via l'application Downloader.
🛠️ Technologies utilisées
Frontend : React 19, TypeScript, Tailwind CSS, Lucide React, Motion.
Lecteur Vidéo : HLS.js avec gestion des pistes audio et sous-titres.
Backend Proxy : Node.js, Express, tsx, esbuild.
APIs : Xtream Codes, M3U8 Playlist Parser, XMLTV EPG Parser, The Movie Database (TMDB).
⚖️ Licence
Ce projet est distribué sous licence MIT. Destiné à la lecture de flux personnels et playlists légales.
- `npm` ou `yarn`

### 1. Cloner le projet
```bash
git clone https://github.com/votre-nom-utilisateur/vision-iptv-player.git
cd vision-iptv-player
