import { lazy, Suspense, useState } from 'react'

const Lazy = lazy(() => import('./Lazy.jsx'))

export default function App() {
  const [showLazy, setShowLazy] = useState(false)

  return (
    <section id="app">
      <h1>webpack-spa</h1>
      <p>A plain webpack 5 SPA, bundled via html-webpack-plugin + mini-css-extract-plugin.</p>
      <button type="button" onClick={() => setShowLazy(true)}>
        Load lazy chunk (JS + CSS)
      </button>
      {showLazy && (
        <Suspense fallback={<p>Loading…</p>}>
          <Lazy />
        </Suspense>
      )}
    </section>
  )
}
