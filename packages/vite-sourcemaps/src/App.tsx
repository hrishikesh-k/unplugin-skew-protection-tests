import { Suspense, lazy, useState } from 'react'
import { throwFromVendorChunk } from './vendorThrower.ts'

const Lazy = lazy(() => import('./Lazy.tsx'))

export default function App() {
  const [showLazy, setShowLazy] = useState(false)
  const [lazyModule, setLazyModule] = useState<typeof import('./Lazy.tsx') | null>(null)

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '40rem', margin: '3rem auto' }}>
      <h1>vite-sourcemaps</h1>
      <p>
        Open DevTools' console, click a button below, and expand the thrown error's stack trace.
        With sourcemaps working correctly, it should point at <code>vendorThrower.ts</code> /{' '}
        <code>Lazy.tsx</code> (this project's original source) — <em>not</em> a hashed{' '}
        <code>assets/*.js</code> bundle filename — even though the request for that chunk itself
        carries a stamped <code>?nfdpl=&lt;token&gt;</code> query parameter.
      </p>

      <p>
        <button type="button" onClick={() => throwFromVendorChunk()}>
          Throw from vendor chunk (static import)
        </button>
      </p>

      <p>
        <button
          type="button"
          onClick={() => {
            setShowLazy(true)
            import('./Lazy.tsx').then(setLazyModule)
          }}
        >
          Load lazy chunk (dynamic import)
        </button>
        {lazyModule && (
          <button type="button" onClick={() => lazyModule.throwFromLazyChunk()}>
            Throw from lazy chunk
          </button>
        )}
      </p>

      {showLazy && (
        <Suspense fallback={<p>Loading…</p>}>
          <Lazy />
        </Suspense>
      )}
    </main>
  )
}
