// Verifies that skew-protection's specifier stamping (render-chunk.ts) didn't break sourcemaps.
//
// It rewrites import specifiers in already-rendered chunk code via MagicString, generating its own
// map for that edit — Rollup then chains that onto whatever map preceded it (the TS/JSX transform's,
// then Rollup's own bundling map). If any link in that chain is off, a stack trace for code in a
// stamped chunk resolves to the wrong file/line, or a completely wrong chunk — this script builds
// the app, then proves the *final* map still round-trips a known source location correctly.
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping'

const DIST_ASSETS = join(import.meta.dirname, '..', 'dist', 'assets')

const CASES = [
  {
    chunkPrefix: 'vendor-thrower-',
    throwText: 'thrown from the static-import',
    originalFile: 'vendorThrower.ts',
    label: 'static cross-chunk import (manualChunks vendor chunk)',
  },
  {
    chunkPrefix: 'Lazy-',
    throwText: 'thrown from the dynamic-import (lazy) chunk',
    originalFile: 'Lazy.tsx',
    label: 'dynamic import() (lazy chunk)',
  },
]

async function findChunkFile(prefix) {
  const files = await readdir(DIST_ASSETS)
  const file = files.find((f) => f.startsWith(prefix) && f.endsWith('.js'))
  if (!file) {
    throw new Error(`No built chunk found matching "${prefix}*.js" in ${DIST_ASSETS}`)
  }
  return file
}

// Converts a byte offset into 1-based line / 0-based column, matching what
// TraceMap#originalPositionFor expects for `generatedLine`/`generatedColumn`.
function offsetToLineColumn(code, offset) {
  const before = code.slice(0, offset)
  const lines = before.split('\n')
  return { line: lines.length, column: lines[lines.length - 1].length }
}

let failures = 0

for (const testCase of CASES) {
  console.log(`\n--- ${testCase.label} ---`)

  const fileName = await findChunkFile(testCase.chunkPrefix)
  const filePath = join(DIST_ASSETS, fileName)
  const code = await readFile(filePath, 'utf8')
  const mapRaw = await readFile(`${filePath}.map`, 'utf8')
  const map = JSON.parse(mapRaw)

  // Sanity check: the plugin only ever rewrites specifier *text* inside the JS it's given — it
  // must never touch the sourcemap's own `sources` list. If it somehow did, every consumer of this
  // map (browser devtools, error-reporting tools) would fail to fetch the original source.
  const pollutedSources = map.sources.filter((source) => source.includes('nfdpl'))
  if (pollutedSources.length > 0) {
    console.error(`FAIL  sourcemap "sources" contains a stamped-looking entry: ${pollutedSources.join(', ')}`)
    failures++
    continue
  }

  const stampedSpecifier = code.includes('?nfdpl=')
  console.log(`  chunk file: ${fileName}`)
  console.log(`  specifier stamped in generated code: ${stampedSpecifier}`)
  if (!stampedSpecifier) {
    console.error('FAIL  expected this chunk to actually be stamped — test setup is not exercising the fix')
    failures++
    continue
  }

  const throwOffset = code.indexOf(testCase.throwText)
  if (throwOffset === -1) {
    console.error(`FAIL  could not find "${testCase.throwText}" in ${fileName} — did the build change?`)
    failures++
    continue
  }

  const { line, column } = offsetToLineColumn(code, throwOffset)
  const tracer = new TraceMap(map)
  const original = originalPositionFor(tracer, { line, column })

  console.log(`  generated position: ${fileName}:${line}:${column}`)
  console.log(`  resolves to: ${original.source}:${original.line}:${original.column}`)

  if (!original.source || !original.source.endsWith(testCase.originalFile)) {
    console.error(`FAIL  expected source to end with "${testCase.originalFile}", got "${original.source}"`)
    failures++
    continue
  }

  // Cross-check against the *actual* original file on disk (not just the map's embedded
  // `sourcesContent`) that the resolved line really is the `throw` statement.
  const originalFilePath = join(import.meta.dirname, '..', 'src', testCase.originalFile)
  const originalSource = await readFile(originalFilePath, 'utf8')
  const originalLine = originalSource.split('\n')[original.line - 1] ?? ''

  if (!originalLine.includes('throw new Error')) {
    console.error(
      `FAIL  resolved original line ${original.line} of ${testCase.originalFile} doesn't contain the throw statement:\n` +
        `      "${originalLine}"`,
    )
    failures++
    continue
  }

  console.log(`  original line ${original.line}: ${originalLine.trim()}`)
  console.log('PASS')
}

console.log(`\n${CASES.length - failures}/${CASES.length} cases passed`)

if (failures > 0) {
  process.exitCode = 1
}
