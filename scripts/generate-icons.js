import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generate() {
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const iconSvgPath = path.join(publicDir, 'icon.svg');
  const maskableSvgPath = path.join(publicDir, 'icon-maskable.svg');

  const iconSvg = fs.readFileSync(iconSvgPath);
  const maskableSvg = fs.readFileSync(maskableSvgPath);

  console.log('Generating PNG icons from SVG...');

  // 1. pwa-512x512.png
  await sharp(iconSvg)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Created pwa-512x512.png');

  // 2. pwa-192x192.png
  await sharp(iconSvg)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Created pwa-192x192.png');

  // 3. pwa-maskable-512x512.png
  await sharp(maskableSvg)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('Created pwa-maskable-512x512.png');

  // 4. apple-touch-icon.png (180x180)
  await sharp(iconSvg)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  // 5. favicon-32x32.png and favicon.ico
  await sharp(iconSvg)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));

  // Also write as favicon.ico
  await sharp(iconSvg)
    .resize(48, 48)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));
  console.log('Created favicon.ico & favicon-32x32.png');

  // 6. Generate rich screenshots for PWABuilder / App Store verification
  // Screenshot 1: Landscape (1280x720) for TV and Desktop
  const wideSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
    <rect width="1280" height="720" fill="#0A0F19"/>
    <!-- Top Bar -->
    <rect width="1280" height="64" fill="#111827"/>
    <rect x="24" y="16" width="36" height="36" rx="8" fill="#10B981"/>
    <text x="72" y="40" font-family="sans-serif" font-size="20" font-weight="900" fill="#FFFFFF">VISION IPTV</text>
    <rect x="240" y="16" width="400" height="32" rx="16" fill="#1F2937"/>
    <text x="260" y="38" font-family="sans-serif" font-size="13" fill="#9CA3AF">Rechercher des chaînes, films, séries...</text>
    <!-- Left Navigation -->
    <rect x="0" y="64" width="220" height="656" fill="#0D131F"/>
    <rect x="16" y="80" width="188" height="42" rx="10" fill="#10B981"/>
    <text x="36" y="106" font-family="sans-serif" font-size="14" font-weight="bold" fill="#000000">TV en Direct &amp; EPG</text>
    <rect x="16" y="132" width="188" height="38" rx="10" fill="#1F2937"/>
    <text x="36" y="156" font-family="sans-serif" font-size="14" fill="#D1D5DB">Films (VOD)</text>
    <rect x="16" y="178" width="188" height="38" rx="10" fill="#1F2937"/>
    <text x="36" y="202" font-family="sans-serif" font-size="14" fill="#D1D5DB">Séries TV</text>
    <rect x="16" y="224" width="188" height="38" rx="10" fill="#1F2937"/>
    <text x="36" y="248" font-family="sans-serif" font-size="14" fill="#D1D5DB">Enregistrements</text>
    <!-- EPG Grid Simulation -->
    <rect x="240" y="80" width="1020" height="620" rx="16" fill="#111827"/>
    <rect x="260" y="100" width="980" height="180" rx="12" fill="#1F2937"/>
    <text x="290" y="145" font-family="sans-serif" font-size="26" font-weight="bold" fill="#FFFFFF">Guide TV TiviMate &amp; Enregistrement Intelligent</text>
    <text x="290" y="180" font-family="sans-serif" font-size="15" fill="#9CA3AF">Interface optimisée télécommande Smart TV et Amazon Firestick</text>
    <rect x="290" y="210" width="140" height="40" rx="8" fill="#10B981"/>
    <text x="325" y="235" font-family="sans-serif" font-size="14" font-weight="bold" fill="#000000">REGARDER</text>
  </svg>`;
  await sharp(Buffer.from(wideSvg))
    .resize(1280, 720)
    .png()
    .toFile(path.join(publicDir, 'screenshot-wide.png'));
  console.log('Created screenshot-wide.png');

  // Screenshot 2: Mobile portrait (720x1280)
  const mobileSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 1280" width="720" height="1280">
    <rect width="720" height="1280" fill="#0A0F19"/>
    <rect width="720" height="80" fill="#111827"/>
    <rect x="24" y="20" width="40" height="40" rx="10" fill="#10B981"/>
    <text x="80" y="47" font-family="sans-serif" font-size="24" font-weight="900" fill="#FFFFFF">VISION IPTV</text>
    <rect x="24" y="100" width="672" height="280" rx="20" fill="#1F2937"/>
    <text x="50" y="160" font-family="sans-serif" font-size="28" font-weight="bold" fill="#FFFFFF">TV en Direct &amp; EPG</text>
    <text x="50" y="200" font-family="sans-serif" font-size="16" fill="#9CA3AF">Navigation fluide D-Pad &amp; Enregistrements programmés</text>
    <rect x="24" y="400" width="324" height="200" rx="16" fill="#1F2937"/>
    <rect x="372" y="400" width="324" height="200" rx="16" fill="#1F2937"/>
    <rect x="24" y="620" width="324" height="200" rx="16" fill="#1F2937"/>
    <rect x="372" y="620" width="324" height="200" rx="16" fill="#1F2937"/>
  </svg>`;
  await sharp(Buffer.from(mobileSvg))
    .resize(720, 1280)
    .png()
    .toFile(path.join(publicDir, 'screenshot-mobile.png'));
  console.log('Created screenshot-mobile.png');

  console.log('All icons generated successfully!');
}

generate().catch(console.error);
