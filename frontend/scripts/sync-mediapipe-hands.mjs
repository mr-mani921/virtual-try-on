import { cpSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules', '@mediapipe', 'hands')
const dest = join(root, 'public', 'mediapipe', 'hands')

if (!existsSync(src)) {
  console.warn('[sync-mediapipe-hands] @mediapipe/hands not installed — skipping')
  process.exit(0)
}

mkdirSync(dirname(dest), { recursive: true })
cpSync(src, dest, { force: true, recursive: true, dereference: true })

const files = readdirSync(dest)
console.log(`[sync-mediapipe-hands] Copied ${files.length} files to public/mediapipe/hands`)
