#!/usr/bin/env node
/**
 * Upload public sprite PNGs to Cloudflare R2 (S3-compatible).
 *
 * Keys mirror the asset registry:
 *   sprites/creature/{lookType}.png
 *   sprites/item/{id}.png
 *
 * Env (same as Nest S3_*):
 *   S3_ENDPOINT, S3_BUCKET, S3_REGION=auto
 *   S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
 *   POKESPACE_SPRITES_ROOT — override source (default: ../pokespace_frontend/public/assets/sprites)
 *
 * Usage:
 *   node --env-file=.env.production ./scripts/assets/upload-r2.mjs
 *   pnpm assets:upload-r2
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_ROOT = path.resolve(__dirname, '../..')

const CACHE_CONTROL = 'public, max-age=31536000, immutable'
const CONTENT_TYPE = 'image/png'
const FOLDERS = ['creature', 'item']

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required env ${name}`)
  }
  return value
}

function resolveSpritesRoot() {
  const override = process.env.POKESPACE_SPRITES_ROOT?.trim()
  if (override) {
    return path.resolve(override)
  }
  return path.resolve(
    BACKEND_ROOT,
    '../pokespace_frontend/public/assets/sprites',
  )
}

function listPngs(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith('.png'))
    .map((name) => path.join(dir, name))
}

async function uploadFile(client, bucket, key, filePath) {
  const body = fs.readFileSync(filePath)
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: CONTENT_TYPE,
      CacheControl: CACHE_CONTROL,
    }),
  )
}

async function main() {
  const endpoint = requireEnv('S3_ENDPOINT')
  const bucket = requireEnv('S3_BUCKET')
  const region = process.env.S3_REGION?.trim() || 'auto'
  const accessKeyId = requireEnv('S3_ACCESS_KEY_ID')
  const secretAccessKey = requireEnv('S3_SECRET_ACCESS_KEY')

  const spritesRoot = resolveSpritesRoot()
  if (!fs.existsSync(spritesRoot)) {
    throw new Error(`Sprites root not found: ${spritesRoot}`)
  }

  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: { accessKeyId, secretAccessKey },
  })

  let uploaded = 0
  let skipped = 0

  for (const folder of FOLDERS) {
    const dir = path.join(spritesRoot, folder)
    const files = listPngs(dir)
    console.log(`[upload-r2] ${folder}: ${files.length} png(s) from ${dir}`)

    for (const filePath of files) {
      const base = path.basename(filePath)
      const key = `sprites/${folder}/${base}`
      try {
        await uploadFile(client, bucket, key, filePath)
        uploaded += 1
        if (uploaded % 50 === 0) {
          console.log(`[upload-r2] … ${uploaded} uploaded`)
        }
      } catch (error) {
        skipped += 1
        const message = error instanceof Error ? error.message : String(error)
        console.error(`[upload-r2] FAIL ${key}: ${message}`)
      }
    }
  }

  const publicBase =
    process.env.S3_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '') || '(unset)'
  console.log(
    `[upload-r2] done — uploaded=${uploaded} failed=${skipped} bucket=${bucket}`,
  )
  console.log(
    `[upload-r2] public base (must be CDN/r2.dev, not S3 API endpoint): ${publicBase}`,
  )
  if (publicBase.includes('r2.cloudflarestorage.com')) {
    console.warn(
      '[upload-r2] WARN: S3_PUBLIC_BASE_URL looks like the S3 API endpoint. Browsers need a public r2.dev or custom domain URL.',
    )
  }
  console.log(
    `[upload-r2] example key: sprites/creature/376.png → ${publicBase}/sprites/creature/376.png`,
  )
}

main().catch((error) => {
  console.error('[upload-r2]', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
