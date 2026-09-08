import { cwd } from 'node:process'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'

import { render } from '../../dist/server/entry-server.js'

import type { Config } from '@netlify/functions'

const template = readFileSync(
  join(
    cwd(),
    'packages',
    'vite-ssr',
    'dist',
    'client',
    'index.html'
  ),
  'utf-8'
)

export default async function () {
  const { html: appHtml } = render()
  const html = template.replace('<!--app-html-->', appHtml)

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8'
    },
  })
}

export const config: Config = {
  path: '/index.html',
}
