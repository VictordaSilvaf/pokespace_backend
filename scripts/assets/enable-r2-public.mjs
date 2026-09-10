#!/usr/bin/env node
/**
 * Enable Cloudflare-managed r2.dev public URL for the sprites bucket.
 *
 * Requires a Cloudflare API token with R2 edit (not the S3 access keys):
 *   CLOUDFLARE_API_TOKEN
 *   CLOUDFLARE_ACCOUNT_ID — defaults from S3_ENDPOINT host prefix
 *   S3_BUCKET — default pokespace
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=... node --env-file=.env.production ./scripts/assets/enable-r2-public.mjs
 */
function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required env ${name}`)
  return value
}

function accountIdFromEndpoint() {
  const endpoint = process.env.S3_ENDPOINT?.trim()
  if (!endpoint) return undefined
  try {
    const host = new URL(endpoint).hostname
    const match = /^([a-f0-9]+)\.r2\.cloudflarestorage\.com$/i.exec(host)
    return match?.[1]
  } catch {
    return undefined
  }
}

async function main() {
  const token = requireEnv('CLOUDFLARE_API_TOKEN')
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || accountIdFromEndpoint()
  if (!accountId) {
    throw new Error(
      'Set CLOUDFLARE_ACCOUNT_ID or S3_ENDPOINT (*.r2.cloudflarestorage.com)',
    )
  }
  const bucket = process.env.S3_BUCKET?.trim() || 'pokespace'
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucket}/domains/managed`

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ enabled: true }),
  })
  const body = await res.json()
  if (!body.success) {
    const msg =
      body.errors?.map((e) => e.message).join('; ') || res.statusText
    throw new Error(`Cloudflare API failed: ${msg}`)
  }

  const domain = body.result?.domain
  const publicBase = domain ? `https://${domain}` : null
  console.log('[assets:enable-r2-public] enabled=', body.result?.enabled)
  console.log('[assets:enable-r2-public] domain=', domain)
  if (publicBase) {
    console.log(
      `[assets:enable-r2-public] set S3_PUBLIC_BASE_URL=${publicBase}`,
    )
    console.log(
      `[assets:enable-r2-public] set VITE_ASSETS_BASE_URL=${publicBase}`,
    )
    console.log(
      `[assets:enable-r2-public] smoke: ${publicBase}/sprites/creature/376.png`,
    )
  }
}

main().catch((err) => {
  console.error('[assets:enable-r2-public] failed:', err.message || err)
  process.exit(1)
})
