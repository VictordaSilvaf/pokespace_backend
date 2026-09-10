#!/usr/bin/env node
/**
 * Tiny authenticated→public CDN stand-in for R2 sprites.
 *
 * Use when the bucket is not yet on r2.dev / custom domain. Streams only
 * `sprites/creature|item/*.png` with long-lived Cache-Control.
 *
 * Env: S3_* (same as upload-r2.mjs)
 * Optional: CDN_PORT (default 8787)
 *
 * Smoke:
 *   node --env-file=.env.production ./scripts/assets/serve-r2-cdn.mjs
 *   curl -I http://127.0.0.1:8787/sprites/creature/376.png
 */
import http from 'node:http'

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'

const ALLOWED = /^sprites\/(creature|item)\/[0-9]+\.png$/i
const PORT = Number(process.env.CDN_PORT || 8787)

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required env ${name}`)
  return value
}

function createClient() {
  return new S3Client({
    region: process.env.S3_REGION?.trim() || 'auto',
    endpoint: requireEnv('S3_ENDPOINT'),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: {
      accessKeyId: requireEnv('S3_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('S3_SECRET_ACCESS_KEY'),
    },
  })
}

async function main() {
  const bucket = requireEnv('S3_BUCKET')
  const client = createClient()
  const base = `http://127.0.0.1:${PORT}`

  const server = http.createServer(async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405).end()
        return
      }
      const key = decodeURIComponent((req.url || '/').replace(/^\//, '').split('?')[0])
      if (!ALLOWED.test(key)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found')
        return
      }
      const obj = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      )
      const headers = {
        'Content-Type': obj.ContentType || 'image/png',
        'Cache-Control':
          obj.CacheControl || 'public, max-age=31536000, immutable',
      }
      if (obj.ContentLength != null) {
        headers['Content-Length'] = String(obj.ContentLength)
      }
      res.writeHead(200, headers)
      if (req.method === 'HEAD' || !obj.Body) {
        res.end()
        return
      }
      for await (const chunk of obj.Body) {
        res.write(chunk)
      }
      res.end()
    } catch (err) {
      const status = err?.$metadata?.httpStatusCode === 404 ? 404 : 500
      res.writeHead(status, { 'Content-Type': 'text/plain' }).end(
        status === 404 ? 'Not found' : 'Error',
      )
    }
  })

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[assets:serve-r2] CDN at ${base}`)
    console.log(`[assets:serve-r2] smoke: ${base}/sprites/creature/376.png`)
    console.log(
      `[assets:serve-r2] set S3_PUBLIC_BASE_URL=${base} (or VITE_ASSETS_BASE_URL)`,
    )
  })
}

main().catch((err) => {
  console.error('[assets:serve-r2] failed:', err.message || err)
  process.exit(1)
})
