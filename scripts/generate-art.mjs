#!/usr/bin/env node
// Generate game art via the Gemini API (Nano Banana 2).
// Usage: node scripts/generate-art.mjs "<prompt>" <outfile> [aspectRatio]
// Key: read from ~/.poggers-gemini.env (GEMINI_API_KEY=...) — never committed.

import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const MODEL = process.env.ART_MODEL || 'gemini-3.1-flash-image'

function apiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY
  const env = readFileSync(join(homedir(), '.poggers-gemini.env'), 'utf8')
  const m = env.match(/GEMINI_API_KEY=(\S+)/)
  if (!m) throw new Error('GEMINI_API_KEY not found in ~/.poggers-gemini.env')
  return m[1]
}

const [prompt, outfile, aspectRatio = '16:9'] = process.argv.slice(2)
if (!prompt || !outfile) {
  console.error('usage: generate-art.mjs "<prompt>" <outfile> [aspectRatio]')
  process.exit(1)
}

const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey()}`,
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio },
      },
    }),
  }
)

if (!res.ok) {
  console.error('HTTP', res.status, await res.text())
  process.exit(1)
}

const data = await res.json()
const parts = data.candidates?.[0]?.content?.parts ?? []
const img = parts.find((p) => p.inlineData?.data)
if (!img) {
  console.error('no image in response:', JSON.stringify(data).slice(0, 600))
  process.exit(1)
}
writeFileSync(outfile, Buffer.from(img.inlineData.data, 'base64'))
console.log('wrote', outfile, Math.round(img.inlineData.data.length * 0.75 / 1024), 'KB')
