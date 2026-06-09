#!/usr/bin/env node

/**
 * PWA Icon Generator Script
 * 
 * This script generates PWA icons in multiple sizes from the source SVG.
 * 
 * To use this script:
 * 1. Install sharp: npm install --save-dev sharp
 * 2. Run: node scripts/generate-icons.mjs
 * 
 * For now, icons can be generated manually using:
 * - Online tools like https://realfavicongenerator.net/
 * - Or design tools like Figma/Photoshop/GIMP
 * 
 * Required icon sizes:
 * - 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');
const svgPath = join(publicDir, 'icon.svg');

console.log('[generate-icons] Starting icon generation...');

// Check if sharp is installed
let sharp;
try {
  sharp = (await import('sharp')).default;
  console.log('[generate-icons] Sharp is installed, generating icons...');
  
  // Read SVG
  const svgBuffer = readFileSync(svgPath);
  
  // Generate each size
  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon-${size}x${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`[generate-icons] Generated ${size}x${size} icon`);
  }
  
  console.log('[generate-icons] All icons generated successfully!');
  
} catch (error) {
  console.warn('[generate-icons] Sharp not installed. Skipping automatic icon generation.');
  console.warn('[generate-icons] To generate icons automatically, run: npm install --save-dev sharp');
  console.warn('[generate-icons] Or generate icons manually using:');
  console.warn('[generate-icons]   - https://realfavicongenerator.net/');
  console.warn('[generate-icons]   - Design tools (Figma, Photoshop, GIMP)');
  console.warn('[generate-icons] Required sizes: 72, 96, 128, 144, 152, 192, 384, 512');
  
  // Create placeholder info file
  const placeholderInfo = `
PWA Icons Placeholder
=====================

To complete the PWA setup, generate icons in the following sizes:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

Methods:
1. Install sharp and run: npm install --save-dev sharp && node scripts/generate-icons.mjs
2. Use online tools: https://realfavicongenerator.net/
3. Export from design tools (Figma, Photoshop, GIMP)

The source SVG is available at: public/icon.svg
`;
  
  writeFileSync(join(iconsDir, 'README.txt'), placeholderInfo);
  console.log('[generate-icons] Created placeholder README in icons directory');
}
